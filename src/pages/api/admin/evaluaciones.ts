import type { APIRoute } from 'astro';
import { getDbClient } from '../../../db/client';

export const prerender = false;

/**
 * Edición/borrado cross-persona de evaluaciones (HU NAV-78).
 *
 *   POST   body { equipoId, periodo, 7 dimensiones, notas? } → upsert.
 *   DELETE ?equipoId=...&periodo=... → borra la fila.
 *
 * Gateado en middleware por `action:evaluacion:manage` (admin por default,
 * override-able). Separado de `/api/me/evaluaciones` para mantener el modelo
 * de privacidad limpio: lo que pasa por aquí es admin actuando sobre otra
 * persona, no autoeval.
 */

const PERIODO_RE = /^\d{4}-Q[1-4]$/;
const DIMENSIONS = ['actitud', 'aptitudes', 'comunicacion', 'velocidad', 'analisis', 'calidad', 'autogestion'] as const;

function jsonError(status: number, message: string, code: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateDimension(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  if (raw < 1 || raw > 10) return null;
  return raw;
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

  const periodo = typeof body.periodo === 'string' ? body.periodo : '';
  if (!PERIODO_RE.test(periodo)) {
    return jsonError(400, 'Periodo inválido. Usa formato "YYYY-Qn" (e.g. 2026-Q2).', 'BAD_PERIODO');
  }

  const values: Record<string, number> = {};
  for (const dim of DIMENSIONS) {
    const v = validateDimension(body[dim]);
    if (v == null) return jsonError(400, `Dimensión "${dim}" debe ser entero entre 1 y 10.`, 'BAD_DIMENSION');
    values[dim] = v;
  }

  const notas = typeof body.notas === 'string' ? body.notas.slice(0, 2000) : null;
  const now = new Date().toISOString();
  const db = getDbClient();

  // Verificamos que el equipoId existe — si no, el FK falla con un error feo.
  const exists = await db.execute({
    sql: 'select 1 from equipo where id = ? limit 1',
    args: [equipoId],
  });
  if (exists.rows.length === 0) {
    return jsonError(404, 'equipoId no existe en el registro `equipo`.', 'EQUIPO_NOT_FOUND');
  }

  await db.execute({
    sql: `insert into evaluacion (equipo_id, periodo, actitud, aptitudes, comunicacion, velocidad, analisis, calidad, autogestion, notas, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict (equipo_id, periodo) do update set
            actitud = excluded.actitud,
            aptitudes = excluded.aptitudes,
            comunicacion = excluded.comunicacion,
            velocidad = excluded.velocidad,
            analisis = excluded.analisis,
            calidad = excluded.calidad,
            autogestion = excluded.autogestion,
            notas = excluded.notas,
            updated_at = excluded.updated_at`,
    args: [
      equipoId, periodo,
      values.actitud, values.aptitudes, values.comunicacion,
      values.velocidad, values.analisis, values.calidad, values.autogestion,
      notas, now, now,
    ],
  });

  return new Response(JSON.stringify({ ok: true, equipoId, periodo }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

export const DELETE: APIRoute = async ({ url }) => {
  const equipoId = (url.searchParams.get('equipoId') || '').trim();
  const periodo = url.searchParams.get('periodo') || '';
  if (!equipoId) return jsonError(400, 'Falta equipoId.', 'BAD_EQUIPO');
  if (!PERIODO_RE.test(periodo)) return jsonError(400, 'Periodo inválido.', 'BAD_PERIODO');

  const db = getDbClient();
  const res = await db.execute({
    sql: 'delete from evaluacion where equipo_id = ? and periodo = ?',
    args: [equipoId, periodo],
  });
  const deleted = Number((res as { rowsAffected?: number }).rowsAffected ?? 0);

  return new Response(JSON.stringify({ ok: true, deleted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
