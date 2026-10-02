/**
 * Reconciliación de personas (Paso 2 del rediseño de datos).
 *
 * UNA SOLA VEZ, OFFLINE, SIN ESCRIBIR EN LA BD. Cruza cuatro fuentes:
 *   - Projects (CSV): apodos cortos en Arquitecto / PM / DEVs.
 *   - Cursos   (CSV): nombre completo + email + OU + puesto + jefe (spine).
 *   - app/core (CSV): `Asignado` con NOMBRE COMPLETO (puentea apodo↔email).
 *   - Turso `user`  : logins existentes (para sugerir el puente equipoId).
 *
 * Produce un CSV REVISABLE POR HUMANO (no inserta nada). El humano
 * corrige nombres/puestos ambiguos y de ahí sale el seed de `equipo`.
 *
 * Uso:
 *   npm run reconcile-equipo [projects] [cursos] [app] [core] [salida]
 * Defaults: mocks/Project-Navigator-4-{projects,cursos,app,core}.csv
 *           mocks/reconciliacion.csv
 *
 * OJO: el `Rol` de Cursos NO es el catálogo de 12 puestos del costeo
 * (es otra taxonomía: "...Explorer"). suggested_role_id es heurístico
 * y SIEMPRE se marca para revisar.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { getDbClient } from '../src/db/client';

// --- Helpers ---------------------------------------------------------------

/** RFC4180-ish: respeta comillas, "" escapadas, comas y saltos embebidos. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const s = text.replace(/\r\n?/g, '\n');
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** Lee un CSV como lista de objetos { headerLower: value }. */
function readCsvObjects(path: string): Array<Record<string, string>> {
  const rows = parseCsv(readFileSync(path, 'utf8'));
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  });
}

/** Minúsculas, sin acentos, colapsa no-alfanumérico a espacio. */
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Match bidireccional por token: apodo ⊂ nombre completo (patrón nameMatches). */
function namesMatch(apodo: string, fullName: string): boolean {
  const a = norm(apodo);
  const f = norm(fullName);
  if (!a || !f) return false;
  if (a === f) return true;
  const aTokens = a.split(' ');
  const fTokens = f.split(' ');
  for (const at of aTokens) {
    if (at.length < 3) continue;
    for (const ft of fTokens) {
      if (ft === at || ft.startsWith(at) || at.startsWith(ft)) return true;
    }
  }
  return false;
}

/**
 * Mapeo HEURÍSTICO Cursos.Rol -> uno de los 12 puestos. Lossy a propósito:
 * la taxonomía de Cursos ("...Explorer") no coincide con el costeo.
 * Devuelve '' si no hay confianza (developer sin seniority, roles raros).
 */
function mapPuesto(raw: string): string {
  const r = norm(raw);
  if (!r) return '';
  if (r.includes('project manager') && r.includes('officer')) return 'project-manager-officer';
  if (r.includes('project manager')) return 'project-manager';
  if (r.includes('product manager')) return 'product-manager';
  if (r.includes('product owner')) return 'product-owner';
  if (r.includes('tech manager')) return 'tech-manager';
  if (r.includes('architect') || r.includes('arquitect')) return 'arquitecto-tecnico';
  if (r.startsWith('qa') || r.includes(' qa') || r.includes('quality')) return 'qa';
  if (r.includes('ux') || r.includes(' ui') || r.includes('diseno') || r.includes('design')) return 'ux-ui';
  if (r.includes('consult')) return 'consultoria-diseno';
  const isDev = r.includes('develop') || r.includes('desarrollador') ||
    r.includes('engineer') || r.includes('full stack') || r.includes('backend') ||
    r.includes('frontend') || r.includes('mobile');
  if (isDev) {
    if (r.includes('semi')) return 'desarrollador-semi-sr';
    if (/\bsr\b/.test(r) || r.includes('senior')) return 'desarrollador-sr';
    if (/\bjr\b/.test(r) || r.includes('junior')) return 'desarrollador-jr';
    return ''; // dev sin seniority -> asignar a mano
  }
  return '';
}

