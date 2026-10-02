import type { CostoRecord, ProjectRecord, TareaRecord } from './dataTransforms';
import { isTareaDone } from './dataTransforms';
import { estimateProjectCost } from './costEngine';
import { isCancelled } from './projectStatus';

export interface TeamVelocityStats {
  weeks: number;
  meanPoints: number;
  stddevPoints: number;
  cv: number;
  meanTasks: number;
  observations: { week: string; puntos: number; tareas: number }[];
}

export type ForecastConfidence = 'high' | 'medium' | 'low';
export type ForecastRisk = 'on-track' | 'slipping' | 'at-risk' | 'stalled' | 'done' | 'insufficient-data';

export interface ProjectForecast {
  project: ProjectRecord;
  daysElapsed: number;
  daysPlanned: number | null;
  expectedProgress: number | null;
  actualProgress: number;
  forecastDate: string | null;
  optimisticDate: string | null;
  pessimisticDate: string | null;
  slippageDays: number | null;
  confidence: ForecastConfidence;
  risk: ForecastRisk;
  onTimeProbability: number | null;
  warnings: string[];
}

const MS_DAY = 86400000;

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function weekKey(d: Date): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = t.getDay();
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((day + 6) % 7));
  return isoDate(monday);
}

export function computeTeamVelocity(tareas: TareaRecord[], windowWeeks = 8): TeamVelocityStats {
  const map = new Map<string, { week: string; puntos: number; tareas: number }>();
  for (const t of tareas) {
    if (!isTareaDone(t.estatus)) continue;
    const d = parseDate(t.finReal);
    if (!d) continue;
    const key = weekKey(d);
    const curr = map.get(key) || { week: key, puntos: 0, tareas: 0 };
    curr.puntos += t.puntos ?? 0;
    curr.tareas += 1;
    map.set(key, curr);
  }
  const all = [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
  const recent = all.slice(-windowWeeks);
  if (recent.length === 0) {
    return { weeks: 0, meanPoints: 0, stddevPoints: 0, cv: 0, meanTasks: 0, observations: [] };
  }
  const meanPoints = recent.reduce((s, w) => s + w.puntos, 0) / recent.length;
  const meanTasks = recent.reduce((s, w) => s + w.tareas, 0) / recent.length;
  const variance =
    recent.reduce((s, w) => s + Math.pow(w.puntos - meanPoints, 2), 0) / recent.length;
  const stddevPoints = Math.sqrt(variance);
  const cv = meanPoints > 0 ? stddevPoints / meanPoints : 0;
  return { weeks: recent.length, meanPoints, stddevPoints, cv, meanTasks, observations: recent };
}

export interface EstimationBias {
  count: number;
  globalRatio: number;
}

export function computeEstimationBias(tareas: TareaRecord[]): EstimationBias {
  // Estimado (`puntos`) vs real (`tracked`, mismo unidad de puntos). Antes era
  // App-only (tiempoET/estimacion); ahora aplica a toda actividad con ambos > 0.
  let totalEst = 0;
  let totalReal = 0;
  let count = 0;
  for (const t of tareas) {
    if (!t.puntos || !t.tracked) continue;
    if (t.puntos <= 0 || t.tracked <= 0) continue;
    totalEst += t.puntos;
    totalReal += t.tracked;
    count++;
  }
  const globalRatio = totalEst > 0 ? totalReal / totalEst : 1;
  return { count, globalRatio };
}

function confidenceFromCV(cv: number, weeks: number): ForecastConfidence {
  if (weeks < 3) return 'low';
  if (cv < 0.3) return 'high';
  if (cv < 0.6) return 'medium';
  return 'low';
}

function spreadFromCV(cv: number): number {
  const clamped = Math.max(0.15, Math.min(0.6, cv));
  return clamped;
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * abs);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-abs * abs);
  return sign * y;
}

