import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { AlertTriangle, Ban, Clock, TrendingDown, Zap, CalendarClock, Bell, Filter, Activity, Database, PauseCircle, Link2, TrendingUp } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord, TareaRecord } from '../../utils/dataTransforms';
import { splitMulti } from '../../utils/dataTransforms';
import { generateAlerts, type AlertType } from '../../utils/healthScore';
import { forecastProjects } from '../../utils/forecastEngine';
import type { ProjectForecast } from '../../utils/forecastEngine';
import { loadSnapshots } from '../../utils/snapshots';
import type { WeeklySnapshot } from '../../utils/snapshots';
import { computeStaleness } from '../../utils/stale';
import { detectAnomalies } from '../../utils/anomalies';
import { analyzeDependencies } from '../../utils/dependencies';
import { generateForecastAlerts, type ForecastAlertType } from '../../utils/forecastAlerts';
import { infoFor } from '../../data/glossary';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import KPICard from '../ui/KPICard';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import Gate from '../auth/Gate';

type CombinedType = AlertType | ForecastAlertType;

const TYPE_META: Record<CombinedType, { icon: React.ElementType; label: string }> = {
  'overdue': { icon: Clock, label: 'Vencido' },
  'blocked': { icon: Ban, label: 'Bloqueado' },
  'at-risk': { icon: AlertTriangle, label: 'En riesgo' },
  'low-progress': { icon: TrendingDown, label: 'Sin avance' },
  'action-needed': { icon: Zap, label: 'Acción' },
  'upcoming-deadline': { icon: CalendarClock, label: 'Vence pronto' },
  'forecast-at-risk': { icon: TrendingUp, label: 'Pronóstico en riesgo' },
  'stale-data': { icon: Database, label: 'Datos sin actualizar' },
  'anomaly-stall': { icon: PauseCircle, label: 'Detenido' },
  'anomaly-slowdown': { icon: Activity, label: 'Desaceleración' },
  'blocker-unresolved': { icon: Link2, label: 'Bloqueador pendiente' },
  'blocker-at-risk': { icon: Link2, label: 'Bloqueador en riesgo' },
};

const SEVERITY_STYLES = {
  critical: 'border-red-500/40 bg-red-500/5',
  warning: 'border-amber-500/40 bg-amber-500/5',
  info: 'border-blue-500/40 bg-blue-500/5',
};

const SEVERITY_DOT = {
  critical: 'bg-red-400',
  warning: 'bg-amber-400',
  info: 'bg-blue-400',
};

type FilterKey = 'all' | CombinedType;

interface CombinedAlert {
  type: CombinedType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  project: ProjectRecord;
}