const csvCell = (v: string) => {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// --- Tipos -----------------------------------------------------------------
interface Person {
  full_name: string;
  nicknames: Set<string>;
  email: string;
  department: string;
  puesto_raw: string;
  suggested_role_id: string;
  manager_name: string;
  matched_user_id: string;
  sources: Set<string>; // P=Projects C=Cursos T=Tareas(app/core) U=User
  confidence: 'alta' | 'media' | 'baja';
  needs_review: boolean;
  notes: string[];
}

// --- Main ------------------------------------------------------------------
async function main() {
  const [
    projPath = 'mocks/Project-Navigator-4-projects.csv',
    cursosPath = 'mocks/Project-Navigator-4-cursos.csv',
    appPath = 'mocks/Project-Navigator-4-app.csv',
    corePath = 'mocks/Project-Navigator-4-core.csv',
    outPath = 'mocks/reconciliacion.csv',
  ] = process.argv.slice(2);

  if (!existsSync(projPath)) {
    console.error(`✗ No existe el CSV de Projects: ${projPath}`);
    process.exit(1);
  }
  const hasCursos = existsSync(cursosPath);
  if (!hasCursos) console.warn(`⚠ Sin ${cursosPath}: sin nombres completos/puestos, todo needs_review.`);

  const people: Person[] = [];
  const findMatches = (name: string): Person[] => people.filter((p) => namesMatch(name, p.full_name));

  // 1. Cursos = identidades ricas (spine).
  for (const c of (hasCursos ? readCsvObjects(cursosPath) : [])) {
    const full = c['colaborador'] || '';
    if (!full) continue;
    people.push({
      full_name: full,
      nicknames: new Set(),
      email: (c['email colaborador'] || '').toLowerCase(),
      department: c['o.u.'] || '',
      puesto_raw: c['rol'] || '',
      suggested_role_id: mapPuesto(c['rol'] || ''),
      manager_name: c['jefe directo'] || '',
      matched_user_id: '',
      sources: new Set(['C']),
      confidence: 'media',
      needs_review: true,
      notes: [],
    });
  }

  // 2. app/core `Asignado` (nombre completo) -> enriquece o agrega.
  for (const [path, tag] of [[appPath, 'app'], [corePath, 'core']] as const) {
    if (!existsSync(path)) continue;
    const seen = new Set<string>();
    for (const r of readCsvObjects(path)) {
      for (const tok of (r['asignado'] || '').split(',')) {
        const name = tok.trim();
        if (!name || name === '-' || seen.has(norm(name))) continue;
        seen.add(norm(name));
        const m = findMatches(name);
        if (m.length >= 1) {
          for (const p of m) p.sources.add('T');
        } else {
          people.push({
            full_name: name,
            nicknames: new Set(),
            email: '', department: '', puesto_raw: '', suggested_role_id: '',
            manager_name: '', matched_user_id: '',
            sources: new Set(['T']),
            confidence: 'baja',
            needs_review: true,
            notes: [`Aparece en ${tag} pero no en Cursos: confirmar identidad/puesto`],
          });
        }
      }
    }
  }

  // 3. Projects -> apodos. Asignar a su persona o crear placeholder.
  const apodoCols = ['arquitecto', 'pm', 'devs'];
  const allApodos = new Set<string>();
  for (const r of readCsvObjects(projPath)) {
    for (const col of apodoCols) {
      for (const tok of (r[col] || '').split(',')) {
        const apodo = tok.trim();
        if (apodo && apodo !== '-') allApodos.add(apodo);
      }
    }
  }
  for (const apodo of allApodos) {
    const matches = findMatches(apodo);
    if (matches.length === 1) {
      matches[0].nicknames.add(apodo);
      matches[0].sources.add('P');
    } else if (matches.length === 0) {
      people.push({
        full_name: apodo, // placeholder: el humano pone el nombre real
        nicknames: new Set([apodo]),
        email: '', department: '', puesto_raw: '', suggested_role_id: '',
        manager_name: '', matched_user_id: '',
        sources: new Set(['P']),
        confidence: 'baja',
        needs_review: true,
        notes: ['Solo en Projects, sin match: capturar nombre completo y puesto'],
      });
    } else {
      for (const m of matches) {
        m.nicknames.add(apodo);
        m.sources.add('P');
        m.notes.push(`Apodo "${apodo}" ambiguo: matchea ${matches.length} personas`);
      }
    }
  }

  // 4. Turso `user` -> sugerir el puente equipoId (email, luego nombre).
  let users: Array<{ id: string; name: string; email: string; equipoId: string | null }> = [];
  try {
    const res = await getDbClient().execute('select id, name, email, equipoId from "user"');
    users = res.rows.map((r) => ({
      id: String(r.id), name: String(r.name ?? ''),
      email: String(r.email ?? '').toLowerCase(),
      equipoId: r.equipoId == null ? null : String(r.equipoId),
    }));
  } catch (e) {
    console.warn('⚠ No se pudo leer Turso `user` (¿env?):', e instanceof Error ? e.message : e);
  }
  for (const u of users) {
    let p = u.email ? people.find((x) => x.email && x.email === u.email) : undefined;
    if (!p) p = findMatches(u.name)[0];
    if (p) {
      p.matched_user_id = u.id;
      p.sources.add('U');
      if (!p.email && u.email) p.email = u.email;
      if (u.equipoId) p.notes.push(`user.equipoId YA seteado (${u.equipoId})`);
    } else {
      people.push({
        full_name: u.name || u.email,
        nicknames: new Set(),
        email: u.email, department: '', puesto_raw: '', suggested_role_id: '',
        manager_name: '', matched_user_id: u.id,
        sources: new Set(['U']),
        confidence: 'baja',
        needs_review: true,
        notes: ['Login sin match: confirmar a qué persona corresponde'],
      });
    }
  }

  // 5. Confianza final.
  for (const p of people) {
    const hasRealName = p.full_name && !p.nicknames.has(p.full_name);
    const ambiguous = p.notes.some((n) => n.includes('ambiguo'));
    if (hasRealName && p.email && !ambiguous && p.sources.has('C')) {
      p.confidence = 'alta'; p.needs_review = false;
    } else if (p.sources.has('C') && !ambiguous) {
      p.confidence = 'media'; p.needs_review = true;
      if (!p.email) p.notes.push('Sin email: no se podrá ligar login automáticamente');
    } else {
      p.confidence = 'baja'; p.needs_review = true;
    }
    if (p.puesto_raw) {
      p.notes.push(p.suggested_role_id
        ? `Puesto inferido heurístico de "${p.puesto_raw}" — confirmar`
        : `Puesto "${p.puesto_raw}" sin mapear a los 12 — asignar a mano`);
    }
  }

  people.sort((a, b) =>
    Number(a.needs_review) - Number(b.needs_review) ||
    a.full_name.localeCompare(b.full_name));

  // 6. Salida CSV (NO toca la BD).
  const cols = ['full_name', 'nickname', 'email', 'department', 'puesto_raw',
    'suggested_role_id', 'manager_name', 'matched_user_id', 'sources',
    'confidence', 'needs_review', 'notes'];
  const lines = [cols.join(',')];
  for (const p of people) {
    lines.push([
      p.full_name, [...p.nicknames].join(' | '), p.email, p.department,
      p.puesto_raw, p.suggested_role_id, p.manager_name, p.matched_user_id,
      [...p.sources].sort().join(''), p.confidence, String(p.needs_review),
      p.notes.join(' · '),
    ].map(csvCell).join(','));
  }
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

  const review = people.filter((p) => p.needs_review).length;
  console.log(`\n✓ ${outPath} generado`);
  console.log(`  Personas: ${people.length}`);
  console.log(`  Confianza alta (candidatas a seed): ${people.length - review}`);
  console.log(`  needs_review (revisar a mano): ${review}`);
  console.log(`  Con login (matched_user_id): ${people.filter((p) => p.matched_user_id).length}`);
  console.log('\n⚠ NADA se escribió en la BD. Revisa el CSV antes del seed.');
  process.exit(0);
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
