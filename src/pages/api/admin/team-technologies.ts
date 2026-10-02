import type { APIRoute } from 'astro';
import { getDbClient } from '../../../db/client';

export const prerender = false;

/**
 * Edición/borrado de la matriz de tecnologías (skills) por persona. Plan 016
 * (Phase 2 de la matriz, build plan 015).
 *
 *   POST   body { equipoId, technologyId, level } → upsert de una fila.
 *   DELETE ?equipoId=...&technologyId=...        → borra la fila.
 *
 * Gateado en middleware por `action:tecnologia:manage` (admin-only por default,
 * statement propio, override-able). La ruta ya estaba reservada por el Phase 1
 * (ver el carve-out de `/api/admin/team-technologies` en src/middleware.ts);
 * este endpoint la implementa sin tocar el middleware.
 *
 * Sólo escribe `equipo_technology` (tabla creada en `2026-tecnologias.sql`).
 * NO crea tablas — Phase 2 no requiere migración.
 *
 * Mismo molde que `admin/evaluaciones.ts`: el endpoint CONFÍA en el gate del
 * middleware (no repite `evaluate`); valida entradas y verifica FKs para no
 * tirar errores feos de constraint.
 */

const VALID_LEVELS = ['trainee', 'jr', 'mid', 'sr', 'arq'] as const;
type Level = (typeof VALID_LEVELS)[number];

function jsonError(status: number, message: string, code: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Body inválido (esperado JSON).', 'BAD_BODY');
  }

  const equipoId = typeof body.equipoId === 'string' ? body.equipoId.trim() : '';
  if (!equipoId) return jsonError(400, 'Falta equipoId.', 'BAD_EQUIPO');

  const technologyId = typeof body.technologyId === 'string' ? body.technologyId.trim() : '';
  if (!technologyId) return jsonError(400, 'Falta technologyId.', 'BAD_TECH');

  const level = typeof body.level === 'string' ? body.level.trim() : '';
  if (!VALID_LEVELS.includes(level as Level)) {
    return jsonError(400, `Nivel inválido. Usa: ${VALID_LEVELS.join('|')}.`, 'BAD_LEVEL');
  }

  const now = new Date().toISOString();
  const db = getDbClient();

  // Verificamos FKs antes de insertar — si no existen, el constraint falla feo.
  const equipoExists = await db.execute({
    sql: 'select 1 from equipo where id = ? limit 1',
    args: [equipoId],
  });
  if (equipoExists.rows.length === 0) {
    return jsonError(404, 'equipoId no existe en el registro `equipo`.', 'EQUIPO_NOT_FOUND');
  }

  const techExists = await db.execute({
    sql: 'select 1 from technology where id = ? limit 1',
    args: [technologyId],
  });
  if (techExists.rows.length === 0) {
    return jsonError(404, 'technologyId no existe en el catálogo `technology`.', 'TECH_NOT_FOUND');
  }

  await db.execute({
    sql: `insert into equipo_technology (equipo_id, technology_id, level, updated_at)
          values (?, ?, ?, ?)
          on conflict (equipo_id, technology_id) do update set
            level = excluded.level,
            updated_at = excluded.updated_at`,
    args: [equipoId, technologyId, level, now],
  });

  return new Response(JSON.stringify({ ok: true, equipoId, technologyId, level }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

export const DELETE: APIRoute = async ({ url }) => {
  const equipoId = (url.searchParams.get('equipoId') || '').trim();
  const technologyId = (url.searchParams.get('technologyId') || '').trim();
  if (!equipoId) return jsonError(400, 'Falta equipoId.', 'BAD_EQUIPO');
  if (!technologyId) return jsonError(400, 'Falta technologyId.', 'BAD_TECH');

  const db = getDbClient();
  const res = await db.execute({
    sql: 'delete from equipo_technology where equipo_id = ? and technology_id = ?',
    args: [equipoId, technologyId],
  });
  const deleted = Number((res as { rowsAffected?: number }).rowsAffected ?? 0);

  return new Response(JSON.stringify({ ok: true, deleted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
