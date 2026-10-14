/**
 * Script ETL: Migración de datos operativos desde Google Sheets hacia Turso.
 *
 * Uso:
 *   npm run migrate:sheets
 *   o: tsx --env-file=.env scripts/migrateSheetsToTurso.ts
 *
 * Extrae:
 *   - proyectos!A1:AJ300   -> cliente, proyecto, proyecto_miembro, proyecto_dependencia
 *   - sprint!A1:J20        -> sprint
 *   - actividades!A1:AD500 -> tarea (App y Core)
 *   - cursos!A1:J50        -> curso_progreso
 *   - Costos!A1:G50        -> puesto_tarifa, modelo_financiero
 *   - repositorios!A1:K60  -> proyecto_repositorio
 *
 * Asocia inicialmente los datos a la empresa 'vortex-it'.
 */

import { createClient } from '@libsql/client';
import { getSheets, getSheetId } from '../src/lib/sheets';
import { getEquipoResolver } from '../src/lib/equipoResolver';
import {
  parseDate,
  parseProgress,
  cleanId,
  splitIds,
  parseNumber,
  makeColAccessor,
} from '../src/lib/sheetParsers';

function parseIntSafe(val: string): number {
  if (!val) return 0;
  const n = parseInt(val.replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: Faltan variables TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en .env');
    process.exit(1);
  }

  const db = createClient({ url, authToken });
  const sheets = getSheets();
  const sheetId = getSheetId();

  if (!sheetId) {
    console.error('Error: Falta SHEET_ID en .env');
    process.exit(1);
  }

  console.log('Iniciando ETL de Google Sheets a Turso (libSQL)...');
  console.log(`Base de datos destino: ${url.replace(/^libsql:\/\//, '').split('.')[0]}`);
  console.log(`Sheet ID origen: ${sheetId}\n`);

  const resolver = await getEquipoResolver();
  const EMPRESA_ID = 'vortex-it';

  // Cargar miembros existentes para validar FKs y autocompletar desconocidos
  const miembrosRows = await db.execute('select "id" from "empresa_miembro"');
  const validMiembrosSet = new Set<string>(miembrosRows.rows.map((r) => String(r.id)));

  async function ensureMiembroExists(rawId: string, displayName?: string): Promise<string | null> {
    const cleaned = cleanId(rawId);
    if (!cleaned) return null;

    if (validMiembrosSet.has(cleaned)) return cleaned;

    const resolved = resolver.resolve(cleaned) || (displayName ? resolver.resolve(displayName) : null);
    if (resolved && validMiembrosSet.has(resolved)) return resolved;

    // Crear miembro placeholder para mantener integridad referencial
    const newId = resolved || slugify(cleaned);
    if (!validMiembrosSet.has(newId)) {
      await db.execute({
        sql: `insert or ignore into "empresa_miembro" ("id", "empresa_id", "full_name", "nickname", "activo")
              values (?, ?, ?, ?, 0)`,
        args: [newId, EMPRESA_ID, displayName || cleaned, cleaned],
      });
      validMiembrosSet.add(newId);
    }
    return newId;
  }

  // =========================================================================
  // 1. Proyectos y Clientes
  // =========================================================================
  console.log('1. Extrayendo hoja "proyectos"...');
  const projRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'proyectos!A1:AJ300',
  });

  const projRows = (projRes.data.values || []) as string[][];
  const projectMapByFolio = new Map<string, string>(); // folio/nombre -> id

  if (projRows.length < 2) {
    console.warn('No se encontraron filas en proyectos');
  } else {
    const col = makeColAccessor(projRows[0]);
    const splitNames = (v: string) =>
      (v || '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-');

    // Extraer y poblar clientes unicos (desde 'aliado' o 'producto')
    const clientesSet = new Set<string>();
    for (const row of projRows.slice(1)) {
      const cli = col(row, 'aliado') || col(row, 'cliente') || col(row, 'producto');
      if (cli && cli.trim()) clientesSet.add(cli.trim());
    }

    console.log(`  Identificados ${clientesSet.size} clientes/aliados.`);
    for (const cli of clientesSet) {
      const cId = slugify(cli) || 'cliente-general';
      await db.execute({
        sql: `insert into "cliente" ("id", "empresa_id", "nombre", "activo")
              values (?, ?, ?, 1)
              on conflict ("id") do update set "nombre" = excluded."nombre"`,
        args: [cId, EMPRESA_ID, cli],
      });
    }

    // Insertar Proyectos
    let proyectosInsertados = 0;
    const dependenciesToInsert: { folio: string; dependsOn: string }[] = [];
    const miembrosToInsert: { folio: string; miembroId: string; rol: string }[] = [];

    for (const row of projRows.slice(1)) {
      const rawFolio = cleanId(col(row, 'folio')) || cleanId(col(row, 'id'));
      const actividad = col(row, 'nombre') || col(row, 'actividad');
      if (!rawFolio || !actividad) continue;

      const folio = rawFolio;
      const cliNombre = col(row, 'aliado') || col(row, 'cliente') || col(row, 'producto');
      const clienteId = cliNombre ? slugify(cliNombre) || null : null;
      const id = folio;
      projectMapByFolio.set(folio.toLowerCase(), id);
      projectMapByFolio.set(actividad.toLowerCase(), id);

      const cuatrimestre = col(row, 'cuatrimestre');
      const epica = col(row, 'épica (producto)') || col(row, 'epica') || col(row, 'épica');

      await db.execute({
        sql: `insert into "proyecto" (
                "id", "folio", "empresa_id", "cliente_id", "numero", "actividad",
                "salud", "accion_requerida", "fecha_accion", "progreso", "tipo",
                "prioridad", "epica", "hito", "cuenta", "puntos", "estatus",
                "fecha_registro", "fecha_inicio", "fin_estimado", "fin_real", "url"
              ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              on conflict ("folio") do update set
                "actividad" = excluded."actividad",
                "cliente_id" = excluded."cliente_id",
                "salud" = excluded."salud",
                "accion_requerida" = excluded."accion_requerida",
                "progreso" = excluded."progreso",
                "estatus" = excluded."estatus",
                "puntos" = excluded."puntos",
                "fecha_inicio" = excluded."fecha_inicio",
                "fin_estimado" = excluded."fin_estimado",
                "fin_real" = excluded."fin_real"`,
        args: [
          id,
          folio,
          EMPRESA_ID,
          clienteId,
          col(row, 'id') || col(row, 'numero'),
          actividad,
          col(row, 'salud') || 'saludable',
          col(row, 'accion requerida') || col(row, 'acción requerida'),
          parseDate(col(row, 'fecha de accion') || col(row, 'fecha acción')),
          parseProgress(col(row, 'progreso')),
          col(row, 'tipo'),
          col(row, 'prioridad'),
          epica,
          cuatrimestre || col(row, 'hito'),
          col(row, 'cuenta') || '',
          parseIntSafe(col(row, 'puntos')),
          col(row, 'estatus') || 'Activo',
          parseDate(col(row, 'registro')),
          parseDate(col(row, 'fecha inicio') || col(row, 'inicio estimado')),
          parseDate(col(row, 'fin estimado')),
          parseDate(col(row, 'fin real')),
          col(row, 'url'),
        ],
      });
      proyectosInsertados++;

      // Guardar dependencias
      const reqDe = col(row, 'requiere de');
      if (reqDe) {
        for (const dep of splitNames(reqDe)) {
          dependenciesToInsert.push({ folio, dependsOn: dep });
        }
      }

      // Procesar roles
      const parseAndCollectRoles = async (nameCol: string, idCol: string, rol: string) => {
        const rawIds = splitIds(col(row, idCol));
        const rawNames = splitNames(col(row, nameCol));

        const combined = rawIds.length > 0 ? rawIds : rawNames;
        for (let i = 0; i < combined.length; i++) {
          const rawItem = combined[i];
          const nameItem = rawNames[i] || rawItem;
          const validId = await ensureMiembroExists(rawItem, nameItem);
          if (validId) {
            miembrosToInsert.push({ folio, miembroId: validId, rol });
          }
        }
      };

      await parseAndCollectRoles('pm', 'pm_id', 'pm');
      await parseAndCollectRoles('arquitecto', 'arquitecto_id', 'arquitecto');
      await parseAndCollectRoles('devs', 'devs_id', 'developer');
      await parseAndCollectRoles('po', 'po_id', 'po');
      await parseAndCollectRoles('sqa', 'sqa_id', 'sqa');
    }

    console.log(`  Procesados e insertados ${proyectosInsertados} proyectos.`);

    // Insertar miembros de proyecto
    for (const m of miembrosToInsert) {
      const pmId = `${m.folio}-${m.miembroId}-${m.rol}`;
      await db.execute({
        sql: `insert or ignore into "proyecto_miembro" ("id", "proyecto_id", "miembro_id", "rol_proyecto", "dedicacion_pct", "activo")
              values (?, ?, ?, ?, 100, 1)`,
        args: [pmId, m.folio, m.miembroId, m.rol],
      });
    }
    console.log(`  Asignados ${miembrosToInsert.length} roles a proyectos.`);

    // Insertar dependencias validas
    for (const d of dependenciesToInsert) {
      const depId = `${d.folio}->${d.dependsOn}`;
      await db.execute({
        sql: `insert or ignore into "proyecto_dependencia" ("id", "proyecto_id", "depends_on_proyecto_id", "tipo_bloqueo")
              select ?, ?, ?, 'bloqueante'
              where exists (select 1 from "proyecto" where "id" = ? or "folio" = ?)
                and exists (select 1 from "proyecto" where "id" = ? or "folio" = ?)`,
        args: [depId, d.folio, d.dependsOn, d.folio, d.folio, d.dependsOn, d.dependsOn],
      });
    }
    console.log(`  Registradas dependencias de proyecto.`);
  }

  // =========================================================================
  // 2. Sprints
  // =========================================================================
  console.log('\n2. Extrayendo hoja "sprint"...');
  try {
    const sprintRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'sprint!A1:J20',
    });
    const sprintRows = (sprintRes.data.values || []) as string[][];
    if (sprintRows.length >= 2) {
      const col = makeColAccessor(sprintRows[0]);
      let sprintsCount = 0;
      for (const row of sprintRows.slice(1)) {
        const nombre = col(row, 'sprint');
        if (!nombre) continue;
        const sId = slugify(nombre);
        await db.execute({
          sql: `insert into "sprint" (
                  "id", "nombre", "mes", "fecha_inicio", "fecha_fin", "estatus"
                ) values (?, ?, ?, ?, ?, 'activo')
                on conflict ("id") do update set
                  "nombre" = excluded."nombre",
                  "fecha_inicio" = excluded."fecha_inicio",
                  "fecha_fin" = excluded."fecha_fin"`,
          args: [
            sId,
            nombre,
            parseIntSafe(col(row, 'mes')) || null,
            parseDate(col(row, 'inicio estimado')),
            parseDate(col(row, 'fin estimado')),
          ],
        });
        sprintsCount++;
      }
      console.log(`  Procesados e insertados ${sprintsCount} sprints.`);
    }
  } catch (err) {
    console.warn('  Aviso en extracción de sprint:', err instanceof Error ? err.message : err);
  }

  // =========================================================================
  // 3. Tareas (actividades!A1:AD500)
  // =========================================================================
  console.log('\n3. Extrayendo hoja "actividades" (tareas)...');
  try {
    const actRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'actividades!A1:AD500',
    });
    const actRows = (actRes.data.values || []) as string[][];
    if (actRows.length >= 2) {
      const col = makeColAccessor(actRows[0]);
      let tareasCount = 0;
      const seenIds = new Map<string, number>();

      for (const row of actRows.slice(1)) {
        const nombre = col(row, 'actividad');
        if (!nombre) continue;

        const rawFolio = cleanId(col(row, 'folio')) || cleanId(col(row, 'proyectoid'));
        const projNombre = col(row, 'proyecto');

        // Resolver proyecto
        let targetProjId =
          projectMapByFolio.get((rawFolio || '').toLowerCase()) ||
          projectMapByFolio.get((projNombre || '').toLowerCase());

        if (!targetProjId) {
          const check = await db.execute({
            sql: `select "id" from "proyecto" where "id" = ? or "folio" = ? or "actividad" = ? limit 1`,
            args: [rawFolio || '', rawFolio || '', projNombre || ''],
          });
          if (check.rows.length > 0) {
            targetProjId = String(check.rows[0].id);
          }
        }

        if (!targetProjId) continue;

        const asignadoNombre = col(row, 'asignado');
        const rawAsignadoId = cleanId(col(row, 'asignadoid')) || asignadoNombre;
        const asignadoId = rawAsignadoId ? await ensureMiembroExists(rawAsignadoId, asignadoNombre) : null;

        const sprintNombre = col(row, 'sprint');
        const sprintId = sprintNombre ? slugify(sprintNombre) : null;
        const producto = (col(row, 'producto') || '').toLowerCase().includes('core') ? 'Core' : 'App';

        // Generar hash ID sintetico
        const key = [targetProjId, rawFolio, nombre, asignadoNombre, sprintNombre].join('|');
        let h = 0;
        for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
        const base = Math.abs(h).toString(36);
        const n = seenIds.get(base) ?? 0;
        seenIds.set(base, n + 1);
        const tId = n === 0 ? base : `${base}-${n}`;

        await db.execute({
          sql: `insert into "tarea" (
                  "id", "proyecto_id", "sprint_id", "producto", "orden", "funcionalidad",
                  "nombre", "descripcion", "tipo", "asignado_miembro_id", "estatus",
                  "fecha_inicio", "fecha_fin", "tiempo_et", "estimacion", "puntos"
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict ("id") do update set
                  "nombre" = excluded."nombre",
                  "estatus" = excluded."estatus",
                  "puntos" = excluded."puntos",
                  "asignado_miembro_id" = excluded."asignado_miembro_id"`,
          args: [
            tId,
            targetProjId,
            sprintId,
            producto,
            parseIntSafe(col(row, 'orden')) || 0,
            col(row, 'funcionalidad') || col(row, 'fase'),
            nombre,
            col(row, 'descripción') || col(row, 'descripcion'),
            col(row, 'tipo'),
            asignadoId,
            col(row, 'estatus') || 'Por hacer',
            parseDate(col(row, 'fecha inicio'), { rawOnFail: true }),
            parseDate(col(row, 'fin estimado'), { rawOnFail: true }),
            parseNumber(col(row, 'tiempo_et')),
            parseNumber(col(row, 'estimacion') || col(row, 'puntos')),
            parseNumber(col(row, 'puntos')),
          ],
        });
        tareasCount++;
      }
      console.log(`  Procesadas e insertadas ${tareasCount} tareas.`);
    }
  } catch (err) {
    console.warn('  Aviso en extracción de actividades:', err instanceof Error ? err.message : err);
  }

  // =========================================================================
  // 4. Cursos (cursos!A1:J50)
  // =========================================================================
  console.log('\n4. Extrayendo hoja "cursos"...');
  try {
    const cursosRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'cursos!A1:J50',
    });
    const cursosRows = (cursosRes.data.values || []) as string[][];
    if (cursosRows.length >= 2) {
      const col = makeColAccessor(cursosRows[0]);
      let cursosCount = 0;
      for (const row of cursosRows.slice(1)) {
        const colaborador = col(row, 'nombre');
        if (!colaborador) continue;
        const rawId = cleanId(col(row, 'id')) || colaborador;
        const miembroId = await ensureMiembroExists(rawId, colaborador);
        if (!miembroId) continue;

        const cursoNombre = 'Programa de Certificación Interna';
        const cProgId = `${miembroId}-${slugify(cursoNombre)}`;
        const progreso = parseFloat(col(row, 'progreso') || '0') || 0;

        await db.execute({
          sql: `insert into "curso_progreso" ("id", "miembro_id", "curso_nombre", "pids_creados", "progreso", "fecha_actualizacion")
                values (?, ?, ?, 0, ?, datetime('now'))
                on conflict ("id") do update set "progreso" = excluded."progreso"`,
          args: [cProgId, miembroId, cursoNombre, progreso],
        });
        cursosCount++;
      }
      console.log(`  Registrados ${cursosCount} avances de cursos.`);
    }
  } catch (err) {
    console.warn('  Aviso en extracción de cursos:', err instanceof Error ? err.message : err);
  }

  // =========================================================================
  // 5. Costos y Modelo Financiero (Costos!A1:G50)
  // =========================================================================
  console.log('\n5. Extrayendo hoja "Costos"...');
  try {
    const costosRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Costos!A1:G50',
    });
    const costosRows = (costosRes.data.values || []) as string[][];
    if (costosRows.length >= 2) {
      const headers = costosRows[0].map((h) => (h || '').trim().toLowerCase());
      const rolIdx = headers.indexOf('rol');
      const costoHoraIdx = headers.indexOf('costo/hora');
      const costoMensualIdx = headers.indexOf('costo/mensual');

      let tarifasCount = 0;
      for (const row of costosRows.slice(1)) {
        const rol = (row[rolIdx] || '').trim();
        if (!rol) continue;

        const slug = slugify(rol);
        const costoHora = parseNumber(row[costoHoraIdx] || '');
        const costoMensual = parseNumber(row[costoMensualIdx] || '');

        if (slug) {
          await db.execute({
            sql: `insert or ignore into "puesto_rol" ("id", "empresa_id", "nombre") values (?, ?, ?)`,
            args: [slug, EMPRESA_ID, rol],
          });

          const pTarifaId = `${EMPRESA_ID}-${slug}-base`;
          await db.execute({
            sql: `insert into "puesto_tarifa" ("id", "empresa_id", "puesto_id", "costo_hora", "costo_mensual", "valid_from")
                  values (?, ?, ?, ?, ?, '2026-01-01')
                  on conflict ("id") do update set
                    "costo_hora" = excluded."costo_hora",
                    "costo_mensual" = excluded."costo_mensual"`,
            args: [pTarifaId, EMPRESA_ID, slug, costoHora, costoMensual],
          });
          tarifasCount++;
        }
      }
      console.log(`  Registradas ${tarifasCount} tarifas de puestos para ${EMPRESA_ID}.`);
    }
  } catch (err) {
    console.warn('  Aviso en extracción de costos:', err instanceof Error ? err.message : err);
  }

  // =========================================================================
  // 6. Repositorios (repositorios!A1:K60)
  // =========================================================================
  console.log('\n6. Extrayendo hoja "repositorios"...');
  try {
    const repoRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'repositorios!A1:K60',
    });
    const repoRows = (repoRes.data.values || []) as string[][];
    if (repoRows.length >= 2) {
      const col = makeColAccessor(repoRows[0]);
      let reposCount = 0;

      // Obtener un proyecto existente como fallback si el repo no tiene match exacto
      const defaultProj = await db.execute(`select "id" from "proyecto" limit 1`);
      const defaultProjId = defaultProj.rows.length > 0 ? String(defaultProj.rows[0].id) : null;

      for (const row of repoRows.slice(1)) {
        const nombre = col(row, 'nombre común');
        const urlGit = col(row, 'github repositorio');
        if (!nombre || !urlGit) continue;

        // Intentar enlazar con un proyecto por nombre o folio
        const projMatch = await db.execute({
          sql: `select "id" from "proyecto" where "actividad" like ? or "folio" like ? limit 1`,
          args: [`%${nombre}%`, `%${nombre}%`],
        });

        const pId = projMatch.rows.length > 0 ? String(projMatch.rows[0].id) : defaultProjId;

        if (pId) {
          const rId = slugify(`${nombre}-${urlGit}`);
          await db.execute({
            sql: `insert into "proyecto_repositorio" ("id", "proyecto_id", "url", "nombre", "tecnologia_principal")
                  values (?, ?, ?, ?, ?)
                  on conflict ("id") do update set
                    "nombre" = excluded."nombre",
                    "tecnologia_principal" = excluded."tecnologia_principal"`,
            args: [rId, pId, urlGit, nombre, col(row, 'producto') || null],
          });
          reposCount++;
        }
      }
      console.log(`  Registrados e insertados ${reposCount} repositorios en Turso.`);
    }
  } catch (err) {
    console.warn('  Aviso en extracción de repositorios:', err instanceof Error ? err.message : err);
  }

  console.log('\nETL finalizado con éxito.');
}

main().catch((e) => {
  console.error('\nError en migración ETL:', e);
  process.exit(1);
});
