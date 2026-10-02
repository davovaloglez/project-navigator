import { roles, DEFAULT_ROLE, blockDenyByRole, type RoleName } from './permissions/roles';
import { statement } from './permissions/statements';
import { roleCan, splitResource } from './permissions/roleDefaults';
import { getDbClient } from '../db/client';
import type { Resource, EffectivePermissions, OverrideEffect, PermUser } from './permissions/types';

export type { Resource, EffectivePermissions, OverrideEffect, PermUser } from './permissions/types';
export { roleCan };

/**
 * Resolver de permisos. FUENTE DE VERDAD server-side.
 *
 * RBAC + overrides por usuario (tabla `user_permission_override`):
 *   efectivo = rol  ∪ overrides(allow)  ∖ overrides(deny)
 *
 * `getEffectivePermissions()` cachea por usuario (TTL corto) para no pegarle a
 * Turso en cada request; las escrituras de overrides invalidan vía
 * `invalidatePermissions(userId)`. Si la tabla aún no existe (migración no
 * aplicada) se degrada a sólo-rol sin romper.
 */

function resolveRole(user: PermUser | null | undefined): RoleName {
  const r = user?.role;
  return r && r in roles ? (r as RoleName) : DEFAULT_ROLE;
}

/** Predicado canónico sobre un payload ya resuelto (sync, server y testeable). */
export function evaluate(perms: EffectivePermissions, resource: Resource): boolean {
  const { kind, value } = splitResource(resource);
  switch (kind) {
    case 'page':
      return perms.pages.includes(value);
    case 'data':
      return perms.data.includes(value);
    case 'action':
      return perms.actions.includes(value);
    case 'block':
      return !perms.blockDenies.includes(value); // default-ALLOW
    default:
      return false;
  }
}

// --- overrides + cache -----------------------------------------------------

const OVERRIDE_TTL_MS = 30_000;
const cache = new Map<string, { perms: EffectivePermissions; exp: number }>();

/** Invalida el cache de un usuario (llamar tras escribir sus overrides). */
export function invalidatePermissions(userId: string): void {
  cache.delete(userId);
}

async function fetchOverrides(userId: string): Promise<Map<string, OverrideEffect>> {
  const out = new Map<string, OverrideEffect>();
  try {
    const db = getDbClient();
    const res = await db.execute({
      sql: 'select resource, effect from user_permission_override where userId = ?',
      args: [userId],
    });
    for (const row of res.rows) {
      const resource = row.resource as string;
      const effect = row.effect as string;
      if (effect === 'allow' || effect === 'deny') out.set(resource, effect);
    }
  } catch {
    // Tabla inexistente (migración no aplicada) u otro fallo → sólo-rol.
  }
  return out;
}

function rolePermissions(role: RoleName): EffectivePermissions {
  return {
    role,
    pages: statement.page.filter((p) => roleCan(role, `page:${p}`)),
    data: statement.data.filter((d) => roleCan(role, `data:${d}`)),
    actions: statement.action.filter((a) => roleCan(role, `action:${a}`)),
    blockDenies: [...(blockDenyByRole[role] ?? [])],
  };
}

function applyOverrides(
  base: EffectivePermissions,
  overrides: Map<string, OverrideEffect>,
): EffectivePermissions {
  const set = { page: new Set(base.pages), data: new Set(base.data), action: new Set(base.actions) };
  const blockDenies = new Set(base.blockDenies);

  for (const [resource, effect] of overrides) {
    const i = resource.indexOf(':');
    if (i < 0) continue;
    const kind = resource.slice(0, i);
    const value = resource.slice(i + 1);

    if (kind === 'block') {
      // allow → quitar del deny; deny → agregar al deny.
      if (effect === 'allow') blockDenies.delete(value);
      else blockDenies.add(value);
      continue;
    }
    if (kind === 'page' || kind === 'data' || kind === 'action') {
      if (effect === 'allow') set[kind].add(value);
      else set[kind].delete(value);
    }
  }

  return {
    role: base.role,
    pages: [...set.page],
    data: [...set.data],
    actions: [...set.action],
    blockDenies: [...blockDenies],
  };
}

/** Permisos efectivos (rol + overrides), cacheados por usuario. */
export async function getEffectivePermissions(
  user: PermUser | null | undefined,
): Promise<EffectivePermissions> {
  const banned = !!user?.banned;
  if (!user || banned) {
    return { role: user && banned ? resolveRole(user) : DEFAULT_ROLE, pages: [], data: [], actions: [], blockDenies: [] };
  }

  const hit = cache.get(user.id);
  if (hit && hit.exp > Date.now()) return hit.perms;

  const role = resolveRole(user);
  const overrides = await fetchOverrides(user.id);
  const perms = applyOverrides(rolePermissions(role), overrides);

  cache.set(user.id, { perms, exp: Date.now() + OVERRIDE_TTL_MS });
  return perms;
}

/** API pública: ¿el usuario puede acceder al recurso? (rol + overrides) */
export async function can(
  user: PermUser | null | undefined,
  resource: Resource,
): Promise<boolean> {
  if (!user || user.banned) return false;
  return evaluate(await getEffectivePermissions(user), resource);
}
