import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import type { HitoRecord } from '../../utils/dataTransforms';
import { serverErrorResponse } from '../../lib/apiError';
import { parseDate, parseProgress, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';

export const prerender = false;

/**
 * Hitos (fases con fechas/estatus propios) por proyecto. Hoja `hitos`.
 * Role-open a cualquier usuario autenticado (igual que /api/proyectos). Cache 5 min.
 * Liga con proyectos vía `id_proyecto → ProjectRecord.id` y con actividades vía
 * `HitoRecord.id ← TareaRecord.hitoId`.
 */
const cache = createSheetCache<HitoRecord[]>();

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
      range: 'hitos!A1:I500',
    });
    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }
    const col = makeColAccessor(rows[0]);

    const data: HitoRecord[] = rows.slice(1).map((row: string[]) => ({
      id: col(row, 'id_hito'),
      proyectoId: col(row, 'id_proyecto'),
      nombre: col(row, 'hito_nombre'),
      cliente: col(row, 'cliente'),
      prioridad: col(row, 'prioridad'),
      inicio: parseDate(col(row, 'inicio')),
      fin: parseDate(col(row, 'fin')),
      estatus: col(row, 'estatus'),
      avance: parseProgress(col(row, 'avance')),
    })).filter((h) => h.id || h.nombre);

    cache.set(data);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return serverErrorResponse(error, 'hitos');
  }
};
