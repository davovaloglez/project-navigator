import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import type { SprintRecord } from '../../utils/dataTransforms';
import { serverErrorResponse } from '../../lib/apiError';
import { parseDate, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';

export const prerender = false;

const cache = createSheetCache<SprintRecord[]>();

function intSafe(value: string): number {
  if (!value) return 0;
  const n = parseInt(value.replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

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
      range: 'sprint!A1:J20',
    });
    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }
    const col = makeColAccessor(rows[0]);

    const data: SprintRecord[] = rows.slice(1).map((row: string[]) => ({
      sprint: col(row, 'sprint'),
      mes: col(row, 'mes'),
      dias: intSafe(col(row, 'dias')),
      inicioEstimado: parseDate(col(row, 'inicio estimado')),
      inicioReal: parseDate(col(row, 'inicio real')),
      finEstimado: parseDate(col(row, 'fin estimado')),
      finReal: parseDate(col(row, 'fin real')),
      desfase: col(row, 'desfase'),
      capacidadHoras: intSafe(col(row, 'capacidad / hrs')),
      puntos: intSafe(col(row, 'pts')),
    })).filter((r) => r.sprint);

    cache.set(data);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return serverErrorResponse(error, 'sprints');
  }
};
