/**
 * Migra y normaliza la hoja 'repositorios' de Google Sheets hacia las tablas
 * 'repositorio' y 'repositorio_colaborador' en Turso.
 *
 * Uso: npx tsx --env-file=.env scripts/seedRepositorios.ts
 */

import { createClient } from '@libsql/client';
import { getSheets, getSheetId } from '../src/lib/sheets';
import { getEquipoResolver } from '../src/lib/equipoResolver';
import { cleanId, makeColAccessor } from '../src/lib/sheetParsers';

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

  console.log('Poblando repositorios y colaboradores normalizados en Turso...\n');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'repositorios!A1:K60',
  });

  const rows = (res.data.values || []) as string[][];
  if (rows.length < 2) {
    console.log('No se encontraron filas en repositorios');
    return;
  }

  const col = makeColAccessor(rows[0]);
  const resolver = await getEquipoResolver();
  const EMPRESA_ID = 'vortex-it';

  // Cargar miembros existentes en Turso
  const miembrosRows = await db.execute('select "id" from "empresa_miembro"');
  const validMiembros = new Set<string>(miembrosRows.rows.map((r) => String(r.id)));

  async function resolveOrEnsureMember(rawName: string): Promise<string | null> {
    const cleaned = cleanId(rawName);
    if (!cleaned) return null;
    const resolved = resolver.resolve(cleaned);
    if (resolved && validMiembros.has(resolved)) return resolved;
    if (validMiembros.has(cleaned)) return cleaned;

    const newId = resolved || slugify(cleaned);
    if (!validMiembros.has(newId)) {
      await db.execute({
        sql: `insert or ignore into "empresa_miembro" ("id", "empresa_id", "full_name", "nickname", "activo")
              values (?, ?, ?, ?, 0)`,
        args: [newId, EMPRESA_ID, cleaned, cleaned],
      });
      validMiembros.add(newId);
    }
    return newId;
  }

  const splitNames = (v: string) =>
    (v || '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s && s !== '-');

  let repoCount = 0;
  let colabCount = 0;

  for (const row of rows.slice(1)) {
    const nombre = col(row, 'nombre común');
    const urlGit = col(row, 'github repositorio');
    if (!nombre || !urlGit) continue;

    const rId = slugify(nombre) || slugify(urlGit);
    const ambientes = col(row, 'ambientes') || 'Prod';
    const estatus = col(row, 'estatus') || 'Activo';
    const dpto = col(row, 'dpto');
    const producto = col(row, 'producto');

    await db.execute({
      sql: `insert into "repositorio" (
              "id", "empresa_id", "nombre", "url", "ambientes", "estatus", "dpto", "producto"
            ) values (?, ?, ?, ?, ?, ?, ?, ?)
            on conflict ("id") do update set
              "nombre" = excluded."nombre",
              "url" = excluded."url",
              "ambientes" = excluded."ambientes",
              "estatus" = excluded."estatus",
              "dpto" = excluded."dpto",
              "producto" = excluded."producto"`,
      args: [rId, EMPRESA_ID, nombre, urlGit, ambientes, estatus, dpto, producto],
    });
    repoCount++;

    // Procesar cada rol de acceso
    const rolesMapping: Array<{ colName: string; rol: 'administrador' | 'arquitecto' | 'colaborador' | 'visualizador' | 'deploy' }> = [
      { colName: 'administrador', rol: 'administrador' },
      { colName: 'arquitecto', rol: 'arquitecto' },
      { colName: 'colaborador', rol: 'colaborador' },
      { colName: 'visualizador', rol: 'visualizador' },
      { colName: 'deploy', rol: 'deploy' },
    ];

    for (const { colName, rol } of rolesMapping) {
      const names = splitNames(col(row, colName));
      for (const name of names) {
        const mId = await resolveOrEnsureMember(name);
        if (mId) {
          const rcId = `${rId}-${mId}-${rol}`;
          await db.execute({
            sql: `insert or ignore into "repositorio_colaborador" ("id", "repositorio_id", "miembro_id", "rol_acceso")
                  values (?, ?, ?, ?)`,
            args: [rcId, rId, mId, rol],
          });
          colabCount++;
        }
      }
    }
  }

  console.log(`✓ Se insertaron/actualizaron ${repoCount} repositorios.`);
  console.log(`✓ Se insertaron ${colabCount} asignaciones de colaboradores por rol.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
