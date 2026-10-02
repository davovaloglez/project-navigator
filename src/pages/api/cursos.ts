import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import { getEquipoResolver, equipoEpoch } from '../../lib/equipoResolver';
import { serverErrorResponse } from '../../lib/apiError';
import { cleanId, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';
import { getRequesterScope, cursoVisible } from '../../lib/requesterScope';

const cache = createSheetCache<unknown[]>({ withEpoch: equipoEpoch });

export const GET: APIRoute = async ({ locals }) => {
  const scope = await getRequesterScope(locals.user);
  const scoped = (data: unknown[]) =>
    new Response(JSON.stringify(data.filter((row) => cursoVisible(row as { equipoId?: string }, scope))), {
      headers: { 'Content-Type': 'application/json' },
    });
  const cached = cache.get();
  if (cached) return scoped(cached);

  try {
    const sheets = getSheets();
    const sheetId = getSheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'cursos!A1:J50',
    });

    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return scoped([]);
    }

    const col = makeColAccessor(rows[0]);

    const resolver = await getEquipoResolver();
    const data = rows.slice(1).map((row: string[]) => {
      const colaborador = col(row, 'nombre');
      const jefeDirecto = col(row, 'jefe');
      // La hoja ya unifica identidad: confía en `id`/`id_jefe` (local-part); el
      // resolver por nombre queda como red de seguridad si vienen vacías.
      const equipoId = cleanId(col(row, 'id')) || (resolver.resolve(colaborador) ?? '');
      const jefeId = cleanId(col(row, 'id_jefe')) || (resolver.resolve(jefeDirecto) ?? '');
      return {
        colaborador,
        emailColaborador: col(row, 'email'),
        ou: col(row, 'departamento'),
        rol: col(row, 'rol'),
        jefeDirecto,
        emailJefe: col(row, 'email_jefe'),
        pidsCreados: 0, // la hoja nueva ya no trae "PIDs creados"
        progreso: parseInt(col(row, 'progreso') || '0') || 0,
        equipoId,
        jefeId,
      };
    }).filter((r) => r.colaborador);

    cache.set(data);
    return scoped(data);
  } catch (error) {
    return serverErrorResponse(error, 'cursos');
  }
};
