/**
 * Detect abrupt rhythm changes in active projects using weekly snapshots.
 *
 * Baseline: average progress rate (pp/week) across all snapshots up to the
 * previous-to-last week. Recent: rate between the last snapshot and today.
 *
 * Flags:
 *   - slowdown:     recent rate ≤ 30% of baseline AND baseline ≥ 0.5 pp/wk
 *   - stall:        recent rate ≤ 0.1 pp/wk AND had history of movement
 *   - acceleration: recent rate ≥ 200% of baseline
 *
 * Requires ≥ 3 snapshots for a project.
 */

import type { ProjectRecord } from './dataTransforms';
import type { WeeklySnapshot } from './snapshots';
import { isActive } from './projectStatus';

const MS_DAY = 86400000;

export type AnomalyKind = 'slowdown' | 'stall' | 'acceleration';
export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface ProjectAnomaly {
  project: ProjectRecord;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  recentRatePerWeek: number;
  baselineRatePerWeek: number;
  ratio: number;
  reason: string;
  snapshotsUsed: number;
}

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseIso(v: string): Date | null {
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function detectAnomalies(
  projects: ProjectRecord[],
  snapshots: WeeklySnapshot[]
): ProjectAnomaly[] {
  if (snapshots.length === 0) return [];
  const today = today0();

  const byId = new Map<string, { weekKey: string; progreso: number }[]>();
  for (const s of snapshots) {
    for (const entry of s.projects) {
      const arr = byId.get(entry.id) || [];
      arr.push({ weekKey: s.weekKey, progreso: entry.progreso });
      byId.set(entry.id, arr);
    }
  }

  const results: ProjectAnomaly[] = [];
  for (const project of projects) {
    if (!isActive(project.estatus)) continue;
    const history = (byId.get(project.id) || []).sort((a, b) =>
      a.weekKey.localeCompare(b.weekKey)
    );
    if (history.length < 2) continue;

    const current = project.progreso;

    // Recent: from second-to-last snapshot to today (using current live value)
    const lastSnap = history[history.length - 1];
    const lastSnapDate = parseIso(lastSnap.weekKey);
    if (!lastSnapDate) continue;
    const daysRecent = Math.max(1, (today.getTime() - lastSnapDate.getTime()) / MS_DAY);
    const weeksRecent = daysRecent / 7;
    const deltaRecent = current - lastSnap.progreso;
    const recentRatePerWeek = deltaRecent / weeksRecent;

    // Baseline: rate from first snapshot to last snapshot (in pp/week)
    const firstSnap = history[0];
    const firstSnapDate = parseIso(firstSnap.weekKey);
    if (!firstSnapDate) continue;
    const daysBaseline = Math.max(1, (lastSnapDate.getTime() - firstSnapDate.getTime()) / MS_DAY);
    const weeksBaseline = daysBaseline / 7;
    if (weeksBaseline < 1) continue; // need at least a week of history
    const deltaBaseline = lastSnap.progreso - firstSnap.progreso;
    const baselineRatePerWeek = deltaBaseline / weeksBaseline;

    const ratio = baselineRatePerWeek > 0 ? recentRatePerWeek / baselineRatePerWeek : 0;

    // Classify
    let kind: AnomalyKind | null = null;
    let severity: AnomalySeverity = 'info';
    let reason = '';

    if (baselineRatePerWeek >= 0.5 && recentRatePerWeek <= 0.1) {
      kind = 'stall';
      severity = 'critical';
      reason = `El proyecto avanzaba a ${baselineRatePerWeek.toFixed(1)} pp/sem y ahora está prácticamente detenido (${recentRatePerWeek.toFixed(1)} pp/sem).`;
    } else if (baselineRatePerWeek >= 0.5 && ratio > 0 && ratio <= 0.3) {
      kind = 'slowdown';
      severity = ratio < 0.15 ? 'critical' : 'warning';
      reason = `El ritmo cayó a ${Math.round(ratio * 100)}% de su línea base (${recentRatePerWeek.toFixed(1)} pp/sem vs ${baselineRatePerWeek.toFixed(1)} pp/sem).`;
    } else if (baselineRatePerWeek > 0 && ratio >= 2) {
      kind = 'acceleration';
      severity = 'info';
      reason = `El ritmo subió ${Math.round(ratio * 100)}% sobre su línea base (${recentRatePerWeek.toFixed(1)} pp/sem vs ${baselineRatePerWeek.toFixed(1)} pp/sem).`;
    }

    if (kind) {
      results.push({
        project,
        kind,
        severity,
        recentRatePerWeek,
        baselineRatePerWeek,
        ratio,
        reason,
        snapshotsUsed: history.length,
      });
    }
  }

  // Sort: critical first, then warning, then acceleration
  const sevOrder: Record<AnomalySeverity, number> = { critical: 0, warning: 1, info: 2 };
  return results.sort((a, b) => {
    if (a.severity !== b.severity) return sevOrder[a.severity] - sevOrder[b.severity];
    return Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1);
  });
}

export function anomalyMeta(kind: AnomalyKind): { label: string; color: string; bg: string; border: string } {
  switch (kind) {
    case 'stall':
      return { label: 'Detenido', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' };
    case 'slowdown':
      return { label: 'Desaceleración', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    case 'acceleration':
      return { label: 'Aceleración', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' };
  }
}