function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function forecastProject(
  p: ProjectRecord,
  velocity: TeamVelocityStats
): ProjectForecast {
  const warnings: string[] = [];
  const today = today0();
  const start = parseDate(p.fechaInicio) || parseDate(p.registro);
  const plannedEnd = parseDate(p.finEstimado);

  const base: ProjectForecast = {
    project: p,
    daysElapsed: 0,
    daysPlanned: null,
    expectedProgress: null,
    actualProgress: p.progreso ?? 0,
    forecastDate: null,
    optimisticDate: null,
    pessimisticDate: null,
    slippageDays: null,
    confidence: 'low',
    risk: 'insufficient-data',
    onTimeProbability: null,
    warnings,
  };

  if (p.estatus === 'Done') {
    return { ...base, risk: 'done' };
  }

  // Un proyecto cancelado no se pronostica (terminal, fuera de la salud).
  if (isCancelled(p.estatus)) {
    warnings.push('Proyecto cancelado');
    return { ...base, risk: 'insufficient-data' };
  }

  if (!start) {
    warnings.push('Sin fecha de inicio');
    return base;
  }

  const daysElapsed = Math.max(0, daysBetween(start, today));
  const daysPlanned = plannedEnd ? Math.max(1, daysBetween(start, plannedEnd)) : null;
  const expectedProgress = daysPlanned ? Math.min(1, daysElapsed / daysPlanned) : null;

  if (p.progreso >= 1) {
    return {
      ...base,
      daysElapsed,
      daysPlanned,
      expectedProgress,
      forecastDate: isoDate(today),
      optimisticDate: isoDate(today),
      pessimisticDate: isoDate(today),
      slippageDays: plannedEnd ? daysBetween(plannedEnd, today) : null,
      confidence: 'high',
      risk: 'done',
    };
  }

  if (p.progreso <= 0) {
    if (p.estatus === 'Upcoming') {
      warnings.push('Proyecto próximo a iniciar — sin progreso registrado');
      return {
        ...base,
        daysElapsed,
        daysPlanned,
        expectedProgress,
        risk: 'insufficient-data',
      };
    }
    warnings.push('Sin avance registrado pese a haber iniciado');
    return {
      ...base,
      daysElapsed,
      daysPlanned,
      expectedProgress,
      risk: 'stalled',
    };
  }

  if (daysElapsed < 3) {
    warnings.push('Muy poco tiempo transcurrido — proyección volátil');
  }

  const dailyRate = p.progreso / Math.max(1, daysElapsed);
  const daysToFinishFromToday = (1 - p.progreso) / dailyRate;
  const forecastDate = addDays(today, Math.round(daysToFinishFromToday));

  const spread = spreadFromCV(velocity.cv || 0.3);
  const optimisticDays = daysToFinishFromToday * (1 - spread);
  const pessimisticDays = daysToFinishFromToday * (1 + spread);
  const optimisticDate = addDays(today, Math.round(optimisticDays));
  const pessimisticDate = addDays(today, Math.round(pessimisticDays));

  const slippageDays = plannedEnd ? daysBetween(plannedEnd, forecastDate) : null;

  let risk: ForecastRisk = 'on-track';
  if (slippageDays === null) {
    risk = 'insufficient-data';
  } else if (slippageDays <= 3) {
    risk = 'on-track';
  } else if (slippageDays <= 14) {
    risk = 'slipping';
  } else {
    risk = 'at-risk';
  }

  if (expectedProgress !== null) {
    const gap = expectedProgress - p.progreso;
    if (gap > 0.3 && risk === 'on-track') risk = 'slipping';
    if (gap > 0.5 && risk !== 'at-risk') risk = 'at-risk';
  }

  const confidence = confidenceFromCV(velocity.cv || 0.5, velocity.weeks);

  let onTimeProbability: number | null = null;
  if (slippageDays !== null && daysToFinishFromToday > 0) {
    const sigma = daysToFinishFromToday * spread;
    if (sigma > 0) {
      onTimeProbability = normalCDF(-slippageDays / sigma);
    }
  }

  return {
    project: p,
    daysElapsed,
    daysPlanned,
    expectedProgress,
    actualProgress: p.progreso,
    forecastDate: isoDate(forecastDate),
    optimisticDate: isoDate(optimisticDate),
    pessimisticDate: isoDate(pessimisticDate),
    slippageDays,
    confidence,
    risk,
    onTimeProbability,
    warnings,
  };
}

export function forecastProjects(
  projects: ProjectRecord[],
  tareas: TareaRecord[]
): { forecasts: ProjectForecast[]; velocity: TeamVelocityStats; bias: EstimationBias } {
  const velocity = computeTeamVelocity(tareas);
  const bias = computeEstimationBias(tareas);
  const forecasts = projects
    .filter((p) => p.estatus !== 'On Hold' && !isCancelled(p.estatus))
    .map((p) => forecastProject(p, velocity));
  return { forecasts, velocity, bias };
}

