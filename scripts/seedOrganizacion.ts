/**
 * Semilla de Departamentos y Equipos de trabajo (Squads) para Vortex IT y Bit Technologies.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/seedOrganizacion.ts
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
  console.log('Sembrando Departamentos y Equipos de trabajo en Turso...\n');

  // 1. Departamentos para Vortex IT y Bit Technologies
  const departamentos = [
    { id: 'dep-tech-ambition', empresaId: 'vortex-it', nombre: 'Tech Ambition', descripcion: 'Desarrollo de software y arquitectura técnica' },
    { id: 'dep-growth-experiences', empresaId: 'vortex-it', nombre: 'Growth Experiences', descripcion: 'Diseño UX/UI y experiencias de usuario' },
    { id: 'dep-allies-networking', empresaId: 'vortex-it', nombre: 'Allies Networking', descripcion: 'Alianzas y vinculación comercial' },
    { id: 'dep-analytics-solutions', empresaId: 'vortex-it', nombre: 'Analytics Solutions', descripcion: 'Datos, BI y analítica de portafolio' },
    { id: 'dep-ingenieria-bit', empresaId: 'bit-technologies', nombre: 'Ingeniería de Software', descripcion: 'Desarrollo de soluciones tecnológicas' },
    { id: 'dep-innovacion-bit', empresaId: 'bit-technologies', nombre: 'Innovación y Producto', descripcion: 'Investigación de IA aplicada y producto digital' },
  ];

  for (const dep of departamentos) {
    await db.execute({
      sql: `insert into "departamento" ("id", "empresa_id", "nombre", "descripcion", "activo")
            values (?, ?, ?, ?, 1)
            on conflict ("id") do update set
              "nombre" = excluded."nombre",
              "descripcion" = excluded."descripcion"`,
      args: [dep.id, dep.empresaId, dep.nombre, dep.descripcion],
    });
  }
  console.log(`✓ Insertados ${departamentos.length} departamentos.`);

  // 2. Asociar departamento_id a miembros de Vortex IT según equipo.department
  const deptsMapping: Record<string, string> = {
    'Tech Ambition': 'dep-tech-ambition',
    'Growth Experiences': 'dep-growth-experiences',
    'Allies Networking': 'dep-allies-networking',
    'Analytics Solutions': 'dep-analytics-solutions',
  };

  for (const [deptName, deptId] of Object.entries(deptsMapping)) {
    const res = await db.execute({
      sql: `update "empresa_miembro"
            set "departamento_id" = ?
            where "id" in (select "id" from "equipo" where "department" = ?)`,
      args: [deptId, deptName],
    });
    console.log(`  Miembros asignados a ${deptName}: ${res.rowsAffected}`);
  }

  // 3. Equipos de trabajo (Squads)
  const equipos = [
    { id: 'squad-core', empresaId: 'vortex-it', depId: 'dep-tech-ambition', nombre: 'Squad Core', descripcion: 'Plataforma central y arquitectura base' },
    { id: 'squad-mobile', empresaId: 'vortex-it', depId: 'dep-tech-ambition', nombre: 'Squad Mobile', descripcion: 'Aplicaciones nativas e híbridas' },
    { id: 'squad-cloud', empresaId: 'vortex-it', depId: 'dep-tech-ambition', nombre: 'Squad Cloud & DevOps', descripcion: 'Infraestructura, CI/CD y despliegue' },
    { id: 'squad-growth', empresaId: 'vortex-it', depId: 'dep-growth-experiences', nombre: 'Squad Growth', descripcion: 'Optimización de conversión y UX' },
    { id: 'squad-analytics', empresaId: 'vortex-it', depId: 'dep-analytics-solutions', nombre: 'Squad Analytics', descripcion: 'Modelos de datos y reportes' },
    { id: 'squad-bit-frontend', empresaId: 'bit-technologies', depId: 'dep-ingenieria-bit', nombre: 'Squad Frontend Solutions', descripcion: 'Interfaces web avanzadas' },
    { id: 'squad-bit-ai', empresaId: 'bit-technologies', depId: 'dep-innovacion-bit', nombre: 'Squad AI & Innovation', descripcion: 'Modelos de IA y automatización' },
  ];

  for (const eq of equipos) {
    await db.execute({
      sql: `insert into "equipo_trabajo" ("id", "empresa_id", "departamento_id", "nombre", "descripcion", "activo")
            values (?, ?, ?, ?, ?, 1)
            on conflict ("id") do update set
              "nombre" = excluded."nombre",
              "descripcion" = excluded."descripcion",
              "departamento_id" = excluded."departamento_id"`,
      args: [eq.id, eq.empresaId, eq.depId, eq.nombre, eq.descripcion],
    });
  }
  console.log(`✓ Insertados ${equipos.length} equipos de trabajo (squads).`);

  // 4. Asignar miembros de Tech Ambition a Squad Core y Mobile
  const techMembers = await db.execute(`select "id" from "empresa_miembro" where "departamento_id" = 'dep-tech-ambition'`);
  let squadMembersCount = 0;
  for (const m of techMembers.rows) {
    const mId = String(m.id);
    const eqId = 'squad-core';
    const emId = `${eqId}-${mId}`;
    await db.execute({
      sql: `insert or ignore into "equipo_miembro" ("id", "equipo_id", "miembro_id", "rol_en_equipo")
            values (?, ?, ?, 'developer')`,
      args: [emId, eqId, mId],
    });
    squadMembersCount++;
  }
  console.log(`✓ Asignados ${squadMembersCount} miembros al Squad Core.`);

  console.log('\nSembrado organizacional completado con éxito.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
