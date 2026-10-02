import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import { serverErrorResponse } from '../../lib/apiError';
import type { Technology } from '../../utils/dataTransforms';

export const prerender = false;

/**
 * Catálogo de tecnologías (tabla Turso `technology`). Role-open a cualquier
 * autenticado (igual que /api/equipo). El middleware gatea el endpoint bajo
 * `page:equipo` (ver API_PAGE_GATES en src/middleware.ts).
 *
 * Sin cache: catálogo pequeño (~49 filas) y raramente modificado; la
 * consistencia inmediata es preferible al ahorro de una sola query.
 *
 * Respuesta: { technologies: Technology[] } ordenadas por category, name.
 */
export const GET: APIRoute = async () => {
  try {
    const db = getDbClient();
    const res = await db.execute(
      `select id, name, category, active
       from technology
       where active = 1
       order by category, name`,
    );
    const technologies: Technology[] = res.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      category: String(r.category),
      active: Number(r.active) === 1,
    }));
    return new Response(JSON.stringify({ technologies }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'technologies');
  }
};