export function riskMeta(risk: ForecastRisk): { label: string; color: string; bg: string; border: string } {
  switch (risk) {
    case 'done':
      return { label: 'Completado', color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30' };
    case 'on-track':
      return { label: 'En tiempo', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' };
    case 'slipping':
      return { label: 'Deslizando', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    case 'at-risk':
      return { label: 'En riesgo', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' };
    case 'stalled':
      return { label: 'Estancado', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' };
    case 'insufficient-data':
      return { label: 'Sin datos', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  }
}

export function confidenceMeta(c: ForecastConfidence): { label: string; color: string } {
  switch (c) {
    case 'high':
      return { label: 'Alta', color: 'text-green-400' };
    case 'medium':
      return { label: 'Media', color: 'text-amber-400' };
    case 'low':
      return { label: 'Baja', color: 'text-red-400' };
  }
}

export interface PortfolioBaseline {
  sampleSize: number;
  meanSlippage: number;
  medianSlippage: number;
  mae: number;
  onTimeRate: number;
  distribution: { bucket: string; count: number }[];
  worst?: { project: ProjectRecord; slippage: number };
  best?: { project: ProjectRecord; slippage: number };
}

export function computePortfolioBaseline(projects: ProjectRecord[]): PortfolioBaseline {
  const samples: { project: ProjectRecord; slippage: number }[] = [];
  for (const p of projects) {
    if (p.estatus !== 'Done') continue;
    const planned = parseDate(p.finEstimado);
    const real = parseDate(p.finReal);
    if (!planned || !real) continue;
    samples.push({ project: p, slippage: daysBetween(planned, real) });
  }
  if (samples.length === 0) {
    return {
      sampleSize: 0,
      meanSlippage: 0,
      medianSlippage: 0,
      mae: 0,
      onTimeRate: 0,
      distribution: [],
    };
  }
  const slippages = samples.map((s) => s.slippage);
  const mean = slippages.reduce((a, b) => a + b, 0) / slippages.length;
  const sortedSlip = [...slippages].sort((a, b) => a - b);
  const median = sortedSlip[Math.floor(sortedSlip.length / 2)];
  const mae = slippages.reduce((a, b) => a + Math.abs(b), 0) / slippages.length;
  const onTime = samples.filter((s) => Math.abs(s.slippage) <= 7).length;
  const buckets = [
    { bucket: '> 30d antes', test: (v: number) => v < -30 },
    { bucket: '7–30d antes', test: (v: number) => v >= -30 && v < -7 },
    { bucket: '±7d (en fecha)', test: (v: number) => v >= -7 && v <= 7 },
    { bucket: '7–30d tarde', test: (v: number) => v > 7 && v <= 30 },
    { bucket: '> 30d tarde', test: (v: number) => v > 30 },
  ];
  const distribution = buckets.map((b) => ({
    bucket: b.bucket,
    count: samples.filter((s) => b.test(s.slippage)).length,
  }));
  const sortedByAbs = [...samples].sort((a, b) => Math.abs(b.slippage) - Math.abs(a.slippage));
  const sortedByBest = [...samples].sort((a, b) => Math.abs(a.slippage) - Math.abs(b.slippage));
  return {
    sampleSize: samples.length,
    meanSlippage: Math.round(mean),
    medianSlippage: median,
    mae: Math.round(mae),
    onTimeRate: onTime / samples.length,
    distribution,
    worst: sortedByAbs[0],
    best: sortedByBest[0],
  };
}

export interface PersonCapacity {
  name: string;
  velocityPointsWeek: number;
  velocityTasksWeek: number;
  pendingTasks: number;
  pendingPoints: number;
  weeksToClear: number | null;
  forecastClearDate: string | null;
  overdueTasks: number;
}

function assigneeMatches(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

export function computePersonCapacity(tareas: TareaRecord[], windowWeeks = 8): PersonCapacity[] {
  const today = today0();
  const assignees = new Set<string>();
  for (const t of tareas) {
    if (t.asignado?.trim()) assignees.add(t.asignado.trim());
  }

  const canonical = new Map<string, string>();
  const names = [...assignees];
  for (const n of names) {
    const match = names.find((m) => m !== n && assigneeMatches(n, m) && m.length < n.length);
    canonical.set(n, match || n);
  }

  const grouped = new Map<string, TareaRecord[]>();
  for (const t of tareas) {
    const raw = t.asignado?.trim();
    if (!raw) continue;
    const key = canonical.get(raw) || raw;
    const arr = grouped.get(key) || [];
    arr.push(t);
    grouped.set(key, arr);
  }

  const results: PersonCapacity[] = [];
  for (const [name, tasks] of grouped) {
    const weekMap = new Map<string, { puntos: number; tareas: number }>();
    for (const t of tasks) {
      if (!isTareaDone(t.estatus)) continue;
      const d = parseDate(t.finReal);
      if (!d) continue;
      const key = weekKey(d);
      const curr = weekMap.get(key) || { puntos: 0, tareas: 0 };
      curr.puntos += t.puntos ?? 0;
      curr.tareas += 1;
      weekMap.set(key, curr);
    }
    const weeks = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-windowWeeks);
    const totalPts = weeks.reduce((s, [, v]) => s + v.puntos, 0);
    const totalTasks = weeks.reduce((s, [, v]) => s + v.tareas, 0);
    const velocityPointsWeek = weeks.length > 0 ? totalPts / weeks.length : 0;
    const velocityTasksWeek = weeks.length > 0 ? totalTasks / weeks.length : 0;

    let pendingTasks = 0;
    let pendingPoints = 0;
    let overdueTasks = 0;
    for (const t of tasks) {
      const s = t.estatus?.toLowerCase() || '';
      if (isTareaDone(t.estatus) || s.includes('cancelad')) continue;
      pendingTasks++;
      pendingPoints += t.puntos ?? 0;
      const end = parseDate(t.finEstimado);
      if (end && end < today) overdueTasks++;
    }

    let weeksToClear: number | null = null;
    let forecastClearDate: string | null = null;
    if (pendingTasks > 0) {
      if (velocityPointsWeek > 0 && pendingPoints > 0) {
        weeksToClear = pendingPoints / velocityPointsWeek;
      } else if (velocityTasksWeek > 0) {
        weeksToClear = pendingTasks / velocityTasksWeek;
      }
      if (weeksToClear !== null && isFinite(weeksToClear)) {
        forecastClearDate = isoDate(addDays(today, Math.round(weeksToClear * 7)));
      }
    }

    results.push({
      name,
      velocityPointsWeek,
      velocityTasksWeek,
      pendingTasks,
      pendingPoints,
      weeksToClear,
      forecastClearDate,
      overdueTasks,
    });
  }

  return results.sort((a, b) => {
    if (a.pendingTasks === 0 && b.pendingTasks > 0) return 1;
    if (b.pendingTasks === 0 && a.pendingTasks > 0) return -1;
    return (b.weeksToClear ?? 0) - (a.weeksToClear ?? 0);
  });
}

// --- Aggregation by hito -----------------------------------------------------

export interface HitoForecast {
  hito: string;
  count: number;
  activeCount: number;
  avgProgress: number;
  latestForecast: string | null;
  latestPlanned: string | null;
  aggregateSlippage: number | null;
  worstRisk: ForecastRisk;
  atRiskCount: number;
  slippingCount: number;
  onTrackCount: number;
  doneCount: number;
  forecasts: ProjectForecast[];
}

const RISK_SEVERITY: Record<ForecastRisk, number> = {
  'at-risk': 5,
  stalled: 4,
  slipping: 3,
  'insufficient-data': 2,
  'on-track': 1,
  done: 0,
};

function worstRiskOf(forecasts: ProjectForecast[]): ForecastRisk {
  let worst: ForecastRisk = 'done';
  for (const f of forecasts) {
    if (RISK_SEVERITY[f.risk] > RISK_SEVERITY[worst]) worst = f.risk;
  }
  return worst;
}

export function aggregateByHito(forecasts: ProjectForecast[]): HitoForecast[] {
  const groups = new Map<string, ProjectForecast[]>();
  for (const f of forecasts) {
    const key = f.project.hito?.trim() || 'Sin hito';
    const arr = groups.get(key) || [];
    arr.push(f);
    groups.set(key, arr);
  }
  const results: HitoForecast[] = [];
  for (const [hito, fcs] of groups) {
    const active = fcs.filter((f) => f.risk !== 'done');
    const count = fcs.length;
    const activeCount = active.length;
    const avgProgress =
      fcs.length > 0 ? fcs.reduce((s, f) => s + f.actualProgress, 0) / fcs.length : 0;
    const forecastDates = active
      .map((f) => f.forecastDate)
      .filter((v): v is string => !!v);
    const plannedDates = fcs
      .map((f) => f.project.finEstimado)
      .filter((v): v is string => !!v && !isNaN(new Date(v).getTime()));
    const latestForecast = forecastDates.length
      ? forecastDates.reduce((a, b) => (a > b ? a : b))
      : null;
    const latestPlanned = plannedDates.length
      ? plannedDates.reduce((a, b) => (a > b ? a : b))
      : null;
    let aggregateSlippage: number | null = null;
    if (latestForecast && latestPlanned) {
      aggregateSlippage = Math.round(
        (new Date(latestForecast).getTime() - new Date(latestPlanned).getTime()) / MS_DAY
      );
    }
    const atRiskCount = fcs.filter((f) => f.risk === 'at-risk' || f.risk === 'stalled').length;
    const slippingCount = fcs.filter((f) => f.risk === 'slipping').length;
    const onTrackCount = fcs.filter((f) => f.risk === 'on-track').length;
    const doneCount = fcs.filter((f) => f.risk === 'done').length;

    results.push({
      hito,
      count,
      activeCount,
      avgProgress,
      latestForecast,
      latestPlanned,
      aggregateSlippage,
      worstRisk: worstRiskOf(active.length > 0 ? active : fcs),
      atRiskCount,
      slippingCount,
      onTrackCount,
      doneCount,
      forecasts: fcs,
    });
  }
  return results.sort((a, b) => {
    const ra = RISK_SEVERITY[a.worstRisk];
    const rb = RISK_SEVERITY[b.worstRisk];
    if (ra !== rb) return rb - ra;
    return (b.aggregateSlippage ?? 0) - (a.aggregateSlippage ?? 0);
  });
}

// --- Team capacity projection ------------------------------------------------

export type CapacityStatus = 'free' | 'healthy' | 'saturated' | 'overloaded';

export interface CapacityHorizon {
  weeks: number;
  supplyPoints: number;
  demandPoints: number;
  utilization: number;
  status: CapacityStatus;
  activeProjects: number;
}

export function computeCapacityProjection(
  forecasts: ProjectForecast[],
  velocity: TeamVelocityStats,
  horizons: number[] = [4, 8, 12]
): CapacityHorizon[] {
  const active = forecasts.filter((f) => f.risk !== 'done');

  return horizons.map((weeks) => {
    const supply = velocity.meanPoints * weeks;
    let demand = 0;
    for (const f of active) {
      if (!f.forecastDate) continue;
      const total = f.project.puntos ?? 0;
      if (total <= 0) continue;
      const remaining = total * Math.max(0, 1 - (f.actualProgress || 0));
      const daysRemainingForecast = Math.max(
        1,
        (new Date(f.forecastDate).getTime() - today0().getTime()) / MS_DAY
      );
      const horizonDays = weeks * 7;
      const capturedFraction = Math.min(1, horizonDays / daysRemainingForecast);
      demand += remaining * capturedFraction;
    }
    const utilization = supply > 0 ? demand / supply : 0;
    let status: CapacityStatus;
    if (utilization < 0.7) status = 'free';
    else if (utilization <= 0.95) status = 'healthy';
    else if (utilization <= 1.15) status = 'saturated';
    else status = 'overloaded';
    return {
      weeks,
      supplyPoints: Math.round(supply),
      demandPoints: Math.round(demand),
      utilization,
      status,
      activeProjects: active.length,
    };
  });
}

export function capacityStatusMeta(s: CapacityStatus): { label: string; color: string; bg: string; barColor: string } {
  switch (s) {
    case 'free':
      return { label: 'Holgura', color: 'text-green-400', bg: 'bg-green-500/15', barColor: 'bg-green-500' };
    case 'healthy':
      return { label: 'Sano', color: 'text-blue-400', bg: 'bg-blue-500/15', barColor: 'bg-blue-500' };
    case 'saturated':
      return { label: 'Saturado', color: 'text-amber-400', bg: 'bg-amber-500/15', barColor: 'bg-amber-500' };
    case 'overloaded':
      return { label: 'Sobrecarga', color: 'text-red-400', bg: 'bg-red-500/15', barColor: 'bg-red-500' };
  }
}

// --- Critical upcoming dates -------------------------------------------------

export type CriticalKind = 'forecast' | 'planned';

export interface CriticalEvent {
  forecast: ProjectForecast;
  kind: CriticalKind;
  date: string;
  daysFromNow: number;
}

export interface CriticalWindow {
  windowDays: number;
  label: string;
  events: CriticalEvent[];
}

export function computeCriticalDates(
  forecasts: ProjectForecast[],
  windows: number[] = [30, 60, 90]
): CriticalWindow[] {
  const today = today0();
  const sortedWindows = [...windows].sort((a, b) => a - b);
  const active = forecasts.filter((f) => f.risk !== 'done');

  const events: CriticalEvent[] = [];
  for (const f of active) {
    if (f.forecastDate) {
      const d = new Date(f.forecastDate);
      if (!isNaN(d.getTime())) {
        const diff = Math.round((d.getTime() - today.getTime()) / MS_DAY);
        events.push({ forecast: f, kind: 'forecast', date: f.forecastDate, daysFromNow: diff });
      }
    }
  }

  events.sort((a, b) => a.daysFromNow - b.daysFromNow);

  const buckets: CriticalWindow[] = sortedWindows.map((w, i) => {
    const prev = i === 0 ? -Infinity : sortedWindows[i - 1];
    const label =
      i === 0 ? `Próximos ${w} días` : `${prev + 1}–${w} días`;
    return {
      windowDays: w,
      label,
      events: events.filter((e) => e.daysFromNow <= w && e.daysFromNow > prev),
    };
  });
  return buckets;
}

export function probabilityMeta(p: number | null): { label: string; color: string; bg: string } {
  if (p === null) return { label: '—', color: 'text-slate-400', bg: 'bg-slate-500/15' };
  const pct = Math.round(p * 100);
  const label = `${pct}%`;
  if (pct >= 75) return { label, color: 'text-green-400', bg: 'bg-green-500/15' };
  if (pct >= 50) return { label, color: 'text-blue-400', bg: 'bg-blue-500/15' };
  if (pct >= 25) return { label, color: 'text-amber-400', bg: 'bg-amber-500/15' };
  return { label, color: 'text-red-400', bg: 'bg-red-500/15' };
}

// --- Slippage cost impact ----------------------------------------------------

export interface ProjectCostImpact {
  forecast: ProjectForecast;
  monthlyCost: number;
  additionalCost: number;
  slippageDays: number;
}

export interface SlippageCostImpact {
  total: number;
  sampleSize: number;
  portfolioMonthly: number;
  items: ProjectCostImpact[];
  coveredProjects: number;
  uncoveredProjects: number;
}

export function computeSlippageCostImpact(
  forecasts: ProjectForecast[],
  allProjects: ProjectRecord[],
  costos: CostoRecord[]
): SlippageCostImpact {
  const items: ProjectCostImpact[] = [];
  let total = 0;
  let portfolioMonthly = 0;
  let coveredProjects = 0;
  let uncoveredProjects = 0;

  for (const f of forecasts) {
    if (f.risk === 'done' || f.risk === 'insufficient-data') continue;
    if (f.slippageDays === null || f.slippageDays <= 0) continue;
    const cost = estimateProjectCost(f.project, allProjects, costos);
    if (cost.estimatedMonthlyCost <= 0) {
      uncoveredProjects++;
      continue;
    }
    coveredProjects++;
    portfolioMonthly += cost.estimatedMonthlyCost;
    const additional = (cost.estimatedMonthlyCost / 30) * f.slippageDays;
    total += additional;
    items.push({
      forecast: f,
      monthlyCost: cost.estimatedMonthlyCost,
      additionalCost: additional,
      slippageDays: f.slippageDays,
    });
  }

  items.sort((a, b) => b.additionalCost - a.additionalCost);

  return {
    total: Math.round(total),
    sampleSize: items.length,
    portfolioMonthly: Math.round(portfolioMonthly),
    items,
    coveredProjects,
    uncoveredProjects,
  };
}
