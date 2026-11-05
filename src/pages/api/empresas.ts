import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import { serverErrorResponse } from '../../lib/apiError';

export const prerender = false;

export interface EmpresaItem {
  id: string;
  nombre: string;
  moneda: string;
  activa: boolean;
  logo_url: string | null;
}

/**
 * GET /api/empresas
 *
 * Lista de empresas de la organización.
 * Abierto a cualquier usuario autenticado (incluyendo tokens MCP).
 */
export const GET: APIRoute = async () => {
  try {
    const db = getDbClient();
    const res = await db.execute(`
      select id, nombre, moneda, activa, logo_url
      from empresa
      order by nombre asc
    `);

    const empresas: EmpresaItem[] = res.rows.map((r) => ({
      id: String(r.id),
      nombre: String(r.nombre),
      moneda: String(r.moneda ?? 'MXN'),
      activa: Number(r.activa) === 1,
      logo_url: r.logo_url ? String(r.logo_url) : null,
    }));

    return new Response(JSON.stringify({ empresas }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'api/empresas GET');
  }
};

