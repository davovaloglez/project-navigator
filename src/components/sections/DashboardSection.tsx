import { useCallback, useMemo } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { FolderKanban, AlertTriangle, Ban, CheckCircle2, Star, ArrowRight } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import { useDashboardConfig } from '../../hooks/useDashboardConfig';
import { useSnapshotCapture } from '../../hooks/useSnapshotCapture';
import { canWith, readInlinePermissions } from '../../hooks/usePermissions';
import type { ProjectRecord, CostoRecord, TareaRecord, CursoRecord } from '../../utils/dataTransforms';
import { isActive } from '../../utils/projectStatus';
import { isTareaDone, splitMulti } from '../../utils/dataTransforms';
import { formatMoney } from '../../utils/costEngine';
import { calcHealthScore, generateAlerts } from '../../utils/healthScore';
import { forecastProjects, computeCriticalDates, riskMeta } from '../../utils/forecastEngine';
import { getEstatusColor } from '../../utils/colors';
import { infoFor } from '../../data/glossary';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import KPICard from '../ui/KPICard';
import StatusBadge from '../ui/StatusBadge';
import DashboardCustomizer from '../ui/DashboardCustomizer';
import ChartCard from '../charts/ChartCard';
import EstatusDonutChart from '../charts/EstatusDonutChart';
import SaludDonutChart from '../charts/SaludDonutChart';
import PrioridadBarChart from '../charts/PrioridadBarChart';
import ProgresoArquitectoChart from '../charts/ProgresoArquitectoChart';
import ProyectosPorArquitectoChart from '../charts/ProyectosPorArquitectoChart';
import HitoProgressChart from '../charts/HitoProgressChart';
import DevWorkloadChart from '../charts/DevWorkloadChart';
import HealthDistributionChart from '../charts/HealthDistributionChart';

const CHART_WIDGETS: Record<string, React.ComponentType<{ data: ProjectRecord[] }>> = {
  'estatus-chart': EstatusDonutChart,
  'salud-chart': SaludDonutChart,
  'prioridad-chart': PrioridadBarChart,
  'arquitecto-chart': ProgresoArquitectoChart,
  'proyectos-arquitecto': ProyectosPorArquitectoChart,
  'hito-chart': HitoProgressChart,
  'dev-chart': DevWorkloadChart,
  'health-distribution': HealthDistributionChart,
};

// --- Inline widget components ---

