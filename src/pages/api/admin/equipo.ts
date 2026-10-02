import type { APIRoute } from 'astro';
import { getDbClient } from '../../../db/client';
import { can } from '../../../lib/permissions';
import { invalidateEquipoCache } from '../../../lib/equipoResolver';

export const prerender = false;

const MAX_BODY_BYTES = 4_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Doble verificación (el middleware ya gatea /api/admin/equipo, esto es defensa). */
async function ensureManager(locals: App.Locals): Promise<boolean> {
  return can(locals.user, 'action:equipo:manage');
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** id estable: local-part del email; si no, slug del nombre. Único con sufijo. */
async function deriveId(db: ReturnType<typeof getDbClient>, email: string, fullName: string): Promise<string> {
  const base = (email.split('@')[0] && slugify(email.split('@')[0])) || slugify(fullName) || 'persona';
  let id = base;
  for (let n = 2; ; n++) {
    const hit = await db.execute({ sql: 'select 1 from equipo where id = ? limit 1', args: [id] });
    if (hit.rows.length === 0) return id;
    id = `${base}-${n}`;
  }
}

/** ¿Asignar managerId a targetId crea un ciclo? Recorre la cadena hacia arriba. */
async function wouldCycle(db: ReturnType<typeof getDbClient>, targetId: string, managerId: string): Promise<boolean> {
  const all = await db.execute('select id, manager_id from equipo');
  const parent = new Map<string, string | null>();
  for (const r of all.rows) parent.set(String(r.id), r.manager_id == null ? null : String(r.manager_id));
  let cur: string | null = managerId;
  for (let i = 0; cur && i < 1000; i++) {
    if (cur === targetId) return true;
    cur = parent.get(cur) ?? null;
  }
  return false;
}

async function roleExists(db: ReturnType<typeof getDbClient>, roleId: string): Promise<boolean> {
  const r = await db.execute({ sql: 'select 1 from roles where id = ? limit 1', args: [roleId] });
  return r.rows.length > 0;
}
async function equipoExists(db: ReturnType<typeof getDbClient>, id: string): Promise<boolean> {
  const r = await db.execute({ sql: 'select 1 from equipo where id = ? limit 1', args: [id] });
  return r.rows.length > 0;
}

interface Body {
  id?: unknown; full_name?: unknown; nickname?: unknown; email?: unknown;
  title?: unknown; role_id?: unknown; department?: unknown;
  manager_id?: unknown; active?: unknown;
}
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

async function parseBody(request: Request): Promise<Body | Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'Body demasiado grande' }, 413);
  try {
    return JSON.parse(raw) as Body;
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
}

// POST → crear un miembro del registro
export const POST: APIRoute = async ({ locals, request }) => {
  if (!(await ensureManager(locals))) return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);
  const parsed = await parseBody(request);
  if (parsed instanceof Response) return parsed;

  const fullName = str(parsed.full_name);
  if (!fullName) return json({ error: 'El nombre completo es obligatorio.' }, 400);

  const email = str(parsed.email).toLowerCase();
  const roleId = str(parsed.role_id);
  const managerId = str(parsed.manager_id);
  const db = getDbClient();

  if (roleId && !(await roleExists(db, roleId))) return json({ error: `Banda/puesto inválido: "${roleId}"` }, 400);
  if (managerId && !(await equipoExists(db, managerId))) return json({ error: 'El jefe seleccionado no existe en el registro.' }, 400);

  const id = await deriveId(db, email, fullName);
  await db.execute({
    sql: `insert into equipo (id, full_name, nickname, role_id, title, department, manager_id, email, active)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, fullName, str(parsed.nickname) || null, roleId || null,
      str(parsed.title) || null, str(parsed.department) || null,
      managerId || null, email || null,
      parsed.active === false ? 0 : 1,
    ],
  });
  invalidateEquipoCache();
  return json({ ok: true, id });
};

// PUT → editar un miembro existente
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!(await ensureManager(locals))) return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);
  const parsed = await parseBody(request);
  if (parsed instanceof Response) return parsed;

  const id = str(parsed.id);
  if (!id) return json({ error: 'id requerido' }, 400);
  const fullName = str(parsed.full_name);
  if (!fullName) return json({ error: 'El nombre completo es obligatorio.' }, 400);

  const db = getDbClient();
  if (!(await equipoExists(db, id))) return json({ error: 'La persona no existe en el registro.' }, 404);

  const email = str(parsed.email).toLowerCase();
  const roleId = str(parsed.role_id);
  const managerId = str(parsed.manager_id);

  if (roleId && !(await roleExists(db, roleId))) return json({ error: `Banda/puesto inválido: "${roleId}"` }, 400);
  if (managerId) {
    if (managerId === id) return json({ error: 'Una persona no puede ser su propio jefe.' }, 400);
    if (!(await equipoExists(db, managerId))) return json({ error: 'El jefe seleccionado no existe en el registro.' }, 400);
    if (await wouldCycle(db, id, managerId)) return json({ error: 'Esa asignación de jefe crearía un ciclo en la jerarquía.' }, 400);
  }

  await db.execute({
    sql: `update equipo set full_name = ?, nickname = ?, role_id = ?, title = ?,
            department = ?, manager_id = ?, email = ?, active = ? where id = ?`,
    args: [
      fullName, str(parsed.nickname) || null, roleId || null,
      str(parsed.title) || null, str(parsed.department) || null,
      managerId || null, email || null,
      parsed.active === false ? 0 : 1, id,
    ],
  });
  invalidateEquipoCache();
  return json({ ok: true });
};
