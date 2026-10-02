import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSheetData } from '../../hooks/useSheetData';
import { useSnapshotCapture } from '../../hooks/useSnapshotCapture';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import type { ProjectRecord, TareaRecord, CursoRecord, CostoRecord } from '../../utils/dataTransforms';
import { splitMulti } from '../../utils/dataTransforms';
import { estimateProjectCost } from '../../utils/costEngine';
import { forecastProjects } from '../../utils/forecastEngine';
import { loadSnapshots } from '../../utils/snapshots';
import type { WeeklySnapshot } from '../../utils/snapshots';
import { computeStaleness } from '../../utils/stale';
import { isTerminal } from '../../utils/projectStatus';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import ProjectCard from '../ui/ProjectCard';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  paginate,
  sanitizePageSize,
  type PageSize,
} from '../ui/PaginationControls';
import { CheckCircle2 } from 'lucide-react';

// Enums estables (definen orden). Arquitecto/DEV/Cuatrimestre se derivan de
// los datos (ver `filterConfigs`) porque dependen de la hoja y cambian.
const STATIC_FILTER_CONFIGS = [
  { key: 'estatus', label: 'Estatus', options: ['On Track','At Risk','Blocked / Critical','Done','Hypercare','LaunchPhase','On Hold','Upcoming','Cancelado'].map(v => ({ value: v, label: v })), multi: true },
  { key: 'salud', label: 'Salud', options: ['Estable','Requiere atencion','En riesgo'].map(v => ({ value: v, label: v })), multi: true },
  { key: 'prioridad', label: 'Prioridad', options: ['Bloqueadora','Crítica','Mayor','Menor','Trivial'].map(v => ({ value: v, label: v })), multi: true },
];

