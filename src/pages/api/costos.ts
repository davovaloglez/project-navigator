import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import { serverErrorResponse } from '../../lib/apiError';
import { parseNumber, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';

const cache = createSheetCache<unknown[]>();

export const GET: APIRoute = async () => {
  const cached = cache.get();
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const sheets = getSheets();
    const sheetId = getSheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Costos!A1:G50',
    });

    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }

    const col = makeColAccessor(rows[0]);

    const data = rows.slice(1).map((row: string[]) => ({
      rol: col(row, 'rol'),
      recursos: parseInt(col(row, 'recursos') || '0') || 0,
      horasRecurso: parseNumber(col(row, 'horas/recurso')),
      costoMensual: parseNumber(col(row, 'costo/mensual')),
      costoHora: parseNumber(col(row, 'costo/hora')),
      horas: parseNumber(col(row, 'horas')),
      total: parseNumber(col(row, 'total')),
    })).filter((r) => r.rol);

    cache.set(data);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'costos');
  }
};