function HealthSummaryWidget({ data }: { data: ProjectRecord[] }) {
  const active = data.filter((p) => isActive(p.estatus));
  const scores = active.map((p) => calcHealthScore(p));
  const avg = scores.length > 0 ? Math.round(scores.reduce((s, h) => s + h.score, 0) / scores.length) : 0;
  const buckets = { 'Excelente': 0, 'Bueno': 0, 'Medio': 0, 'Bajo': 0, 'Crítico': 0 };
  for (const h of scores) buckets[h.label as keyof typeof buckets]++;
  const color = avg >= 65 ? 'text-green-400' : avg >= 45 ? 'text-yellow-400' : 'text-red-400';
  const ring = avg >= 65 ? 'border-green-500/40' : avg >= 45 ? 'border-yellow-500/40' : 'border-red-500/40';

  const criticalCount = generateAlerts(data).filter((a) => a.severity === 'critical').length;
  const doneCount = data.filter((p) => p.estatus === 'Done').length;
  const onTrackCount = data.filter((p) => p.estatus === 'On Track').length;
  const riskCount = data.filter((p) => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical').length;

  return (
    <ChartCard title="Salud del Portafolio" info={infoFor('dashboard-health-summary')}>
      {/* Score + buckets */}
      <div className="flex items-center gap-6 mb-4">
        <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0 ${ring}`}>
          <span className={`text-2xl font-bold ${color}`}>{avg}</span>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {Object.entries(buckets).filter(([, v]) => v > 0).map(([label, count]) => {
            const barColor = { Excelente: 'bg-green-500', Bueno: 'bg-blue-500', Medio: 'bg-yellow-500', Bajo: 'bg-orange-500', Crítico: 'bg-red-500' }[label] || 'bg-slate-500';
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 w-16 shrink-0">{label}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2 min-w-0">
                  <div className={`${barColor} h-2 rounded-full`} style={{ width: `${active.length > 0 ? (count / active.length) * 100 : 0}%` }} />
                </div>
                <span className="text-[11px] text-slate-500 w-6 text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Counts row (migrado del banner de Resumen) */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/40 text-center">
        <div>
          <p className="text-lg font-bold text-green-400">{doneCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Completados</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-400">{onTrackCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">On Track</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-400">{riskCount}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">En riesgo</p>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-3">
        {active.length} proyectos activos — {criticalCount > 0 ? `${criticalCount} alertas críticas` : 'Sin alertas críticas'}
      </p>
    </ChartCard>
  );
}

function AlertsPreviewWidget({ data }: { data: ProjectRecord[] }) {
  const alerts = generateAlerts(data);
  const top = alerts.slice(0, 5);
  return (
    <ChartCard title={`Alertas (${alerts.length})`} info={infoFor('dashboard-alerts-preview')}>
      {top.length > 0 ? (
        <div className="space-y-2">
          {top.map((alert, idx) => (
            <a
              key={`${alert.project.folio}-${idx}`}
              href={`/proyecto/${alert.project.id}`}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.severity === 'critical' ? 'bg-red-400' : alert.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{alert.title}</p>
                <p className="text-[10px] text-slate-500 truncate">{alert.description}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-green-400 py-4 text-center">Sin alertas activas</p>
      )}
      <a href="/alertas" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors">
        Ver todas las alertas <ArrowRight className="w-3 h-3" />
      </a>
    </ChartCard>
  );
}

function AtRiskProjectsWidget({ data }: { data: ProjectRecord[] }) {
  const active = data.filter((p) => isActive(p.estatus));
  const scored = active.map((p) => ({ project: p, health: calcHealthScore(p) }));
  const worst = scored.sort((a, b) => a.health.score - b.health.score).slice(0, 5);

  return (
    <ChartCard title="Proyectos en Riesgo" info={infoFor('dashboard-at-risk-projects')}>
      <div className="space-y-2">
        {worst.map(({ project: p, health }) => {
          const ec = getEstatusColor(p.estatus);
          return (
            <a key={p.id} href={`/proyecto/${p.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${health.bgColor} ${health.color}`}>
                {health.score}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">{p.actividad}</p>
                <p className="text-[10px] text-slate-500">{p.folio} · {p.arquitecto}</p>
              </div>
              <StatusBadge label={p.estatus} {...ec} />
            </a>
          );
        })}
      </div>
    </ChartCard>
  );
}

function UpcomingDeadlinesWidget({ data }: { data: ProjectRecord[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = data
    .filter((p) => isActive(p.estatus) && p.finEstimado)
    .map((p) => {
      const end = new Date(p.finEstimado);
      const days = Math.round((end.getTime() - today.getTime()) / 86400000);
      return { project: p, days, date: end };
    })
    .filter((x) => x.days >= -7 && x.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  return (
    <ChartCard title="Próximos Vencimientos" info={infoFor('dashboard-upcoming-deadlines')}>
      {upcoming.length > 0 ? (
        <div className="space-y-2">
          {upcoming.map(({ project: p, days }) => {
            const isOverdue = days < 0;
            const isSoon = days >= 0 && days <= 7;
            return (
              <a key={p.id} href={`/proyecto/${p.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div className={`w-10 text-center shrink-0 py-1 rounded-lg text-xs font-bold ${isOverdue ? 'bg-red-500/15 text-red-400' : isSoon ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                  {isOverdue ? `${Math.abs(days)}d` : `${days}d`}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200 truncate">{p.actividad}</p>
                  <p className="text-[10px] text-slate-500">{p.folio} · {p.finEstimado}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-500">{Math.round(p.progreso * 100)}%</p>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 py-4 text-center">Sin vencimientos próximos</p>
      )}
      <a href="/timeline" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors">
        Ver timeline completo <ArrowRight className="w-3 h-3" />
      </a>
    </ChartCard>
  );
}

function RoadmapProgressWidget({ data }: { data: ProjectRecord[] }) {
  const hitoGroups = new Map<string, ProjectRecord[]>();
  for (const p of data) {
    const h = p.cuatrimestre || 'Sin cuatrimestre';
    if (!hitoGroups.has(h)) hitoGroups.set(h, []);
    hitoGroups.get(h)!.push(p);
  }
  const hitos = [...hitoGroups.entries()]
    .map(([name, items]) => ({
      name,
      total: items.length,
      done: items.filter((p) => p.estatus === 'Done').length,
      avg: items.length > 0 ? Math.round((items.reduce((s, p) => s + p.progreso, 0) / items.length) * 100) : 0,
      pts: items.reduce((s, p) => s + p.puntos, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ChartCard title="Progreso del Roadmap" info={infoFor('dashboard-roadmap-progress')}>
      <div className="space-y-3">
        {hitos.map((h) => {
          const pColor = h.avg >= 80 ? 'bg-green-500' : h.avg >= 40 ? 'bg-yellow-500' : 'bg-red-500';
          return (
            <div key={h.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-200 font-medium">{h.name}</span>
                <span className="text-xs text-slate-400">{h.done}/{h.total} · {h.pts} pts</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div className={`${pColor} h-2.5 rounded-full`} style={{ width: `${h.avg}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 text-right">{h.avg}%</p>
            </div>
          );
        })}
      </div>
      <a href="/roadmap" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors">
        Ver roadmap completo <ArrowRight className="w-3 h-3" />
      </a>
    </ChartCard>
  );
}

