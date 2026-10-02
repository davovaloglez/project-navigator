import type { ProjectRecord } from './dataTransforms';
import { isActive, isCancelled } from './projectStatus';

export interface HealthDetail {
  score: number;        // 0-100
  label: string;        // Crítico, Bajo, Medio, Alto, Excelente
  color: string;        // tailwind text color
  bgColor: string;      // tailwind bg color
  chartColor: string;   // hex
  factors: string[];    // human-readable explanations
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (86400000));
}

/**
 * Calculates a health score (0-100) for a project by crossing:
 * - Progress vs expected progress (based on dates)
 * - Estatus
 * - Salud (manual field)
 * - Whether it has pending actions
 */
export function calcHealthScore(p: ProjectRecord): HealthDetail {
  // Un proyecto cancelado no cuenta para la SALUD: se reporta neutro (N/A) y
  // los agregados lo excluyen vía `isActive` / `countsForHealth`.
  if (isCancelled(p.estatus)) {
    return {
      score: 0,
      label: 'Cancelado',
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/15',
      chartColor: '#94a3b8',
      factors: ['Proyecto cancelado — no cuenta para la salud'],
    };
  }

  let score = 60; // Start neutral
  const factors: string[] = [];

  // 1. Estatus weight (±20)
  if (p.estatus === 'Done') { score += 30; factors.push('Proyecto completado'); }
  else if (p.estatus === 'On Track') { score += 15; factors.push('Estatus On Track'); }
  else if (p.estatus === 'LaunchPhase') { score += 12; factors.push('En fase de lanzamiento'); }
  else if (p.estatus === 'Hypercare') { score += 10; factors.push('En Hypercare'); }
  else if (p.estatus === 'Upcoming') { score += 5; factors.push('Próximo a iniciar'); }
  else if (p.estatus === 'On Hold') { score -= 5; factors.push('Proyecto pausado'); }
  else if (p.estatus === 'At Risk') { score -= 15; factors.push('Estatus At Risk'); }
  else if (p.estatus === 'Blocked / Critical') { score -= 25; factors.push('Bloqueado / Crítico'); }

  // 2. Salud manual (±10)
  if (p.salud === 'Estable') { score += 10; }
  else if (p.salud === 'Requiere atencion') { score -= 5; factors.push('Requiere atención'); }
  else if (p.salud === 'En riesgo') { score -= 10; factors.push('Salud en riesgo'); }

  // 3. Progress vs expected progress (±20)
  if (p.finEstimado && (p.fechaInicio || p.registro) && p.estatus !== 'Done') {
    const start = new Date(p.fechaInicio || p.registro);
    const end = new Date(p.finEstimado);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const totalDays = daysBetween(start, end);
      const elapsed = daysBetween(start, TODAY);
      if (totalDays > 0 && elapsed > 0) {
        const expectedProgress = Math.min(elapsed / totalDays, 1);
        const diff = p.progreso - expectedProgress;
        if (diff >= 0.1) { score += 10; factors.push('Progreso adelantado'); }
        else if (diff >= -0.1) { /* on track */ }
        else if (diff >= -0.3) { score -= 10; factors.push('Progreso rezagado'); }
        else { score -= 20; factors.push('Progreso muy rezagado'); }
      }
    }
  }

  // 4. Overdue check (±15)
  if (p.finEstimado && p.estatus !== 'Done' && p.estatus !== 'On Hold') {
    const end = new Date(p.finEstimado);
    if (!isNaN(end.getTime()) && TODAY > end) {
      const overdueDays = daysBetween(end, TODAY);
      if (overdueDays > 30) { score -= 15; factors.push(`Vencido hace ${overdueDays} días`); }
      else if (overdueDays > 7) { score -= 10; factors.push(`Vencido hace ${overdueDays} días`); }
      else { score -= 5; factors.push(`Vencido hace ${overdueDays} días`); }
    }
  }

  // 5. Pending actions (-5)
  if (p.accionRequerida && p.estatus !== 'Done') {
    score -= 5;
    factors.push('Tiene acciones pendientes');
  }

  // 6. Priority weight
  if (p.prioridad === 'Bloqueadora' && p.estatus !== 'Done') { score -= 5; }
  else if (p.prioridad === 'Crítica' && p.estatus !== 'Done') { score -= 3; }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Label
  let label: string, color: string, bgColor: string, chartColor: string;
  if (score >= 85) { label = 'Excelente'; color = 'text-green-400'; bgColor = 'bg-green-500/15'; chartColor = '#4ade80'; }
  else if (score >= 65) { label = 'Bueno'; color = 'text-blue-400'; bgColor = 'bg-blue-500/15'; chartColor = '#60a5fa'; }
  else if (score >= 45) { label = 'Medio'; color = 'text-yellow-400'; bgColor = 'bg-yellow-500/15'; chartColor = '#facc15'; }
  else if (score >= 25) { label = 'Bajo'; color = 'text-orange-400'; bgColor = 'bg-orange-500/15'; chartColor = '#fb923c'; }
  else { label = 'Crítico'; color = 'text-red-400'; bgColor = 'bg-red-500/15'; chartColor = '#f87171'; }

  return { score, label, color, bgColor, chartColor, factors };
}

