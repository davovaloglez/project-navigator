import { createAuthMiddleware, getSessionFromCtx, APIError } from 'better-auth/api';
import { getDbClient } from '../db/client';
import { invalidatePermissions } from './permissions';

/**
 * Endurecimiento server-side de los candados anti-bloqueo del módulo Admin.
 *
 * La UI ya deshabilita estas acciones, pero esto las bloquea también en el
 * servidor (única fuente de verdad) ante peticiones directas a los endpoints
 * del admin plugin (`/admin/set-role`, `/admin/ban-user`, `/admin/remove-user`,
 * `/admin/update-user`):
 *
 *  1. Un usuario NO puede cambiar su propio rol (auto-bloqueo).
 *  2. No se puede degradar / desactivar / eliminar al ÚLTIMO admin activo
 *     (el sistema nunca queda sin administradores).
 *
 * Better-Auth ya rechaza por su cuenta el auto-baneo y la auto-eliminación.
 */

const WATCHED = new Set([
  '/admin/set-role',
  '/admin/ban-user',
  '/admin/remove-user',
  '/admin/update-user',
]);

function rolesOf(role: unknown): string[] {
  if (Array.isArray(role)) return role.flatMap((r) => String(r).split(',')).map((s) => s.trim());
  if (typeof role === 'string') return role.split(',').map((s) => s.trim());
  return [];
}

const isAdminRole = (role: unknown) => rolesOf(role).includes('admin');

function forbidden(message: string): never {
  throw new APIError('FORBIDDEN', { message, code: 'FORBIDDEN' });
}

async function getTarget(userId: string): Promise<{ role: string | null; banned: boolean } | null> {
  const db = getDbClient();
  const res = await db.execute({
    sql: 'select role, banned from "user" where id = ?',
    args: [userId],
  });
  const row = res.rows[0];
  if (!row) return null;
  return { role: (row.role as string | null) ?? null, banned: row.banned === 1 };
}

/** Nº de admins ACTIVOS (no baneados) excluyendo a `exceptId`. */
async function activeAdminsExcept(exceptId: string): Promise<number> {
  const db = getDbClient();
  const res = await db.execute({
    sql: `select count(*) as c from "user"
          where (banned is null or banned = 0)
            and id != ?
            and (role = 'admin' or role like 'admin,%' or role like '%,admin' or role like '%,admin,%')`,
    args: [exceptId],
  });
  return Number(res.rows[0]?.c ?? 0);
}

export const adminGuard = createAuthMiddleware(async (ctx) => {
  const path = ctx.path;
  if (!WATCHED.has(path)) return;

  const body = (ctx.body ?? {}) as {
    userId?: string;
    role?: unknown;
    data?: { role?: unknown; banned?: unknown };
  };
  const targetId = body.userId;
  if (!targetId) return; // que el endpoint valide

  const session = await getSessionFromCtx(ctx).catch(() => null);
  const actingId = session?.user?.id;

  // Fail-CLOSED: si no podemos identificar quién actúa sobre una ruta
  // sensible, denegamos (mejor que dejar pasar un cambio de rol propio).
  if (!actingId) {
    forbidden('No se pudo verificar tu sesión. Vuelve a iniciar sesión.');
  }

  // --- 1. No cambiar tu propio rol -----------------------------------------
  const changesOwnRole =
    actingId === targetId &&
    ((path === '/admin/set-role') ||
      (path === '/admin/update-user' && body.data?.role !== undefined));
  if (changesOwnRole) {
    forbidden('No puedes cambiar tu propio rol (protección anti-bloqueo).');
  }

  // --- 2. Proteger al último admin activo ----------------------------------
  const target = await getTarget(targetId);
  if (!target || !isAdminRole(target.role) || target.banned) return; // sólo aplica a admins activos

  let removesAdminAccess = false;
  if (path === '/admin/remove-user') removesAdminAccess = true;
  else if (path === '/admin/ban-user') removesAdminAccess = true;
  else if (path === '/admin/set-role') removesAdminAccess = !isAdminRole(body.role);
  else if (path === '/admin/update-user') {
    const d = body.data ?? {};
    const demoted = d.role !== undefined && !isAdminRole(d.role);
    const banned = d.banned === true || d.banned === 1;
    removesAdminAccess = demoted || banned;
  }
  if (!removesAdminAccess) return;

  if ((await activeAdminsExcept(targetId)) === 0) {
    forbidden(
      'Es el único administrador activo. Asigna el rol admin a otro usuario antes de degradarlo, desactivarlo o eliminarlo.',
    );
  }
});

/**
 * `hooks.after`: tras mutar a un usuario vía el admin plugin (rol, ban/unban,
 * datos), invalida su cache de permisos para que el cambio surta efecto de
 * inmediato (sin esperar el TTL de 30s del resolver).
 */
const MUTATING = new Set([
  '/admin/set-role',
  '/admin/ban-user',
  '/admin/unban-user',
  '/admin/remove-user',
  '/admin/update-user',
]);

export const adminGuardAfter = createAuthMiddleware(async (ctx) => {
  if (!MUTATING.has(ctx.path)) return;
  const targetId = (ctx.body as { userId?: string } | undefined)?.userId;
  if (targetId) invalidatePermissions(targetId);
});
