/**
 * Seed de `equipo` desde el CSV de reconciliación revisado (Paso 3).
 *
 * Idempotente y reversible-friendly: upsert por `id` (no duplica),
 * NO borra nada. Transaccional (db.batch). Orden:
 *   1. Valida role_id contra la tabla `roles` (aborta si hay slug malo).
 *   2. Deriva `id` estable del email (local-part) — legible para debug.
 *   3. Upsert `equipo` (role_id NULL si vacío).
 *   4. 2ª pasada: resuelve manager_id por nombre EXACTO (no fuzzy laxo).
 *   5. Setea `user.equipoId` para los que traen matched_user_id
 *      (AUTORITATIVO: sobrescribe — el CSV revisado manda en migración).
 *
 * Uso:
 *   npm run seed-equipo            # aplica
 *   npm run seed-equipo -- --dry   # solo imprime el plan, no escribe
 *   npm run seed-equipo -- mocks/otro.csv
 */
import { readFileSync, existsSync } from 'node:fs';
import { getDbClient } from '../src/db/client';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false, i = 0;
  const s = text.replace(/\r\n?/g, '\n');
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** id estable: local-part del email; si no hay, slug del nombre. */
function deriveId(email: string, fullName: string): string {
  const local = (email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (local) return local;
  return norm(fullName).replace(/ /g, '-') || 'sin-id';
}

interface Row {
  id: string; full_name: string; nickname: string; email: string;
  role_id: string; title: string; department: string; manager_name: string; user_id: string;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const csvPath = args.find((a) => !a.startsWith('--')) || 'mocks/reconciliacion.csv';
  if (!existsSync(csvPath)) { console.error(`✗ No existe ${csvPath}`); process.exit(1); }

  const grid = parseCsv(readFileSync(csvPath, 'utf8'));
  const head = grid[0].map((h) => h.trim().toLowerCase());
  const at = (r: string[], name: string) => (r[head.indexOf(name)] ?? '').trim();

  const rows: Row[] = grid.slice(1).map((r) => {
    const email = at(r, 'email').toLowerCase();
    return {
      id: deriveId(email, at(r, 'full_name')),
      full_name: at(r, 'full_name'),
      nickname: at(r, 'nickname'),
      email,
      role_id: at(r, 'suggested_role_id'),
      title: at(r, 'puesto_raw').replace(/\s+/g, ' '), // título funcional (display)
      department: at(r, 'department'),
      manager_name: at(r, 'manager_name'),
      user_id: at(r, 'matched_user_id'),
    };
  }).filter((x) => x.full_name);

  // --- Validaciones que ABORTAN antes de escribir ---
  const db = getDbClient();
  const rolesRes = await db.execute('select id from "roles"');
  const validRoles = new Set(rolesRes.rows.map((r) => String(r.id)));
  const badRoles = rows.filter((r) => r.role_id && !validRoles.has(r.role_id));
  if (badRoles.length) {
    console.error('✗ suggested_role_id inválido (no existe en `roles`):');
    for (const b of badRoles) console.error(`   ${b.full_name}: "${b.role_id}"`);
    process.exit(1);
  }
  const byId = new Map<string, Row>();
  for (const r of rows) {
    const dup = byId.get(r.id);
    if (dup) { console.error(`✗ id duplicado "${r.id}": ${dup.full_name} vs ${r.full_name}`); process.exit(1); }
    byId.set(r.id, r);
  }

  // --- Resolución de manager por nombre EXACTO normalizado ---
  const idByNormName = new Map(rows.map((r) => [norm(r.full_name), r.id]));
  const managerOf = new Map<string, string>();   // rowId -> managerId
  const mgrUnresolved: string[] = [];
  for (const r of rows) {
    if (!r.manager_name) continue;
    const mid = idByNormName.get(norm(r.manager_name));
    if (mid && mid !== r.id) managerOf.set(r.id, mid);
    else mgrUnresolved.push(`${r.full_name} → "${r.manager_name}"`);
  }

  console.log(`Filas: ${rows.length} | con login: ${rows.filter((r) => r.user_id).length}`);
  console.log(`Managers resueltos: ${managerOf.size} | sin resolver: ${mgrUnresolved.length}`);
  if (mgrUnresolved.length) {
    console.log('  (manager_id quedará NULL — el jefe no está en el registro):');
    for (const m of mgrUnresolved) console.log(`   - ${m}`);
  }

  if (dry) {
    console.log('\n--dry: no se escribió nada. Quita --dry para aplicar.');
    process.exit(0);
  }

  // --- Escritura transaccional ---
  const stmts = [];
  for (const r of rows) {
    stmts.push({
      sql: `insert into "equipo" (id, full_name, nickname, role_id, title, department, email, active)
            values (?, ?, ?, ?, ?, ?, ?, 1)
            on conflict(id) do update set
              full_name = excluded.full_name, nickname = excluded.nickname,
              role_id = excluded.role_id, title = excluded.title,
              department = excluded.department, email = excluded.email`,
      args: [r.id, r.full_name, r.nickname || null, r.role_id || null,
             r.title || null, r.department || null, r.email || null],
    });
  }
  for (const [rowId, mgrId] of managerOf) {
    stmts.push({ sql: 'update "equipo" set manager_id = ? where id = ?', args: [mgrId, rowId] });
  }
  let links = 0;
  for (const r of rows) {
    if (!r.user_id) continue;
    links++;
    // AUTORITATIVO (no null-guarded): durante la migración el CSV
    // revisado es la fuente de verdad del puente. Si no sobrescribe,
    // un match equivocado ya escrito no se podría corregir re-corriendo.
    stmts.push({
      sql: 'update "user" set equipoId = ? where id = ?',
      args: [r.id, r.user_id],
    });
  }

  await db.batch(stmts, 'write');

  const count = await db.execute('select count(*) c from "equipo"');
  console.log(`\n✓ Seed aplicado (idempotente, sin borrados)`);
  console.log(`  equipo upsert: ${rows.length}`);
  console.log(`  manager_id seteados: ${managerOf.size}`);
  console.log(`  user.equipoId enlazados: ${links}`);
  console.log(`  Total filas en equipo: ${count.rows[0].c}`);
  process.exit(0);
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
