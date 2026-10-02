import { useMemo } from 'react';
import type { ProjectRecord, TareaRecord, CostoRecord } from '../../../utils/dataTransforms';
import { isActive } from '../../../utils/projectStatus';
import { isTareaDone } from '../../../utils/dataTransforms';
import { calcHealthScore } from '../../../utils/healthScore';
import { estimatePersonCost } from '../../../utils/costEngine';

/** Subconjunto del registro `equipo` (GET /api/equipo) usado en la ficha. */
export interface EquipoLite {
  id: string;
  fullName: string;
  nickname: string;
  tag: string;
  title: string;
  roleName: string;
  department: string;
  email: string;
  image?: string | null;
}

export interface PersonStats {
  kpis: {
    total: number;
    avgProgress: number;
    completed: number;
    atRisk: number;
    totalPoints: number;
  };
  performance: {
    completionRate: number;
    avgHealth: number;
    donePoints: number;
    onTimeRate: number;
    activeCount: number;
  };
}

/**
 * Calcula los KPIs principales + métricas de rendimiento de la persona,
 * sobre el subconjunto de proyectos en los que aparece como PM/Arq/Dev/PO/SQA.
 */
export function usePersonStats(personProjects: ProjectRecord[]): PersonStats {
  return useMemo(() => {
    const total = personProjects.length;
    const avgProgress = total > 0
      ? Math.round((personProjects.reduce((s, p) => s + p.progreso, 0) / total) * 100)
      : 0;
    const completed = personProjects.filter((p) => p.estatus === 'Done').length;
    const atRisk = personProjects.filter(
      (p) => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical',
    ).length;
    const totalPoints = personProjects.reduce((s, p) => s + p.puntos, 0);

    const done = personProjects.filter((p) => p.estatus === 'Done');
    const active = personProjects.filter((p) => isActive(p.estatus));
    const completionRate = total > 0 ? Math.round((done.length / total) * 100) : 0;
    const avgHealth = total > 0
      ? Math.round(personProjects.reduce((s, p) => s + calcHealthScore(p).score, 0) / total)
      : 0;
    const donePoints = done.reduce((s, p) => s + p.puntos, 0);
    const withDates = done.filter((p) => p.finReal && p.finEstimado);
    const onTime = withDates.filter((p) => new Date(p.finReal) <= new Date(p.finEstimado));
    const onTimeRate = withDates.length > 0
      ? Math.round((onTime.length / withDates.length) * 100)
      : -1;

    return {
      kpis: { total, avgProgress, completed, atRisk, totalPoints },
      performance: {
        completionRate,
        avgHealth,
        donePoints,
        onTimeRate,
        activeCount: active.length,
      },
    };
  }, [personProjects]);
}

/** Estadísticas agregadas de las tareas asignadas a la persona. */
export function useTaskStats(personTareas: TareaRecord[]) {
  return useMemo(() => {
    const total = personTareas.length;
    let completadas = 0,
      activas = 0,
      atrasadas = 0;
    let puntosTotales = 0,
      puntosCompletados = 0;
    for (const t of personTareas) {
      const s = t.estatus.toLowerCase();
      const pts = t.puntos ?? 0;
      puntosTotales += pts;
      if (isTareaDone(t.estatus)) {
        completadas++;
        puntosCompletados += pts;
      } else if (
        s.includes('in progress') ||
        s.includes('review') ||
        s.includes('testing') ||
        s.includes('change') ||
        s.includes('pending') ||
        s.includes('pendiente')
      ) {
        activas++;
      }
      if (t.salud.toLowerCase().includes('atraz')) atrasadas++;
    }
    return { total, completadas, activas, atrasadas, puntosTotales, puntosCompletados };
  }, [personTareas]);
}

/** Costo prorrateado de la persona en sus proyectos activos. */
export function usePersonCost(
  personId: string | null,
  projects: ProjectRecord[],
  costos: CostoRecord[],
) {
  return useMemo(
    () => estimatePersonCost(personId ?? '', projects, costos),
    [personId, projects, costos],
  );
}

/** Color para el health score según severidad. */
export function healthScoreColor(score: number): string {
  if (score >= 65) return 'text-green-400';
  if (score >= 45) return 'text-yellow-400';
  return 'text-red-400';
}