function PointsDistributionWidget({ data }: { data: ProjectRecord[] }) {
  const totalPts = data.reduce((s, p) => s + p.puntos, 0);
  const donePts = data.filter((p) => p.estatus === 'Done').reduce((s, p) => s + p.puntos, 0);
  const activePts = data.filter((p) => isActive(p.estatus)).reduce((s, p) => s + p.puntos, 0);

  const byArq = new Map<string, { done: number; pending: number }>();
  for (const p of data) {
    // Multi-arquitecto: "Luis, George" cuenta para cada uno por separado.
    const arqs = p.arquitecto.split(',').map((s) => s.trim()).filter((s) => s && s !== '-');
    for (const arq of arqs) {
      if (!byArq.has(arq)) byArq.set(arq, { done: 0, pending: 0 });
      const entry = byArq.get(arq)!;
      if (p.estatus === 'Done') entry.done += p.puntos;
      else entry.pending += p.puntos;
    }
  }
  const arqData = [...byArq.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.done + b.pending) - (a.done + a.pending));

  return (
    <ChartCard title="Story Points" info={infoFor('dashboard-points-distribution')}>
      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-slate-700/30 rounded-lg p-2">
          <p className="text-lg font-bold text-white">{totalPts}</p>
          <p className="text-[10px] text-slate-500">Total</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2">
          <p className="text-lg font-bold text-green-400">{donePts}</p>
          <p className="text-[10px] text-slate-500">Entregados</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2">
          <p className="text-lg font-bold text-blue-400">{activePts}</p>
          <p className="text-[10px] text-slate-500">Activos</p>
        </div>
      </div>
      <div className="space-y-2">
        {arqData.slice(0, 5).map((a) => (
          <div key={a.name} className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-16 truncate">{a.name}</span>
            <div className="flex-1 flex h-2 bg-slate-700 rounded-full overflow-hidden">
              {a.done > 0 && <div className="bg-green-500 h-full" style={{ width: `${(a.done / (a.done + a.pending)) * 100}%` }} />}
              {a.pending > 0 && <div className="bg-blue-500 h-full" style={{ width: `${(a.pending / (a.done + a.pending)) * 100}%` }} />}
            </div>
            <span className="text-[10px] text-slate-500 w-8 text-right">{a.done + a.pending}</span>
          </div>
        ))}
      </div>
      <a href="/distribucion" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors">
        Ver distribución completa <ArrowRight className="w-3 h-3" />
      </a>
    </ChartCard>
  );
}

