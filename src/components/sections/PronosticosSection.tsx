import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { useSnapshotCapture } from '../../hooks/useSnapshotCapture';
import {
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  History,
  Users,
  Info,
  BarChart3,
  BookOpen,
  Calculator,
  Database,
  Lightbulb,
  ShieldAlert,
  Flag,
  Calendar,
  CalendarClock,
  AlertCircle,
  Activity,
  Link2,
} from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord, TareaRecord, CostoRecord, CursoRecord } from '../../utils/dataTransforms';
import { splitMulti } from '../../utils/dataTransforms';
import {
  forecastProjects,
  riskMeta,
  computePortfolioBaseline,
  computePersonCapacity,
  aggregateByHito,
  computeCapacityProjection,
  computeCriticalDates,
  computeSlippageCostImpact,
  type ForecastRisk,
} from '../../utils/forecastEngine';
import Header from '../layout/Header';
import KPICard from '../ui/KPICard';
import FilterDropdowns from '../ui/FilterDropdowns';
import Tabs from '../ui/Tabs';
import ForecastCard from '../ui/ForecastCard';
import PersonCapacityCard from '../ui/PersonCapacityCard';
import HitoForecastCard from '../ui/HitoForecastCard';
import CapacityHorizonCard from '../ui/CapacityHorizonCard';
import CriticalDatesList from '../ui/CriticalDatesList';
import SlippageCostCard from '../ui/SlippageCostCard';
import CourseForecastCard from '../ui/CourseForecastCard';
import BacktestCard from '../ui/BacktestCard';
import SnapshotStatusCard from '../ui/SnapshotStatusCard';
import {
  loadSnapshots,
  snapshotStats,
  type WeeklySnapshot,
} from '../../utils/snapshots';
import { runBacktest } from '../../utils/backtest';
import { computeCourseForecasts } from '../../utils/courseForecast';
import { computeStaleness, staleCount } from '../../utils/stale';
import { detectAnomalies } from '../../utils/anomalies';
import { analyzeDependencies, type EquipoLookup } from '../../utils/dependencies';
import { buildMembers } from '../../lib/equipoMatch';
import AnomalyCard from '../ui/AnomalyCard';
import DependencyCard from '../ui/DependencyCard';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  paginate,
  sanitizePageSize,
  type PageSize,
} from '../ui/PaginationControls';
import { infoFor } from '../../data/glossary';

const RISK_ORDER: ForecastRisk[] = ['at-risk', 'stalled', 'slipping', 'on-track', 'done', 'insufficient-data'];

type TabKey = 'proyectos' | 'planeacion' | 'dependencias' | 'personas' | 'contexto' | 'metodologia';

