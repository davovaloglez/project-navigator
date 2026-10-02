import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import { serverErrorResponse } from '../../lib/apiError';
import type { TeamTechnology } from '../../utils/dataTransforms';

export const prerender = false;

/**
 * Matriz persona × tecnología (tabla Turso `equipo_technology`). Role-open a
 * cualquier autenticado (igual que /api/equipo). El middleware gatea el
 * endpoint bajo `page:equipo` (ver API_PAGE_GATES en src/middleware.ts).
 *
 * Sin row-scoping: la matriz de skills NO es dato personal sensible cruzado
 * (a diferencia de /api/costos); decision #5 del plan 015: readable by everyone.
 *
 * Filtros opcionales:
 *   ?technology=<id>  — sólo filas de esa tecnología
 *   ?level=<level>    — sólo filas con ese nivel
 *   ?equipo=<id>      — sólo filas de esa persona
 *
 * Respuesta: { rows: TeamTechnology[] }
 */
export const GET: APIRoute = async (context) => {
  try {
    const url = new URL(context.request.url);
    const technologyFilter = url.searchParams.get('technology') ?? '';
    const levelFilter = url.searchParams.get('level') ?? '';
    const equipoFilter = url.searchParams.get('equipo') ?? '';

    let query = `
      select equipo_id, technology_id, level, updated_at
      from equipo_technology
      where 1=1
    `;
    const args: string[] = [];

    if (technologyFilter) {
      query += ` and technology_id = ?`;
      args.push(technologyFilter);
    }
    if (levelFilter) {
      query += ` and level = ?`;
      args.push(levelFilter);
    }
    if (equipoFilter) {
      query += ` and equipo_id = ?`;
      args.push(equipoFilter);
    }
    query += ` order by equipo_id, technology_id`;

    const db = getDbClient();
    const res = await db.execute({ sql: query, args });
    const rows: TeamTechnology[] = res.rows.map((r) => ({
      equipoId: String(r.equipo_id),
      technologyId: String(r.technology_id),
      level: String(r.level) as TeamTechnology['level'],
      updatedAt: String(r.updated_at),
    }));

    return new Response(JSON.stringify({ rows }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'team-technologies');
  }
};
