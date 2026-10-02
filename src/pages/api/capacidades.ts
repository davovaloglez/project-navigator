import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import type { CapacidadRecord } from '../../utils/dataTransforms';
import { getEquipoResolver, equipoEpoch } from '../../lib/equipoResolver';
import { serverErrorResponse } from '../../lib/apiError';
import { cleanId, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';
import { getRequesterScope, capacidadVisible } from '../../lib/requesterScope';

export const prerender = false;

const cache = createSheetCache<CapacidadRecord[]>({ withEpoch: equipoEpoch });

function numSafe(value: string): number {
  if (!value) return 0;
  const n = parseFloat(value.replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

export const GET: APIRoute = async ({ locals }) => {
  const scope = await getRequesterScope(locals.user);
  const scoped = (data: CapacidadRecord[]) =>
    new Response(JSON.stringify(data.filter((row) => capacidadVisible(row, scope))), {
      headers: { 'Content-Type': 'application/json' },
    });
  const cached = cache.get();
  if (cached) return scoped(cached);
  try {
    const sheets = getSheets();
    const sheetId = getSheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'capacidades!A1:F60',
    });
    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return scoped([]);
    }
    const col = makeColAccessor(rows[0]);

    const resolver = await getEquipoResolver();
    const data: CapacidadRecord[] = rows.slice(1).map((row: string[]) => {
      const nombre = col(row, 'nombre');
      // `user_id` (local-part) es passthrough; resolver por nombre como respaldo.
      const equipoId = cleanId(col(row, 'user_id')) || (resolver.resolve(nombre) ?? '');
      return {
        equipoId,
        teamNum: col(row, 'id_team'),
        nombre,
        sprint: col(row, 'id_sprint'),
        vacaciones: numSafe(col(row, 'vacaciones')),
        capacidad: numSafe(col(row, 'capacidad')),
      };
    }).filter((r) => r.nombre || r.equipoId);

    cache.set(data);
    return scoped(data);
  } catch (error) {
    return serverErrorResponse(error, 'capacidades');
  }
};