export default function ProyectosSection() {
  const { isScoped } = useScopeView();
  const { data, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const tareasQ = useSheetData<TareaRecord>('/api/tareas');
  const cursosQ = useSheetData<CursoRecord>('/api/cursos');
  // Costos: gating natural — si el rol no tiene `data:costos`, el endpoint responde 403
  // (`forbidden`) y el costo simplemente no se muestra. No expone costo a dev/ventas.
  const costosQ = useSheetData<CostoRecord>('/api/costos');
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    filters: Record<string, string[]>;
    includeDone: boolean;
    pageSize: PageSize;
  }>('proyectos', { filters: {}, includeDone: false, pageSize: DEFAULT_PAGE_SIZE });
  const activeFilters = persisted.filters;
  const includeDone = persisted.includeDone;
  const pageSize = sanitizePageSize(persisted.pageSize);
  const setActiveFilters = useCallback(
    (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) =>
      setPersisted((prev) => ({
        ...prev,
        filters: typeof updater === 'function' ? updater(prev.filters) : updater,
      })),
    [setPersisted],
  );
  const setIncludeDone = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) =>
      setPersisted((prev) => ({
        ...prev,
        includeDone: typeof updater === 'function' ? updater(prev.includeDone) : updater,
      })),
    [setPersisted],
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const setPageSize = useCallback(
    (next: PageSize) => {
      setPersisted((prev) => ({ ...prev, pageSize: next }));
      setPage(0);
    },
    [setPersisted],
  );
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);

  useSnapshotCapture(data, cursosQ.data);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const forecastMap = useMemo(() => {
    const { forecasts } = forecastProjects(data, tareasQ.data);
    const map = new Map<string, typeof forecasts[number]>();
    for (const f of forecasts) map.set(f.project.id, f);
    return map;
  }, [data, tareasQ.data]);

  const staleMap = useMemo(() => computeStaleness(data, snapshots), [data, snapshots]);

  // Costo mensual estimado por proyecto. Vacío si no hay acceso a costos (403/forbidden)
  // o si la hoja de costos aún no carga. `data` completo como divisor para no inflar el prorrateo.
  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!costosQ.data.length) return map;
    for (const p of data) {
      map.set(p.id, estimateProjectCost(p, data, costosQ.data).estimatedMonthlyCost);
    }
    return map;
  }, [data, costosQ.data]);

  // Opciones derivadas de los datos (apodos/cuatrimestres reales de la hoja).
  const toOpts = (vals: Iterable<string>) => [...new Set(vals)].sort().map((v) => ({ value: v, label: v }));
  const pmOptions = useMemo(() => toOpts(data.flatMap((p) => splitMulti(p.pm))), [data]);
  const arquitectoOptions = useMemo(
    () => toOpts(data.flatMap((p) => splitMulti(p.arquitecto))),
    [data],
  );
  const devOptions = useMemo(
    () => toOpts(data.flatMap((p) => p.devs).filter((d) => d && d !== '-')),
    [data],
  );
  const cuatrimestreOptions = useMemo(
    () => toOpts(data.map((p) => p.cuatrimestre).filter(Boolean)),
    [data],
  );

  // Scopeado (pm/dev): el filtro PM es redundante (solo su propio nombre) y
  // los de Arquitecto/DEV no aplican (ya ve un subconjunto acotado a su id).
  const filterConfigs = useMemo(() => {
    const base = [
      ...STATIC_FILTER_CONFIGS,
      { key: 'cuatrimestre', label: 'Q de entrega', options: cuatrimestreOptions, multi: true },
    ];
    if (isScoped) return base;
    return [
      ...base,
      { key: 'arquitecto', label: 'Arquitecto', options: arquitectoOptions, multi: true },
      { key: 'dev', label: 'DEV', options: devOptions, multi: false },
      { key: 'pm', label: 'PM', options: pmOptions, multi: false },
    ];
  }, [isScoped, cuatrimestreOptions, arquitectoOptions, devOptions, pmOptions]);

  const filtered = useMemo(() => {
    let result = data;
    const q = search.toLowerCase();
    if (q) {
      result = result.filter((p) =>
        p.actividad.toLowerCase().includes(q) || p.folio.toLowerCase().includes(q)
      );
    }
    const estatusSelected = activeFilters.estatus || [];
    // "Terminados" = Done + Cancelado. Se ocultan por defecto salvo que el
    // usuario los seleccione explícitamente en el filtro de estatus.
    if (!includeDone) {
      result = result.filter((p) => !isTerminal(p.estatus) || estatusSelected.includes(p.estatus));
    }
    for (const [key, values] of Object.entries(activeFilters)) {
      if (!values.length) continue;
      if (key === 'dev') {
        result = result.filter((p) => p.devs.some((d) => values.includes(d)));
      } else if (key === 'arquitecto') {
        // Multi-rol: la hoja trae "Luis, George" → match por cualquiera.
        result = result.filter((p) => splitMulti(p.arquitecto).some((a) => values.includes(a)));
      } else if (key === 'pm') {
        result = result.filter((p) => splitMulti(p.pm).some((pm) => values.includes(pm)));
      } else {
        result = result.filter((p) => values.includes(String((p as unknown as Record<string, unknown>)[key] || '')));
      }
    }
    return result;
  }, [data, activeFilters, search, includeDone]);

  const hiddenDoneCount = useMemo(() => {
    if (includeDone) return 0;
    const estatusSelected = activeFilters.estatus || [];
    return data.filter((p) => isTerminal(p.estatus) && !estatusSelected.includes(p.estatus)).length;
  }, [data, includeDone, activeFilters.estatus]);

  // Reset page when filters change
  useMemo(() => setPage(0), [filtered.length]);

  const { paged, totalPages, safePage } = paginate(filtered, page, pageSize);

  if (loading) {
    return (
      <div>
        <Header title="Portafolio" onRefresh={refetch} loading />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
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
        <Header title="Portafolio" onRefresh={refetch} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Portafolio" onRefresh={refetch} loading={loading} />

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <FilterDropdowns
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={(key, values) => setActiveFilters((prev) => ({ ...prev, [key]: values }))}
          onClear={() => { clearPersisted(); setSearch(''); }}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por actividad o folio..."
        />
        <button
          onClick={() => setIncludeDone((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
            includeDone
              ? 'bg-green-500/15 text-green-300 border-green-500/40'
              : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
          }`}
          title={includeDone ? 'Ocultar proyectos terminados' : 'Mostrar proyectos terminados'}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{includeDone ? 'Terminados visibles' : 'Incluir terminados'}</span>
        </button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-slate-400">
            {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
            {Object.values(activeFilters).some(v => v.length > 0) || search ? ' (filtrados)' : ''}
            {hiddenDoneCount > 0 && (
              <span className="text-slate-500"> · {hiddenDoneCount} terminado{hiddenDoneCount !== 1 ? 's' : ''} oculto{hiddenDoneCount !== 1 ? 's' : ''}</span>
            )}
          </p>
          <GlossaryTooltip id="portafolio-grid" />
        </div>
      </div>

      {/* Project Cards Grid */}
      {paged.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              forecast={forecastMap.get(project.id)}
              stale={staleMap.get(project.id)}
              showPm={isScoped}
              monthlyCost={costMap.get(project.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-400">Sin resultados</p>
          <p className="text-sm text-slate-500 mt-1">Intenta ajustar los filtros.</p>
        </div>
      )}

      {/* Pagination */}
      <PaginationControls
        total={filtered.length}
        page={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        className="mt-6"
      />
    </div>
  );
}
