import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import { serverErrorResponse } from '../../lib/apiError';

export const prerender = false;

/**
 * Lectura cross-persona de evaluaciones (vista de comparativa, NAV-78).
 * Gateado en middleware por `action:evaluacion:view-all` — sólo `admin`
 * por default, override-able. Lectura individual del usuario logueado va
 * por `/api/me/evaluaciones`.
 *
 *   GET → todas las filas de `evaluacion`, agrupables por persona y periodo
 *         en cliente.
 */

export interface EvaluacionRow {
  id: number;
  equipoId: string;
  periodo: string;
  actitud: number;
  aptitudes: number;
  comunicacion: number;
  velocidad: number;
  analisis: number;
  calidad: number;
  autogestion: number;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export const GET: APIRoute = async () => {
  try {
    const db = getDbClient();
    const res = await db.execute(
      'select id, equipo_id, periodo, actitud, aptitudes, comunicacion, velocidad, analisis, calidad, autogestion, notas, created_at, updated_at from evaluacion order by periodo desc, equipo_id asc',
    );
    const evaluaciones: EvaluacionRow[] = res.rows.map((r) => ({
      id: Number(r.id),
      equipoId: String(r.equipo_id),
      periodo: String(r.periodo),
      actitud: Number(r.actitud),
      aptitudes: Number(r.aptitudes),
      comunicacion: Number(r.comunicacion),
      velocidad: Number(r.velocidad),
      analisis: Number(r.analisis),
      calidad: Number(r.calidad),
      autogestion: Number(r.autogestion),
      notas: r.notas == null ? null : String(r.notas),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

    return new Response(JSON.stringify({ evaluaciones }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'evaluaciones');
  }
};
