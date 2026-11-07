import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import { getEquipoResolver, equipoEpoch } from '../../lib/equipoResolver';
import { getRequesterScope, projectVisible } from '../../lib/requesterScope';
import type { ProjectRecord } from '../../utils/dataTransforms';
import { serverErrorResponse } from '../../lib/apiError';
import { parseDate, parseProgress, cleanId, splitIds, makeColAccessor } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';
import { getDbClient } from '../../db/client';
import { can } from '../../lib/permissions';

export const prerender = false;

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

/**
 * Genera un nuevo ID numérico o identificador único para el proyecto
 */
async function generateNextProjectId(db: ReturnType<typeof getDbClient>): Promise<string> {
  const res = await db.execute('select id from proyecto');
  let maxId = 100;
  for (const row of res.rows) {
    const n = parseInt(String(row.id), 10);
    if (!isNaN(n) && n > maxId) maxId = n;
  }
  return String(maxId + 1);
}

/**
 * Formatea fecha ISO (YYYY-MM-DD) a DD/MM/YYYY para Sheets
 */
function toSheetDate(iso: string): string {
  if (!iso || !iso.includes('-')) return iso || '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * POST /api/proyectos
 *
 * Registra un nuevo proyecto en Turso (BBDD principal) y replica la fila
 * en Google Sheets en segundo plano.
 * Requiere permisos: admin, superadmin o pm (action:proyecto:create).
 */
export const POST: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const allowed = await can(user, 'action:proyecto:create');
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Permisos insuficientes para crear proyectos', code: 'FORBIDDEN' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json().catch(() => ({}));
    const {
      actividad,
      empresaId,
      folio: customFolio,
      fechaInicio,
      finEstimado,
      estatus = 'Activo',
      prioridad = 'Media',
      salud = 'Verde',
      puntos = 0,
      tipo = '',
      epica = '',
      cuatrimestre = '',
      url = '',
      producto = '',
      servicio = '',
      aliado = 'Ninguno',
      sprint = '',
      pmIds = [],
      arquitectoIds = [],
      poIds = [],
      sqaIds = [],
      devIds = [],
      requiereDe = '',
      accionRequerida = '',
      fechaAccion = '',
    } = body;

    if (!actividad || !actividad.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre o actividad del proyecto es obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDbClient();
    const finalEmpresaId = (empresaId && String(empresaId).trim()) || 'vortex-it';

    // Generar consecutivo para folio si no se especificó
    let finalFolio = (customFolio && String(customFolio).trim()) || '';
    if (!finalFolio) {
      const prefix = finalEmpresaId === 'bit-technologies' ? 'BIT' : 'VOR';
      const year = new Date().getFullYear();
      const countRes = await db.execute({
        sql: 'select count(*) as count from proyecto where empresa_id = ?',
        args: [finalEmpresaId],
      });
      const nextNum = (Number(countRes.rows[0]?.count ?? 0) + 1).toString().padStart(3, '0');
      finalFolio = `${prefix}-${year}-${nextNum}`;
    }

    const projectId = await generateNextProjectId(db);
    const today = new Date().toISOString().split('T')[0];

    // Inserción en tabla `proyecto`
    await db.execute({
      sql: `
        insert into proyecto (
          id, folio, empresa_id, actividad, salud, accion_requerida, fecha_accion,
          progreso, tipo, prioridad, epica, hito, cuenta, puntos, estatus,
          fecha_registro, fecha_inicio, fin_estimado, url,
          producto, servicio, aliado, sprint,
          created_at, updated_at
        ) values (
          ?, ?, ?, ?, ?, ?, ?,
          0, ?, ?, ?, ?, '', ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          datetime('now'), datetime('now')
        )
      `,
      args: [
        projectId,
        finalFolio,
        finalEmpresaId,
        actividad.trim(),
        salud || 'Estable',
        accionRequerida || null,
        fechaAccion || null,
        tipo || null,
        prioridad || 'Mayor',
        epica || null,
        cuatrimestre || null,
        Number(puntos) || 0,
        estatus || 'On Track',
        today,
        fechaInicio || today,
        finEstimado || null,
        url || null,
        producto || null,
        servicio || null,
        aliado || 'Ninguno',
        sprint || null,
      ],
    });

    // Asignar miembros en `proyecto_miembro`
    const memberAssignments: Array<{ memberId: string; role: string }> = [
      ...((pmIds as string[]) || []).map((id) => ({ memberId: id, role: 'pm' })),
      ...((arquitectoIds as string[]) || []).map((id) => ({ memberId: id, role: 'arquitecto' })),
      ...((poIds as string[]) || []).map((id) => ({ memberId: id, role: 'po' })),
      ...((sqaIds as string[]) || []).map((id) => ({ memberId: id, role: 'sqa' })),
      ...((devIds as string[]) || []).map((id) => ({ memberId: id, role: 'dev' })),
    ];

    for (const assignment of memberAssignments) {
      if (!assignment.memberId) continue;
      // Aseguramos que el id de miembro exista o se registre en empresa_miembro
      await db.execute({
        sql: `
          insert or ignore into empresa_miembro (id, empresa_id, full_name, nickname, activo)
          values (?, ?, ?, ?, 1)
        `,
        args: [assignment.memberId, finalEmpresaId, assignment.memberId, assignment.memberId],
      });

      const pmId = `${projectId}-${assignment.memberId}-${assignment.role}`;
      await db.execute({
        sql: `
          insert or replace into proyecto_miembro (id, proyecto_id, miembro_id, rol_proyecto, dedicacion_pct, activo)
          values (?, ?, ?, ?, 100, 1)
        `,
        args: [pmId, projectId, assignment.memberId, assignment.role],
      });
    }

    // Invalida cache en memoria
    cache.invalidate();

    // Sincronización asíncrona hacia Google Sheets (sin bloquear respuesta crítica)
    (async () => {
      try {
        const sheets = getSheets();
        const sheetId = getSheetId();
        if (!sheetId) return;

        // Recuperar nombres display para las columnas de Sheets
        const equipoRes = await db.execute('select id, nickname, full_name from equipo');
        const nameMap = new Map<string, string>();
        for (const row of equipoRes.rows) {
          nameMap.set(String(row.id), String(row.nickname || row.full_name || row.id));
        }

        const resolveDisplayNames = (ids: string[]) =>
          ids.map((id) => nameMap.get(id) || id).join(', ');

        const pmStr = resolveDisplayNames(pmIds);
        const arqStr = resolveDisplayNames(arquitectoIds);
        const poStr = resolveDisplayNames(poIds);
        const sqaStr = resolveDisplayNames(sqaIds);
        const devsStr = resolveDisplayNames(devIds);

        // Header mapping en Sheet:
        // id | Folio | Nombre | Fin Estimado | Arquitecto | Salud | Requiere de | Accion Requerida |
        // Fecha de Accion | Producto | Progreso | Tipo | Prioridad | Épica (Producto) | Cuatrimestre |
        // Puntos | Registro | Fecha Inicio | Fin Real | PM | Devs | Estatus | URL | Servicio | Aliado |
        // Sprint | PO | SQA | Arquitecto_ID | PM_ID | DEVs_ID | PO_ID | SQA_ID | Requiere_ID
        const newRow = [
          projectId,                               // id
          finalFolio,                              // Folio
          actividad.trim(),                        // Nombre
          toSheetDate(finEstimado),                // Fin Estimado
          arqStr,                                  // Arquitecto
          salud || 'Estable',                      // Salud
          requiereDe || '',                        // Requiere de
          accionRequerida || '',                   // Accion Requerida
          toSheetDate(fechaAccion),                // Fecha de Accion
          producto || '',                          // Producto
          '0%',                                    // Progreso
          tipo || '',                              // Tipo
          prioridad || 'Mayor',                    // Prioridad
          epica || '',                             // Épica (Producto)
          cuatrimestre || '',                      // Cuatrimestre
          String(puntos || 0),                     // Puntos
          toSheetDate(today),                      // Registro
          toSheetDate(fechaInicio || today),       // Fecha Inicio
          '',                                      // Fin Real
          pmStr,                                   // PM
          devsStr,                                 // Devs
          estatus || 'On Track',                   // Estatus
          url || '',                               // URL
          servicio || '',                          // Servicio
          aliado || 'Ninguno',                     // Aliado
          sprint || '',                            // Sprint
          poStr,                                   // PO
          sqaStr,                                  // SQA
          arquitectoIds.join(', '),                // Arquitecto_ID
          pmIds.join(', '),                        // PM_ID
          devIds.join(', '),                       // DEVs_ID
          poIds.join(', '),                        // PO_ID
          sqaIds.join(', '),                       // SQA_ID
          '',                                      // Requiere_ID
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: 'proyectos!A1',
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [newRow],
          },
        });
      } catch (err) {
        console.error('Error sincronizando proyecto nuevo con Google Sheets:', err);
      }
    })();

    return new Response(
      JSON.stringify({
        ok: true,
        id: projectId,
        folio: finalFolio,
        actividad: actividad.trim(),
        message: 'Proyecto registrado exitosamente.',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return serverErrorResponse(error, 'proyectos POST');
  }
};

/**
 * PUT /api/proyectos
 *
 * Actualiza todos los campos de un proyecto en Turso (BBDD principal)
 * y sincroniza la fila correspondiente en Google Sheets.
 * Requiere permisos: admin, superadmin o pm (action:proyecto:update).
 */
export const PUT: APIRoute = async (context) => {
  try {
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const allowed = await can(user, 'action:proyecto:update');
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Permisos insuficientes para editar proyectos', code: 'FORBIDDEN' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await context.request.json().catch(() => ({}));
    const {
      id,
      actividad,
      empresaId,
      folio,
      fechaInicio,
      finEstimado,
      finReal,
      estatus = 'Activo',
      prioridad = 'Media',
      salud = 'Verde',
      progreso,
      puntos = 0,
      tipo = '',
      epica = '',
      cuatrimestre = '',
      url = '',
      producto = '',
      servicio = '',
      aliado = 'Ninguno',
      sprint = '',
      pmIds = [],
      arquitectoIds = [],
      poIds = [],
      sqaIds = [],
      devIds = [],
      requiereDe = '',
      accionRequerida = '',
      fechaAccion = '',
    } = body;

    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'El ID del proyecto es obligatorio para editarlo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!actividad || !actividad.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre o actividad del proyecto es obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDbClient();
    const finalEmpresaId = (empresaId && String(empresaId).trim()) || 'vortex-it';
    const numProgreso = typeof progreso === 'number' ? progreso : parseFloat(String(progreso || '0')) || 0;

    // Normalizar progreso: el form envía 0..100, la BBDD guarda 0..1.
    // Caso borde: si el usuario ingresa exactamente 1 lo tratamos como 1%.
    const normalizedProgreso = numProgreso > 1 ? numProgreso / 100 : numProgreso / 100;

    // Actualizar en base de datos `proyecto`
    await db.execute({
      sql: `
        update proyecto set
          folio = coalesce(nullif(?, ''), folio),
          empresa_id = ?,
          actividad = ?,
          salud = ?,
          accion_requerida = ?,
          fecha_accion = ?,
          progreso = ?,
          tipo = ?,
          prioridad = ?,
          epica = ?,
          hito = ?,
          puntos = ?,
          estatus = ?,
          fecha_inicio = ?,
          fin_estimado = ?,
          fin_real = ?,
          url = ?,
          producto = ?,
          servicio = ?,
          aliado = ?,
          sprint = ?,
          updated_at = datetime('now')
        where id = ?
      `,
      args: [
        folio ? String(folio).trim() : null,
        finalEmpresaId,
        actividad.trim(),
        salud || 'Estable',
        accionRequerida || null,
        fechaAccion || null,
        normalizedProgreso,
        tipo || null,
        prioridad || 'Mayor',
        epica || null,
        cuatrimestre || null,
        Number(puntos) || 0,
        estatus || 'On Track',
        fechaInicio || null,
        finEstimado || null,
        finReal || null,
        url || null,
        producto || null,
        servicio || null,
        aliado || 'Ninguno',
        sprint || null,
        id,
      ],
    });

    // Actualizar miembros en `proyecto_miembro` (limpiar y reinsertar)
    await db.execute({
      sql: 'delete from proyecto_miembro where proyecto_id = ?',
      args: [id],
    });

    const memberAssignments: Array<{ memberId: string; role: string }> = [
      ...((pmIds as string[]) || []).map((mId) => ({ memberId: mId, role: 'pm' })),
      ...((arquitectoIds as string[]) || []).map((mId) => ({ memberId: mId, role: 'arquitecto' })),
      ...((poIds as string[]) || []).map((mId) => ({ memberId: mId, role: 'po' })),
      ...((sqaIds as string[]) || []).map((mId) => ({ memberId: mId, role: 'sqa' })),
      ...((devIds as string[]) || []).map((mId) => ({ memberId: mId, role: 'dev' })),
    ];

    for (const assignment of memberAssignments) {
      if (!assignment.memberId) continue;
      await db.execute({
        sql: `
          insert or ignore into empresa_miembro (id, empresa_id, full_name, nickname, activo)
          values (?, ?, ?, ?, 1)
        `,
        args: [assignment.memberId, finalEmpresaId, assignment.memberId, assignment.memberId],
      });

      const pmId = `${id}-${assignment.memberId}-${assignment.role}`;
      await db.execute({
        sql: `
          insert or replace into proyecto_miembro (id, proyecto_id, miembro_id, rol_proyecto, dedicacion_pct, activo)
          values (?, ?, ?, ?, 100, 1)
        `,
        args: [pmId, id, assignment.memberId, assignment.role],
      });
    }

    // Invalida cache de lectura
    cache.invalidate();

    // Sincronización asíncrona hacia Google Sheets (localizar fila por `id` y actualizar)
    (async () => {
      try {
        const sheets = getSheets();
        const sheetId = getSheetId();
        if (!sheetId) return;

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: 'proyectos!A1:AJ300',
        });
        const rows = res.data.values || [];
        if (rows.length < 2) return;

        const col = makeColAccessor(rows[0]);
        let targetRowIndex = -1;
        for (let r = 1; r < rows.length; r++) {
          if (cleanId(col(rows[r], 'id')) === cleanId(id)) {
            targetRowIndex = r + 1; // 1-based row index en Sheet
            break;
          }
        }

        const equipoRes = await db.execute('select id, nickname, full_name from equipo');
        const nameMap = new Map<string, string>();
        for (const row of equipoRes.rows) {
          nameMap.set(String(row.id), String(row.nickname || row.full_name || row.id));
        }

        const resolveDisplayNames = (ids: string[]) =>
          ids.map((mId) => nameMap.get(mId) || mId).join(', ');

        const pmStr = resolveDisplayNames(pmIds);
        const arqStr = resolveDisplayNames(arquitectoIds);
        const poStr = resolveDisplayNames(poIds);
        const sqaStr = resolveDisplayNames(sqaIds);
        const devsStr = resolveDisplayNames(devIds);
        const progStr = `${Math.round(normalizedProgreso * 100)}%`;

        // Preservar la fecha de Registro original de la fila existente
        const existingRegistro = targetRowIndex > 0
          ? col(rows[targetRowIndex - 1], 'registro') || ''
          : '';

        const rowValues = [
          id,                                      // id
          folio || '',                             // Folio
          actividad.trim(),                        // Nombre
          toSheetDate(finEstimado),                // Fin Estimado
          arqStr,                                  // Arquitecto
          salud || 'Estable',                      // Salud
          requiereDe || '',                        // Requiere de
          accionRequerida || '',                   // Accion Requerida
          toSheetDate(fechaAccion),                // Fecha de Accion
          producto || '',                          // Producto
          progStr,                                 // Progreso
          tipo || '',                              // Tipo
          prioridad || 'Mayor',                    // Prioridad
          epica || '',                             // Épica (Producto)
          cuatrimestre || '',                      // Cuatrimestre
          String(puntos || 0),                     // Puntos
          existingRegistro,                        // Registro (preservar original)
          toSheetDate(fechaInicio),                // Fecha Inicio
          toSheetDate(finReal),                    // Fin Real
          pmStr,                                   // PM
          devsStr,                                 // Devs
          estatus || 'On Track',                   // Estatus
          url || '',                               // URL
          servicio || '',                          // Servicio
          aliado || 'Ninguno',                     // Aliado
          sprint || '',                            // Sprint
          poStr,                                   // PO
          sqaStr,                                  // SQA
          arquitectoIds.join(', '),                // Arquitecto_ID
          pmIds.join(', '),                        // PM_ID
          devIds.join(', '),                       // DEVs_ID
          poIds.join(', '),                        // PO_ID
          sqaIds.join(', '),                       // SQA_ID
          '',                                      // Requiere_ID
        ];

        if (targetRowIndex > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `proyectos!A${targetRowIndex}:AJ${targetRowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [rowValues],
            },
          });
        }
      } catch (err) {
        console.error('Error sincronizando edición de proyecto en Google Sheets:', err);
      }
    })();

    return new Response(
      JSON.stringify({
        ok: true,
        id,
        message: 'Proyecto actualizado exitosamente.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return serverErrorResponse(error, 'proyectos PUT');
  }
};


