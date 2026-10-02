import { useCallback, useMemo } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import { useSnapshotCapture } from '../../hooks/useSnapshotCapture';
import type { ProjectRecord, CursoRecord } from '../../utils/dataTransforms';
import { isActive } from '../../utils/projectStatus';
import { groupByField, splitMulti } from '../../utils/dataTransforms';
import { calcHealthScore } from '../../utils/healthScore';
import { getEstatusColor } from '../../utils/colors';
import { infoFor } from '../../data/glossary';
import StatusBadge from '../ui/StatusBadge';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import ChartCard from '../charts/ChartCard';
import PageLink from '../auth/PageLink';
import Gate from '../auth/Gate';

export default function ResumenSection() {
  const { isScoped } = useScopeView();
  const { data: allData, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const cursosQ = useSheetData<CursoRecord>('/api/cursos');
  useSnapshotCapture(allData, cursosQ.data);

  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    pmFilter: Record<string, string[]>;
  }>('resumen', { pmFilter: {} });
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

  const activeProjects = useMemo(() => data.filter((p) => isActive(p.estatus)), [data]);

  // Health scores (alimentan Worst/Best projects abajo)
  const healthScores = useMemo(() => {
    return activeProjects.map((p) => ({ project: p, health: calcHealthScore(p) }));
  }, [activeProjects]);

  // Worst projects
  const worstProjects = useMemo(() => {
    return [...healthScores].sort((a, b) => a.health.score - b.health.score).slice(0, 5);
  }, [healthScores]);

  // Best projects
  const bestProjects = useMemo(() => {
    return [...healthScores].sort((a, b) => b.health.score - a.health.score).slice(0, 5);
  }, [healthScores]);

  // Comparativa por cuatrimestre (antes "hito")
  const hitoData = useMemo(() => {
    const groups = groupByField(activeProjects, 'cuatrimestre');
    return Object.entries(groups)
      .filter(([name]) => name && name !== 'Sin dato')
      .map(([name, items]) => {
        const avg = Math.round((items.reduce((s, p) => s + p.progreso, 0) / items.length) * 100);
        const avgHealth = Math.round(items.reduce((s, p) => s + calcHealthScore(p).score, 0) / items.length);
        return { name, progreso: avg, salud: avgHealth, count: items.length };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeProjects]);

  if (loading) {
    return (
      <div>
        <Header title="Resumen Ejecutivo" onRefresh={refetch} loading />
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl p-5 animate-pulse h-80" />
            <div className="bg-slate-800 rounded-xl p-5 animate-pulse h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Resumen Ejecutivo" onRefresh={refetch} />
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Header title="Resumen Ejecutivo" onRefresh={refetch} loading={loading} />
        {pmOptions.length > 0 && (
          <FilterDropdowns
            filters={filterConfigs}
            activeFilters={pmFilter}
            onFilterChange={(key, values) => setPmFilter({ [key]: values })}
            onClear={clearPersisted}
          />
        )}
      </div>
      {activePmName && (
        <p className="text-xs text-blue-300 mb-4">
          Mostrando {data.length} proyecto{data.length !== 1 ? 's' : ''} del PM <span className="font-semibold">{activePmName}</span>
        </p>
      )}

      {/* Banner "Salud del Portafolio" y chart "Distribución de Salud" movidos al
          Dashboard (HU NAV-69). Si necesitas la vista de score, abre /. */}

      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Hito comparison */}
        <ChartCard title="Comparativa por Q de entrega" info={infoFor('resumen-hito-comparison')}>
          <div className="space-y-4 py-2">
            {hitoData.map((h) => (
              <div key={h.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-200 font-medium">{h.name}</span>
                  <span className="text-xs text-slate-500">{h.count} proyectos</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Progreso</span><span>{h.progreso}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${h.progreso >= 80 ? 'bg-green-500' : h.progreso >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${h.progreso}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Salud</span><span>{h.salud}/100</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div className={`h-2 rounded-full ${h.salud >= 65 ? 'bg-green-500' : h.salud >= 45 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${h.salud}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Needs attention / Going well */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Needs attention */}
        <Gate resource="block:resumen-needs-attention">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Requieren Atención
              <GlossaryTooltip id="resumen-needs-attention" />
            </h3>
            {worstProjects.length > 0 ? (
              <div className="space-y-2">
                {worstProjects.map(({ project: p, health }) => {
                  const ec = getEstatusColor(p.estatus);
                  return (
                    <a key={p.id} href={`/proyecto/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:bg-slate-700/50 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${health.bgColor} ${health.color}`}>
                        {health.score}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500 font-mono">{p.folio}</p>
                        <p className="text-sm text-slate-200 truncate">{p.actividad}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{health.factors.slice(0, 2).join(' · ')}</p>
                      </div>
                      <StatusBadge label={p.estatus} {...ec} />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Todos los proyectos están en buen estado.</p>
            )}
          </div>
        </Gate>

        {/* Going well */}
        <Gate resource="block:resumen-best-performance">
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Mejor Desempeño
              <GlossaryTooltip id="resumen-best-performance" />
            </h3>
            {bestProjects.length > 0 ? (
              <div className="space-y-2">
                {bestProjects.map(({ project: p, health }) => {
                  const ec = getEstatusColor(p.estatus);
                  return (
                    <a key={p.id} href={`/proyecto/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:bg-slate-700/50 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${health.bgColor} ${health.color}`}>
                        {health.score}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500 font-mono">{p.folio}</p>
                        <p className="text-sm text-slate-200 truncate">{p.actividad}</p>
                      </div>
                      <StatusBadge label={p.estatus} {...ec} />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No hay datos suficientes.</p>
            )}
          </div>
        </Gate>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <PageLink pageKey="alertas" href="/alertas" hideWhenDenied className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
          Ver todas las alertas <ArrowRight className="w-3.5 h-3.5" />
        </PageLink>
        <PageLink pageKey="timeline" href="/timeline" hideWhenDenied className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
          Ver timeline <ArrowRight className="w-3.5 h-3.5" />
        </PageLink>
        <PageLink pageKey="portafolio" href="/portafolio" hideWhenDenied className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
          Ver portafolio completo <ArrowRight className="w-3.5 h-3.5" />
        </PageLink>
      </div>
    </div>
  );
}
