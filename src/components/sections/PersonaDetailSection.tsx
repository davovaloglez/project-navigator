import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  FolderKanban,
  TrendingUp,
  Star,
  DollarSign,
  Mail,
  Target,
  LayoutDashboard,
  CalendarRange,
  GitBranch,
  Cpu,
} from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { buildMembers, resolveId } from '../../lib/equipoMatch';
import type {
  ProjectRecord,
  CursoRecord,
  CostoRecord,
  TareaRecord,
  RepoRecord,
  Technology,
  TeamTechnology,
} from '../../utils/dataTransforms';
import { formatMoney } from '../../utils/costEngine';
import { isTerminal } from '../../utils/projectStatus';
import Breadcrumbs from '../ui/Breadcrumbs';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import Tabs from '../ui/Tabs';
import Avatar from '../ui/Avatar';
import {
  type EquipoLite,
  usePersonStats,
  usePersonCost,
  healthScoreColor,
} from './persona-detalle/shared';
import ResumenTab from './persona-detalle/ResumenTab';
import ProyectosTab from './persona-detalle/ProyectosTab';
import CronogramaTab from './persona-detalle/CronogramaTab';
import AccesosTab from './persona-detalle/AccesosTab';
import TecnologiasTab from './persona-detalle/TecnologiasTab';

interface Props {
  /**
   * Param de URL — puede ser un `equipo.id` directo (preferente, HU NAV-78.2)
   * o un nombre/apodo legible (back-compat con bookmarks/links viejos).
   * El resolver intenta match exacto por id primero; si no, fuzzy por nombre.
   */
  idOrName: string;
}

type TabKey = 'resumen' | 'proyectos' | 'cronograma' | 'accesos' | 'tecnologias';

