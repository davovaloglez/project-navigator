/**
 * Detect projects whose `progreso` hasn't moved meaningfully across snapshots.
 *
 * A project is flagged "stale" when:
 *   - It's active (not Done / On Hold)
 *   - We have a snapshot ≥ 14 days old for it
 *   - Progress has changed ≤ 1 percentage point since then
 *
 * Why 1pp: captures rounding noise and tiny adjustments while catching
 * truly dormant projects.
 */

import type { ProjectRecord } from './dataTransforms';
import type { WeeklySnapshot } from './snapshots';
import { isActive } from './projectStatus';

const MS_DAY = 86400000;
const STALE_THRESHOLD_DAYS = 14;
const STALE_PROGRESS_PP = 0.01;

export type StaleState = 'fresh' | 'stale' | 'unknown';

export interface StaleInfo {
  state: StaleState;
  daysSinceLastMove: number | null;
  progressAtLastMove: number | null;
  progressNow: number;
  reason: string;
}

function parseIso(v: string): Date | null {
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeStaleness(
  projects: ProjectRecord[],
  snapshots: WeeklySnapshot[]
): Map<string, StaleInfo> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byId = new Map<string, { weekKey: string; progreso: number }[]>();
  for (const s of snapshots) {
    for (const entry of s.projects) {
      const arr = byId.get(entry.id) || [];
      arr.push({ weekKey: s.weekKey, progreso: entry.progreso });
      byId.set(entry.id, arr);
    }
  }

  const result = new Map<string, StaleInfo>();
  for (const p of projects) {
    if (!isActive(p.estatus)) continue;
    const history = (byId.get(p.id) || [])
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

    if (history.length === 0) {
      result.set(p.id, {
        state: 'unknown',
        daysSinceLastMove: null,
        progressAtLastMove: null,
        progressNow: p.progreso,
        reason: 'Sin snapshots para comparar todavía',
      });
      continue;
    }

    // Walk history from newest to oldest, find the last "meaningful" move
    const current = p.progreso;
    let lastMove: { weekKey: string; progreso: number } | null = null;
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (Math.abs(current - h.progreso) > STALE_PROGRESS_PP) {
        lastMove = h;
        break;
      }
    }

    if (!lastMove) {
      // Never moved since first snapshot
      const first = history[0];
      const firstDate = parseIso(first.weekKey);
      const days = firstDate ? Math.round((today.getTime() - firstDate.getTime()) / MS_DAY) : null;
      if (days !== null && days >= STALE_THRESHOLD_DAYS) {
        result.set(p.id, {
          state: 'stale',
          daysSinceLastMove: days,
          progressAtLastMove: first.progreso,
          progressNow: current,
          reason: `Sin movimiento en ${days} días (desde el primer snapshot)`,
        });
      } else {
        result.set(p.id, {
          state: 'fresh',
          daysSinceLastMove: days,
          progressAtLastMove: first.progreso,
          progressNow: current,
          reason: 'Sin historial suficiente para flagear',
        });
      }
      continue;
    }

    const moveDate = parseIso(lastMove.weekKey);
    const daysSince = moveDate
      ? Math.round((today.getTime() - moveDate.getTime()) / MS_DAY)
      : null;

    if (daysSince !== null && daysSince >= STALE_THRESHOLD_DAYS) {
      result.set(p.id, {
        state: 'stale',
        daysSinceLastMove: daysSince,
        progressAtLastMove: lastMove.progreso,
        progressNow: current,
        reason: `Progreso sin cambios en ${daysSince} días (último movimiento: ${lastMove.weekKey})`,
      });
    } else {
      result.set(p.id, {
        state: 'fresh',
        daysSinceLastMove: daysSince,
        progressAtLastMove: lastMove.progreso,
        progressNow: current,
        reason: daysSince !== null ? `Último movimiento hace ${daysSince} días` : 'Sin datos',
      });
    }
  }

  return result;
}

export function staleCount(map: Map<string, StaleInfo>): number {
  let n = 0;
  for (const info of map.values()) {
    if (info.state === 'stale') n++;
  }
  return n;
}
