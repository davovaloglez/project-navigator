import { getDbClient } from '../db/client';
import { buildMembers, resolveId, type MatchMember } from './equipoMatch';

/**
 * Resolver server-side: carga el registro `equipo` de Turso (cache 5 min,
 * mismo TTL que los endpoints Sheets) y delega el match puro a equipoMatch.
 */

let cache: { members: MatchMember[]; at: number } | null = null;
const TTL = 5 * 60 * 1000;

/**
 * Epoch del registro: se incrementa al invalidar. Los endpoints que
 * enriquecen con ids resueltos (`/api/proyectos|tareas|cursos`) guardan el
 * epoch junto a su cache y la descartan si cambió — así un edit del registro
 * surte efecto inmediato sin esperar el TTL de cada endpoint.
 */
let epoch = 0;
export function equipoEpoch(): number {
  return epoch;
}

async function loadMembers(): Promise<MatchMember[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.members;
  const db = getDbClient();
  const res = await db.execute('select id, nickname, full_name from equipo');
  const members = buildMembers(
    res.rows.map((r) => ({
      id: String(r.id),
      nickname: r.nickname == null ? '' : String(r.nickname),
      full_name: r.full_name == null ? '' : String(r.full_name),
    })),
  );
  cache = { members, at: Date.now() };
  return members;
}

export interface EquipoResolver {
  /** Devuelve el `equipo.id` o null si no resuelve / es ambiguo. */
  resolve(name: string): string | null;
}

/** Construye el resolver (1 llamada por request; memo local por nombre). */
export async function getEquipoResolver(): Promise<EquipoResolver> {
  const members = await loadMembers();
  const memo = new Map<string, string | null>();
  return {
    resolve(name: string): string | null {
      if (memo.has(name)) return memo.get(name)!;
      const id = resolveId(name, members);
      memo.set(name, id);
      return id;
    },
  };
}

/** Invalida la cache (tras editar el registro desde /api/admin/equipo). */
export function invalidateEquipoCache(): void {
  cache = null;
  epoch++;
}