function CostOverviewWidget({ data: _projects }: { data: ProjectRecord[] }) {
  const costos = useSheetData<CostoRecord>('/api/costos');
  if (costos.loading) return <ChartCard title="Resumen de Costos" info={infoFor('dashboard-cost-overview')}><div className="h-40 animate-pulse bg-slate-700/30 rounded-lg" /></ChartCard>;
  if (!costos.data.length) return null;
  const totalMensual = costos.data.reduce((s, c) => s + c.total, 0);
  const totalRecursos = costos.data.reduce((s, c) => s + c.recursos, 0);
  const top5 = [...costos.data].sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <ChartCard title="Resumen de Costos" info={infoFor('dashboard-cost-overview')}>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center">
        <div className="bg-slate-700/30 rounded-lg p-2">
          <p className="text-lg font-bold text-green-400">{formatMoney(totalMensual)}</p>
          <p className="text-[10px] text-slate-500">Costo mensual</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2">
          <p className="text-lg font-bold text-white">{totalRecursos}</p>
          <p className="text-[10px] text-slate-500">Recursos</p>
        </div>
      </div>
      <div className="space-y-2">
        {top5.map((c) => (
          <div key={c.rol} className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex-1 truncate">{c.rol}</span>
            <span className="text-[10px] text-slate-500">{c.recursos} rec.</span>
            <span className="text-xs text-green-400 font-medium shrink-0">{formatMoney(c.total)}</span>
          </div>
        ))}
      </div>
      <a href="/costos" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors">
        Ver costos completos <ArrowRight className="w-3 h-3" />
      </a>
    </ChartCard>
  );
}

