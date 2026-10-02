import { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, UserCheck, KeyRound, Search, Plus, Pencil, X, Layers, ArrowUpDown, LayoutGrid, Activity, Network, GitCompare, DollarSign, Cpu } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import { usePermissions } from '../../hooks/usePermissions';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import type { ProjectRecord, CapacidadRecord, SprintRecord, TareaRecord, CostoRecord, Technology, TeamTechnology } from '../../utils/dataTransforms';
import { roleCategory, roleRango, CATEGORY_ORDER } from '../../utils/roleCategory';
import { infoFor } from '../../data/glossary';
import Header from '../layout/Header';
import KPICard from '../ui/KPICard';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import Tabs from '../ui/Tabs';
import CapacityHeatmap from './equipo/CapacityHeatmap';
import Organigrama from './equipo/Organigrama';
import Comparativa from './equipo/Comparativa';
import CostosEquipo from './equipo/CostosEquipo';
import Tecnologias from './equipo/Tecnologias';

interface EquipoRecord {
  id: string;
  fullName: string;
  nickname: string;
  tag: string;
  email: string;
  title: string;
  department: string;
  roleId: string;
  roleName: string;
  managerId: string;
  managerName: string;
  active: boolean;
  hasLogin: boolean;
  image: string | null;
}

type GroupBy = 'none' | 'categoria' | 'departamento' | 'rol';
type SortBy = 'carga' | 'puntos' | 'criticos';
type TabKey = 'directorio' | 'capacidad' | 'organigrama' | 'comparativa' | 'costos' | 'tecnologias';
interface RoleOpt { id: string; name: string; }

interface EquipoPayload { equipo: EquipoRecord[]; roles: RoleOpt[]; }

