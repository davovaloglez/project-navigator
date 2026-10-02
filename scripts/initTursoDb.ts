/**
 * Script para inicializar de forma secuencial y limpia la base de datos Turso
 * con el esquema base de Better-Auth, todas las migraciones y las semillas de datos.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createClient } from '@libsql/client';

function splitStatements(sql: string): string[] {
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('--')) return '';
      return line;
    })
    .join('\n');
  return cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runSqlFile(db: ReturnType<typeof createClient>, filePath: string) {
  const raw = readFileSync(filePath, 'utf8');
  const statements = splitStatements(raw);
  console.log(`\n▸ Ejecutando: ${filePath} (${statements.length} sentencias)`);
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i];
    const preview = sql.replace(/\s+/g, ' ').slice(0, 70);
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}${sql.length > 70 ? '…' : ''} `);
    try {
      await db.execute(sql);
      console.log('✓');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Si la tabla, columna o constraint ya existe, se reporta pero continúa
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate column') ||
        msg.includes('UNIQUE constraint failed')
      ) {
        console.log(`⚠️  (ya existe / ignorado)`);
      } else {
        console.log('✗');
        console.error(`\nError en: ${sql}\nDetalle: ${msg}`);
        throw e;
      }
    }
  }
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('✗ Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');
    process.exit(1);
  }

  const db = createClient({ url, authToken });
  console.log(`Iniciando migración sobre ${url}...`);

  // 1. Esquema base de autenticación y tablas manuales iniciales
  const authSchemaPath = resolve('src/db/auth-schema.sql');
  await runSqlFile(db, authSchemaPath);

  // 2. Migraciones en orden
  const migrationsDir = resolve('src/db/migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    await runSqlFile(db, join(migrationsDir, file));
  }

  // 3. Semillas de equipo y datos
  const seedsDir = resolve('src/db/seeds');
  const seedFiles = readdirSync(seedsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of seedFiles) {
    await runSqlFile(db, join(seedsDir, file));
  }

  console.log('\n✓ ¡Base de datos inicializada con éxito!');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Error al inicializar base de datos:', err);
  process.exit(1);
});
