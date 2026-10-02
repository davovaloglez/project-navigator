import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import type { TareaRecord } from '../../utils/dataTransforms';
import { getEquipoResolver, equipoEpoch } from '../../lib/equipoResolver';
import { getRequesterScope, taskVisible } from '../../lib/requesterScope';
import { serverErrorResponse } from '../../lib/apiError';
import { parseDate, parseProgress, cleanId, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';

const cache = createSheetCache<TareaRecord[]>({ withEpoch: equipoEpoch });

function parseIntSafe(value: string): number {
  if (!value) return 0;
  const n = parseInt(value.replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

/** Id sintético estable: hash de campos identitarios + sufijo anti-colisión.
 *  La hoja `actividades` no trae un id propio; este se mantiene estable mientras
 *  esos campos no cambien. */
function makeTareaId(t: TareaRecord, seen: Map<string, number>): string {
  const key = [t.proyectoId, t.folio, t.nombre, t.asignado, t.sprint].join('|');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const base = Math.abs(h).toString(36);
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

export const GET: APIRoute = async ({ locals }) => {
  // Scoping fila-a-fila (Fase 5): cache RAW compartido, filtro por request.
  const scope = await getRequesterScope(locals.user);
  const scoped = (data: TareaRecord[]) =>
    new Response(JSON.stringify(data.filter((t) => taskVisible(t, scope))), {
      headers: { 'Content-Type': 'application/json' },
    });

  const cached = cache.get();
  if (cached) {
    return scoped(cached);
  }

  try {
    const sheets = getSheets();
    const sheetId = getSheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'actividades!A1:AD500',
    });
    const rows = (res.data.values || []) as string[][];
    if (rows.length < 2) {
      cache.set([]);
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }

    const col = makeColAccessor(rows[0]);

    const data: TareaRecord[] = [];
    for (const row of rows.slice(1)) {
      const nombre = col(row, 'actividad');
      if (!nombre) continue; // fila vacía
      data.push({
        id: '', // se asigna abajo con makeTareaId
        proyectoId: cleanId(col(row, 'proyectoid')),
        proyecto: col(row, 'proyecto'),
        producto: col(row, 'producto'),
        sprint: col(row, 'sprint'),
        folio: cleanId(col(row, 'folio')),
        url: cleanId(col(row, 'url')),
        nombre,
        asignado: col(row, 'asignado'),
        estatus: col(row, 'estatus'),
        salud: cleanId(col(row, 'salud')),
        fase: col(row, 'fase'),
        tipo: col(row, 'tipo'),
        prioridad: col(row, 'prioridad'),
        dificultad: cleanId(col(row, 'dificultad')),
        epica: col(row, 'épica'),
        hito: cleanId(col(row, 'hito')),
        hitoId: cleanId(col(row, 'hitoid')),
        cuenta: cleanId(col(row, 'cuenta')),
        puntos: parseIntSafe(col(row, 'puntos')),
        tracked: parseIntSafe(col(row, 'traking')),
        avance: parseProgress(col(row, 'avance')),
        registro: parseDate(col(row, 'registro'), { rawOnFail: true }),
        inicioEstimado: parseDate(col(row, 'inicio estimado'), { rawOnFail: true }),
        inicio: parseDate(col(row, 'fecha inicio'), { rawOnFail: true }),
        finEstimado: parseDate(col(row, 'fin estimado'), { rawOnFail: true }),
        finReal: parseDate(cleanId(col(row, 'fin real')), { rawOnFail: true }),
        rol: col(row, 'rol'),
        // La hoja ya trae el id en `AsignadoId` (passthrough); el GET completa
        // los vacíos con el resolver por nombre como red de seguridad.
        asignadoId: cleanId(col(row, 'asignadoid')) || undefined,
      });
    }

    const seenIds = new Map<string, number>();
    for (const t of data) t.id = makeTareaId(t, seenIds);

    const resolver = await getEquipoResolver();
    for (const t of data) {
      if (!t.asignadoId) t.asignadoId = resolver.resolve(t.asignado) ?? '';
    }

    cache.set(data);
    return scoped(data);
  } catch (error) {
    return serverErrorResponse(error, 'tareas');
  }
};
