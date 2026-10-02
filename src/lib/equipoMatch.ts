/**
 * Matcher de identidad PURO y client-safe (sin Turso): nombre/apodo →
 * `equipo.id`. Lo usan el resolver server (equipoResolver.ts, con cache
 * Turso) y la UI (PersonaDetailSection). Reemplaza al frágil `nameMatches()`.
 *
 * Prioridad: (1) alias curado  (2) nickname exacto único  (3) full_name
 * exacto único  (4) fuzzy por token, SOLO si el match es único
 * (ambiguo → null: mejor no resolver que resolver mal).
 */

/** Apodos de Projects que el fuzzy NO resuelve, o resuelve AMBIGUO (curado). */
export const ALIAS: Record<string, string> = {
  yorch: 'jenriquez', // "Jorge Alberto Enríquez Salazar" (nickname "George")
  eduardo: 'emontano', // vs "Erithan Eduardo Gonzalez" — en Projects "Eduardo" = Montaño
  alejandro: 'avazquez', // vs "David Alejandro González" (ese es el apodo "Dave")
};

export function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** ¿algún token de `a` (len≥3) coincide/prefija con algún token de `b`? */
export function tokenMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const at = a.split(' ');
  const bt = b.split(' ');
  for (const x of at) {
    if (x.length < 3) continue;
    for (const y of bt) {
      if (y === x || y.startsWith(x) || x.startsWith(y)) return true;
    }
  }
  return false;
}

export interface MatchMember { id: string; nick: string; full: string; }

/** Normaliza filas crudas (acepta full_name o fullName). */
export function buildMembers(
  rows: Array<{ id: string; nickname?: string | null; full_name?: string | null; fullName?: string | null }>,
): MatchMember[] {
  return rows.map((r) => ({
    id: r.id,
    nick: norm(r.nickname ?? ''),
    full: norm(r.full_name ?? r.fullName ?? ''),
  }));
}

/** Devuelve el `equipo.id` o null si no resuelve / es ambiguo. */
export function resolveId(name: string, members: MatchMember[]): string | null {
  const n = norm(name);
  if (!n || n === '-') return null;

  const alias = ALIAS[n];
  if (alias && members.some((m) => m.id === alias)) return alias;

  const nick = members.filter((m) => m.nick && m.nick === n).map((m) => m.id);
  if (new Set(nick).size === 1) return nick[0];

  const full = members.filter((m) => m.full === n).map((m) => m.id);
  if (new Set(full).size === 1) return full[0];

  const fuzzy = new Set<string>();
  for (const m of members) {
    if (tokenMatch(n, m.nick) || tokenMatch(n, m.full)) fuzzy.add(m.id);
  }
  return fuzzy.size === 1 ? [...fuzzy][0] : null;
}
