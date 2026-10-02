import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import type { RepoRecord } from '../../utils/dataTransforms';
import { serverErrorResponse } from '../../lib/apiError';
import { makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';

export const prerender = false;

/**
 * Repositorios (hoja `repositorios`) con roles de acceso GitHub por persona.
 * Role-open a cualquier usuario autenticado (como /api/proyectos). Cache 5 min.
 * Los campos de rol (administrador/arquitecto/colaborador/visualizador/deploy)
 * traen nombres display concatenados; el matching por persona se hace en cliente.
 */
const cache = createSheetCache<RepoRecord[]>();

export const GET: APIRoute = async () => {
  const cached = cache.get();
  if (cached) {
    return new Response(JSON.stringify(cached), { headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const sheets = getSheets();
    const sheetId = getSheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'repositorios!A1:K60',
    });
    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }
    const col = makeColAccessor(rows[0]);

    const data: RepoRecord[] = rows.slice(1).map((row: string[]) => ({
      nombre: col(row, 'nombre común'),
      ambientes: col(row, 'ambientes'),
      estatus: col(row, 'estatus'),
      dpto: col(row, 'dpto'),
      producto: col(row, 'producto'),
      github: col(row, 'github repositorio'),
      administrador: col(row, 'administrador'),
      arquitecto: col(row, 'arquitecto'),
      colaborador: col(row, 'colaborador'),
      visualizador: col(row, 'visualizador'),
      deploy: col(row, 'deploy'),
    })).filter((r) => r.nombre);

    cache.set(data);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return serverErrorResponse(error, 'repositorios');
  }
};
