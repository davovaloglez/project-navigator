import type { ProjectRecord } from './types.js';
import { isActive, isCancelled } from './projectStatus.js';

export interface HealthDetail {
  score: number;
  label: string;
  factors: string[];
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function calcHealthScore(p: ProjectRecord): HealthDetail {
  if (isCancelled(p.estatus)) {
    return { score: 0, label: 'Cancelado', factors: ['Proyecto cancelado — no cuenta para la salud'] };
  }

  let score = 60;
  const factors: string[] = [];

  if (p.estatus === 'Done') { score += 30; factors.push('Proyecto completado'); }
  else if (p.estatus === 'On Track') { score += 15; factors.push('Estatus On Track'); }
  else if (p.estatus === 'LaunchPhase') { score += 12; factors.push('En fase de lanzamiento'); }
  else if (p.estatus === 'Hypercare') { score += 10; factors.push('En Hypercare'); }
  else if (p.estatus === 'Upcoming') { score += 5; factors.push('Próximo a iniciar'); }
  else if (p.estatus === 'On Hold') { score -= 5; factors.push('Proyecto pausado'); }
  else if (p.estatus === 'At Risk') { score -= 15; factors.push('Estatus At Risk'); }
  else if (p.estatus === 'Blocked / Critical') { score -= 25; factors.push('Bloqueado / Crítico'); }

  if (p.salud === 'Estable') { score += 10; }
  else if (p.salud === 'Requiere atencion') { score -= 5; factors.push('Requiere atención'); }
  else if (p.salud === 'En riesgo') { score -= 10; factors.push('Salud en riesgo'); }

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

  if (p.finEstimado && p.estatus !== 'Done' && p.estatus !== 'On Hold') {
    const end = new Date(p.finEstimado);
    if (!isNaN(end.getTime()) && TODAY > end) {
      const overdueDays = daysBetween(end, TODAY);
      if (overdueDays > 30) { score -= 15; factors.push(`Vencido hace ${overdueDays} días`); }
      else if (overdueDays > 7) { score -= 10; factors.push(`Vencido hace ${overdueDays} días`); }
      else { score -= 5; factors.push(`Vencido hace ${overdueDays} días`); }
    }
  }

  if (p.accionRequerida && p.estatus !== 'Done') {
    score -= 5;
    factors.push('Tiene acciones pendientes');
  }

  if (p.prioridad === 'Bloqueadora' && p.estatus !== 'Done') { score -= 5; }
  else if (p.prioridad === 'Crítica' && p.estatus !== 'Done') { score -= 3; }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  if (score >= 85) label = 'Excelente';
  else if (score >= 65) label = 'Bueno';
  else if (score >= 45) label = 'Medio';
  else if (score >= 25) label = 'Bajo';
  else label = 'Crítico';

  return { score, label, factors };
}

export type AlertType =
  | 'overdue'
  | 'blocked'
  | 'at-risk'
  | 'low-progress'
  | 'action-needed'
  | 'upcoming-deadline';

export interface Alert {
  type: AlertType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  /** Identidad canónica del proyecto. */
  id: string;
  folio: string;
  actividad: string;
  estatus: string;
}

export function generateAlerts(projects: ProjectRecord[]): Alert[] {
  const alerts: Alert[] = [];
  for (const p of projects) {
    if (!isActive(p.estatus)) continue;

    if (p.finEstimado) {
      const end = new Date(p.finEstimado);
      if (!isNaN(end.getTime()) && TODAY > end) {
        const days = daysBetween(end, TODAY);
        alerts.push({
          type: 'overdue',
          severity: days > 14 ? 'critical' : 'warning',
          title: `${p.actividad} — vencido`,
          description: `"${p.folio}" venció hace ${days} día${days !== 1 ? 's' : ''} (${p.finEstimado})`,
          id: p.id,
          folio: p.folio,
          actividad: p.actividad,
          estatus: p.estatus,
        });
      }
    }

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
            id: p.id,
            folio: p.folio,
            actividad: p.actividad,
            estatus: p.estatus,
          });
        }
      }
    }

    if (p.estatus === 'Blocked / Critical') {
      alerts.push({
        type: 'blocked',
        severity: 'critical',
        title: `${p.actividad} — bloqueado`,
        description: `"${p.folio}" está bloqueado/crítico${p.requiereDe ? ` — Requiere: ${p.requiereDe}` : ''}`,
        id: p.id,
        folio: p.folio,
        actividad: p.actividad,
        estatus: p.estatus,
      });
    }

    if (p.estatus === 'At Risk') {
      alerts.push({
        type: 'at-risk',
        severity: 'warning',
        title: `${p.actividad} — en riesgo`,
        description: `"${p.folio}" — Salud: ${p.salud}`,
        id: p.id,
        folio: p.folio,
        actividad: p.actividad,
        estatus: p.estatus,
      });
    }

    if (p.progreso < 0.2 && (p.prioridad === 'Bloqueadora' || p.prioridad === 'Crítica') && p.estatus !== 'Upcoming') {
      alerts.push({
        type: 'low-progress',
        severity: 'warning',
        title: `${p.actividad} — sin avance`,
        description: `"${p.folio}" tiene ${Math.round(p.progreso * 100)}% y prioridad ${p.prioridad}`,
        id: p.id,
        folio: p.folio,
        actividad: p.actividad,
        estatus: p.estatus,
      });
    }

    if (p.accionRequerida) {
      alerts.push({
        type: 'action-needed',
        severity: 'info',
        title: `${p.actividad} — requiere acción`,
        description: `"${p.folio}" — Requiere: ${p.accionRequerida}${p.fechaAccion ? ` (${p.fechaAccion})` : ''}`,
        id: p.id,
        folio: p.folio,
        actividad: p.actividad,
        estatus: p.estatus,
      });
    }
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return alerts;
}
