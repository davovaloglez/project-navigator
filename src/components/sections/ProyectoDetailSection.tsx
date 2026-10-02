import { useCallback, useMemo, useState, useEffect } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight, Clock, Star, TrendingUp, DollarSign, Target, LayoutDashboard, ListTree, CalendarRange, Link2 } from 'lucide-react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord, CostoRecord, TareaRecord, HitoRecord } from '../../utils/dataTransforms';
import { estimateProjectCost, formatMoney } from '../../utils/costEngine';
import { getEstatusColor, getSaludColor, getPrioridadColor } from '../../utils/colors';
import StatusBadge from '../ui/StatusBadge';
import Breadcrumbs from '../ui/Breadcrumbs';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import Tabs from '../ui/Tabs';
import PageLink from '../auth/PageLink';
import { readInlinePermissions, canWith } from '../../hooks/usePermissions';
import { projectStats, type EquipoMember } from './proyecto-detalle/shared';
import ResumenTab from './proyecto-detalle/ResumenTab';
import DetalleTab from './proyecto-detalle/DetalleTab';
import CronogramaTab from './proyecto-detalle/CronogramaTab';
import RelacionadosTab from './proyecto-detalle/RelacionadosTab';
import PronosticoTab from './proyecto-detalle/PronosticoTab';

interface Props {
  id: string;
}

type TabKey = 'resumen' | 'detalle' | 'cronograma' | 'relacionados' | 'pronostico';

