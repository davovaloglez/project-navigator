/**
 * Espejo de src/lib/equipoMatch.ts del proyecto Astro. Matcher PURO de identidad
 * nombre/apodo → equipo.id. Cliente-safe; no depende de Turso.
 *
 * Prioridad: (1) alias curado  (2) nickname exacto único  (3) full_name exacto
 * único  (4) fuzzy por token, sólo si el match es único (ambiguo → null).
 */

/** Apodos que el fuzzy NO resuelve o resuelve AMBIGUO (espejo curado). */
export const ALIAS: Record<string, string> = {
  yorch: 'jenriquez',
  eduardo: 'emontano',
  alejandro: 'avazquez',
};

export function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

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

export function buildMembers(
  rows: Array<{ id: string; nickname?: string | null; full_name?: string | null; fullName?: string | null }>,
): MatchMember[] {
  return rows.map((r) => ({
    id: r.id,
    nick: norm(r.nickname ?? ''),
    full: norm(r.full_name ?? r.fullName ?? ''),
  }));
}

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