export default function PronosticosSection() {
  const { isScoped } = useScopeView();
  const projectsQ = useSheetData<ProjectRecord>('/api/proyectos');
  const tareasQ = useSheetData<TareaRecord>('/api/tareas');
  const costosQ = useSheetData<CostoRecord>('/api/costos');
  const cursosQ = useSheetData<CursoRecord>('/api/cursos');

  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);
  // NAV-76: cargamos el registro `equipo` para resolver chunks de `requiereDe`
  // que apuntan a personas (apodos como "Fabian", "Edin") en vez de proyectos.
  const [equipoRows, setEquipoRows] = useState<Array<{
    id: string; nickname: string; fullName: string; tag: string; image: string | null;
  }>>([]);

  useSnapshotCapture(projectsQ.data, cursosQ.data);

  useEffect(() => {
    fetch('/api/equipo', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { equipo?: typeof equipoRows } | null) => {
        if (d?.equipo) setEquipoRows(d.equipo);
      })
      .catch(() => { /* fallback silencioso: el análisis sigue funcionando sin equipo */ });
  }, []);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  // Refresh local snapshot state whenever data changes (hook may have captured)
  useEffect(() => {
    if (projectsQ.data.length === 0 && cursosQ.data.length === 0) return;
    setSnapshots(loadSnapshots());
  }, [projectsQ.data, cursosQ.data]);

  const refreshSnapshots = () => setSnapshots(loadSnapshots());

  type SortByKey = 'risk' | 'slippage' | 'forecast';
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    tab: TabKey;
    filters: Record<string, string[]>;
    sortBy: SortByKey;
    pageSize: PageSize;
  }>('pronosticos', { tab: 'proyectos', filters: {}, sortBy: 'risk', pageSize: DEFAULT_PAGE_SIZE });
  const { tab, filters, sortBy } = persisted;
  const pageSize = sanitizePageSize(persisted.pageSize);
  const setTab = useCallback(
    (next: TabKey) => setPersisted((prev) => ({ ...prev, tab: next })),
    [setPersisted],
  );
  const setFilters = useCallback(
    (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) =>
      setPersisted((prev) => ({ ...prev, filters: typeof updater === 'function' ? updater(prev.filters) : updater })),
    [setPersisted],
  );
  const setSortBy = useCallback(
    (next: SortByKey) => setPersisted((prev) => ({ ...prev, sortBy: next })),
    [setPersisted],
  );
  const [page, setPage] = useState(0);
  const [capacityPage, setCapacityPage] = useState(0);
  const setPageSize = useCallback(
    (next: PageSize) => {
      setPersisted((prev) => ({ ...prev, pageSize: next }));
      setPage(0);
      setCapacityPage(0);
    },
    [setPersisted],
  );

  const { forecasts, velocity, bias } = useMemo(() => {
    return forecastProjects(projectsQ.data, tareasQ.data);
  }, [projectsQ.data, tareasQ.data]);

  const baseline = useMemo(() => computePortfolioBaseline(projectsQ.data), [projectsQ.data]);
  const capacity = useMemo(() => computePersonCapacity(tareasQ.data), [tareasQ.data]);
  const hitoForecasts = useMemo(() => aggregateByHito(forecasts), [forecasts]);
  const capacityHorizons = useMemo(
    () => computeCapacityProjection(forecasts, velocity),
    [forecasts, velocity]
  );
  const criticalWindows = useMemo(() => computeCriticalDates(forecasts), [forecasts]);
  const slippageCost = useMemo(
    () => computeSlippageCostImpact(forecasts, projectsQ.data, costosQ.data),
    [forecasts, projectsQ.data, costosQ.data]
  );
  const courseForecasts = useMemo(
    () => computeCourseForecasts(cursosQ.data, snapshots),
    [cursosQ.data, snapshots]
  );
  const backtest = useMemo(
    () => runBacktest(snapshots, projectsQ.data),
    [snapshots, projectsQ.data]
  );
  const snapStats = useMemo(() => snapshotStats(snapshots), [snapshots]);
  const staleMap = useMemo(
    () => computeStaleness(projectsQ.data, snapshots),
    [projectsQ.data, snapshots]
  );
  const staleTotal = useMemo(() => staleCount(staleMap), [staleMap]);
  const anomalies = useMemo(
    () => detectAnomalies(projectsQ.data, snapshots),
    [projectsQ.data, snapshots]
  );
  const forecastByFolio = useMemo(() => {
    const m = new Map<string, typeof forecasts[number]>();
    for (const f of forecasts) m.set(f.project.id, f);
    return m;
  }, [forecasts]);
  const equipoLookup = useMemo<EquipoLookup | null>(() => {
    if (equipoRows.length === 0) return null;
    const members = buildMembers(equipoRows);
    const byId = new Map<string, { name: string; image: string | null }>();
    for (const r of equipoRows) {
      byId.set(r.id, { name: r.tag || r.fullName || r.nickname || r.id, image: r.image });
    }
    return { members, byId };
  }, [equipoRows]);

  const dependencies = useMemo(
    () => analyzeDependencies(projectsQ.data, forecastByFolio, equipoLookup),
    [projectsQ.data, forecastByFolio, equipoLookup]
  );

  const activeForecasts = useMemo(
    () => forecasts.filter((f) => f.risk !== 'done'),
    [forecasts]
  );

  const kpis = useMemo(() => {
    const total = activeForecasts.length;
    const onTrack = activeForecasts.filter((f) => f.risk === 'on-track').length;
    const slipping = activeForecasts.filter((f) => f.risk === 'slipping').length;
    const atRisk = activeForecasts.filter((f) => f.risk === 'at-risk' || f.risk === 'stalled').length;
    const slippages = activeForecasts
      .map((f) => f.slippageDays)
      .filter((v): v is number => v !== null);
    const avgSlippage =
      slippages.length > 0
        ? Math.round(slippages.reduce((s, v) => s + v, 0) / slippages.length)
        : 0;
    return { total, onTrack, slipping, atRisk, avgSlippage };
  }, [activeForecasts]);

  const filterOptions = useMemo(() => {
    const risks = new Set<ForecastRisk>();
    const pms = new Set<string>();
    const hitos = new Set<string>();
    for (const f of activeForecasts) {
      risks.add(f.risk);
      for (const pm of splitMulti(f.project.pm)) pms.add(pm);
      if (f.project.cuatrimestre) hitos.add(f.project.cuatrimestre);
    }
    return {
      risk: [...risks].map((r) => ({ value: r, label: riskMeta(r).label })),
      pm: [...pms].sort().map((v) => ({ value: v, label: v })),
      cuatrimestre: [...hitos].sort().map((v) => ({ value: v, label: v })),
    };
  }, [activeForecasts]);

  const filtered = useMemo(() => {
    return activeForecasts.filter((f) => {
      if (filters.risk?.length && !filters.risk.includes(f.risk)) return false;
      if (filters.pm?.length && !splitMulti(f.project.pm).some((pm) => filters.pm!.includes(pm))) return false;
      if (filters.cuatrimestre?.length && !filters.cuatrimestre.includes(f.project.cuatrimestre)) return false;
      return true;
    });
  }, [activeForecasts, filters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === 'risk') {
      copy.sort((a, b) => {
        const ra = RISK_ORDER.indexOf(a.risk);
        const rb = RISK_ORDER.indexOf(b.risk);
        if (ra !== rb) return ra - rb;
        return (b.slippageDays ?? 0) - (a.slippageDays ?? 0);
      });
    } else if (sortBy === 'slippage') {
      copy.sort((a, b) => (b.slippageDays ?? -Infinity) - (a.slippageDays ?? -Infinity));
    } else {
      copy.sort((a, b) => (a.forecastDate ?? '').localeCompare(b.forecastDate ?? ''));
    }
    return copy;
  }, [filtered, sortBy]);

  const { paged: pagedForecasts, totalPages, safePage } = paginate(sorted, page, pageSize);

  const {
    paged: pagedCapacity,
    totalPages: capacityTotalPages,
    safePage: safeCapacityPage,
  } = paginate(capacity, capacityPage, pageSize);

  const loading = projectsQ.loading || tareasQ.loading;
  const error = projectsQ.error || tareasQ.error;
  const refetch = () => {
    projectsQ.refetch();
    tareasQ.refetch();
  };

  if (loading) {
    return (
      <div>
        <Header title="Pronósticos" onRefresh={refetch} loading />
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-44" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Pronósticos" onRefresh={refetch} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={refetch}
            className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Pronósticos" onRefresh={refetch} loading={loading} />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <KPICard title="Proyectos proyectados" value={kpis.total} icon={Target} accentColor="text-blue-400" info={infoFor('pronosticos-kpi-total')} />
        <KPICard title="En tiempo" value={kpis.onTrack} icon={CheckCircle2} accentColor="text-green-400" info={infoFor('pronosticos-kpi-on-track')} />
        <KPICard title="Deslizando" value={kpis.slipping} icon={Clock} accentColor="text-amber-400" info={infoFor('pronosticos-kpi-slipping')} />
        <KPICard
          title="En riesgo"
          value={kpis.atRisk}
          icon={AlertTriangle}
          accentColor="text-red-400"
          highlight={kpis.atRisk > 0}
          info={infoFor('pronosticos-kpi-at-risk')}
        />
        <KPICard
          title="Desvío promedio"
          value={`${kpis.avgSlippage > 0 ? '+' : ''}${kpis.avgSlippage}d`}
          icon={TrendingUp}
          accentColor={kpis.avgSlippage > 7 ? 'text-red-400' : kpis.avgSlippage > 0 ? 'text-amber-400' : 'text-green-400'}
          subtitle="vs fin estimado"
          info={infoFor('pronosticos-kpi-avg-slippage')}
        />
        <KPICard
          title="Datos stale"
          value={staleTotal}
          icon={AlertCircle}
          accentColor="text-amber-400"
          subtitle={snapStats.weeks > 0 ? `${snapStats.weeks} sem. snapshots` : 'sin snapshots aún'}
          highlight={staleTotal > 0}
          info={infoFor('pronosticos-kpi-stale')}
        />
      </div>

      {/* Tabs */}
      <Tabs
        className="mb-6"
        active={tab}
        onChange={(k) => setTab(k as TabKey)}
        tabs={[
          { key: 'proyectos', label: 'Proyectos', icon: Target, count: sorted.length },
          { key: 'planeacion', label: 'Planeación', icon: CalendarClock, count: hitoForecasts.length },
          { key: 'dependencias', label: 'Dependencias', icon: Link2, count: dependencies.length },
          { key: 'personas', label: 'Personas', icon: Users, count: capacity.length },
          { key: 'contexto', label: 'Contexto', icon: Info },
          { key: 'metodologia', label: '¿Cómo funciona?', icon: BookOpen },
        ]}
      />

      {/* Tab: Proyectos */}
      {tab === 'proyectos' && (
        <>
          {/* Legend */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[12px] text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-slate-200 font-medium text-[12px]">Cómo leer las tarjetas</span>
                  <GlossaryTooltip id="pronosticos-proyectos-legend" />
                </div>
                <p>
                  <span className="text-slate-200 font-medium">Riesgo</span> es una etiqueta categórica (En tiempo, Deslizando, En riesgo). Considera tanto el <span className="text-slate-200">desvío</span> proyectado como el gap de progreso esperado vs real.
                </p>
                <p>
                  <span className="text-slate-200 font-medium">Desvío</span> (ej. <span className="text-amber-400 font-semibold">+12d</span>) es la diferencia en días entre la fecha pronosticada y <code className="text-slate-300 text-[11px]">finEstimado</code>. Positivo = tarde; negativo = antes.
                </p>
                <p>
                  La <span className="text-slate-200 font-medium">banda</span> es el intervalo optimista–pesimista, modulado por la variabilidad del throughput del equipo.
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4">
            <FilterDropdowns
              filters={[
                { key: 'risk', label: 'Riesgo', options: filterOptions.risk, multi: true },
                ...(isScoped ? [] : [{ key: 'pm', label: 'PM', options: filterOptions.pm, multi: true }]),
                { key: 'cuatrimestre', label: 'Q de entrega', options: filterOptions.cuatrimestre, multi: true },
              ]}
              activeFilters={filters}
              onFilterChange={(k, v) => {
                setFilters((p) => ({ ...p, [k]: v }));
                setPage(0);
              }}
              onClear={() => {
                clearPersisted();
                setPage(0);
              }}
            />
          </div>

          <div className="flex items-center gap-2 mb-4 text-xs">
            <span className="text-slate-500">Ordenar por:</span>
            {(['risk', 'slippage', 'forecast'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  sortBy === k ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {k === 'risk' ? 'Riesgo' : k === 'slippage' ? 'Desvío' : 'Fecha pronóstico'}
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-slate-300">Pronósticos por proyecto</h3>
            <GlossaryTooltip id="pronosticos-proyectos-cards" />
          </div>
          {pagedForecasts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pagedForecasts.map((f) => (
                <ForecastCard key={f.project.id} forecast={f} stale={staleMap.get(f.project.id)} />
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
              <p className="text-slate-400">Sin proyectos para proyectar con los filtros actuales.</p>
            </div>
          )}

          <PaginationControls
            total={sorted.length}
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            className="mt-6"
          />
        </>
      )}

      {/* Tab: Planeación */}
      {tab === 'planeacion' && (
        <div className="space-y-6">
          {/* Anomaly detection */}
          {anomalies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-medium text-slate-300">Anomalías de ritmo</h3>
                <GlossaryTooltip id="pronosticos-planeacion-anomalies" />
                <span className="text-[11px] text-slate-500 ml-2">
                  cambios abruptos detectados entre snapshots
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anomalies.map((a) => (
                  <AnomalyCard key={a.project.id} anomaly={a} />
                ))}
              </div>
            </div>
          )}

          {/* Slippage cost impact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-slate-300">Costo proyectado de desvíos</h3>
              <GlossaryTooltip id="pronosticos-planeacion-slippage-cost" />
            </div>
            <SlippageCostCard impact={slippageCost} />
          </div>

          {/* Capacity projection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-slate-300">Capacidad del equipo</h3>
              <GlossaryTooltip id="pronosticos-planeacion-capacity-horizons" />
              <span className="text-[11px] text-slate-500 ml-2">
                oferta vs demanda proyectada a 4/8/12 semanas
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {capacityHorizons.map((h) => (
                <CapacityHorizonCard key={h.weeks} horizon={h} />
              ))}
            </div>
          </div>

          {/* Hitos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flag className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-slate-300">Cierre por Q de entrega</h3>
              <GlossaryTooltip id="pronosticos-planeacion-hitos" />
              <span className="text-[11px] text-slate-500 ml-2">
                agregación del pronóstico más tardío de cada hito
              </span>
            </div>
            {hitoForecasts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {hitoForecasts.map((h) => (
                  <HitoForecastCard key={h.hito || 'sin-cuatrimestre'} hito={h} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-400">Sin hitos para agregar.</p>
              </div>
            )}
          </div>

          {/* Critical dates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-medium text-slate-300">Próximas fechas críticas</h3>
              <GlossaryTooltip id="pronosticos-planeacion-critical-dates" />
              <span className="text-[11px] text-slate-500 ml-2">
                entregas proyectadas en las ventanas 30 / 60 / 90 días
              </span>
            </div>
            <CriticalDatesList windows={criticalWindows} />
          </div>
        </div>
      )}

      {/* Tab: Dependencias */}
      {tab === 'dependencias' && (
        <div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[12px] text-slate-400">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-slate-200 font-medium">Análisis de dependencias</span>
                  <GlossaryTooltip id="pronosticos-dependencias-analisis" />
                </div>
                <p>
                  Proyectos con el campo <code className="text-slate-300 text-[11px]">requiereDe</code> poblado. Hacemos best-effort matching contra otros proyectos por folio o nombre. Los bloqueadores no resueltos proyectan el inicio efectivo del proyecto dependiente.
                </p>
              </div>
            </div>
          </div>

          {dependencies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dependencies.map((d) => (
                <DependencyCard key={d.dependent.id} dependency={d} />
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
              <p className="text-slate-400">Ningún proyecto tiene dependencias declaradas en <code className="text-slate-300">requiereDe</code>.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Personas */}
      {tab === 'personas' && (
        <div className="space-y-8">
          {/* Capacity section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-slate-300">Capacidad por persona</h3>
              <GlossaryTooltip id="pronosticos-personas-capacidad" />
              <span className="text-[11px] text-slate-500 ml-2">
                velocity de tareas vs carga asignada pendiente
              </span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-slate-400">
                  Velocity = puntos completados por semana (últimas 8 sem.). Cuando una persona tiene carga pendiente y
                  velocity histórica, estimamos cuántas semanas tardará en liquidarla al ritmo actual.
                </p>
              </div>
            </div>

            {pagedCapacity.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedCapacity.map((c) => (
                  <PersonCapacityCard key={c.name} capacity={c} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                <p className="text-slate-400">Sin tareas asignadas para calcular capacidad.</p>
              </div>
            )}

            <PaginationControls
              total={capacity.length}
              page={safeCapacityPage}
              totalPages={capacityTotalPages}
              pageSize={pageSize}
              onPageChange={setCapacityPage}
              onPageSizeChange={setPageSize}
              className="mt-4"
            />
          </div>

          {/* Course forecasts section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-slate-300">Finalización de cursos</h3>
              <GlossaryTooltip id="pronosticos-personas-cursos" />
              <span className="text-[11px] text-slate-500 ml-2">
                ritmo derivado de snapshots semanales · {snapStats.weeks} sem. acumuladas
              </span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-slate-400">
                  La hoja de Cursos no tiene fechas, así que el ritmo se deriva comparando snapshots semanales guardados en este navegador. Con pocos snapshots, la proyección se queda vacía — se irá llenando con el tiempo.
                </p>
              </div>
            </div>

            {courseForecasts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseForecasts.map((f) => (
                  <CourseForecastCard key={f.colaborador} forecast={f} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                <p className="text-slate-400">Sin datos de cursos cargados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Contexto */}
      {tab === 'contexto' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-slate-300">Backtesting del motor</h3>
              <GlossaryTooltip id="pronosticos-contexto-backtest" />
            </div>
            <BacktestCard result={backtest} snapshotWeeks={snapStats.weeks} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-slate-300">Estado de snapshots</h3>
              <GlossaryTooltip id="pronosticos-contexto-snapshots" />
            </div>
            <SnapshotStatusCard
              weeks={snapStats.weeks}
              firstWeek={snapStats.firstWeek}
              lastWeek={snapStats.lastWeek}
              projectsTracked={snapStats.projectsTracked}
              cursosTracked={snapStats.cursosTracked}
              projects={projectsQ.data}
              cursos={cursosQ.data}
              onChange={refreshSnapshots}
            />
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-slate-300">Velocity del equipo</h3>
              <GlossaryTooltip id="pronosticos-contexto-velocity" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{velocity.meanPoints.toFixed(1)}</p>
            <p className="text-xs text-slate-500">
              puntos / semana (últimas {velocity.weeks} sem.)
            </p>
            <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Tareas/semana</span>
                <span className="text-slate-200 font-medium">{velocity.meanTasks.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Variabilidad (CV)</span>
                <span
                  className={`font-medium ${velocity.cv < 0.3 ? 'text-green-400' : velocity.cv < 0.6 ? 'text-amber-400' : 'text-red-400'}`}
                >
                  {(velocity.cv * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2">
                El CV (coeficiente de variación) determina el ancho de la banda optimista–pesimista en cada pronóstico.
              </p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-slate-300">Precisión de estimación</h3>
              <GlossaryTooltip id="pronosticos-contexto-precision" />
            </div>
            <p
              className={`text-3xl font-bold mb-1 ${bias.globalRatio > 1.2 ? 'text-red-400' : bias.globalRatio < 0.8 ? 'text-blue-400' : 'text-green-400'}`}
            >
              {bias.globalRatio.toFixed(2)}×
            </p>
            <p className="text-xs text-slate-500">
              ET / Estimación (App, {bias.count} tareas)
            </p>
            <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
              {bias.globalRatio > 1.2
                ? 'Tareas reales tardan más que lo estimado — considera un buffer.'
                : bias.globalRatio < 0.8
                  ? 'El equipo estima conservador — ejecuta más rápido.'
                  : 'Estimaciones alineadas con el tiempo real.'}
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-medium text-slate-300">Baseline histórico (proyectos Done)</h3>
              <GlossaryTooltip id="pronosticos-contexto-baseline" />
            </div>
            {baseline.sampleSize > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p
                    className={`text-2xl font-bold ${Math.abs(baseline.meanSlippage) <= 7 ? 'text-green-400' : Math.abs(baseline.meanSlippage) <= 21 ? 'text-amber-400' : 'text-red-400'}`}
                  >
                    {baseline.meanSlippage > 0 ? '+' : ''}
                    {baseline.meanSlippage}d
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Desvío promedio</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-200">{baseline.medianSlippage}d</p>
                  <p className="text-[11px] text-slate-500 mt-1">Mediana</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-200">{baseline.mae}d</p>
                  <p className="text-[11px] text-slate-500 mt-1">Error absoluto medio</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-200">
                    {Math.round(baseline.onTimeRate * 100)}%
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">En fecha (±7d)</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Aún no hay proyectos Done con fechas de inicio y fin real para medir baseline.
              </p>
            )}
            {baseline.sampleSize > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-[11px] text-slate-500 mb-2">Distribución por muestra</p>
                <div className="space-y-1.5">
                  {baseline.distribution.map((d) => {
                    const pct = baseline.sampleSize > 0 ? (d.count / baseline.sampleSize) * 100 : 0;
                    return (
                      <div key={d.bucket} className="flex items-center gap-3 text-[11px]">
                        <span className="text-slate-500 w-28 shrink-0">{d.bucket}</span>
                        <div className="flex-1 bg-slate-700/50 rounded h-2 overflow-hidden">
                          <div
                            className="h-2 bg-slate-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-slate-400 w-8 text-right">{d.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-slate-300">Método del pronóstico</h3>
              <GlossaryTooltip id="pronosticos-contexto-metodo-resumen" />
            </div>
            <div className="text-[12px] text-slate-400 space-y-2 leading-relaxed">
              <p>
                <span className="text-slate-200 font-medium">Extrapolación de tasa de avance.</span>{' '}
                Para cada proyecto con <code className="text-slate-300 text-[11px]">fechaInicio</code> y progreso &gt; 0, calculamos tasa diaria =
                <code className="text-slate-300 text-[11px]"> progreso / días transcurridos</code>, y proyectamos cuándo
                alcanzará 100%.
              </p>
              <p>
                <span className="text-slate-200 font-medium">Banda de confianza.</span> Ancho ±spread, donde
                <code className="text-slate-300 text-[11px]"> spread = clamp(CV, 15%, 60%)</code>. A mayor variabilidad
                en throughput semanal, banda más ancha.
              </p>
              <p>
                <span className="text-slate-200 font-medium">Etiqueta de riesgo.</span> Se combina el desvío vs fin
                estimado (≤3d = en tiempo, ≤14d = deslizando, &gt;14d = en riesgo) con el gap progreso esperado vs real (gap
                &gt;30% escala a deslizando, &gt;50% a en riesgo).
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                No usamos ML — la muestra es chica (~decenas de proyectos) y un modelo probabilístico sobreajustaría. El
                método es determinista, reproducible y explicable.
              </p>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Tab: Metodología */}
      {tab === 'metodologia' && <MethodologyTab />}
    </div>
  );
}

function MethodologyTab() {
  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              Predicciones deterministas, sin machine learning
            </h3>
            <p className="text-[13px] text-slate-300 leading-relaxed">
              Toda la información aquí proviene de tus hojas de Google Sheets: <strong>Projects</strong>, <strong>Copia de app</strong> y <strong>Copia de Core</strong>. No
              usamos modelos estadísticos ni IA: son fórmulas aritméticas explicables, reproducibles y auditables. Si algo no cuadra,
              puedes rastrear cada número hasta su dato fuente.
            </p>
          </div>
        </div>
      </div>

      {/* Method 1: Forecast date */}
      <MethodCard
        glossaryId="pronosticos-metodologia-forecast-date"
        number="1"
        title="Fecha de cierre por proyecto"
        subtitle="Extrapolación lineal de la tasa de avance"
        color="blue"
        inputs={[
          { label: 'fechaInicio', detail: 'Columna del Sheet Projects — cuándo arrancó el proyecto' },
          { label: 'progreso', detail: 'Porcentaje 0–100% que tú registras manualmente' },
          { label: 'finEstimado', detail: 'Fecha planeada de entrega' },
        ]}
        formula={[
          'tasaDiaria = progreso / díasTranscurridos',
          'díasRestantes = (1 − progreso) / tasaDiaria',
          'fechaPronóstico = hoy + díasRestantes',
        ]}
        reasoning="Si un proyecto lleva 40% de avance en 30 días, el ritmo observado es 1.33% por día. A ese ritmo tardará ~75 días totales en llegar a 100%. La matemática asume que el equipo mantendrá el mismo ritmo promedio que ha llevado hasta hoy."
        whyThis="Con tu muestra de proyectos (decenas, no miles), un modelo más complejo sobreajustaría y daría falsa precisión. La extrapolación lineal es simple, honesta y transparente."
      />

      {/* Method 2: Band */}
      <MethodCard
        glossaryId="pronosticos-metodologia-band"
        number="2"
        title="Banda optimista–pesimista"
        subtitle="Variabilidad histórica del throughput"
        color="purple"
        inputs={[
          { label: 'tareas completadas', detail: 'Tareas con estatus "Completado" y fecha fin registrada' },
          { label: 'puntos', detail: 'Story points / estimación por tarea' },
          { label: 'ventana', detail: 'Últimas 8 semanas ISO (lunes a domingo)' },
        ]}
        formula={[
          'Agrupa tareas completadas por semana',
          'μ = promedio de puntos completados por semana',
          'σ = desviación estándar',
          'CV = σ / μ   (coeficiente de variación)',
          'anchoBanda = clamp(CV, 15%, 60%)',
          'optimista = fechaPronóstico − (díasRestantes × anchoBanda)',
          'pesimista = fechaPronóstico + (díasRestantes × anchoBanda)',
        ]}
        reasoning="Si el equipo entrega muy parejo semana a semana (CV bajo, ~15%), la banda es angosta: hay poca incertidumbre. Si el throughput oscila mucho (CV alto, >50%), la banda se abre proporcionalmente. Los límites de 15% y 60% evitan bandas engañosas (ni tan cerradas que ignoren variabilidad real, ni tan amplias que pierdan significado)."
        whyThis="El CV es el estándar para medir variabilidad relativa. Usarlo como modulador convierte la incertidumbre del equipo en un rango concreto de fechas, en vez de dar una única fecha puntual con falsa precisión."
      />

      {/* Method 3: Risk label */}
      <MethodCard
        glossaryId="pronosticos-metodologia-risk-label"
        number="3"
        title="Etiqueta de riesgo"
        subtitle="Clasificación categórica del estado del proyecto"
        color="amber"
        inputs={[
          { label: 'desvío', detail: 'Días entre fechaPronóstico y finEstimado' },
          { label: 'gap', detail: 'Progreso esperado (por fecha) − progreso real registrado' },
        ]}
        formula={[
          '// Por desvío:',
          'desvío ≤ 3d       → En tiempo',
          'desvío 4–14d      → Deslizando',
          'desvío > 14d      → En riesgo',
          '',
          '// Escalamiento por gap de progreso:',
          'gap > 30%  y riesgo = En tiempo → Deslizando',
          'gap > 50%  y riesgo ≠ En riesgo → En riesgo',
          '',
          '// Casos especiales:',
          'progreso = 0 y ya inició → Estancado',
          'Sin fechaInicio          → Sin datos',
        ]}
        reasoning='Un proyecto puede tener desvío pequeño y aún estar en problemas si su progreso va muy atrás del esperado. Por eso no basta con el desvío: se escala el riesgo cuando el gap de progreso es severo.'
        whyThis="El desvío en días es cuantitativo, pero no accionable por sí solo. La etiqueta categórica (3 niveles) te permite priorizar en lenguaje común sin tener que pensar umbrales cada vez que revisas la vista."
      />

      {/* Method 4: Capacity */}
      <MethodCard
        glossaryId="pronosticos-metodologia-capacity"
        number="4"
        title="Capacidad por persona"
        subtitle="Velocity individual vs carga asignada"
        color="cyan"
        inputs={[
          { label: 'asignado', detail: 'Nombre registrado en las tareas (consolidado por fuzzy matching para cubrir variantes)' },
          { label: 'puntos completados', detail: 'Por persona, últimas 8 semanas' },
          { label: 'tareas pendientes', detail: 'Todas las no "Completado" ni "Cancelado"' },
        ]}
        formula={[
          'velocityPersona = puntos completados / semanas observadas',
          'puntosPendientes = Σ puntos de tareas pendientes asignadas',
          'semanasParaLiquidar = puntosPendientes / velocityPersona',
          'fechaLibre = hoy + (semanasParaLiquidar × 7)',
        ]}
        reasoning="Si alguien ha cerrado 10 pts/sem en promedio y tiene 50 pts pendientes, tardará ~5 semanas al ritmo actual. Si no hay historial de velocity, no podemos proyectar (se muestra '?')."
        whyThis="Permite ver quién está sobrecargado antes de que llegue a ser un cuello de botella. El fuzzy matching bidireccional es crítico porque los nombres en Projects (apodos) no siempre coinciden con Cursos/Cronograma (nombres completos)."
      />

      {/* Method 5: Estimation accuracy */}
      <MethodCard
        glossaryId="pronosticos-metodologia-estimation-bias"
        number="5"
        title="Precisión de estimación"
        subtitle="Calidad del proceso de estimación"
        color="emerald"
        inputs={[
          { label: 'actividades con estimado y real', detail: 'Sólo las que tienen ambos: puntos (estimado) y tracked (tiempo real)' },
        ]}
        formula={[
          'ratio = Σ tracked / Σ puntos',
          '',
          'ratio > 1.2 → Sub-estimación sistemática',
          'ratio < 0.8 → Sobre-estimación sistemática',
          '0.8–1.2     → Estimaciones alineadas con la realidad',
        ]}
        reasoning="Un ratio de 1.35 significa que las tareas reales toman 35% más tiempo que lo estimado. No se aplica automáticamente al pronóstico (porque el pronóstico ya se basa en el progreso real, no en estimaciones), pero es una señal para el proceso de planeación."
        whyThis="Mide una cosa distinta a las demás: la calidad del plan original. Es una métrica de proceso, no de ejecución. Útil para decidir si agregar buffer a estimaciones futuras."
      />

      {/* Method 6: Baseline */}
      <MethodCard
        glossaryId="pronosticos-metodologia-baseline"
        number="6"
        title="Baseline histórico"
        subtitle="Desempeño pasado del portafolio"
        color="rose"
        inputs={[
          { label: 'proyectos Done', detail: 'Con finEstimado y finReal registrados' },
        ]}
        formula={[
          'Para cada proyecto Done:',
          '  desvío = finReal − finEstimado (días)',
          '',
          'Se reporta:',
          '  promedio, mediana, MAE (error absoluto medio)',
          '  % en fecha (±7d)',
          '  distribución por bucket (−30d/−7d/±7d/+30d/+30d+)',
        ]}
        reasoning="Si históricamente el portafolio se desliza +20d en promedio, un pronóstico con desvío +15d no es una anomalía: está dentro del ruido normal. El baseline da contexto para juzgar si un desvío proyectado es preocupante."
        whyThis="Sin baseline, un desvío de 15 días parece malo en abstracto. Con baseline, puedes decir 'este proyecto está proyectado a deslizarse menos de lo que históricamente hemos deslizado'. Es la ancla de realidad del sistema."
      />

      {/* Method 7: Probability on time */}
      <MethodCard
        glossaryId="pronosticos-metodologia-probability"
        number="7"
        title="Probabilidad de cumplir fin estimado"
        subtitle="Distribución normal alrededor del pronóstico"
        color="blue"
        inputs={[
          { label: 'daysToFinish', detail: 'Días restantes según la extrapolación lineal (método 1)' },
          { label: 'slippageDays', detail: 'Desvío entre fecha pronóstico y finEstimado' },
          { label: 'CV', detail: 'Variabilidad semanal del equipo (método 2)' },
        ]}
        formula={[
          'σ = daysToFinish × spread(CV)',
          'Z = −slippageDays / σ',
          'P(a tiempo) = Φ(Z)   // CDF normal estándar',
          '',
          'Rangos semánticos:',
          '  ≥ 75%  →  alta',
          '  50–75% →  razonable',
          '  25–50% →  frágil',
          '  < 25%  →  muy improbable',
        ]}
        reasoning='Modelamos la fecha real de cierre como una variable normal centrada en el pronóstico con desviación σ. Entonces la probabilidad de terminar a tiempo es la probabilidad de que una muestra de esa normal caiga en o antes del finEstimado. Un proyecto con desvío 0 tiene 50% por construcción; mientras más negativo el desvío y menor el CV, mayor la probabilidad.'
        whyThis="La etiqueta de riesgo es categórica y pierde matiz. Una probabilidad numérica (ej. 38%) comunica mejor cuán frágil es un compromiso sin esconder la incertidumbre bajo una etiqueta."
      />

      {/* Method 8: Hito aggregation */}
      <MethodCard
        glossaryId="pronosticos-metodologia-hito-aggregation"
        number="8"
        title="Cierre por Q de entrega"
        subtitle="Agregación del pronóstico más tardío de cada grupo"
        color="purple"
        inputs={[
          { label: 'forecasts agrupados por project.cuatrimestre', detail: 'Cada proyecto aporta su fecha pronóstico y su finEstimado' },
        ]}
        formula={[
          'Para cada hito:',
          '  cierreProyectado = max(forecastDate de cada proyecto activo)',
          '  ultimoPlan       = max(finEstimado de cada proyecto)',
          '  desvíoAgregado   = cierreProyectado − ultimoPlan',
          '  progresoPromedio = media(progreso) en proyectos del hito',
          '  peorRiesgo       = peor etiqueta entre los proyectos activos',
        ]}
        reasoning="Un hito cierra cuando el último de sus proyectos termina. No sirve promediar fechas, hay que tomar el máximo. El riesgo del hito es tan malo como su peor proyecto."
        whyThis="Al dirección le importa saber cuándo se cierra 2026 Q1 completo, no sólo cuándo cierra el proyecto X. La agregación convierte pronósticos individuales en algo accionable a nivel estratégico."
      />

      {/* Method 9: Capacity horizons */}
      <MethodCard
        glossaryId="pronosticos-metodologia-capacity-horizons"
        number="9"
        title="Capacidad del equipo a N semanas"
        subtitle="Oferta vs demanda en horizontes de 4/8/12 semanas"
        color="cyan"
        inputs={[
          { label: 'velocity.meanPoints', detail: 'Puntos por semana del equipo (método 2)' },
          { label: 'project.puntos × (1 − progreso)', detail: 'Puntos restantes por proyecto activo' },
          { label: 'daysRemainingForecast', detail: 'Días hasta la fecha pronóstico por proyecto' },
        ]}
        formula={[
          'Para cada horizonte H (en semanas):',
          '  supply = velocity.meanPoints × H',
          '  demand = Σ por proyecto activo:',
          '    remaining × min(1, H×7 / daysRemainingForecast)',
          '',
          '  utilización = demand / supply',
          '',
          '  < 70%       → Holgura',
          '  70–95%      → Sano',
          '  95–115%     → Saturado',
          '  > 115%      → Sobrecarga',
        ]}
        reasoning="La demanda no toma toda la carga pendiente, sino la fracción que realmente caerá dentro del horizonte (prorrateo según la fecha pronóstico). Un proyecto que termina en 10 semanas aporta toda su carga restante al horizonte de 12 semanas pero sólo parte al de 4."
        whyThis="Responde preguntas estratégicas como '¿podemos tomar un proyecto más este trimestre?'. Es una métrica de compromiso, no de ejecución: ayuda a decidir qué NO comprometer."
      />

      {/* Method 10: Critical dates */}
      <MethodCard
        glossaryId="pronosticos-metodologia-critical-dates"
        number="10"
        title="Próximas fechas críticas"
        subtitle="Entregas proyectadas en ventanas 30/60/90 días"
        color="amber"
        inputs={[
          { label: 'forecast.forecastDate', detail: 'Fecha proyectada de cierre por proyecto' },
        ]}
        formula={[
          'Para cada proyecto activo:',
          '  daysFromNow = forecastDate − hoy',
          '',
          'Asignación por ventanas (0–30, 31–60, 61–90):',
          '  si daysFromNow ≤ W y daysFromNow > W_previa',
          '  → pertenece a esa ventana',
          '',
          'Orden: cronológico (más próximo primero)',
          'Valores negativos (vencidos) aparecen en la ventana más próxima',
        ]}
        reasoning="Una vista cronológica responde la pregunta operativa del día a día: ¿qué tengo que cerrar esta semana, este mes, este trimestre? Los proyectos vencidos suben al inicio para priorizar."
        whyThis="Las fechas individuales se pierden en la vista global. Agruparlas por ventanas cercanas las vuelve accionables para PMs: lo de 30 días entra a 1:1, lo de 60 a planning, lo de 90 a roadmap."
      />

      {/* Method 11: Slippage cost impact */}
      <MethodCard
        glossaryId="pronosticos-metodologia-slippage-cost"
        number="11"
        title="Costo proyectado de desvíos"
        subtitle="Impacto financiero de los deslizamientos"
        color="rose"
        inputs={[
          { label: 'forecast.slippageDays', detail: 'Días de desvío positivo por proyecto activo' },
          { label: 'estimateProjectCost()', detail: 'Costo mensual del equipo por proyecto (prorrateado a N proyectos activos)' },
          { label: 'costos del Sheet', detail: 'Tabla de roles y costos mensuales por función' },
        ]}
        formula={[
          'Para cada proyecto con slippage > 0:',
          '  costoDiario = estimatedMonthlyCost / 30',
          '  costoAdicional = costoDiario × slippageDays',
          '',
          'Agregado del portafolio:',
          '  totalImpacto = Σ costoAdicional',
          '  %Mensual = totalImpacto / Σ costosMensuales',
        ]}
        reasoning="Cada día de desvío cuesta una fracción diaria del costo mensual del equipo asignado. Agregado al portafolio, traduce el concepto abstracto de 'se está deslizando' en una cifra de dinero que finanzas entiende."
        whyThis="Los PMs razonan en días; los directivos en dinero. Esta métrica hace el puente: convierte slippage operativo en costo hundido proyectado, lo cual cambia completamente la priorización de intervenciones."
      />

      {/* Method 12: Snapshot-based course forecast */}
      <MethodCard
        glossaryId="pronosticos-metodologia-course-forecast"
        number="12"
        title="Finalización de cursos"
        subtitle="Proyección por persona basada en snapshots semanales"
        color="purple"
        inputs={[
          { label: 'CursoRecord.progreso', detail: 'Progreso actual (0–100) del Sheet de Cursos' },
          { label: 'snapshots semanales', detail: 'Histórico de progreso por persona guardado en localStorage' },
        ]}
        formula={[
          'Para cada colaborador con al menos 1 snapshot:',
          '  snapshotMasViejo = primera captura disponible',
          '  semanas = (hoy − snapshotMasViejo.fecha) / 7',
          '  delta = progresoActual − snapshotMasViejo.progreso',
          '  ritmo = delta / semanas   (puntos %/sem)',
          '',
          '  semanasRestantes = (100 − progresoActual) / ritmo',
          '  fechaFinal = hoy + semanasRestantes × 7',
        ]}
        reasoning="La hoja de Cursos no tiene fechas, así que no podemos derivar ritmo de ella sola. Los snapshots capturados cada semana proveen la dimensión temporal faltante: al acumular semanas, el delta de progreso da una velocidad real."
        whyThis='Requiere tiempo: los primeros snapshots no proyectan nada. Pero a partir de la 2–3ra semana el ritmo real emerge sin depender de suposiciones. Es la forma honesta de proyectar: esperar a tener datos en lugar de inventarlos.'
      />

      {/* Method 13: Backtest */}
      <MethodCard
        glossaryId="pronosticos-metodologia-backtest"
        number="13"
        title="Backtesting del motor de pronóstico"
        subtitle="¿Qué tan bien predijo el método en el pasado?"
        color="emerald"
        inputs={[
          { label: 'snapshots históricos', detail: 'Estado de cada proyecto guardado semana a semana' },
          { label: 'proyectos Done con finReal', detail: 'Proyectos ya cerrados, ancla de verdad' },
        ]}
        formula={[
          'Para cada proyecto hoy en Done:',
          '  1. Buscar snapshot donde tenía 20–95% de progreso',
          '  2. A ese momento, calcular:',
          '       daysElapsed = snapshotDate − fechaInicio',
          '       ritmo = progresoSnapshot / daysElapsed',
          '       prediccion = snapshotDate + (1 − progresoSnapshot) / ritmo',
          '  3. error = prediccion − finReal',
          '',
          'Se reporta:',
          '  MAE (error absoluto medio)',
          '  sesgo medio (¿sistemáticamente tarde o temprano?)',
          '  % dentro de ±7d y ±14d',
        ]}
        reasoning="Al cerrarse un proyecto podemos mirar atrás y decir: '¿qué habría predicho este método cuando iba al 40%?'. Si el MAE es bajo, el motor funciona. Si el sesgo es consistente (ej. siempre +10d), podemos calibrarlo."
        whyThis="Un método sin forma de verificarse es fe. El backtest hace al motor auditable: si las predicciones sistemáticamente erran, lo sabemos y lo corregimos. Es la forma científica de mejorar el pronóstico en vez de sólo usarlo."
      />

      {/* Limitations */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Limitaciones honestas</h3>
            <p className="text-[12px] text-slate-400">
              Conocer los límites del método es tan importante como conocer el método.
            </p>
          </div>
        </div>
        <ul className="space-y-2.5 text-[13px] text-slate-300 leading-relaxed">
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">•</span>
            <span>
              <strong className="text-white">Asume ritmo lineal.</strong> No modela sprints, bloqueadores intermitentes ni el
              efecto "último 10% es el 90% del trabajo". Si un proyecto se acelera al final o se empantana, el pronóstico no lo ve.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">•</span>
            <span>
              <strong className="text-white">Depende de <code className="text-slate-200 text-[12px]">progreso</code> bien mantenido.</strong> Si
              un proyecto no se actualiza en 2 semanas, la tasa diaria se subestima y el pronóstico se alarga artificialmente.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">•</span>
            <span>
              <strong className="text-white">Muestra chica.</strong> ~decenas de proyectos y 8 semanas de throughput. Por eso
              un modelo más complejo (ML, regresión bayesiana) sobreajustaría — el volumen de datos no lo justifica todavía.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">•</span>
            <span>
              <strong className="text-white">No hay backtesting real.</strong> Sólo tenemos el estado actual, no snapshots
              históricos de progreso. No puedo decir con certeza "hace 3 meses este método habría acertado en X%". El baseline
              mide la precisión del plan original, no de este pronóstico.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 shrink-0">•</span>
            <span>
              <strong className="text-white">Velocity global mezcla productos.</strong> App y Core se agregan juntos para el
              ritmo del equipo. Si hay gran disparidad, el pronóstico global es un promedio ponderado que no refleja la realidad
              de cada producto por separado.
            </span>
          </li>
        </ul>
      </div>

      {/* How to improve */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Cómo podemos endurecer el método</h3>
        </div>
        <ul className="space-y-1.5 text-[12px] text-slate-400">
          <li>
            → Guardar <strong className="text-slate-200">snapshots semanales</strong> de progreso para habilitar backtesting real
          </li>
          <li>
            → Ponderar semanas recientes más que viejas (<strong className="text-slate-200">media móvil exponencial</strong>) para responder más rápido a cambios de ritmo
          </li>
          <li>
            → Separar velocity por producto (App vs Core) y proyectar con la velocity del producto correcto
          </li>
          <li>
            → Detectar proyectos con progreso <strong className="text-slate-200">no actualizado en N días</strong> y marcarlos como "datos stale"
          </li>
        </ul>
      </div>
    </div>
  );
}

interface MethodInput {
  label: string;
  detail: string;
}

interface MethodCardProps {
  number: string;
  title: string;
  subtitle: string;
  color: 'blue' | 'purple' | 'amber' | 'cyan' | 'emerald' | 'rose';
  inputs: MethodInput[];
  formula: string[];
  reasoning: string;
  whyThis: string;
  glossaryId?: string;
}

const COLOR_MAP: Record<MethodCardProps['color'], { border: string; badge: string; accent: string }> = {
  blue: { border: 'border-blue-500/20', badge: 'bg-blue-500/15 text-blue-300', accent: 'text-blue-400' },
  purple: { border: 'border-purple-500/20', badge: 'bg-purple-500/15 text-purple-300', accent: 'text-purple-400' },
  amber: { border: 'border-amber-500/20', badge: 'bg-amber-500/15 text-amber-300', accent: 'text-amber-400' },
  cyan: { border: 'border-cyan-500/20', badge: 'bg-cyan-500/15 text-cyan-300', accent: 'text-cyan-400' },
  emerald: { border: 'border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-300', accent: 'text-emerald-400' },
  rose: { border: 'border-rose-500/20', badge: 'bg-rose-500/15 text-rose-300', accent: 'text-rose-400' },
};

function MethodCard({ number, title, subtitle, color, inputs, formula, reasoning, whyThis, glossaryId }: MethodCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`bg-slate-800 border ${c.border} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-start gap-3">
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold shrink-0 ${c.badge}`}
        >
          {number}
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {glossaryId && <GlossaryTooltip id={glossaryId} />}
          </div>
          <p className={`text-xs ${c.accent}`}>{subtitle}</p>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: inputs + formula */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className={`w-3.5 h-3.5 ${c.accent}`} />
              <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Qué datos usa</h4>
            </div>
            <ul className="space-y-1.5">
              {inputs.map((input) => (
                <li key={input.label} className="text-[12px]">
                  <code className="text-slate-200 bg-slate-900/60 px-1.5 py-0.5 rounded text-[11px]">
                    {input.label}
                  </code>
                  <span className="text-slate-500"> — {input.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className={`w-3.5 h-3.5 ${c.accent}`} />
              <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Cómo se calcula</h4>
            </div>
            <pre className="bg-slate-900/60 rounded-lg p-3 text-[11px] text-slate-300 font-mono leading-relaxed overflow-x-auto whitespace-pre">
              {formula.join('\n')}
            </pre>
          </div>
        </div>

        {/* Right column: reasoning + why */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className={`w-3.5 h-3.5 ${c.accent}`} />
              <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">En palabras simples</h4>
            </div>
            <p className="text-[12px] text-slate-300 leading-relaxed">{reasoning}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className={`w-3.5 h-3.5 ${c.accent}`} />
              <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Por qué este método</h4>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed italic">{whyThis}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