export type AlertType = 'overdue' | 'blocked' | 'at-risk' | 'low-progress' | 'action-needed' | 'upcoming-deadline';

export interface Alert {
  type: AlertType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  project: ProjectRecord;
}

export function generateAlerts(projects: ProjectRecord[]): Alert[] {
  const alerts: Alert[] = [];

  for (const p of projects) {
    if (!isActive(p.estatus)) continue;

    // Overdue
    if (p.finEstimado) {
      const end = new Date(p.finEstimado);
      if (!isNaN(end.getTime()) && TODAY > end) {
        const days = daysBetween(end, TODAY);
        alerts.push({
          type: 'overdue',
          severity: days > 14 ? 'critical' : 'warning',
          title: `${p.actividad} — vencido`,
          description: `"${p.folio}" venció hace ${days} día${days !== 1 ? 's' : ''} (${p.finEstimado})`,
          project: p,
        });
      }
    }

    // Upcoming deadline (next 7 days)
    if (p.finEstimado && p.progreso < 0.9) {
      const end = new Date(p.finEstimado);
      if (!isNaN(end.getTime())) {
        const daysLeft = daysBetween(TODAY, end);
        if (daysLeft >= 0 && daysLeft <= 7) {
          alerts.push({
            type: 'upcoming-deadline',
            severity: 'warning',
            title: `${p.actividad} — vence pronto`,
            description: `"${p.folio}" vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''} con ${Math.round(p.progreso * 100)}% de progreso`,
            project: p,
          });
        }
      }
    }

    // Blocked
    if (p.estatus === 'Blocked / Critical') {
      alerts.push({
        type: 'blocked',
        severity: 'critical',
        title: `${p.actividad} — bloqueado`,
        description: `"${p.folio}" está bloqueado/crítico${p.requiereDe ? ` — Requiere: ${p.requiereDe}` : ''}`,
        project: p,
      });
    }

    // At risk
    if (p.estatus === 'At Risk') {
      alerts.push({
        type: 'at-risk',
        severity: 'warning',
        title: `${p.actividad} — en riesgo`,
        description: `"${p.folio}" — Salud: ${p.salud}`,
        project: p,
      });
    }

    // Low progress with high priority
    if (p.progreso < 0.2 && (p.prioridad === 'Bloqueadora' || p.prioridad === 'Crítica') && p.estatus !== 'Upcoming') {
      alerts.push({
        type: 'low-progress',
        severity: 'warning',
        title: `${p.actividad} — sin avance`,
        description: `"${p.folio}" tiene ${Math.round(p.progreso * 100)}% y prioridad ${p.prioridad}`,
        project: p,
      });
    }

    // Pending actions
    if (p.accionRequerida) {
      alerts.push({
        type: 'action-needed',
        severity: 'info',
        title: `${p.actividad} — requiere acción`,
        description: `"${p.folio}" — Requiere: ${p.accionRequerida}${p.fechaAccion ? ` (${p.fechaAccion})` : ''}`,
        project: p,
      });
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}