function TareasOverviewWidget({ data: _projects }: { data: ProjectRecord[] }) {
  const tareas = useSheetData<TareaRecord>('/api/tareas');
  if (tareas.loading) return <ChartCard title="Resumen de Cronograma" info={infoFor('dashboard-tareas-overview')}><div className="h-40 animate-pulse bg-slate-700/30 rounded-lg" /></ChartCard>;
  if (!tareas.data.length) return null;

  let completadas = 0, activas = 0, atrasadas = 0;
  let puntosTotales = 0, puntosCompletados = 0, tracked = 0;
  for (const t of tareas.data) {
    const s = t.estatus.toLowerCase();
    const pts = t.puntos ?? 0;
    puntosTotales += pts;
    tracked += t.tracked ?? 0;
    if (isTareaDone(t.estatus)) { completadas++; puntosCompletados += pts; }
    else if (s.includes('in progress') || s.includes('review') || s.includes('testing') || s.includes('change') || s.includes('pending') || s.includes('pendiente')) activas++;
    if (t.salud.toLowerCase().includes('atraz')) atrasadas++;
  }
  const pctCompletadas = tareas.data.length > 0 ? Math.round((completadas / tareas.data.length) * 100) : 0;

  return (
    <ChartCard title="Resumen de Cronograma" info={infoFor('dashboard-tareas-overview')}>
      <div className="grid grid-cols-2 gap-3 mb-4 text-center">
        <div className="bg-slate-700/30 rounded-lg p-2">
          <p className="text-lg font-bold text-white">{tareas.data.length}</p>
          <p className="text-[10px] text-slate-500">Tareas totales</p>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2">
          <p className="text-lg font-bold text-green-400">{completadas}</p>
          <p className="text-[10px] text-slate-500">Completadas ({pctCompletadas}%)</p>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex-1">Activas</span>
          <span className="text-sm text-amber-400 font-medium">{activas}</span>
        </div>
        {atrasadas > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex-1">Atrasadas</span>
            <span className="text-sm text-red-400 font-medium">{atrasadas}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
          <span className="text-xs text-slate-400 flex-1">Puntos entregados</span>
          <span className="text-sm text-purple-300 font-medium">
            {puntosCompletados}<span className="text-[10px] text-slate-500 font-normal">/{puntosTotales}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="px-1.5 py-0.5 bg-purple-500/15 text-purple-300 rounded">Estimado: {puntosTotales} pts</span>
        {tracked > 0 && <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 rounded">Real: {tracked} pts</span>}
      </div>
      <a href="/cronograma" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors">
        Ver cronograma completo <ArrowRight className="w-3 h-3" />
      </a>
    </ChartCard>
  );
}

function CriticalForecastWidget({ data }: { data: ProjectRecord[] }) {
  const tareas = useSheetData<TareaRecord>('/api/tareas');

  if (tareas.loading) {
    return (
      <ChartCard title="Próximas fechas críticas" info={infoFor('dashboard-critical-forecast')}>
        <div className="h-40 animate-pulse bg-slate-700/30 rounded-lg" />
      </ChartCard>
    );
  }

  const { forecasts } = forecastProjects(data, tareas.data);
  const windows = computeCriticalDates(forecasts, [30, 60]);
  const events = windows.flatMap((w) => w.events).slice(0, 6);

  return (
    <ChartCard title="Próximas fechas críticas" info={infoFor('dashboard-critical-forecast')}>
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((e) => {
            const r = riskMeta(e.forecast.risk);
            const isOverdue = e.daysFromNow < 0;
            return (
              <a
                key={e.forecast.project.id}
                href={`/pronosticos/${e.forecast.project.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <div
                  className={`w-10 text-center shrink-0 py-1 rounded-lg text-xs font-bold ${isOverdue ? 'bg-red-500/15 text-red-400' : e.daysFromNow <= 7 ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700 text-slate-300'}`}
                >
                  {isOverdue ? `-${Math.abs(e.daysFromNow)}d` : `${e.daysFromNow}d`}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200 truncate" title={e.forecast.project.actividad}>
                    {e.forecast.project.actividad}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {new Date(e.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                    {e.forecast.project.cuatrimestre ? ` · ${e.forecast.project.cuatrimestre}` : ''}
                  </p>
                </div>
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0 ${r.bg} ${r.color} ${r.border}`}>
                  {r.label}
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 py-4 text-center">Sin fechas proyectadas en los próximos 60 días</p>
      )}
      <a href="/pronosticos" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-3 transition-colors">
        Ver pronósticos completos <ArrowRight className="w-3 h-3" />
      </a>
    </ChartCard>
  );
}

// --- Special widgets that aren't simple chart components ---
const SPECIAL_WIDGETS: Record<string, React.ComponentType<{ data: ProjectRecord[] }>> = {
  'health-summary': HealthSummaryWidget,
  'alerts-preview': AlertsPreviewWidget,
  'at-risk-projects': AtRiskProjectsWidget,
  'upcoming-deadlines': UpcomingDeadlinesWidget,
  'critical-forecast': CriticalForecastWidget,
  'roadmap-progress': RoadmapProgressWidget,
  'points-distribution': PointsDistributionWidget,
  'cost-overview': CostOverviewWidget,
  'tareas-overview': TareasOverviewWidget,
};

const ALL_WIDGETS = { ...CHART_WIDGETS, ...SPECIAL_WIDGETS };

export default function DashboardSection({ canDashboard = true }: { canDashboard?: boolean }) {
  const { isScoped } = useScopeView();
  const { data: allData, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const cursosQ = useSheetData<CursoRecord>('/api/cursos');
  const { config, toggleWidget, moveWidget, resetConfig, isVisible } = useDashboardConfig();
  useSnapshotCapture(allData, cursosQ.data);

  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    pmFilter: Record<string, string[]>;
  }>('dashboard', { pmFilter: {} });
  const pmFilter = persisted.pmFilter;
  const setPmFilter = useCallback(
    (next: Record<string, string[]>) => setPersisted((prev) => ({ ...prev, pmFilter: next })),
    [setPersisted],
  );

  const pmOptions = useMemo(() =>
    [...new Set(allData.flatMap((p) => splitMulti(p.pm)))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [allData]);

  const filterConfigs = useMemo(
    () => (isScoped ? [] : [{ key: 'pm', label: 'PM', options: pmOptions, multi: false }]),
    [pmOptions, isScoped],
  );

  const data = useMemo(() => {
    const selected = pmFilter.pm || [];
    return selected.length ? allData.filter((p) => splitMulti(p.pm).some((pm) => selected.includes(pm))) : allData;
  }, [allData, pmFilter]);

  const activePmName = pmFilter.pm?.[0];

  const kpis = useMemo(() => {
    const total = data.length;
    const atRisk = data.filter((p) => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical').length;
    const blocked = data.filter((p) => p.estatus === 'Blocked / Critical').length;
    const done = data.filter((p) => p.estatus === 'Done').length;
    const totalPoints = data.reduce((s, p) => s + p.puntos, 0);
    const alerts = generateAlerts(data);
    return { total, atRisk, blocked, done, totalPoints, alertCount: alerts.filter(a => a.severity === 'critical').length };
  }, [data]);

  // Gating de bloques: cada widget se identifica por su id de glosario
  // `dashboard-<widget.id>`. Default-ALLOW; sólo se ocultan los denegados por
  // rol/override (e.g. `dashboard-cost-overview` para pm/dev/ventas).
  const perms = readInlinePermissions();
  const visibleWidgets = config.widgets.filter(
    (w) => w.visible && ALL_WIDGETS[w.id] && canWith(perms, `block:dashboard-${w.id}`),
  );

  // Defensa en profundidad: sin `page:dashboard` el tablero no renderiza nada
  // (ni KPIs ni widgets). El gate real es el middleware —que redirige antes de
  // llegar aquí—; esta capa protege al componente si esa ruta cambiara.
  if (!canDashboard) {
    return (
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Dashboard</h2>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-2">No tienes acceso al dashboard</p>
          <p className="text-sm text-slate-500">
            Tu rol no incluye permiso para ver este tablero. Contacta a un administrador.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <Header title="Dashboard" onRefresh={refetch} loading />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Dashboard" onRefresh={refetch} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white truncate">Dashboard</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {kpis.total} proyectos
            {kpis.alertCount > 0 && <span className="text-red-400 ml-2">· {kpis.alertCount} alertas críticas</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 print:hidden flex-wrap justify-end">
          {pmOptions.length > 0 && (
            <FilterDropdowns
              filters={filterConfigs}
              activeFilters={pmFilter}
              onFilterChange={(key, values) => setPmFilter({ [key]: values })}
              onClear={clearPersisted}
            />
          )}
          <DashboardCustomizer config={config} onToggle={toggleWidget} onMove={moveWidget} onReset={resetConfig} />
        </div>
      </div>
      {activePmName && (
        <p className="text-xs text-blue-300 mb-4">
          Mostrando {data.length} proyecto{data.length !== 1 ? 's' : ''} del PM <span className="font-semibold">{activePmName}</span>
        </p>
      )}

      {/* KPIs */}
      {isVisible('kpis') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <KPICard title="Total proyectos" value={kpis.total} icon={FolderKanban} accentColor="text-blue-400" info={infoFor('dashboard-kpi-total')} />
          <KPICard title="En riesgo" value={kpis.atRisk} icon={AlertTriangle} accentColor="text-orange-400" highlight={kpis.atRisk > 0} info={infoFor('dashboard-kpi-en-riesgo')} />
          <KPICard title="Bloqueados" value={kpis.blocked} icon={Ban} accentColor="text-red-400" highlight={kpis.blocked > 0} info={infoFor('dashboard-kpi-bloqueados')} />
          <KPICard title="Completados" value={kpis.done} icon={CheckCircle2} accentColor="text-green-400" info={infoFor('dashboard-kpi-completados')} />
          <KPICard title="Story points" value={kpis.totalPoints} icon={Star} accentColor="text-amber-400" info={infoFor('dashboard-kpi-puntos')} />
        </div>
      )}

      {/* All widgets in user-configured order, 2-column grid */}
      {visibleWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleWidgets.map((widget) => {
            const Component = ALL_WIDGETS[widget.id];
            return <Component key={widget.id} data={data} />;
          })}
        </div>
      )}

      {visibleWidgets.length === 0 && !isVisible('kpis') && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-2">No hay widgets visibles</p>
          <p className="text-sm text-slate-500">Usa el botón "Personalizar" para agregar widgets a tu dashboard.</p>
        </div>
      )}
    </div>
  );
}