export default function EquipoSection() {
  const { can } = usePermissions();
  const canManage = can('action:equipo:manage');
  const canCosts = can('data:costos');

  const { data: projects } = useSheetData<ProjectRecord>('/api/proyectos');
  const { data: capacidades } = useSheetData<CapacidadRecord>('/api/capacidades');
  const { data: sprints } = useSheetData<SprintRecord>('/api/sprints');
  const { data: tareas } = useSheetData<TareaRecord>('/api/tareas');
  const { data: costos, forbidden: costosForbidden, loading: costosLoading } = useSheetData<CostoRecord>('/api/costos');
  // Tecnologías (skills) matrix — Plan 015
  const [techCatalog, setTechCatalog] = useState<Technology[]>([]);
  const [techMatrix, setTechMatrix] = useState<TeamTechnology[]>([]);
  const [payload, setPayload] = useState<EquipoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EquipoRecord | 'new' | null>(null);
  const { state: persisted, setState: setPersisted } = usePersistedFilters<{ groupBy: GroupBy; sortBy: SortBy; tab: TabKey }>(
    'equipo', { groupBy: 'none', sortBy: 'carga', tab: 'directorio' },
  );
  const { groupBy, sortBy, tab } = persisted;
  const setGroupBy = useCallback((v: GroupBy) => setPersisted((p) => ({ ...p, groupBy: v })), [setPersisted]);
  const setSortBy = useCallback((v: SortBy) => setPersisted((p) => ({ ...p, sortBy: v })), [setPersisted]);
  const setTab = useCallback((v: TabKey) => setPersisted((p) => ({ ...p, tab: v })), [setPersisted]);

  const loadEquipo = useCallback(() => {
    setLoading(true);
    const fetcher = (url: string) =>
      fetch(url, { credentials: 'same-origin' }).then((r) => {
        if (r.status === 401) { window.location.href = '/login'; throw new Error('401'); }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
    Promise.all([
      fetcher('/api/equipo') as Promise<EquipoPayload>,
      fetcher('/api/technologies') as Promise<{ technologies: Technology[] }>,
      fetcher('/api/team-technologies') as Promise<{ rows: TeamTechnology[] }>,
    ])
      .then(([equipoData, techData, matrixData]) => {
        setPayload(equipoData);
        setTechCatalog(techData.technologies);
        setTechMatrix(matrixData.rows);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadEquipo(); }, [loadEquipo]);

  // Sprint actual = el último del calendario que tenga capacidades cargadas;
  // si no, el primero con datos de capacidad.
  const capSprint = useMemo(() => {
    const withCaps = new Set(capacidades.map((c) => c.sprint));
    const ordered = [...sprints].map((s) => s.sprint).reverse();
    return ordered.find((s) => withCaps.has(s)) || [...withCaps][0] || '';
  }, [capacidades, sprints]);

  const capByPerson = useMemo(() => {
    const m = new Map<string, { capacidad: number; vacaciones: number }>();
    for (const c of capacidades) {
      if (capSprint && c.sprint !== capSprint) continue;
      if (!c.equipoId) continue;
      m.set(c.equipoId, { capacidad: c.capacidad, vacaciones: c.vacaciones });
    }
    return m;
  }, [capacidades, capSprint]);

  const people = useMemo(() => {
    const reg = payload?.equipo ?? [];
    return reg.map((person) => {
      // Identidad resuelta en el server (equipoResolver). Sin fuzzy local.
      const owned = projects.filter((p) =>
        p.pmIds.includes(person.id) ||
        p.arquitectoIds.includes(person.id) ||
        p.poIds.includes(person.id) ||
        p.sqaIds.includes(person.id) ||
        p.devIds.includes(person.id));
      const uniq = [...new Map(owned.map((p) => [p.id, p])).values()];
      const avgProgress = uniq.length
        ? Math.round((uniq.reduce((s, p) => s + p.progreso, 0) / uniq.length) * 100) : 0;
      const statuses: Record<string, number> = {};
      for (const p of uniq) statuses[p.estatus] = (statuses[p.estatus] || 0) + 1;
      const criticalCount = uniq.filter((p) => p.estatus === 'Blocked / Critical' || p.estatus === 'At Risk').length;
      return {
        person,
        projectCount: uniq.length,
        avgProgress,
        totalPoints: uniq.reduce((s, p) => s + p.puntos, 0),
        criticalCount,
        statuses,
        capacidad: capByPerson.get(person.id) ?? null,
      };
    }).sort((a, b) =>
      Number(b.person.active) - Number(a.person.active) ||
      b.projectCount - a.projectCount ||
      a.person.fullName.localeCompare(b.person.fullName));
  }, [payload, projects, capByPerson]);

  type Item = (typeof people)[number];

  const filtered = useMemo(() => {
    if (!search) return people;
    const q = search.toLowerCase();
    return people.filter(({ person }) =>
      [person.fullName, person.nickname, person.title, person.email, person.roleName]
        .some((v) => v.toLowerCase().includes(q)));
  }, [people, search]);

  const grouped = useMemo(() => {
    const metric = (x: Item) => sortBy === 'puntos' ? x.totalPoints : sortBy === 'criticos' ? x.criticalCount : x.projectCount;
    const sorted = [...filtered].sort((a, b) =>
      Number(b.person.active) - Number(a.person.active) ||
      metric(b) - metric(a) ||
      a.person.fullName.localeCompare(b.person.fullName));
    if (groupBy === 'none') return [{ key: '', items: sorted }];
    const keyOf = (x: Item) =>
      groupBy === 'categoria' ? roleCategory(x.person.roleId)
        : groupBy === 'departamento' ? (x.person.department || 'Sin departamento')
          : (x.person.roleName || 'Sin rol');
    const m = new Map<string, Item[]>();
    for (const x of sorted) { const k = keyOf(x); if (!m.has(k)) m.set(k, []); m.get(k)!.push(x); }
    const entries = [...m.entries()];
    if (groupBy === 'categoria') {
      entries.sort(([a], [b]) => CATEGORY_ORDER.indexOf(a as never) - CATEGORY_ORDER.indexOf(b as never));
    } else {
      entries.sort(([, a], [, b]) => b.length - a.length);
    }
    return entries.map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy, sortBy]);

  if (loading && !payload) {
    return (
      <div>
        <Header title="Equipo" onRefresh={loadEquipo} loading />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Equipo" onRefresh={loadEquipo} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar el registro</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={loadEquipo} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const reg = payload?.equipo ?? [];
  const total = reg.length;
  const activos = reg.filter((p) => p.active).length;
  const conAcceso = reg.filter((p) => p.hasLogin).length;

  // Cada tab del directorio está gateada por su `block:` del glosario
  // (default-ALLOW). Costos sigue gateado por `data:costos` (rol). El admin
  // puede denegar bloques per-user desde /admin/[id] → Permisos.
  // Tecnologías (Plan 015): default-ALLOW para todos los roles; NO se agrega
  // al `blockDenyByRole` (a diferencia de equipo-capacity-heatmap / equipo-comparativa).
  const canDirectorio = can('block:equipo-directorio');
  const canCapacidad = can('block:equipo-capacity-heatmap');
  const canOrganigrama = can('block:equipo-organigrama');
  const canComparativa = can('block:equipo-comparativa');
  const canTecnologias = can('block:equipo-tecnologias-heatmap');
  const availableTabs: TabKey[] = [
    ...(canDirectorio ? ['directorio' as const] : []),
    ...(canCapacidad ? ['capacidad' as const] : []),
    ...(canOrganigrama ? ['organigrama' as const] : []),
    ...(canComparativa ? ['comparativa' as const] : []),
    ...(canCosts ? ['costos' as const] : []),
    ...(canTecnologias ? ['tecnologias' as const] : []),
  ];
  // Fallback: si el tab persistido fue denegado, cae al primero disponible.
  const activeTab: TabKey = availableTabs.includes(tab) ? tab : (availableTabs[0] ?? 'directorio');

  const renderCard = (item: Item) => {
    const { person, projectCount, avgProgress, totalPoints, statuses, capacidad } = item;
    const progressColor = avgProgress >= 80 ? 'bg-green-500' : avgProgress >= 40 ? 'bg-yellow-500' : 'bg-red-500';
    const rango = roleRango(person.roleId);
    return (
      <div
        key={person.id}
        className={`bg-slate-800 border rounded-xl p-4 transition-colors group ${person.active ? 'border-slate-700/50' : 'border-slate-700/30 opacity-60'}`}
      >
        <div className="flex items-start gap-3 mb-3">
          <a href={`/persona/${person.id}`} className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {person.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                {person.fullName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {person.title || person.roleName || 'Sin puesto'}
                {person.nickname && <span className="text-slate-600"> · {person.nickname}</span>}
              </p>
            </div>
          </a>
          {canManage && (
            <button
              onClick={() => setEditing(person)}
              title="Editar miembro"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-3 flex-wrap">
          {person.roleName && <span className="px-1.5 py-0.5 bg-purple-500/15 text-purple-300 rounded text-[10px]">{person.roleName}</span>}
          {rango && <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 rounded text-[10px]">{rango}</span>}
          {person.department && <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-400">{person.department}</span>}
          {person.hasLogin && <span className="px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 rounded text-[10px]">Acceso</span>}
          {!person.active && <span className="px-1.5 py-0.5 bg-red-500/15 text-red-300 rounded text-[10px]">Inactivo</span>}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{projectCount}</p>
            <p className="text-[10px] text-slate-500">Proyectos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{avgProgress}%</p>
            <p className="text-[10px] text-slate-500">Progreso</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{totalPoints}</p>
            <p className="text-[10px] text-slate-500">Puntos</p>
          </div>
        </div>

        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div className={`${progressColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${avgProgress}%` }} />
        </div>

        {capacidad && (capacidad.capacidad > 0 || capacidad.vacaciones > 0) && (
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
            <span title={`Capacidad del sprint ${capSprint}`}>
              Capacidad {capSprint}: <span className="text-slate-200 font-medium">{capacidad.capacidad}h</span>
            </span>
            {capacidad.vacaciones > 0 && (
              <span className="text-amber-400">Vac: {capacidad.vacaciones}h</span>
            )}
          </div>
        )}

        {Object.keys(statuses).length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {Object.entries(statuses).map(([status, count]) => (
              <span key={status} className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-500">
                {status}: {count}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Header title="Equipo" onRefresh={loadEquipo} loading={loading} />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <KPICard title="Total personas" value={total} icon={Users} accentColor="text-blue-400" info={infoFor('equipo-kpi-total')} />
        <KPICard title="Activos" value={activos} icon={UserCheck} accentColor="text-green-400" info={infoFor('equipo-kpi-arquitectos')} />
        <KPICard title="Con acceso" value={conAcceso} icon={KeyRound} accentColor="text-cyan-400" info={infoFor('equipo-kpi-developers')} />
      </div>

      {availableTabs.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-300 mb-1">Sin pestañas disponibles para tu usuario.</p>
          <p className="text-[11px] text-slate-500">
            Si crees que es un error, pide a un admin que revise tus permisos en <code className="text-slate-400">/admin</code>.
          </p>
        </div>
      ) : (
        <Tabs
          className="mb-6"
          active={activeTab}
          onChange={(k) => setTab(k as TabKey)}
          tabs={[
            ...(canDirectorio ? [{ key: 'directorio', label: 'Directorio', icon: LayoutGrid, count: reg.length || undefined }] : []),
            ...(canCapacidad ? [{ key: 'capacidad', label: 'Capacidad y Carga', icon: Activity }] : []),
            ...(canOrganigrama ? [{ key: 'organigrama', label: 'Organigrama', icon: Network }] : []),
            ...(canComparativa ? [{ key: 'comparativa', label: 'Comparativa', icon: GitCompare }] : []),
            ...(canCosts ? [{ key: 'costos', label: 'Costos', icon: DollarSign }] : []),
            ...(canTecnologias ? [{ key: 'tecnologias', label: 'Tecnologías', icon: Cpu }] : []),
          ]}
        />
      )}

      {activeTab === 'directorio' && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative max-w-sm flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, apodo, puesto..."
                className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            {canManage && (
              <button
                onClick={() => setEditing('new')}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Agregar miembro
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-slate-300">Directorio del equipo</h3>
              <GlossaryTooltip id="equipo-directorio" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Agrupar</span>
                {([['none', 'Ninguno'], ['categoria', 'Categoría'], ['departamento', 'Departamento'], ['rol', 'Rol']] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setGroupBy(v)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${groupBy === v ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ordenar</span>
                {([['carga', 'Carga'], ['puntos', 'Pts'], ['criticos', 'Críticos']] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setSortBy(v)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${sortBy === v ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
              <p className="text-slate-400">Sin resultados</p>
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.key || 'all'} className={g.key ? 'mb-6' : ''}>
                {g.key && (
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{g.key}</h4>
                    <span className="text-[10px] text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">{g.items.length}</span>
                    <div className="flex-1 border-t border-slate-700/40" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.items.map(renderCard)}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {activeTab === 'capacidad' && (
        <CapacityHeatmap
          tareas={tareas}
          equipo={reg.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            image: p.image,
            active: p.active,
            roleName: p.roleName,
            title: p.title,
          }))}
        />
      )}

      {activeTab === 'organigrama' && (
        <Organigrama
          equipo={reg.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            image: p.image,
            active: p.active,
            managerId: p.managerId,
            managerName: p.managerName,
            roleName: p.roleName,
            title: p.title,
            department: p.department,
          }))}
        />
      )}

      {activeTab === 'comparativa' && (
        <Comparativa
          equipo={reg.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            image: p.image,
            active: p.active,
            roleName: p.roleName,
            title: p.title,
            department: p.department,
          }))}
          projects={projects}
          tareas={tareas}
          costos={costos}
          costosForbidden={costosForbidden}
        />
      )}

      {activeTab === 'costos' && canCosts && (
        <CostosEquipo
          equipo={reg.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            image: p.image,
            active: p.active,
            roleName: p.roleName,
            title: p.title,
            department: p.department,
          }))}
          projects={projects}
          costos={costos}
          costosLoading={costosLoading}
        />
      )}

      {activeTab === 'tecnologias' && canTecnologias && (
        <Tecnologias
          equipo={reg.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            image: p.image,
            active: p.active,
            roleName: p.roleName,
          }))}
          catalog={techCatalog}
          matrix={techMatrix}
          projects={projects}
        />
      )}

      {canManage && editing && payload && (
        <EquipoEditModal
          target={editing}
          roles={payload.roles}
          all={reg}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadEquipo(); }}
        />
      )}
    </div>
  );
}

function EquipoEditModal({ target, roles, all, onClose, onSaved }: {
  target: EquipoRecord | 'new';
  roles: RoleOpt[];
  all: EquipoRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = target === 'new';
  const t = isNew ? null : target;
  const [form, setForm] = useState({
    full_name: t?.fullName ?? '',
    nickname: t?.nickname ?? '',
    email: t?.email ?? '',
    title: t?.title ?? '',
    role_id: t?.roleId ?? '',
    department: t?.department ?? '',
    manager_id: t?.managerId ?? '',
    active: t ? t.active : true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.full_name.trim()) { setErr('El nombre completo es obligatorio.'); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/admin/equipo', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(isNew ? form : { ...form, id: t!.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(body.error || `Error ${res.status}`); return; }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">{isNew ? 'Agregar miembro' : `Editar — ${t!.fullName}`}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          {err && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-red-300">{err}</div>}
          {([
            ['full_name', 'Nombre completo *', 'text'],
            ['nickname', 'Apodo (como aparece en Projects)', 'text'],
            ['email', 'Email', 'email'],
            ['title', 'Título funcional (display)', 'text'],
            ['department', 'Departamento / OU', 'text'],
          ] as const).map(([k, label, type]) => (
            <div key={k}>
              <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
              <input
                type={type}
                value={form[k] as string}
                onChange={(e) => set(k, e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Banda de costo (puesto)</label>
            <select
              value={form.role_id}
              onChange={(e) => set('role_id', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">— Sin asignar (pendiente RH) —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Jefe directo</label>
            <select
              value={form.manager_id}
              onChange={(e) => set('manager_id', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">— Sin jefe —</option>
              {all.filter((p) => p.id !== t?.id).map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Activo (sigue en el equipo)
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-300 hover:text-white">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            {saving ? 'Guardando...' : isNew ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
