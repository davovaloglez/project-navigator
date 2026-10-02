/**
 * Proactive alerts derived from the forecast engine, snapshots, anomalies
 * and dependencies. Complements the static alerts from healthScore.ts with
 * signals that only emerge from the temporal and predictive analysis.
 */

import type { ProjectRecord } from './dataTransforms';
import type { ProjectForecast } from './forecastEngine';
import type { StaleInfo } from './stale';
import type { ProjectAnomaly } from './anomalies';
import type { ProjectDependency } from './dependencies';

export type ForecastAlertType =
  | 'forecast-at-risk'
  | 'stale-data'
  | 'anomaly-stall'
  | 'anomaly-slowdown'
  | 'blocker-unresolved'
  | 'blocker-at-risk';

export type ForecastAlertSeverity = 'critical' | 'warning' | 'info';

export interface ForecastAlert {
  type: ForecastAlertType;
  severity: ForecastAlertSeverity;
  title: string;
  description: string;
  project: ProjectRecord;
}

interface Inputs {
  forecasts: ProjectForecast[];
  staleMap: Map<string, StaleInfo>;
  anomalies: ProjectAnomaly[];
  dependencies: ProjectDependency[];
}

export function generateForecastAlerts(inputs: Inputs): ForecastAlert[] {
  const out: ForecastAlert[] = [];

  for (const f of inputs.forecasts) {
    if (f.risk === 'done' || f.risk === 'insufficient-data') continue;
    const p = f.project;

    if (f.risk === 'at-risk' || f.risk === 'stalled') {
      out.push({
        type: 'forecast-at-risk',
        severity: 'critical',
        title: `${p.actividad} — pronóstico en riesgo`,
        description:
          f.slippageDays !== null && f.slippageDays > 0
            ? `Pronóstico +${f.slippageDays}d vs fin estimado${f.onTimeProbability !== null ? ` · ${Math.round(f.onTimeProbability * 100)}% probabilidad a tiempo` : ''}`
            : `Motor clasifica como "${f.risk}"`,
        project: p,
      });
    }
  }

  for (const [id, info] of inputs.staleMap) {
    if (info.state !== 'stale') continue;
    const project = inputs.forecasts.find((f) => f.project.id === id)?.project;
    if (!project) continue;
    out.push({
      type: 'stale-data',
      severity: info.daysSinceLastMove && info.daysSinceLastMove > 30 ? 'critical' : 'warning',
      title: `${project.actividad} — progreso sin actualizar`,
      description: info.reason,
      project,
    });
  }

  for (const a of inputs.anomalies) {
    if (a.kind === 'stall') {
      out.push({
        type: 'anomaly-stall',
        severity: 'critical',
        title: `${a.project.actividad} — detenido`,
        description: a.reason,
        project: a.project,
      });
    } else if (a.kind === 'slowdown') {
      out.push({
        type: 'anomaly-slowdown',
        severity: a.severity === 'critical' ? 'critical' : 'warning',
        title: `${a.project.actividad} — desaceleración`,
        description: a.reason,
        project: a.project,
      });
    }
  }

  for (const d of inputs.dependencies) {
    if (d.unresolvedBlockerCount === 0) continue;
    const atRiskBlockers = d.blockers.filter((b) => b.status === 'at-risk');
    if (atRiskBlockers.length > 0) {
      const names = atRiskBlockers
        .map((b) => b.target?.actividad || b.rawText)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      out.push({
        type: 'blocker-at-risk',
        severity: 'critical',
        title: `${d.dependent.actividad} — bloqueador en riesgo`,
        description: `Depende de: ${names}${atRiskBlockers.length > 3 ? '…' : ''}${d.additionalSlippageDays ? ` · +${d.additionalSlippageDays}d por cascada` : ''}`,
        project: d.dependent,
      });
    } else {
      const names = d.blockers
        .filter((b) => b.status === 'active')
        .map((b) => b.target?.actividad || b.rawText)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      if (names) {
        out.push({
          type: 'blocker-unresolved',
          severity: 'warning',
          title: `${d.dependent.actividad} — ${d.unresolvedBlockerCount} bloqueador${d.unresolvedBlockerCount !== 1 ? 'es' : ''} pendiente${d.unresolvedBlockerCount !== 1 ? 's' : ''}`,
          description: `Depende de: ${names}${d.blockers.length > 3 ? '…' : ''}`,
          project: d.dependent,
        });
      }
    }
  }

  const severityOrder: Record<ForecastAlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  out.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return out;
}

export function forecastAlertTypeMeta(type: ForecastAlertType): { label: string } {
  switch (type) {
    case 'forecast-at-risk':
      return { label: 'Pronóstico en riesgo' };
    case 'stale-data':
      return { label: 'Datos sin actualizar' };
    case 'anomaly-stall':
      return { label: 'Detenido' };
    case 'anomaly-slowdown':
      return { label: 'Desaceleración' };
    case 'blocker-unresolved':
      return { label: 'Bloqueador pendiente' };
    case 'blocker-at-risk':
      return { label: 'Bloqueador en riesgo' };
  }
}
