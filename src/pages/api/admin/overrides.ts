import type { APIRoute } from 'astro';
import { getDbClient } from '../../../db/client';
import { can, invalidatePermissions } from '../../../lib/permissions';

export const prerender = false;

const RESOURCE_RE = /^(page|data|action|block):[A-Za-z0-9:_-]{1,80}$/;
const MAX_BODY_BYTES = 4_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Doble verificación (el middleware ya gatea /api/admin/*, esto es defensa). */
async function ensureManager(locals: App.Locals): Promise<boolean> {
  return can(locals.user, 'action:user:manage');
}

// GET /api/admin/overrides?userId=... → overrides de ese usuario
export const GET: APIRoute = async ({ locals, url }) => {
  if (!(await ensureManager(locals))) return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);
  const userId = url.searchParams.get('userId');
  if (!userId) return json({ error: 'userId requerido' }, 400);

  const db = getDbClient();
  const res = await db.execute({
    sql: 'select resource, effect from user_permission_override where userId = ? order by resource',
    args: [userId],
  });
  const overrides = res.rows.map((r) => ({
    resource: r.resource as string,
    effect: r.effect as string,
  }));
  return json({ overrides });
};

// PUT { userId, resource, effect } → upsert un override
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!(await ensureManager(locals))) return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'Body demasiado grande' }, 413);

  let body: { userId?: unknown; resource?: unknown; effect?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const resource = typeof body.resource === 'string' ? body.resource.trim() : '';
  const effect = body.effect;

  if (!userId) return json({ error: 'userId requerido' }, 400);
  if (!RESOURCE_RE.test(resource)) return json({ error: 'resource inválido' }, 400);
  if (effect !== 'allow' && effect !== 'deny') return json({ error: 'effect debe ser allow|deny' }, 400);

  const db = getDbClient();
  await db.execute({
    sql: `insert into user_permission_override (userId, resource, effect, createdAt)
          values (?, ?, ?, ?)
          on conflict(userId, resource) do update set effect = excluded.effect, createdAt = excluded.createdAt`,
    args: [userId, resource, effect, new Date().toISOString()],
  });
  invalidatePermissions(userId);
  return json({ ok: true });
};

// DELETE ?userId=&resource=  → borra un override
// DELETE ?userId=           → borra todos los overrides del usuario
export const DELETE: APIRoute = async ({ locals, url }) => {
  if (!(await ensureManager(locals))) return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);
  const userId = url.searchParams.get('userId');
  const resource = url.searchParams.get('resource');
  if (!userId) return json({ error: 'userId requerido' }, 400);

  const db = getDbClient();
  if (resource) {
    if (!RESOURCE_RE.test(resource)) return json({ error: 'resource inválido' }, 400);
    await db.execute({
      sql: 'delete from user_permission_override where userId = ? and resource = ?',
      args: [userId, resource],
    });
  } else {
    await db.execute({
      sql: 'delete from user_permission_override where userId = ?',
      args: [userId],
    });
  }
  invalidatePermissions(userId);
  return json({ ok: true });
};