export default function ProyectoDetailSection({ id }: Props) {
  const { data, loading, error } = useSheetData<ProjectRecord>('/api/proyectos');
  const costos = useSheetData<CostoRecord>('/api/costos');
  // Suplementarios: actividades + hitos del proyecto (no rompen la ficha si fallan/403)
  const tareasQ = useSheetData<TareaRecord>('/api/tareas');
  const hitosQ = useSheetData<HitoRecord>('/api/hitos');

  const perms = readInlinePermissions();
  const { state: persisted, setState: setPersisted } = usePersistedFilters<{ tab: TabKey }>(
    'proyecto-detalle', { tab: 'resumen' },
  );
  const tab = persisted.tab;
  const setTab = useCallback((next: TabKey) => setPersisted((prev) => ({ ...prev, tab: next })), [setPersisted]);

  // Registro `equipo` para enriquecer las tarjetas de personas por id.
  const [registry, setRegistry] = useState<EquipoMember[]>([]);
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/equipo', { credentials: 'same-origin', signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { equipo: EquipoMember[] }) => setRegistry(d.equipo ?? []))
      .catch(() => { /* sin registro: las tarjetas degradan a nombre + rol */ });
    return () => ac.abort();
  }, []);

  const projectIdx = useMemo(() => data.findIndex((p) => p.id === id), [data, id]);
  const project = projectIdx >= 0 ? data[projectIdx] : null;
  const prevProject = projectIdx > 0 ? data[projectIdx - 1] : null;
  const nextProject = projectIdx >= 0 && projectIdx < data.length - 1 ? data[projectIdx + 1] : null;

  const projectTareas = useMemo(
    () => (project ? tareasQ.data.filter((t) => t.proyectoId === project.id) : []),
    [tareasQ.data, project],
  );
  const projectHitos = useMemo(
    () => (project ? hitosQ.data.filter((h) => h.proyectoId === project.id) : []),
    [hitosQ.data, project],
  );

  // Costo para el KPI strip (la tab Detalle lo recalcula para su breakdown)
  const stripCost = useMemo(
    () => (project ? estimateProjectCost(project, data, costos.data).estimatedMonthlyCost : 0),
    [project, data, costos.data],
  );

  if (loading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Portafolio', href: '/portafolio' }, { label: project?.actividad || id }]} />
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-32" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-80 lg:col-span-2" />
            <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Portafolio', href: '/portafolio' }, { label: project?.actividad || id }]} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <p className="text-red-400 font-medium mb-2">{error ? 'Error al cargar datos' : 'Proyecto no encontrado'}</p>
          <p className="text-sm text-slate-400">{error || `No se encontró el proyecto ${id}`}</p>
        </div>
      </div>
    );
  }

  const { progressPct, health, daysLeft, isOverdue, isDone } = projectStats(project);
  const estatusColor = getEstatusColor(project.estatus);
  const saludColor = getSaludColor(project.salud);
  const prioridadColor = getPrioridadColor(project.prioridad);
  const canForecast = canWith(perms, 'page:pronosticos');

  const tabDefs = [
    { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { key: 'detalle', label: 'Detalle', icon: ListTree },
    { key: 'cronograma', label: 'Cronograma', icon: CalendarRange, count: projectTareas.length || undefined },
    { key: 'relacionados', label: 'Relacionados', icon: Link2 },
    ...(canForecast ? [{ key: 'pronostico', label: 'Pronóstico', icon: TrendingUp }] : []),
  ];
  // Si el tab persistido es 'pronostico' pero el rol no puede, cae a 'resumen'
  const activeTab: TabKey = tab === 'pronostico' && !canForecast ? 'resumen' : tab;

  return (
    <div>
      {/* Breadcrumbs + navigation */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <Breadcrumbs items={[{ label: 'Portafolio', href: '/portafolio' }, { label: project.folio }]} />
        <div className="flex items-center gap-1 shrink-0">
          {prevProject && (
            <a href={`/proyecto/${prevProject.id}`} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors" title={prevProject.actividad}>
              <ChevronLeft className="w-4 h-4" />
            </a>
          )}
          {nextProject && (
            <a href={`/proyecto/${nextProject.id}`} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors" title={nextProject.actividad}>
              <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Hero header (fijo, fuera de tabs) */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-mono mb-1">{project.folio}</p>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">{project.actividad}</h1>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={project.estatus} {...estatusColor} size="md" />
              <StatusBadge label={project.salud} bg={saludColor.bg} text={saludColor.text} size="md" />
              <StatusBadge label={project.prioridad} bg={prioridadColor.bg} text={prioridadColor.text} size="md" />
              {project.tipo && <StatusBadge label={project.tipo} bg="bg-slate-700" text="text-slate-300" size="md" />}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${health.bgColor} ${health.color}`}>
                {health.score} — {health.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <PageLink
              pageKey="pronosticos"
              href={`/pronosticos/${project.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/15 text-purple-300 rounded-lg text-sm hover:bg-purple-500/25 transition-colors"
              deniedClassName="hidden"
            >
              <TrendingUp className="w-4 h-4" /> Ver pronóstico
            </PageLink>
            {project.url && (
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 text-blue-400 rounded-lg text-sm hover:bg-blue-500/25 transition-colors">
                <ExternalLink className="w-4 h-4" /> Ver en plataforma
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Quick KPI strip (fijo) */}
      <div className="flex items-center gap-1.5 mb-2">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Resumen del proyecto</h3>
        <GlossaryTooltip id="proyecto-kpi-strip" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <p className="text-lg font-bold text-white">{progressPct}%</p>
            <p className="text-[10px] text-slate-500">Progreso</p>
          </div>
        </div>
        <div className={`bg-slate-800 border rounded-xl p-3 flex items-center gap-3 ${isOverdue ? 'border-red-500/40' : 'border-slate-700/50'}`}>
          <Clock className={`w-5 h-5 shrink-0 ${isOverdue ? 'text-red-400' : isDone ? 'text-green-400' : 'text-amber-400'}`} />
          <div>
            <p className={`text-lg font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
              {isDone ? 'Listo' : daysLeft !== null ? (isOverdue ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d`) : '—'}
            </p>
            <p className="text-[10px] text-slate-500">{isDone ? 'Completado' : isOverdue ? 'Vencido' : 'Días restantes'}</p>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-lg font-bold text-white">{project.puntos || 0}</p>
            <p className="text-[10px] text-slate-500">Story points</p>
          </div>
        </div>
        <div className={`bg-slate-800 border rounded-xl p-3 flex items-center gap-3 ${health.score < 45 ? 'border-red-500/40' : 'border-slate-700/50'}`}>
          <Target className={`w-5 h-5 shrink-0 ${health.color}`} />
          <div>
            <p className={`text-lg font-bold ${health.color}`}>{health.score}</p>
            <p className="text-[10px] text-slate-500">Health score</p>
          </div>
        </div>
        {stripCost > 0 && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-lg font-bold text-green-400">{formatMoney(stripCost)}</p>
              <p className="text-[10px] text-slate-500">Costo est./mes</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs className="mb-6" active={activeTab} onChange={(k) => setTab(k as TabKey)} tabs={tabDefs} />

      {activeTab === 'resumen' && (
        <ResumenTab project={project} allProjects={data} projectHitos={projectHitos} projectTareas={projectTareas} />
      )}
      {activeTab === 'detalle' && (
        <DetalleTab project={project} allProjects={data} costos={costos.data} projectTareas={projectTareas} registry={registry} />
      )}
      {activeTab === 'cronograma' && (
        <CronogramaTab project={project} projectTareas={projectTareas} projectHitos={projectHitos} />
      )}
      {activeTab === 'relacionados' && (
        <RelacionadosTab project={project} allProjects={data} />
      )}
      {activeTab === 'pronostico' && canForecast && (
        <PronosticoTab project={project} allProjects={data} allTareas={tareasQ.data} />
      )}
    </div>
  );
}
