/**
 * Projected completion dates for team members' courses.
 *
 * Velocity comes from historical snapshots: for each colaborador, compare the
 * oldest and newest snapshot progress to derive progress-points-per-week, then
 * extrapolate to 100%.
 *
 * Without snapshots we can't compute velocity (there are no dates in the Cursos
 * sheet), so we return `source: 'none'` and the UI shows the collection prompt.
 */

import type { CursoRecord } from './dataTransforms';
import type { WeeklySnapshot } from './snapshots';

const MS_DAY = 86400000;

export type CourseForecastSource = 'snapshots' | 'none';
export type CourseTrend = 'advancing' | 'stalled' | 'declining' | 'unknown' | 'done';

export interface CourseForecast {
  colaborador: string;
  ou: string;
  rol: string;
  progresoActual: number;
  pidsCreados: number;
  velocityPerWeek: number | null;
  weeksToFinish: number | null;
  forecastFinishDate: string | null;
  source: CourseForecastSource;
  trend: CourseTrend;
  snapshotsUsed: number;
}

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseIsoDate(v: string): Date | null {
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function computeCourseForecasts(
  cursos: CursoRecord[],
  snapshots: WeeklySnapshot[]
): CourseForecast[] {
  const today = today0();

  const historyByName = new Map<string, { weekKey: string; progreso: number }[]>();
  for (const s of snapshots) {
    for (const entry of s.cursos) {
      const arr = historyByName.get(entry.colaborador) || [];
      arr.push({ weekKey: s.weekKey, progreso: entry.progreso });
      historyByName.set(entry.colaborador, arr);
    }
  }

  const results: CourseForecast[] = [];
  for (const c of cursos) {
    const history = (historyByName.get(c.colaborador) || [])
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey));

    let velocityPerWeek: number | null = null;
    let source: CourseForecastSource = 'none';
    let trend: CourseTrend = 'unknown';
    let snapshotsUsed = 0;

    if (c.progreso >= 100) {
      trend = 'done';
    } else if (history.length >= 1) {
      // Combine snapshot history with current live value as the latest point
      const first = history[0];
      const firstDate = parseIsoDate(first.weekKey);
      if (firstDate) {
        const weeksSinceFirst = Math.max(1, (today.getTime() - firstDate.getTime()) / (MS_DAY * 7));
        const delta = c.progreso - first.progreso;
        snapshotsUsed = history.length;
        if (weeksSinceFirst >= 1) {
          velocityPerWeek = delta / weeksSinceFirst;
          source = 'snapshots';
          if (velocityPerWeek > 0.5) trend = 'advancing';
          else if (velocityPerWeek >= -0.5) trend = 'stalled';
          else trend = 'declining';
        }
      }
    }

    let weeksToFinish: number | null = null;
    let forecastFinishDate: string | null = null;
    if (c.progreso < 100 && velocityPerWeek !== null && velocityPerWeek > 0) {
      const remaining = 100 - c.progreso;
      weeksToFinish = remaining / velocityPerWeek;
      if (isFinite(weeksToFinish) && weeksToFinish > 0) {
        forecastFinishDate = isoDate(addDays(today, Math.round(weeksToFinish * 7)));
      } else {
        weeksToFinish = null;
      }
    }

    results.push({
      colaborador: c.colaborador,
      ou: c.ou,
      rol: c.rol,
      progresoActual: c.progreso,
      pidsCreados: c.pidsCreados,
      velocityPerWeek,
      weeksToFinish,
      forecastFinishDate,
      source,
      trend,
      snapshotsUsed,
    });
  }

  return results.sort((a, b) => {
    const rank = (t: CourseTrend) =>
      t === 'done' ? 3 : t === 'advancing' ? 0 : t === 'stalled' ? 1 : t === 'declining' ? 2 : 2;
    const ra = rank(a.trend);
    const rb = rank(b.trend);
    if (ra !== rb) return ra - rb;
    return b.progresoActual - a.progresoActual;
  });
}

export function courseTrendMeta(t: CourseTrend): { label: string; color: string; bg: string } {
  switch (t) {
    case 'advancing':
      return { label: 'Avanzando', color: 'text-green-400', bg: 'bg-green-500/15' };
    case 'stalled':
      return { label: 'Sin ritmo', color: 'text-amber-400', bg: 'bg-amber-500/15' };
    case 'declining':
      return { label: 'Retrocediendo', color: 'text-red-400', bg: 'bg-red-500/15' };
    case 'done':
      return { label: 'Completado', color: 'text-slate-400', bg: 'bg-slate-500/15' };
    case 'unknown':
      return { label: 'Sin datos', color: 'text-slate-400', bg: 'bg-slate-500/10' };
  }
}