export default function AlertasSection() {
  const { isScoped } = useScopeView();
  const { data, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const tareasQ = useSheetData<TareaRecord>('/api/tareas');
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    filter: FilterKey;
    pmFilter: Record<string, string[]>;
  }>('alertas', { filter: 'all', pmFilter: {} });
  const { filter, pmFilter } = persisted;
  const setFilter = useCallback(
    (next: FilterKey) => setPersisted((prev) => ({ ...prev, filter: next })),
    [setPersisted],
  );
  const setPmFilter = useCallback(
    (next: Record<string, string[]>) => setPersisted((prev) => ({ ...prev, pmFilter: next })),
    [setPersisted],
  );
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);

  const pmOptions = useMemo(() =>
    [...new Set(data.flatMap((p) => splitMulti(p.pm)))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [data]);

  const filterConfigs = useMemo(
    () => (isScoped ? [] : [{ key: 'pm', label: 'PM', options: pmOptions, multi: false }]),
    [pmOptions, isScoped],
  );

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const forecastMap = useMemo(() => {
    const { forecasts } = forecastProjects(data, tareasQ.data);
    const m = new Map<string, ProjectForecast>();
    for (const f of forecasts) m.set(f.project.id, f);
    return m;
  }, [data, tareasQ.data]);

  const alerts = useMemo<CombinedAlert[]>(() => {
    const base = generateAlerts(data) as CombinedAlert[];
    const forecasts = [...forecastMap.values()];
    const staleMap = computeStaleness(data, snapshots);
    const anomalies = detectAnomalies(data, snapshots);
    const dependencies = analyzeDependencies(data, forecastMap);
    const forecastAlerts = generateForecastAlerts({
      forecasts,
      staleMap,
      anomalies,
      dependencies,
    }) as CombinedAlert[];
    const combined = [...base, ...forecastAlerts];
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    combined.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return combined;
  }, [data, forecastMap, snapshots]);

  const pmScopedAlerts = useMemo(() => {
    const selected = pmFilter.pm || [];
    return selected.length ? alerts.filter((a) => splitMulti(a.project.pm).some((pm) => selected.includes(pm))) : alerts;
  }, [alerts, pmFilter]);

  const filtered = useMemo(() => {
    if (filter === 'all') return pmScopedAlerts;
    return pmScopedAlerts.filter((a) => a.type === filter);
  }, [pmScopedAlerts, filter]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 };
    for (const a of pmScopedAlerts) c[a.severity]++;
    return c;
  }, [pmScopedAlerts]);

  if (loading) {
    return (
      <div>
        <Header title="Alertas" onRefresh={refetch} loading />
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Alertas" onRefresh={refetch} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">Reintentar</button>
        </div>
      </div>
    );
  }

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: pmScopedAlerts.length },
    { key: 'overdue', label: 'Vencidos', count: pmScopedAlerts.filter(a => a.type === 'overdue').length },
    { key: 'blocked', label: 'Bloqueados', count: pmScopedAlerts.filter(a => a.type === 'blocked').length },
    { key: 'at-risk', label: 'En riesgo', count: pmScopedAlerts.filter(a => a.type === 'at-risk').length },
    { key: 'upcoming-deadline', label: 'Vencen pronto', count: pmScopedAlerts.filter(a => a.type === 'upcoming-deadline').length },
    { key: 'action-needed', label: 'Acciones', count: pmScopedAlerts.filter(a => a.type === 'action-needed').length },
    { key: 'low-progress', label: 'Sin avance', count: pmScopedAlerts.filter(a => a.type === 'low-progress').length },
    { key: 'forecast-at-risk', label: 'Pronóstico en riesgo', count: pmScopedAlerts.filter(a => a.type === 'forecast-at-risk').length },
    { key: 'anomaly-slowdown', label: 'Desaceleración', count: pmScopedAlerts.filter(a => a.type === 'anomaly-slowdown').length },
    { key: 'anomaly-stall', label: 'Detenido', count: pmScopedAlerts.filter(a => a.type === 'anomaly-stall').length },
    { key: 'stale-data', label: 'Sin actualizar', count: pmScopedAlerts.filter(a => a.type === 'stale-data').length },
    { key: 'blocker-at-risk', label: 'Bloqueador en riesgo', count: pmScopedAlerts.filter(a => a.type === 'blocker-at-risk').length },
    { key: 'blocker-unresolved', label: 'Bloqueador pendiente', count: pmScopedAlerts.filter(a => a.type === 'blocker-unresolved').length },
  ];

  return (
    <div>
      <Header title="Alertas" onRefresh={refetch} loading={loading} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <KPICard title="Críticas" value={counts.critical} icon={Ban} accentColor="text-red-400" highlight={counts.critical > 0} info={infoFor('alertas-kpi-criticas')} />
        <KPICard title="Advertencias" value={counts.warning} icon={AlertTriangle} accentColor="text-amber-400" highlight={counts.warning > 0} info={infoFor('alertas-kpi-advertencias')} />
        <KPICard title="Informativas" value={counts.info} icon={Bell} accentColor="text-blue-400" info={infoFor('alertas-kpi-informativas')} />
      </div>

      {/* PM filter */}
      {pmOptions.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <FilterDropdowns
            filters={filterConfigs}
            activeFilters={pmFilter}
            onFilterChange={(key, values) => setPmFilter({ [key]: values })}
            onClear={clearPersisted}
          />
        </div>
      )}

      <Gate resource="block:alertas-lista">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-slate-500" />
        {filterOptions.filter(f => f.count > 0).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="flex items-center gap-1.5 mb-3">
        <h3 className="text-sm font-medium text-slate-300">Alertas activas</h3>
        <GlossaryTooltip id="alertas-lista" />
      </div>
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((alert, idx) => {
            const meta = TYPE_META[alert.type];
            const Icon = meta.icon;
            return (
              <a
                key={`${alert.project.folio}-${alert.type}-${idx}`}
                href={`/proyecto/${alert.project.id}`}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors hover:bg-slate-800/50 ${SEVERITY_STYLES[alert.severity]}`}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className={`w-5 h-5 ${alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[alert.severity]}`} />
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 shrink-0">{meta.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{alert.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-12 text-center">
          <p className="text-green-400 font-medium mb-1">Sin alertas</p>
          <p className="text-sm text-slate-400">No hay alertas activas con los filtros seleccionados.</p>
        </div>
      )}
      </Gate>
    </div>
  );
}
