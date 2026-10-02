import { getDbClient } from '../db/client';
import { isScopedRole } from './scopeRoles';
import type { ProjectRecord, TareaRecord } from '../utils/dataTransforms';

/**
 * Scoping fila-a-fila por identidad (Fase 5). Determina qué filas de
 * /api/proyectos y /api/tareas ve el solicitante según su rol + su
 * `equipo.id` (vía `user.equipoId`).
 *
 * Matriz aprobada:
 *  - admin/directores/gerentes/ventas → TODO (unscoped).
 *  - pm  → proyectos donde pmId|arquitectoId == su equipoId.
 *  - dev (y cualquier rol scopeado) → arquitectoId == su id o está en devIds.
 *  - Tareas (scopeados): asignadoId == su id. (Limitación conocida: las
 *    tareas no tienen link a proyecto, así que un PM NO ve "las tareas de
 *    sus proyectos", solo las asignadas a él. Se resolverá cuando TASKS
 *    gane project_folio.)
 *  - Rol scopeado SIN equipoId ligado → fail-closed (no ve nada).
 *
 * `equipoId` NO viene en la sesión (auth.ts no declara additionalFields):
 * lookup `user.equipoId` cacheado por userId (TTL 60s).
 */

type LocalsUser = { id?: string; role?: string | null } | null | undefined;

export interface RequesterScope {
  kind: 'unscoped' | 'pm' | 'dev';
  equipoId: string | null;
}

const eqCache = new Map<string, { equipoId: string | null; at: number }>();
const EQ_TTL = 60 * 1000;

async function lookupEquipoId(userId: string): Promise<string | null> {
  const hit = eqCache.get(userId);
  if (hit && Date.now() - hit.at < EQ_TTL) return hit.equipoId;
  const db = getDbClient();
  const res = await db.execute({ sql: 'select equipoId from "user" where id = ? limit 1', args: [userId] });
  const equipoId = res.rows.length && res.rows[0].equipoId != null ? String(res.rows[0].equipoId) : null;
  eqCache.set(userId, { equipoId, at: Date.now() });
  return equipoId;
}

export async function getRequesterScope(user: LocalsUser): Promise<RequesterScope> {
  // Sin usuario (no debería ocurrir: middleware exige sesión) → fail-closed.
  if (!user?.id) return { kind: 'dev', equipoId: null };
  const role = user.role ?? 'dev';
  if (!isScopedRole(role)) return { kind: 'unscoped', equipoId: null };
  const equipoId = await lookupEquipoId(user.id);
  return { kind: role === 'pm' ? 'pm' : 'dev', equipoId };
}

export function projectVisible(p: ProjectRecord, s: RequesterScope): boolean {
  if (s.kind === 'unscoped') return true;
  if (!s.equipoId) return false; // fail-closed
  if (s.kind === 'pm') return p.pmIds.includes(s.equipoId) || p.arquitectoIds.includes(s.equipoId);
  return p.arquitectoIds.includes(s.equipoId) || p.devIds.includes(s.equipoId);
}

export function taskVisible(t: TareaRecord, s: RequesterScope): boolean {
  if (s.kind === 'unscoped') return true;
  if (!s.equipoId) return false; // fail-closed
  return t.asignadoId === s.equipoId;
}

export function cursoVisible(c: { equipoId?: string }, s: RequesterScope): boolean {
  if (s.kind === 'unscoped') return true;
  if (!s.equipoId) return false; // fail-closed
  return c.equipoId === s.equipoId;
}

export function capacidadVisible(c: { equipoId?: string }, s: RequesterScope): boolean {
  if (s.kind === 'unscoped') return true;
  if (!s.equipoId) return false; // fail-closed
  return c.equipoId === s.equipoId;
}

/** Invalida el lookup de equipoId (tras ligar/desligar un login). */
export function invalidateRequesterScope(userId?: string): void {
  if (userId) eqCache.delete(userId);
  else eqCache.clear();
}
