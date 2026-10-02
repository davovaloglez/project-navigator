/**
 * Resolver de identidad para el MCP. Carga el registro `equipo` vía
 * /api/equipo (cache 5 min compartido con el resto del API client) y delega
 * en el matcher PURO de equipoMatch.
 *
 * Nota: este resolver es complementario — los endpoints /api/proyectos|tareas
 * |cursos ya devuelven los ids resueltos en los campos *_ID. El resolver sólo
 * se usa cuando el caller del MCP pasa un string y queremos transformarlo a
 * id (p.ej. `get_person` con `nombre`).
 */
import { loadEquipo } from './api.js';
import { buildMembers, resolveId, type MatchMember } from './equipoMatch.js';
import type { EquipoRecord } from './types.js';

export interface EquipoResolver {
  /** Devuelve equipo.id o null si no resuelve / ambiguo. */
  resolve(name: string): string | null;
  equipo: EquipoRecord[];
}

let memoCache: { resolver: EquipoResolver; at: number } | null = null;
const MEMO_TTL = 60 * 1000; // 1min — el cache del loadEquipo ya hace los 5min

export async function getEquipoResolver(): Promise<EquipoResolver> {
  if (memoCache && Date.now() - memoCache.at < MEMO_TTL) return memoCache.resolver;
  const { equipo } = await loadEquipo();
  const members: MatchMember[] = buildMembers(
    equipo.map((e) => ({ id: e.id, nickname: e.nickname, full_name: e.fullName })),
  );
  const localMemo = new Map<string, string | null>();
  const resolver: EquipoResolver = {
    resolve(name: string): string | null {
      if (localMemo.has(name)) return localMemo.get(name)!;
      const id = resolveId(name, members);
      localMemo.set(name, id);
      return id;
    },
    equipo,
  };
  memoCache = { resolver, at: Date.now() };
  return resolver;
}