export default function PersonaDetailSection({ idOrName }: Props) {
  const projects = useSheetData<ProjectRecord>('/api/proyectos');
  const cursos = useSheetData<CursoRecord>('/api/cursos');
  const costosData = useSheetData<CostoRecord>('/api/costos');
  const tareas = useSheetData<TareaRecord>('/api/tareas');
  const repos = useSheetData<RepoRecord>('/api/repositorios');
  // Catálogo de tecnologías. NOTA: /api/technologies devuelve `{ technologies: [] }`
  // (objeto), NO un array bare — `useSheetData` setea el JSON tal cual como `data`,
  // así que devolvería el objeto y `groupByCategory` reventaría con
  // "catalog is not iterable". Por eso se hace fetch manual desenvuelto a su array,
  // igual que `EquipoSection` y que la matriz de abajo.
  const [techCatalog, setTechCatalog] = useState<Technology[]>([]);
  const [techCatalogLoading, setTechCatalogLoading] = useState(true);
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/technologies', { credentials: 'same-origin', signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { technologies: Technology[] }) => setTechCatalog(d.technologies ?? []))
      .catch(() => {
        /* 403/red: catálogo vacío, el tab degrada limpio */
      })
      .finally(() => setTechCatalogLoading(false));
    return () => ac.abort();
  }, []);

  // Persistencia per-user del tab activo + toggle "Incluir terminados".
  const { state: persisted, setState: setPersisted } = usePersistedFilters<{
    tab: TabKey;
    includeDone: boolean;
  }>('persona-detalle', { tab: 'resumen', includeDone: false });
  const tab = persisted.tab;
  const includeDone = persisted.includeDone;
  const setTab = useCallback(
    (next: TabKey) => setPersisted((prev) => ({ ...prev, tab: next })),
    [setPersisted],
  );
  const setIncludeDone = useCallback(
    (next: boolean) => setPersisted((prev) => ({ ...prev, includeDone: next })),
    [setPersisted],
  );

  // Registro `equipo` para resolver el param de URL a `equipo.id`.
  const [registry, setRegistry] = useState<EquipoLite[]>([]);
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/equipo', { credentials: 'same-origin', signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { equipo: EquipoLite[] }) => setRegistry(d.equipo ?? []))
      .catch(() => {
        /* sin registro: personId queda null, ficha vacía pero usable */
      });
    return () => ac.abort();
  }, []);

  // Resolución por dos vías (en este orden):
  //   1. Match exacto por `equipo.id` — formato preferente (`/persona/emontano`).
  //   2. Fallback a `resolveId(nombre, members)` — back-compat con links viejos
  //      que pasaban el nombre completo o apodo (`/persona/Lore`).
  const personId = useMemo(() => {
    if (!idOrName) return null;
    const direct = registry.find((r) => r.id === idOrName);
    if (direct) return direct.id;
    return resolveId(idOrName, buildMembers(registry));
  }, [idOrName, registry]);
  const personRecord = useMemo(
    () => registry.find((r) => r.id === personId) ?? null,
    [registry, personId],
  );
  const displayName = personRecord?.fullName ?? idOrName;

  // Matriz de tecnologías de ESTA persona. La URL depende de `personId`, que se
  // resuelve async (tras cargar /api/equipo), así que no usamos useSheetData
  // (URL estática) sino un fetch manual keyado por personId. Se recarga tras una
  // edición admin (el modal llama `onRefetch`). El 403 degrada limpio (matriz
  // vacía) — la lectura está gateada por `page:equipo` igual que el resto.
  const [personMatrix, setPersonMatrix] = useState<TeamTechnology[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixReloadKey, setMatrixReloadKey] = useState(0);
  const refetchMatrix = useCallback(() => setMatrixReloadKey((k) => k + 1), []);
  useEffect(() => {
    if (!personId) {
      setPersonMatrix([]);
      return;
    }
    const ac = new AbortController();
    setMatrixLoading(true);
    fetch(`/api/team-technologies?equipo=${encodeURIComponent(personId)}`, {
      credentials: 'same-origin',
      signal: ac.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { rows: TeamTechnology[] }) => setPersonMatrix(d.rows ?? []))
      .catch(() => {
        /* 403/red: matriz vacía, el tab no se rompe */
      })
      .finally(() => setMatrixLoading(false));
    return () => ac.abort();
  }, [personId, matrixReloadKey]);

  // El costo es SUPLEMENTARIO: si falla o está denegado (403) no debe romper
  // la ficha de la persona (proyectos/cursos/tareas son lo principal).
  const loading = projects.loading || cursos.loading;
  const error = projects.error || cursos.error;

  const personProjects = useMemo(() => {
    if (!personId) return [];
    return projects.data.filter(
      (p) =>
        p.arquitectoIds.includes(personId) ||
        p.pmIds.includes(personId) ||
        p.devIds.includes(personId) ||
        p.poIds.includes(personId) ||
        p.sqaIds.includes(personId),
    );
  }, [projects.data, personId]);

  const personTareas = useMemo(() => {
    if (!personId) return [];
    return tareas.data.filter((t) => t.asignadoId === personId);
  }, [tareas.data, personId]);

  // Accesos a repositorios: repos donde el nombre de la persona aparece en algún
  // rol GitHub. Match preferente por `tag` (substring exacto, e.g. "Lorena Olvera");
  // si tag está vacío (migración 2026-equipo-tag.sql aún no aplicada/seedeada) cae
  // a un match heurístico por tokens del full_name.
  const personRepos = useMemo(() => {
    const tag = (personRecord?.tag || '').trim().toLowerCase();
    const toks = (personRecord?.fullName || displayName || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    const has = (cell: string) => {
      const c = (cell || '').toLowerCase();
      if (!c) return false;
      if (tag) return c.includes(tag);
      if (toks.length === 0) return false;
      if (toks.length === 1) return c.includes(toks[0]);
      return c.includes(toks[0]) && toks.slice(1).some((t) => c.includes(t));
    };
    if (!tag && toks.length === 0) return [];
    const out: { repo: RepoRecord; roles: string[] }[] = [];
    for (const r of repos.data) {
      const roles: string[] = [];
      if (has(r.administrador)) roles.push('Administrador');
      if (has(r.arquitecto)) roles.push('Arquitecto');
      if (has(r.colaborador)) roles.push('Colaborador');
      if (has(r.visualizador)) roles.push('Visualizador');
      if (has(r.deploy)) roles.push('Deploy');
      if (roles.length) out.push({ repo: r, roles });
    }
    return out;
  }, [repos.data, personRecord, displayName]);

  const roles = useMemo(() => {
    const r: string[] = [];
    if (!personId) return r;
    if (projects.data.some((p) => p.arquitectoIds.includes(personId))) r.push('Arquitecto');
    if (projects.data.some((p) => p.pmIds.includes(personId))) r.push('PM');
    if (projects.data.some((p) => p.poIds.includes(personId))) r.push('PO');
    if (projects.data.some((p) => p.sqaIds.includes(personId))) r.push('SQA');
    if (projects.data.some((p) => p.devIds.includes(personId))) r.push('Developer');
    return r;
  }, [projects.data, personId]);

  const curso = useMemo(() => {
    if (!personId) return null;
    return cursos.data.find((c) => c.equipoId === personId) || null;
  }, [cursos.data, personId]);

  const stats = usePersonStats(personProjects);
  const personCost = usePersonCost(personId, projects.data, costosData.data);

  // Conteo de proyectos VISIBLES en el tab (respeta el toggle "Incluir terminados").
  // Usado para el badge del tab para que coincida con lo que ven los ojos.
  const visibleProjectsCount = useMemo(
    () => (includeDone
      ? personProjects.length
      : personProjects.filter((p) => !isTerminal(p.estatus)).length),
    [personProjects, includeDone],
  );

  if (loading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Equipo', href: '/equipo' }, { label: displayName }]} />
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-32" />
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Equipo', href: '/equipo' }, { label: displayName }]} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  const healthColor = healthScoreColor(stats.performance.avgHealth);

  const tabDefs = [
    { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    {
      key: 'proyectos',
      label: 'Proyectos',
      icon: FolderKanban,
      count: visibleProjectsCount || undefined,
    },
    {
      key: 'cronograma',
      label: 'Cronograma',
      icon: CalendarRange,
      count: personTareas.length || undefined,
    },
    {
      key: 'accesos',
      label: 'Cursos y Accesos',
      icon: GitBranch,
      count: personRepos.length || undefined,
    },
    {
      key: 'tecnologias',
      label: 'Tecnologías',
      icon: Cpu,
      count: personMatrix.length || undefined,
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Equipo', href: '/equipo' }, { label: displayName }]} />

      {/* Profile header (fijo, fuera de tabs) */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={displayName} image={personRecord?.image ?? null} size={56} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{displayName}</h1>
              <GlossaryTooltip id="persona-detalle-header" />
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {roles.map((role) => (
                <span
                  key={role}
                  className="px-2 py-0.5 bg-slate-700 rounded-full text-xs text-slate-300"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <div className="flex items-center justify-end gap-1">
              <p className={`text-3xl font-bold ${healthColor}`}>{stats.performance.avgHealth}</p>
              <GlossaryTooltip id="persona-detalle-health-score" />
            </div>
            <p className="text-[10px] text-slate-500">Health Score</p>
            {personCost.monthlyCost > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {formatMoney(personCost.monthlyCost)}/mes · ${personCost.costoHora}/hr
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ficha de identidad (registro `equipo`) */}
      {personRecord &&
        (personRecord.title ||
          personRecord.roleName ||
          personRecord.department ||
          personRecord.email) && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {personRecord.title && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                    Puesto
                  </p>
                  <p className="text-sm text-slate-200 truncate">{personRecord.title}</p>
                </div>
              )}
              {personRecord.roleName && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                    Banda de rol
                  </p>
                  <p className="text-sm text-slate-200 truncate">{personRecord.roleName}</p>
                </div>
              )}
              {personRecord.department && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                    Departamento
                  </p>
                  <p className="text-sm text-slate-200 truncate">{personRecord.department}</p>
                </div>
              )}
              {personRecord.email && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">
                    Email
                  </p>
                  <a
                    href={`mailto:${personRecord.email}`}
                    className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors truncate"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{personRecord.email}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      {/* KPI strip (fijo) */}
      <div className="flex items-center gap-1.5 mb-2">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Resumen de la persona
        </h3>
        <GlossaryTooltip id="persona-detalle-kpi-strip" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <FolderKanban className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-lg font-bold text-white">{stats.kpis.total}</p>
            <p className="text-[10px] text-slate-500">Proyectos</p>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <p className="text-lg font-bold text-white">{stats.kpis.avgProgress}%</p>
            <p className="text-[10px] text-slate-500">Progreso prom.</p>
          </div>
        </div>
        <div
          className={`bg-slate-800 border rounded-xl p-3 flex items-center gap-3 ${
            stats.performance.avgHealth < 45 ? 'border-red-500/40' : 'border-slate-700/50'
          }`}
        >
          <Target className={`w-5 h-5 shrink-0 ${healthColor}`} />
          <div>
            <p className={`text-lg font-bold ${healthColor}`}>{stats.performance.avgHealth}</p>
            <p className="text-[10px] text-slate-500">Health score</p>
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-lg font-bold text-white">{stats.performance.donePoints}</p>
            <p className="text-[10px] text-slate-500">Pts entregados</p>
          </div>
        </div>
        {personCost.monthlyCost > 0 && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-lg font-bold text-green-400">
                {formatMoney(personCost.monthlyCost)}
              </p>
              <p className="text-[10px] text-slate-500">Costo/mes</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs className="mb-6" active={tab} onChange={(k) => setTab(k as TabKey)} tabs={tabDefs} />

      {tab === 'resumen' && (
        <ResumenTab
          personProjects={personProjects}
          stats={stats}
          includeDone={includeDone}
          setIncludeDone={setIncludeDone}
        />
      )}
      {tab === 'proyectos' && (
        <ProyectosTab
          personId={personId}
          personProjects={personProjects}
          displayName={displayName}
          includeDone={includeDone}
          setIncludeDone={setIncludeDone}
          personCost={personCost}
        />
      )}
      {tab === 'cronograma' && (
        <CronogramaTab
          personTareas={personTareas}
          personProjects={personProjects}
          allProjects={projects.data}
        />
      )}
      {tab === 'accesos' && <AccesosTab personRepos={personRepos} curso={curso} />}
      {tab === 'tecnologias' && (
        <TecnologiasTab
          equipoId={personId}
          personName={displayName}
          personImage={personRecord?.image ?? null}
          catalog={techCatalog}
          catalogLoading={techCatalogLoading}
          matrix={personMatrix}
          matrixLoading={matrixLoading}
          onRefetch={refetchMatrix}
        />
      )}
    </div>
  );
}
