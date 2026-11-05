/**
 * Script de validación de integridad referencial y conteo de datos en Turso.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/validateTursoIntegrity.ts
 */

import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: Faltan variables TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en .env');
    process.exit(1);
  }

  const db = createClient({ url, authToken });
  console.log('Verificando integridad y datos en Turso...\n');

  const tables = [
    'empresa',
    'departamento',
    'equipo_trabajo',
    'puesto_rol',
    'empresa_miembro',
    'equipo_miembro',
    'puesto_tarifa',
    'miembro_tarifa',
    'modelo_financiero',
    'cliente',
    'proyecto',
    'proyecto_equipo',
    'proyecto_miembro',
    'proyecto_dependencia',
    'sprint',
    'tarea',
    'curso_progreso',
    'proyecto_repositorio',
  ];

  console.log('--- Conteo de registros por tabla ---');
  for (const table of tables) {
    try {
      const res = await db.execute(`select count(*) as count from "${table}"`);
      const count = res.rows[0]?.count ?? 0;
      console.log(`  ${table.padEnd(24)}: ${count} registros`);
    } catch (e) {
      console.error(`  ${table.padEnd(24)}: ERROR - ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('\n--- Empresas registradas ---');
  const empresas = await db.execute('select "id", "nombre", "activa" from "empresa"');
  for (const emp of empresas.rows) {
    console.log(`  [${emp.id}] ${emp.nombre} (Activa: ${emp.activa === 1 ? 'Sí' : 'No'})`);
  }

  console.log('\n--- Verificación de integridad referencial (PRAGMA foreign_key_check) ---');
  try {
    const fkCheck = await db.execute('PRAGMA foreign_key_check');
    if (fkCheck.rows.length === 0) {
      console.log('✓ Cero violaciones de claves foráneas detectadas. Integridad 100% OK.');
    } else {
      console.warn('⚠️ Se detectaron inconsistencias en foreign keys:', fkCheck.rows);
    }
  } catch (e) {
    console.log('Aviso al ejecutar foreign_key_check:', e instanceof Error ? e.message : e);
  }

  console.log('\n--- Verificación de aislamiento multi-empresa (Tenant Integrity) ---');
  try {
    // 1. Proyectos vs Clientes
    const badClientes = await db.execute(`
      select count(*) as count
      from "proyecto" p
      join "cliente" c on c."id" = p."cliente_id"
      where p."empresa_id" != c."empresa_id"
    `);
    const countBadClientes = badClientes.rows[0]?.count ?? 0;
    if (countBadClientes === 0) {
      console.log('✓ Proyecto -> Cliente: Aislamiento 100% OK.');
    } else {
      console.warn(`⚠️ Se detectaron ${countBadClientes} proyectos con clientes de otra empresa.`);
    }

    // 2. Proyectos vs Miembros asignados (PM, líderes, colaboradores)
    const badMiembros = await db.execute(`
      select count(*) as count
      from "proyecto_miembro" pm
      join "proyecto" p on p."id" = pm."proyecto_id"
      join "empresa_miembro" m on m."id" = pm."miembro_id"
      where p."empresa_id" != m."empresa_id"
    `);
    const countBadMiembros = badMiembros.rows[0]?.count ?? 0;
    if (countBadMiembros === 0) {
      console.log('✓ Proyecto -> Miembros (proyecto_miembro): Aislamiento 100% OK.');
    } else {
      console.warn(`⚠️ Se detectaron ${countBadMiembros} asignaciones de proyecto con miembros de otra empresa.`);
    }

    // 3. Tareas vs Miembros asignados
    const badTareas = await db.execute(`
      select count(*) as count
      from "tarea" t
      join "proyecto" p on p."id" = t."proyecto_id"
      join "empresa_miembro" m on m."id" = t."asignado_miembro_id"
      where p."empresa_id" != m."empresa_id"
    `);
    const countBadTareas = badTareas.rows[0]?.count ?? 0;
    if (countBadTareas === 0) {
      console.log('✓ Tarea -> Asignado: Aislamiento 100% OK.');
    } else {
      console.warn(`⚠️ Se detectaron ${countBadTareas} tareas asignadas a miembros de otra empresa.`);
    }
  } catch (e) {
    console.error('Error al validar aislamiento multi-empresa:', e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
