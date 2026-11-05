/**
 * Aplica una migración SQL contra la BD Turso configurada en `.env`. Reusable
 * para cualquier archivo de `src/db/migrations/`.
 *
 * Uso:  npm run apply-migration -- src/db/migrations/2026-evaluaciones.sql
 *
 * Lee `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` del entorno (cargado por tsx
 * con --env-file). Divide el archivo por sentencias (separador `;` fuera de
 * literales/comentarios) y ejecuta cada una con `db.execute()`. Si una falla,
 * imprime el SQL ofensivo y aborta.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';

function splitStatements(sql: string): string[] {
  // Strip comentarios -- linea y bloques /* */
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');

  // Separar respetando bloques BEGIN ... END de TRIGGERS
  const rawParts = cleaned.split(';');
  const result: string[] = [];
  let buffer = '';

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    buffer = buffer ? buffer + ';' + part : part;

    // Contar occurrences de begin y end como palabras completas
    const beginCount = (buffer.match(/\bbegin\b/gi) || []).length;
    const endCount = (buffer.match(/\bend\b/gi) || []).length;

    if (beginCount === endCount) {
      if (buffer.trim().length > 0) {
        result.push(buffer.trim());
      }
      buffer = '';
    }
  }

  if (buffer.trim().length > 0) {
    result.push(buffer.trim());
  }

  return result;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Uso: npm run apply-migration -- <ruta-al-archivo.sql>');
    process.exit(1);
  }

  const path = resolve(arg);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.error(`✗ No pude leer el archivo: ${path}`);
    process.exit(1);
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('✗ Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en el entorno.');
    process.exit(1);
  }

  const db = createClient({ url, authToken });
  const statements = splitStatements(raw);
  console.log(`▸ Aplicando ${statements.length} sentencias desde ${arg}`);
  console.log(`▸ BD: ${url.replace(/^libsql:\/\//, '').split('.')[0]}\n`);

  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    const preview = sql.replace(/\s+/g, ' ').slice(0, 80);
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}${sql.length > 80 ? '…' : ''}  `);
    try {
      await db.execute(sql);
      console.log('✓');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log('✗');
      console.error(`\n✗ Falló la sentencia ${i + 1}:\n${sql}\n\nError: ${msg}`);
      process.exit(1);
    }
  }

  console.log(`\n✓ Migración aplicada (${statements.length} sentencias).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
