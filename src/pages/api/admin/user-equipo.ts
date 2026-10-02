import type { APIRoute } from 'astro';
import { getDbClient } from '../../../db/client';
import { can } from '../../../lib/permissions';
import { invalidateRequesterScope } from '../../../lib/requesterScope';

export const prerender = false;

const MAX_BODY_BYTES = 2_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** El middleware ya gatea /api/admin/* con action:user:manage; esto es defensa. */
async function ensureManager(locals: App.Locals): Promise<boolean> {
  return can(locals.user, 'action:user:manage');
}

// GET ?userId= → { equipoId, equipoName } del vínculo actual.
export const GET: APIRoute = async ({ locals, url }) => {
  if (!(await ensureManager(locals))) {
    return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);
  }
  const userId = url.searchParams.get('userId');
  if (!userId) return json({ error: 'userId requerido' }, 400);
  const db = getDbClient();
  const res = await db.execute({
    sql: `select u.equipoId as eid, e.full_name as name
          from "user" u left join equipo e on e.id = u.equipoId
          where u.id = ? limit 1`,
    args: [userId],
  });
  if (res.rows.length === 0) return json({ error: 'El usuario no existe.' }, 404);
  const r = res.rows[0];
  return json({ equipoId: r.eid == null ? null : String(r.eid), equipoName: r.name == null ? null : String(r.name) });
};

/**
 * PUT { userId, equipoId } — vincula (o desvincula con equipoId vacío/null)
 * una cuenta de login con una persona del registro `equipo`. Es el puente
 * `user.equipoId` que habilita el scoping por identidad (Fase 5).
 */
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!(await ensureManager(locals))) {
    return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'Body demasiado grande' }, 413);
  let body: { userId?: unknown; equipoId?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const equipoId = typeof body.equipoId === 'string' ? body.equipoId.trim() : '';
  if (!userId) return json({ error: 'userId requerido' }, 400);

  const db = getDbClient();
  const u = await db.execute({ sql: 'select 1 from "user" where id = ? limit 1', args: [userId] });
  if (u.rows.length === 0) return json({ error: 'El usuario no existe.' }, 404);

  if (equipoId) {
    const e = await db.execute({ sql: 'select 1 from equipo where id = ? limit 1', args: [equipoId] });
    if (e.rows.length === 0) return json({ error: 'La persona del equipo no existe.' }, 400);
  }

  await db.execute({
    sql: 'update "user" set equipoId = ? where id = ?',
    args: [equipoId || null, userId],
  });
  // El scoping cachea userId→equipoId 60s: invalidar para efecto inmediato.
  invalidateRequesterScope(userId);

  return json({ ok: true, equipoId: equipoId || null });
};
