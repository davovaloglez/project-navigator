import { useCallback, useMemo, useState } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { Flag, ChevronDown, ChevronRight, ArrowUpDown, Maximize2, Minimize2 } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord } from '../../utils/dataTransforms';
import { splitMulti } from '../../utils/dataTransforms';
import { isTerminal } from '../../utils/projectStatus';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import ProjectCard from '../ui/ProjectCard';
import GlossaryTooltip from '../ui/GlossaryTooltip';

interface EpicGroup {
  epica: string;
  projects: ProjectRecord[];
  avgProgress: number;
  totalPoints: number;
  doneCount: number;
}

interface HitoGroup {
  hito: string;
  epics: EpicGroup[];
  totalProjects: number;
  avgProgress: number;
  totalPoints: number;
  doneCount: number;
}

function currentCuatrimestre(now: Date = new Date()): string {
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()} Q${q}`;
}

export default function RoadmapSection() {
  const { isScoped } = useScopeView();
  const { data: allData, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    sortOrder: 'asc' | 'desc';
    filters: Record<string, string[]>;
    includeDone: boolean;
    onlyCurrentQ: boolean;
  }>('roadmap', { sortOrder: 'asc', filters: {}, includeDone: false, onlyCurrentQ: false });
  const { sortOrder, filters: activeFilters, includeDone, onlyCurrentQ } = persisted;
  const setSortOrder = useCallback(
    (updater: 'asc' | 'desc' | ((prev: 'asc' | 'desc') => 'asc' | 'desc')) =>
      setPersisted((prev) => ({ ...prev, sortOrder: typeof updater === 'function' ? updater(prev.sortOrder) : updater })),
    [setPersisted],
  );
  const setActiveFilters = useCallback(
    (next: Record<string, string[]>) => setPersisted((prev) => ({ ...prev, filters: next })),
    [setPersisted],
  );
  const setIncludeDone = useCallback(
    (next: boolean) => setPersisted((prev) => ({ ...prev, includeDone: next })),
    [setPersisted],
  );
  const setOnlyCurrentQ = useCallback(
    (next: boolean) => setPersisted((prev) => ({ ...prev, onlyCurrentQ: next })),
    [setPersisted],
  );

  const currentQ = useMemo(() => currentCuatrimestre(), []);

  const pmOptions = useMemo(() =>
    [...new Set(allData.flatMap((p) => splitMulti(p.pm)))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [allData]);

  const arquitectoOptions = useMemo(() =>
    [...new Set(allData.flatMap((p) => splitMulti(p.arquitecto)))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [allData]);

  const saludOptions = useMemo(() =>
    [...new Set(allData.map((p) => p.salud).filter((s) => s && s !== '-'))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [allData]);

  const estatusOptions = useMemo(() =>
    [...new Set(allData.map((p) => p.estatus).filter((s) => s && s !== '-'))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [allData]);

  const filterConfigs = useMemo(
    () => isScoped
      ? []
      : [
          { key: 'pm', label: 'PM', options: pmOptions, multi: false },
          { key: 'arquitecto', label: 'Arquitecto', options: arquitectoOptions, multi: true },
          { key: 'salud', label: 'Salud', options: saludOptions, multi: true },
          { key: 'estatus', label: 'Estatus', options: estatusOptions, multi: true },
        ],
    [isScoped, pmOptions, arquitectoOptions, saludOptions, estatusOptions],
  );

  const data = useMemo(() => {
    return allData.filter((p) => {
      const pm = activeFilters.pm || [];
      if (pm.length && !splitMulti(p.pm).some((v) => pm.includes(v))) return false;
      const arq = activeFilters.arquitecto || [];
      if (arq.length && !splitMulti(p.arquitecto).some((v) => arq.includes(v))) return false;
      const salud = activeFilters.salud || [];
      if (salud.length && !salud.includes(p.salud)) return false;
      const estatus = activeFilters.estatus || [];
      if (estatus.length && !estatus.includes(p.estatus)) return false;
      if (!includeDone && isTerminal(p.estatus) && !estatus.includes(p.estatus)) return false;
      if (onlyCurrentQ && p.cuatrimestre !== currentQ) return false;
      return true;
    });
  }, [allData, activeFilters, includeDone, onlyCurrentQ, currentQ]);

  const roadmap = useMemo(() => {
    const hitoMap = new Map<string, Map<string, ProjectRecord[]>>();

    for (const p of data) {
      const hito = p.cuatrimestre || 'Sin cuatrimestre';
      const epica = p.epica || 'Sin épica';
      if (!hitoMap.has(hito)) hitoMap.set(hito, new Map());
      const epicMap = hitoMap.get(hito)!;
      if (!epicMap.has(epica)) epicMap.set(epica, []);
      epicMap.get(epica)!.push(p);
    }

    const result: HitoGroup[] = [];
    for (const [hito, epicMap] of hitoMap) {
      const epics: EpicGroup[] = [];
      let totalProjects = 0, totalProgress = 0, totalPoints = 0, totalDone = 0;

      for (const [epica, projects] of epicMap) {
        const avg = projects.length > 0 ? Math.round((projects.reduce((s, p) => s + p.progreso, 0) / projects.length) * 100) : 0;
        const pts = projects.reduce((s, p) => s + p.puntos, 0);
        const done = projects.filter((p) => p.estatus === 'Done').length;
        epics.push({ epica, projects, avgProgress: avg, totalPoints: pts, doneCount: done });
        totalProjects += projects.length;
        totalProgress += projects.reduce((s, p) => s + p.progreso, 0);
        totalPoints += pts;
        totalDone += done;
      }

      epics.sort((a, b) => a.epica.localeCompare(b.epica));
      const avg = totalProjects > 0 ? Math.round((totalProgress / totalProjects) * 100) : 0;
      result.push({ hito, epics, totalProjects, avgProgress: avg, totalPoints, doneCount: totalDone });
    }

    return result.sort((a, b) => sortOrder === 'asc' ? a.hito.localeCompare(b.hito) : b.hito.localeCompare(a.hito));
  }, [data, sortOrder]);

  function toggleCollapse(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function expandAll() {
    setCollapsed({});
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    for (const h of roadmap) {
      next[`hito:${h.hito}`] = true;
      for (const e of h.epics) next[`${h.hito}-${e.epica}`] = true;
    }
    setCollapsed(next);
  }

  const allCollapsed = roadmap.length > 0 && roadmap.every((h) => collapsed[`hito:${h.hito}`]);

  if (loading) {
    return (
      <div>
        <Header title="Roadmap" onRefresh={refetch} loading />
        <div className="space-y-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Roadmap" onRefresh={refetch} />
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
      <Header title="Roadmap" onRefresh={refetch} loading={loading} />
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-slate-400">{data.length} proyectos organizados por Q de entrega y épica</p>
          <GlossaryTooltip id="roadmap-jerarquia" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filterConfigs.length > 0 && (
            <FilterDropdowns
              filters={filterConfigs}
              activeFilters={activeFilters}
              onFilterChange={(key, values) => setActiveFilters({ ...activeFilters, [key]: values })}
              onClear={clearPersisted}
            />
          )}
          <button
            onClick={() => setSortOrder((s) => s === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'asc' ? 'Más antiguo primero' : 'Más reciente primero'}
          </button>
        </div>
      </div>

      {/* Toggles + colapsar/expandir */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIncludeDone(!includeDone)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              includeDone
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {includeDone ? '✓ Incluir terminados' : 'Incluir terminados'}
          </button>
          <button
            onClick={() => setOnlyCurrentQ(!onlyCurrentQ)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              onlyCurrentQ
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={`Filtra al Q de entrega vigente (${currentQ})`}
          >
            {onlyCurrentQ ? `✓ Mostrar actual (${currentQ})` : `Mostrar actual (${currentQ})`}
          </button>
        </div>
        <button
          onClick={() => (allCollapsed ? expandAll() : collapseAll())}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:text-white transition-colors"
        >
          {allCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          {allCollapsed ? 'Expandir todo' : 'Colapsar todo'}
        </button>
      </div>

      {roadmap.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-400">Sin resultados para los filtros aplicados</p>
        </div>
      ) : (
        <div className="space-y-8">
          {roadmap.map((hitoGroup) => {
            const progressColor = hitoGroup.avgProgress >= 80 ? 'bg-green-500' : hitoGroup.avgProgress >= 40 ? 'bg-yellow-500' : 'bg-red-500';
            const hitoKey = `hito:${hitoGroup.hito}`;
            const isHitoCollapsed = !!collapsed[hitoKey];
            const isCurrent = hitoGroup.hito === currentQ;

            return (
              <div key={hitoGroup.hito || 'sin-cuatrimestre'}>
                {/* Hito header (clickable to collapse) */}
                <button
                  onClick={() => toggleCollapse(hitoKey)}
                  className="w-full flex items-center justify-between gap-4 mb-4 text-left hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    {isHitoCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                    <Flag className={`w-5 h-5 shrink-0 ${isCurrent ? 'text-emerald-400' : 'text-blue-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{hitoGroup.hito}</h3>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Actual</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {hitoGroup.totalProjects} proyectos · {hitoGroup.doneCount} completados · {hitoGroup.totalPoints} pts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-slate-200">{hitoGroup.avgProgress}%</span>
                    <div className="w-32 bg-slate-700 rounded-full h-2.5">
                      <div className={`${progressColor} h-2.5 rounded-full transition-all`} style={{ width: `${hitoGroup.avgProgress}%` }} />
                    </div>
                  </div>
                </button>

                {/* Epics */}
                {!isHitoCollapsed && (
                  <div className="space-y-4 ml-2 border-l-2 border-slate-700/50 pl-5">
                    {hitoGroup.epics.map((epic) => {
                      const epicKey = `${hitoGroup.hito}-${epic.epica}`;
                      const isCollapsed = collapsed[epicKey];
                      const epicProgressColor = epic.avgProgress >= 80 ? 'bg-green-500' : epic.avgProgress >= 40 ? 'bg-yellow-500' : 'bg-red-500';

                      return (
                        <div key={epicKey}>
                          {/* Epic header */}
                          <button
                            onClick={() => toggleCollapse(epicKey)}
                            className="w-full flex items-center justify-between gap-3 py-2 hover:opacity-80 transition-opacity text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                              <span className="text-sm font-semibold text-slate-200 truncate">{epic.epica}</span>
                              <span className="text-xs text-slate-500 shrink-0">
                                {epic.doneCount}/{epic.projects.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {epic.totalPoints > 0 && <span className="text-[10px] text-slate-500">{epic.totalPoints} pts</span>}
                              <span className="text-xs font-medium text-slate-300 w-8 text-right">{epic.avgProgress}%</span>
                              <div className="w-20 bg-slate-700 rounded-full h-1.5">
                                <div className={`${epicProgressColor} h-1.5 rounded-full`} style={{ width: `${epic.avgProgress}%` }} />
                              </div>
                            </div>
                          </button>

                          {/* Project cards grid */}
                          {!isCollapsed && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2 mb-4">
                              {epic.projects.map((p) => (
                                <ProjectCard key={p.id} project={p} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
