/**
 * Forecast backtesting using historical snapshots.
 *
 * For each project now in Done state with a finReal date, look back through
 * snapshots to find when it was still active with meaningful progress. Compute
 * what the linear-extrapolation forecast would have produced at that moment,
 * then compare against actual finReal.
 */

import type { ProjectRecord } from './dataTransforms';
import type { WeeklySnapshot } from './snapshots';

const MS_DAY = 86400000;

export interface BacktestEntry {
  project: ProjectRecord;
  snapshotWeek: string;
  snapshotProgress: number;
  predictedDate: string;
  actualDate: string;
  errorDays: number;
}

export interface BacktestResult {
  sampleSize: number;
  mae: number;
  meanError: number;
  medianError: number;
  within7d: number;
  within14d: number;
  entries: BacktestEntry[];
}

function parseDate(v: string | undefined | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_DAY);
}

export function runBacktest(
  snapshots: WeeklySnapshot[],
  projects: ProjectRecord[]
): BacktestResult {
  const empty: BacktestResult = {
    sampleSize: 0,
    mae: 0,
    meanError: 0,
    medianError: 0,
    within7d: 0,
    within14d: 0,
    entries: [],
  };
  if (snapshots.length === 0) return empty;

  const entries: BacktestEntry[] = [];
  for (const project of projects) {
    if (project.estatus !== 'Done') continue;
    const finReal = parseDate(project.finReal);
    const fechaInicio = parseDate(project.fechaInicio) || parseDate(project.registro);
    if (!finReal || !fechaInicio) continue;

    // Find the earliest snapshot with meaningful progress (20–80%) for this project
    const candidate = snapshots
      .map((s) => {
        const match = s.projects.find((p) => p.id === project.id);
        return match ? { snapshot: s, entry: match } : null;
      })
      .filter((v): v is NonNullable<typeof v> => !!v)
      .find(({ entry }) => entry.progreso >= 0.2 && entry.progreso < 0.95);

    if (!candidate) continue;

    const snapshotDate = parseDate(candidate.snapshot.weekKey);
    if (!snapshotDate) continue;
    const daysElapsed = daysBetween(fechaInicio, snapshotDate);
    if (daysElapsed <= 0) continue;

    const dailyRate = candidate.entry.progreso / daysElapsed;
    if (dailyRate <= 0) continue;
    const daysToFinish = (1 - candidate.entry.progreso) / dailyRate;
    const predictedMs = snapshotDate.getTime() + daysToFinish * MS_DAY;
    const predictedDate = new Date(predictedMs);
    predictedDate.setHours(0, 0, 0, 0);

    const errorDays = daysBetween(finReal, predictedDate);

    entries.push({
      project,
      snapshotWeek: candidate.snapshot.weekKey,
      snapshotProgress: candidate.entry.progreso,
      predictedDate: predictedDate.toISOString().split('T')[0],
      actualDate: project.finReal,
      errorDays,
    });
  }

  if (entries.length === 0) return empty;

  const errors = entries.map((e) => e.errorDays);
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
  const meanError = errors.reduce((s, e) => s + e, 0) / errors.length;
  const sorted = [...errors].sort((a, b) => a - b);
  const medianError = sorted[Math.floor(sorted.length / 2)];
  const within7d = entries.filter((e) => Math.abs(e.errorDays) <= 7).length / entries.length;
  const within14d = entries.filter((e) => Math.abs(e.errorDays) <= 14).length / entries.length;

  entries.sort((a, b) => Math.abs(b.errorDays) - Math.abs(a.errorDays));

  return {
    sampleSize: entries.length,
    mae: Math.round(mae),
    meanError: Math.round(meanError),
    medianError: medianError,
    within7d,
    within14d,
    entries,
  };
}
