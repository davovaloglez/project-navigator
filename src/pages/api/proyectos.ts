import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import { getEquipoResolver, equipoEpoch } from '../../lib/equipoResolver';
import { getRequesterScope, projectVisible } from '../../lib/requesterScope';
import type { ProjectRecord } from '../../utils/dataTransforms';
import { serverErrorResponse } from '../../lib/apiError';
import { parseDate, parseProgress, cleanId, splitIds, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';

const cache = createSheetCache<ProjectRecord[]>({ withEpoch: equipoEpoch });

export const GET: APIRoute = async ({ locals }) => {
  // Scoping fila-a-fila por identidad (Fase 5). Se cachea el dataset RAW
  // (compartido) y se filtra por request según el rol+equipoId del solicitante.
  const scope = await getRequesterScope(locals.user);
  const scoped = (data: ProjectRecord[]) =>
    new Response(JSON.stringify(data.filter((p) => projectVisible(p, scope))), {
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
      range: 'proyectos!A1:AJ300',
    });

    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }

    const col = makeColAccessor(rows[0]);

    const resolver = await getEquipoResolver();
    const splitNames = (v: string) => (v || '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-');
    // Todos los roles son MULTI-persona. Confía en la columna `*_ID`
    // (csv-paralela a los nombres); resolver por nombre como red de seguridad
    // cuando viene vacía (p.ej. arquitecto múltiple "Luis, George" → #N/A).
    const roleIds = (nameRaw: string, idRaw: string): string[] => {
      const ids = splitIds(idRaw);
      if (ids.length) return ids;
      return [...new Set(splitNames(nameRaw).map((n) => resolver.resolve(n)).filter((x): x is string => !!x))];
    };
    const parsed = rows.slice(1).map((row: string[]): ProjectRecord => {
      const arquitecto = col(row, 'arquitecto');
      const pm = col(row, 'pm');
      const po = col(row, 'po');
      const sqa = col(row, 'sqa');
      const devs = splitNames(col(row, 'devs'));
      const devIds = roleIds(col(row, 'devs'), col(row, 'devs_id'));
      const arquitectoIds = roleIds(arquitecto, col(row, 'arquitecto_id'));
      const pmIds = roleIds(pm, col(row, 'pm_id'));
      const poIds = roleIds(po, col(row, 'po_id'));
      const sqaIds = roleIds(sqa, col(row, 'sqa_id'));
      const producto = col(row, 'producto');
      const cuatrimestre = col(row, 'cuatrimestre');
      return {
        id: cleanId(col(row, 'id')),
        folio: col(row, 'folio'),
        actividad: col(row, 'nombre'),
        finEstimado: parseDate(col(row, 'fin estimado')),
        arquitecto,
        salud: col(row, 'salud'),
        requiereDe: col(row, 'requiere de'),
        accionRequerida: col(row, 'accion requerida'),
        fechaAccion: parseDate(col(row, 'fecha de accion')),
        cliente: producto, // compat
        progreso: parseProgress(col(row, 'progreso')),
        tipo: col(row, 'tipo'),
        prioridad: col(row, 'prioridad'),
        epica: col(row, 'épica (producto)'),
        hito: cuatrimestre, // puente: la hoja no tiene hito a nivel proyecto
        cuatrimestre,
        cuenta: '',
        puntos: parseInt(col(row, 'puntos') || '0') || 0,
        registro: parseDate(col(row, 'registro')),
        inicioEstimado: parseDate(col(row, 'inicio estimado')),
        fechaInicio: parseDate(col(row, 'fecha inicio')),
        finReal: parseDate(col(row, 'fin real')),
        pm,
        devs,
        estatus: col(row, 'estatus'),
        url: col(row, 'url'),
        producto,
        servicio: col(row, 'servicio'),
        aliado: col(row, 'aliado'),
        sprint: col(row, 'sprint'),
        po,
        sqa,
        pmIds,
        arquitectoIds,
        devIds,
        poIds,
        sqaIds,
        requiereIds: splitIds(col(row, 'requiere_id')),
      };
    }).filter((r) => r.id);

    // Dedup por `id` (identidad única). PROJECT-15 trae dos filas con id=4
    // (fases del mismo proyecto) → gana la de `registro` más reciente.
    const byId = new Map<string, ProjectRecord>();
    for (const r of parsed) {
      const prev = byId.get(r.id);
      if (!prev || r.registro >= prev.registro) byId.set(r.id, r);
    }
    const data = [...byId.values()];

    cache.set(data);
    return scoped(data);
  } catch (error) {
    return serverErrorResponse(error, 'proyectos');
  }
};
