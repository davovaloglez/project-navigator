import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { buildMembers, resolveId } from '../../lib/equipoMatch';
import type { EquipoRecord } from '../../pages/api/equipo';
import Avatar from '../ui/Avatar';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { ListChecks, Ban, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import { isTareaDone, type TareaRecord } from '../../utils/dataTransforms';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import ChartCard from '../charts/ChartCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, AreaChart, Area, PieChart, Pie } from 'recharts';
import { Cell } from '../../utils/recharts';
import { getTipoTareaColor } from '../../utils/colors';
import { infoFor } from '../../data/glossary';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import InfoTooltip from '../ui/InfoTooltip';
import { Star, Gauge } from 'lucide-react';

const COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#2dd4bf', '#818cf8', '#e879f9', '#34d399', '#94a3b8', '#a78bfa'];

const PRIORITY_WEIGHT: Record<string, number> = {
  'bloqueadora': 0,
  'crítica': 1,
  'critica': 1,
  'mayor': 2,
  'media': 3,
  'menor': 4,
  'baja': 5,
};

function statusBadge(estatus: string) {
  const s = estatus.toLowerCase();
  if (s.includes('done') || s.includes('completad')) return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (s.includes('in progress') || s.includes('en proceso')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (s.includes('review')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (s.includes('testing') || s.includes('qa')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (s.includes('change')) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  if (s.includes('cancelad')) return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30'; // Pending / otros
}

function statusGroupKey(estatus: string): string {
  const s = (estatus || '').toLowerCase();
  if (isTareaDone(estatus)) return 'Done';
  if (s.includes('in progress') || s.includes('en proceso')) return 'In Progress';
  if (s.includes('review')) return 'TL Review';
  if (s.includes('testing') || s.includes('qa')) return 'Testing';
  if (s.includes('change')) return 'Change Request';
  if (s.includes('cancelad')) return 'Cancelada';
  if (s.includes('pending') || s.includes('pendiente')) return 'Pending';
  return estatus || 'Otro';
}

const STATUS_GROUP_ORDER = ['Pending', 'In Progress', 'TL Review', 'Testing', 'Change Request', 'Done', 'Cancelada', 'Otro'];

function saludGroupKey(salud: string): string {
  return salud || 'Sin salud';
}

function isBlocker(t: TareaRecord): boolean {
  const p = (t.prioridad || '').toLowerCase();
  return p.includes('bloqueador') || p === 'crítica' || p === 'critica';
}

export default function CronogramaSection() {
  const { data, loading, error, refetch } = useSheetData<TareaRecord>('/api/tareas');
  const [search, setSearch] = useState('');

  // Registro `equipo` para resolver asignado → foto/nombre completo (Avatar)
  const [registry, setRegistry] = useState<EquipoRecord[]>([]);
  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/equipo', { credentials: 'same-origin', signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { equipo: EquipoRecord[] }) => setRegistry(d.equipo ?? []))
      .catch(() => { /* sin registro: Avatar cae a iniciales */ });
    return () => ac.abort();
  }, []);

  const members = useMemo(() => buildMembers(registry), [registry]);
  const getAsignadoMeta = useCallback(
    (name: string): { image: string | null; fullName: string; id: string | null } => {
      const id = resolveId(name, members);
      const rec = id ? registry.find((r) => r.id === id) : null;
      return { image: rec?.image ?? null, fullName: rec?.fullName ?? name, id };
    },
    [members, registry],
  );
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    filters: Record<string, string[]>;
    groupBy: 'estatus' | 'salud' | 'asignado' | 'matriz';
    sortBy: 'fecha' | 'prioridad';
    hideDone: boolean;
  }>('cronograma', { filters: {}, groupBy: 'estatus', sortBy: 'fecha', hideDone: false });
  const activeFilters = persisted.filters;
  const { groupBy, sortBy, hideDone } = persisted;
  const setActiveFilters = useCallback(
    (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) =>
      setPersisted((prev) => ({ ...prev, filters: typeof updater === 'function' ? updater(prev.filters) : updater })),
    [setPersisted],
  );
  const setGroupBy = useCallback(
    (next: 'estatus' | 'salud' | 'asignado' | 'matriz') => setPersisted((prev) => ({ ...prev, groupBy: next })),
    [setPersisted],
  );
  const setSortBy = useCallback(
    (next: 'fecha' | 'prioridad') => setPersisted((prev) => ({ ...prev, sortBy: next })),
    [setPersisted],
  );
  const setHideDone = useCallback(
    (next: boolean) => setPersisted((prev) => ({ ...prev, hideDone: next })),
    [setPersisted],
  );

  // Distinct values for filters
  const filterOptions = useMemo(() => {
    const sprints = new Set<string>();
    const fases = new Set<string>();
    const roles = new Set<string>();
    const asignados = new Set<string>();
    const estatuses = new Set<string>();
    const tipos = new Set<string>();

    for (const t of data) {
      if (t.sprint) sprints.add(t.sprint);
      if (t.fase) fases.add(t.fase);
      if (t.rol) roles.add(t.rol);
      if (t.asignado) asignados.add(t.asignado);
      if (t.estatus) estatuses.add(t.estatus);
      if (t.tipo) tipos.add(t.tipo);
    }

    const toOpts = (s: Set<string>) =>
      [...s].sort().map((v) => ({ value: v, label: v }));

    return {
      sprint: toOpts(sprints),
      fase: toOpts(fases),
      rol: toOpts(roles),
      asignado: toOpts(asignados),
      estatus: toOpts(estatuses),
      tipo: toOpts(tipos),
    };
  }, [data]);

  // Apply filters + search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const f = activeFilters;
    return data.filter((t) => {
      if (f.sprint?.length && !f.sprint.includes(t.sprint)) return false;
      if (f.fase?.length && !f.fase.includes(t.fase)) return false;
      if (f.rol?.length && !f.rol.includes(t.rol)) return false;
      if (f.asignado?.length && !f.asignado.includes(t.asignado)) return false;
      if (f.estatus?.length && !f.estatus.includes(t.estatus)) return false;
      if (f.tipo?.length && !f.tipo.includes(t.tipo)) return false;
      if (q) {
        const hay = `${t.nombre} ${t.folio} ${t.epica} ${t.asignado}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, activeFilters, search]);

  // ¿El estatus Done está habilitado por los filtros actuales? (controla la visibilidad del toggle)
  const doneEnabled = useMemo(() => filtered.some((t) => isTareaDone(t.estatus)), [filtered]);

  // Dataset de la sección "Tareas / Historias": opcionalmente sin Done (no afecta charts/indicadores)
  const listData = useMemo(
    () => (hideDone ? filtered.filter((t) => !isTareaDone(t.estatus)) : filtered),
    [filtered, hideDone],
  );

  // Leyenda de colores: tipos de tarea presentes en lo que se está mostrando.
  // Mismo mecanismo de identificación que las gráficas del dashboard (punto + label).
  const tipoLegend = useMemo(() => {
    const tipos = new Set<string>();
    for (const t of listData) if (t.tipo) tipos.add(t.tipo);
    return [...tipos]
      .sort((a, b) => a.localeCompare(b))
      .map((tipo) => ({ tipo, color: getTipoTareaColor(tipo).chart }));
  }, [listData]);

  // ---------- Indicadores dinámicos (3 widgets) ----------
  const progressIndicator = useMemo(() => {
    const total = filtered.length;
    let completadas = 0, pendientes = 0;
    for (const t of filtered) {
      if (isTareaDone(t.estatus)) completadas++;
      else pendientes++;
    }
    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
    return { total, completadas, pendientes, pct };
  }, [filtered]);

  const blockedIndicator = useMemo(() => {
    const blocked = filtered.filter((t) => !isTareaDone(t.estatus) && isBlocker(t));
    return { count: blocked.length };
  }, [filtered]);

  const burndown = useMemo(() => {
    const totalPts = filtered.reduce((s, t) => s + (t.puntos ?? 0), 0);
    const donePts = filtered.filter((t) => isTareaDone(t.estatus)).reduce((s, t) => s + (t.puntos ?? 0), 0);
    const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

    // Series: puntos restantes acumulado por semana (últimas 8 semanas con cierres)
    const weekLabel = (d: Date) => {
      const t = new Date(d);
      t.setHours(0, 0, 0, 0);
      const day = t.getDay();
      const monday = new Date(t);
      monday.setDate(t.getDate() - ((day + 6) % 7));
      return monday.toISOString().split('T')[0];
    };

    const weekMap = new Map<string, number>(); // semana → puntos entregados esa semana
    for (const t of filtered) {
      if (!isTareaDone(t.estatus) || !t.finReal) continue;
      const d = new Date(t.finReal);
      if (isNaN(d.getTime())) continue;
      const key = weekLabel(d);
      weekMap.set(key, (weekMap.get(key) || 0) + (t.puntos ?? 0));
    }

    const weeks = [...weekMap.keys()].sort();
    const series: { label: string; restantes: number; ideal: number }[] = [];
    if (weeks.length > 0 && totalPts > 0) {
      const lastWeeks = weeks.slice(-8);
      let acc = 0;
      const stepIdeal = totalPts / Math.max(1, lastWeeks.length);
      lastWeeks.forEach((w, idx) => {
        acc += weekMap.get(w) || 0;
        series.push({
          label: new Date(w).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
          restantes: Math.max(0, totalPts - acc),
          ideal: Math.max(0, totalPts - stepIdeal * (idx + 1)),
        });
      });
    }

    return { totalPts, donePts, pct, series };
  }, [filtered]);

  // ---------- Charts laterales (los que se mantienen) ----------
  const byEpica = useMemo(() => {
    const map = new Map<string, { total: number; completadas: number }>();
    for (const t of filtered) {
      if (!t.epica) continue;
      const curr = map.get(t.epica) || { total: 0, completadas: 0 };
      curr.total++;
      if (isTareaDone(t.estatus)) curr.completadas++;
      map.set(t.epica, curr);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, total: v.total, completadas: v.completadas, pendientes: v.total - v.completadas }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byAsignado = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      if (!t.asignado) continue;
      map.set(t.asignado, (map.get(t.asignado) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Weekly throughput
  const throughput = useMemo(() => {
    const weekMap = new Map<string, { week: string; tareas: number; puntos: number }>();
    const weekLabel = (d: Date) => {
      const t = new Date(d);
      t.setHours(0, 0, 0, 0);
      const day = t.getDay();
      const monday = new Date(t);
      monday.setDate(t.getDate() - ((day + 6) % 7));
      return monday.toISOString().split('T')[0];
    };
    for (const t of filtered) {
      if (!isTareaDone(t.estatus)) continue;
      if (!t.finReal) continue;
      const d = new Date(t.finReal);
      if (isNaN(d.getTime())) continue;
      const key = weekLabel(d);
      const curr = weekMap.get(key) || { week: key, tareas: 0, puntos: 0 };
      curr.tareas++;
      curr.puntos += t.puntos ?? 0;
      weekMap.set(key, curr);
    }
    const entries = [...weekMap.values()].sort((a, b) => a.week.localeCompare(b.week));
    return entries.slice(-12).map((e) => ({
      ...e,
      label: new Date(e.week).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    }));
  }, [filtered]);

  // Estimation accuracy
  const accuracy = useMemo(() => {
    const tasks = filtered.filter((t) => (t.puntos ?? 0) > 0 && (t.tracked ?? 0) > 0);
    let acertadas = 0, subEstimadas = 0, sobreEstimadas = 0;
    let totalEst = 0, totalReal = 0;
    for (const t of tasks) {
      const est = t.puntos;
      const real = t.tracked;
      totalEst += est;
      totalReal += real;
      const ratio = real / est;
      if (ratio >= 0.8 && ratio <= 1.2) acertadas++;
      else if (ratio > 1.2) subEstimadas++;
      else sobreEstimadas++;
    }
    return {
      count: tasks.length,
      acertadas,
      subEstimadas,
      sobreEstimadas,
      totalEst,
      totalReal,
      globalRatio: totalEst > 0 ? totalReal / totalEst : 0,
    };
  }, [filtered]);

  // Sort helper reusado por Kanban simple y matriz
  const sortTareas = useCallback((a: TareaRecord, b: TareaRecord) => {
    if (sortBy === 'prioridad') {
      const pa = PRIORITY_WEIGHT[(a.prioridad || '').toLowerCase()] ?? 99;
      const pb = PRIORITY_WEIGHT[(b.prioridad || '').toLowerCase()] ?? 99;
      if (pa !== pb) return pa - pb;
    }
    const fa = a.finEstimado || a.inicio || '';
    const fb = b.finEstimado || b.inicio || '';
    if (fa && fb) return fa.localeCompare(fb);
    if (fa) return -1;
    if (fb) return 1;
    return 0;
  }, [sortBy]);

  // ---------- Kanban: agrupación simple (1 eje) ----------
  const kanbanColumns = useMemo(() => {
    if (groupBy === 'matriz') return [];
    const groupOf = (t: TareaRecord) => {
      if (groupBy === 'estatus') return statusGroupKey(t.estatus);
      if (groupBy === 'salud') return saludGroupKey(t.salud);
      return t.asignado || 'Sin asignar';
    };

    const map = new Map<string, TareaRecord[]>();
    for (const t of listData) {
      const k = groupOf(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }

    for (const arr of map.values()) arr.sort(sortTareas);

    const entries = [...map.entries()];
    if (groupBy === 'estatus') {
      entries.sort(([a], [b]) => {
        const ia = STATUS_GROUP_ORDER.indexOf(a);
        const ib = STATUS_GROUP_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
    } else {
      entries.sort(([, a], [, b]) => b.length - a.length);
    }
    return entries.map(([key, items]) => ({ key, items }));
  }, [listData, groupBy, sortTareas]);

  // ---------- Matriz: filas = asignado, columnas = estatus ----------
  const matrixData = useMemo(() => {
    if (groupBy !== 'matriz') return null;

    // 1. Columnas (status groups presentes en el subset)
    const statusSet = new Set<string>();
    for (const t of listData) statusSet.add(statusGroupKey(t.estatus));
    const statusCols = [...statusSet].sort((a, b) => {
      const ia = STATUS_GROUP_ORDER.indexOf(a);
      const ib = STATUS_GROUP_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    // 2. Agrupar por asignado × estatus
    const asignadoMap = new Map<string, Map<string, TareaRecord[]>>();
    const asignadoTotals = new Map<string, number>();
    for (const t of listData) {
      const asg = t.asignado || 'Sin asignar';
      const col = statusGroupKey(t.estatus);
      if (!asignadoMap.has(asg)) asignadoMap.set(asg, new Map());
      const row = asignadoMap.get(asg)!;
      if (!row.has(col)) row.set(col, []);
      row.get(col)!.push(t);
      asignadoTotals.set(asg, (asignadoTotals.get(asg) || 0) + 1);
    }

    // 3. Sort dentro de cada celda
    for (const row of asignadoMap.values()) {
      for (const arr of row.values()) arr.sort(sortTareas);
    }

    // 4. Filas ordenadas por total desc; "Sin asignar" al final
    const rows = [...asignadoMap.entries()]
      .map(([name, row]) => ({
        name,
        total: asignadoTotals.get(name) || 0,
        cells: statusCols.map((c) => row.get(c) || []),
      }))
      .sort((a, b) => {
        if (a.name === 'Sin asignar') return 1;
        if (b.name === 'Sin asignar') return -1;
        return b.total - a.total;
      });

    // 5. Totales por columna
    const colTotals = statusCols.map((c) => {
      let n = 0;
      for (const r of rows) {
        const idx = statusCols.indexOf(c);
        n += r.cells[idx]?.length || 0;
      }
      return n;
    });

    return { statusCols, rows, colTotals };
  }, [listData, groupBy, sortTareas]);

  if (loading) {
    return (
      <div>
        <Header title="Cronograma" onRefresh={refetch} loading />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-36" />
          ))}
        </div>
        <div className="bg-slate-800 rounded-xl p-5 animate-pulse h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Cronograma" onRefresh={refetch} />
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
      <Header title="Cronograma" onRefresh={refetch} loading={loading} />

      {/* Indicadores dinámicos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 mb-6">
        {/* Progreso de tareas */}
        <div className="lg:col-span-4 bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-green-400" />
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Progreso de tareas</p>
            </div>
            <InfoTooltip {...(infoFor('cronograma-progreso-tareas') || { description: '' })} />
          </div>
          <div className="flex items-baseline gap-2 mb-3 flex-wrap">
            <span className="text-3xl font-bold text-green-400">{progressIndicator.completadas}</span>
            <span className="text-sm text-slate-500">/ <span className="text-slate-200 font-semibold">{progressIndicator.total}</span> totales / <span className="text-amber-400 font-semibold">{progressIndicator.pendientes}</span> pendientes</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-700 rounded-full h-2.5">
              <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${progressIndicator.pct}%` }} />
            </div>
            <span className="text-sm font-bold text-slate-200 w-10 text-right">{progressIndicator.pct}%</span>
          </div>
        </div>

        {/* Bloqueadas */}
        <div className={`lg:col-span-3 bg-slate-800 border rounded-xl p-5 ${blockedIndicator.count > 0 ? 'border-red-500/40' : 'border-slate-700/50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Ban className="w-4 h-4 text-red-400" />
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Bloqueadoras / Críticas activas</p>
            </div>
            <InfoTooltip {...(infoFor('cronograma-indicador-bloqueadas') || { description: '' })} />
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold ${blockedIndicator.count > 0 ? 'text-red-400' : 'text-slate-500'}`}>{blockedIndicator.count}</span>
            <span className="text-xs text-slate-500">{blockedIndicator.count === 1 ? 'tarea requiere atención' : 'tareas requieren atención'}</span>
          </div>
        </div>

        {/* Burndown */}
        <div className="lg:col-span-5 bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Puntos de historia</p>
            </div>
            <InfoTooltip {...(infoFor('cronograma-burndown-puntos') || { description: '' })} />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-cyan-400">{burndown.donePts}</span>
            <span className="text-sm text-slate-500">/ <span className="text-slate-200 font-semibold">{burndown.totalPts}</span> totales</span>
            <span className="ml-auto text-sm font-bold text-slate-200">{burndown.pct}% avance</span>
          </div>
          <p className="text-[10px] text-slate-500 mb-2">puntos completados de {burndown.totalPts} planeados</p>
          {burndown.series.length >= 2 ? (
            <>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={burndown.series} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: unknown, name) => [`${value} pts`, String(name) === 'restantes' ? 'Restantes' : 'Ideal']}
                  />
                  <Area type="monotone" dataKey="restantes" stroke="#22d3ee" strokeWidth={2} fill="url(#burnFill)" />
                  <Line type="monotone" dataKey="ideal" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-3 h-0.5 rounded bg-cyan-400" />
                  Restantes (pts por cerrar)
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-3 border-t border-dashed border-slate-400" />
                  Ideal (ritmo lineal esperado)
                </span>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-slate-500 italic">Burndown disponible con ≥2 semanas de cierres</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FilterDropdowns
          filters={[
            { key: 'sprint', label: 'Sprint', options: filterOptions.sprint, multi: true },
            { key: 'fase', label: 'Fase', options: filterOptions.fase, multi: true },
            { key: 'rol', label: 'Rol', options: filterOptions.rol, multi: true },
            { key: 'asignado', label: 'Asignado', options: filterOptions.asignado, multi: true },
            { key: 'estatus', label: 'Estatus', options: filterOptions.estatus, multi: true },
            { key: 'tipo', label: 'Tipo', options: filterOptions.tipo, multi: true },
          ]}
          activeFilters={activeFilters}
          onFilterChange={(key, values) => setActiveFilters((prev) => ({ ...prev, [key]: values }))}
          onClear={() => { clearPersisted(); setSearch(''); }}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar tarea, folio, épica..."
        />
      </div>

      {/* Charts: Carga + Throughput */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Carga por Persona" info={infoFor('cronograma-carga-persona')}>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={byAsignado}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {byAsignado.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: unknown, name) => [`${value} tareas`, String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
            {byAsignado.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </ChartCard>

        {throughput.length > 0 && (
          <ChartCard title="Throughput Semanal (tareas completadas)" info={infoFor('cronograma-throughput-semanal')}>
            <p className="text-[11px] text-slate-500 mb-3">Últimas {throughput.length} semanas</p>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={throughput} margin={{ left: 10, right: 20, top: 10 }}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#c084fc', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Bar yAxisId="left" dataKey="tareas" fill="#4ade80" radius={[6, 6, 0, 0]} name="Tareas" />
                <Line yAxisId="right" type="monotone" dataKey="puntos" stroke="#c084fc" strokeWidth={2} dot={{ fill: '#c084fc', r: 3 }} name="Puntos" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-400" />
                Tareas completadas (eje izq.)
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-3 h-0.5 rounded bg-purple-400" />
                Puntos entregados (eje der.)
              </span>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Épica progress + Precisión */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {byEpica.length > 0 && (
          <ChartCard title="Progreso por Épica" info={infoFor('cronograma-progreso-funcionalidad')}>
            <ResponsiveContainer width="100%" height={Math.max(250, byEpica.length * 32 + 60)}>
              <BarChart data={byEpica} layout="vertical" margin={{ left: 10, right: 20 }} stackOffset="none">
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={170} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Bar dataKey="completadas" stackId="a" fill="#4ade80" name="Completadas" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendientes" stackId="a" fill="#64748b" name="Pendientes" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {accuracy.count > 0 && (
          <ChartCard title="Precisión de Estimación" info={infoFor('cronograma-precision-estimacion')}>
            <p className="text-[11px] text-slate-500 mb-3">
              {accuracy.count} tareas con puntos estimados y tiempo real (tracked) registrados
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{accuracy.acertadas}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Acertadas</p>
                <p className="text-[9px] text-slate-600 mt-0.5">±20%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{accuracy.subEstimadas}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sub-estimadas</p>
                <p className="text-[9px] text-slate-600 mt-0.5">tardaron más</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{accuracy.sobreEstimadas}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sobre-estimadas</p>
                <p className="text-[9px] text-slate-600 mt-0.5">tardaron menos</p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">Estimado total</span>
                <span className="text-slate-200 font-medium">{accuracy.totalEst} pts</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">Real total (tracked)</span>
                <span className="text-slate-200 font-medium">{accuracy.totalReal} pts</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Ratio global (Real / Est)</span>
                <span className={`font-bold ${accuracy.globalRatio > 1.2 ? 'text-red-400' : accuracy.globalRatio < 0.8 ? 'text-blue-400' : 'text-green-400'}`}>
                  {accuracy.globalRatio.toFixed(2)}×
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                {accuracy.globalRatio > 1.2
                  ? 'El equipo invierte más tiempo del estimado — considerar aumentar estimaciones'
                  : accuracy.globalRatio < 0.8
                    ? 'El equipo invierte menos tiempo del estimado — estimaciones conservadoras'
                    : 'Estimaciones alineadas con el tiempo real'}
              </p>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Kanban: agrupar + ordenar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Tareas / Historias ({listData.length})</h3>
          <GlossaryTooltip id="cronograma-lista-tareas" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {doneEnabled && (
            <button
              onClick={() => setHideDone(!hideDone)}
              title={hideDone ? 'Mostrar tareas con estatus Done' : 'Ocultar tareas con estatus Done'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                hideDone
                  ? 'bg-green-500/20 text-green-300 border-green-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {hideDone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {hideDone ? 'Mostrar completadas' : 'Ocultar completadas'}
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Agrupar</span>
            {(['estatus', 'salud', 'asignado', 'matriz'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setGroupBy(opt)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  groupBy === opt ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt === 'estatus' ? 'Estado' : opt === 'salud' ? 'Salud' : opt === 'asignado' ? 'Asignado' : 'Estado × Asignado'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ordenar</span>
            {(['fecha', 'prioridad'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setSortBy(opt)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  sortBy === opt ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt === 'fecha' ? 'Fecha est.' : 'Prioridad'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda de identificación: color por tipo de tarea + estado del borde de la card */}
      {tipoLegend.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Tipo</span>
          {tipoLegend.map(({ tipo, color }) => (
            <div key={tipo} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {tipo}
            </div>
          ))}
          <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500 font-medium">Borde</span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 ring-1 ring-red-500/40" />
            Atrasada
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/40 ring-1 ring-green-500/30" />
            Terminada
          </div>
        </div>
      )}

      {listData.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <p className="text-slate-400">Sin resultados</p>
        </div>
      ) : groupBy === 'matriz' && matrixData ? (
        <div className="overflow-x-auto pb-3">
          <div
            className="min-w-min grid gap-2"
            style={{ gridTemplateColumns: `12rem repeat(${matrixData.statusCols.length}, 16rem)` }}
          >
            {/* Header row: corner + status column headers */}
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-950 z-10">
              Asignado ↓ / Estado →
            </div>
            {matrixData.statusCols.map((col, idx) => (
              <div key={col} className="px-2 py-1 flex items-center justify-between gap-2 bg-slate-900/60 rounded">
                <h4 className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider truncate">{col}</h4>
                <span className="text-[10px] text-slate-500 font-medium bg-slate-800 rounded-full px-1.5 py-0.5 shrink-0">
                  {matrixData.colTotals[idx]}
                </span>
              </div>
            ))}

            {/* One row per asignado */}
            {matrixData.rows.map((row) => {
              const meta = getAsignadoMeta(row.name);
              return (
              <Fragment key={row.name}>
                <a
                  href={row.name !== 'Sin asignar' ? `/persona/${meta.id ?? encodeURIComponent(row.name)}` : undefined}
                  className={`px-2 py-2 flex items-center gap-2 sticky left-0 bg-slate-950 z-10 border-l-2 border-slate-700/40 ${row.name !== 'Sin asignar' ? 'hover:border-blue-400 hover:bg-slate-900/40 transition-colors' : ''}`}
                >
                  {row.name !== 'Sin asignar' && (
                    <Avatar name={meta.fullName} image={meta.image} size={32} />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate">{row.name}</span>
                    <span className="text-[10px] text-slate-500">{row.total} tareas</span>
                  </div>
                </a>
                {row.cells.map((cell, idx) => (
                  <div key={idx} className="bg-slate-900/30 border border-slate-700/30 rounded-lg p-2 space-y-2 min-h-15">
                    {cell.length === 0 ? (
                      <div className="text-[10px] text-slate-700 italic text-center py-2">—</div>
                    ) : (
                      cell.map((t, i) => renderCard(t, `${row.name}-${idx}-${i}`, /*hideAsignado*/ true, /*hideEstatus*/ true))
                    )}
                  </div>
                ))}
              </Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-3 min-w-min">
            {kanbanColumns.map((col) => (
              <div key={col.key} className="w-72 shrink-0 bg-slate-900/40 border border-slate-700/40 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider truncate">{col.key}</h4>
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-800 rounded-full px-2 py-0.5">{col.items.length}</span>
                </div>
                <div className="space-y-2 max-h-170 overflow-y-auto pr-1">
                  {col.items.map((t, idx) => renderCard(t, `${col.key}-${idx}`, /*hideAsignado*/ groupBy === 'asignado', /*hideEstatus*/ groupBy === 'estatus'))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  function renderCard(t: TareaRecord, key: string, hideAsignado: boolean, hideEstatus: boolean) {
    const done = isTareaDone(t.estatus);
    const s = t.estatus.toLowerCase();
    const isCancelled = s.includes('cancelad');
    const isDelayed = (t.salud || '').toLowerCase().includes('atraz');
    return (
      <div
        key={key}
        className={`bg-slate-800 border rounded-lg p-3 hover:bg-slate-700/50 transition-colors ${isDelayed ? 'border-red-500/40' : done ? 'border-green-500/20' : 'border-slate-700/50'} ${isCancelled ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1 flex-wrap">
            {t.fase && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 bg-slate-700/60 text-slate-300">{t.fase}</span>
            )}
            {t.sprint && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 bg-indigo-500/15 text-indigo-300">{t.sprint}</span>
            )}
          </div>
          {!hideEstatus && (
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0 ${statusBadge(t.estatus)}`}>{t.estatus}</span>
          )}
        </div>

        {t.epica && <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">{t.epica}</p>}
        <a href={`/tarea/${t.id}`} className="block group">
          <h4 className="text-xs font-medium text-slate-200 group-hover:text-blue-300 transition-colors mb-1 line-clamp-2">{t.nombre}</h4>
        </a>
        {t.folio && <p className="text-[9px] text-slate-600 font-mono line-clamp-1 mb-2">{t.folio}</p>}

        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 mb-2">
          {t.tipo && (() => {
            const tc = getTipoTareaColor(t.tipo);
            return <span className={`px-1.5 py-0.5 rounded font-medium ${tc.bg} ${tc.text}`}>{t.tipo}</span>;
          })()}
          {t.prioridad && (
            <span className="px-1.5 py-0.5 bg-slate-700/60 text-slate-300 rounded">{t.prioridad}</span>
          )}
          {t.puntos > 0 && (
            <span className="px-1.5 py-0.5 bg-purple-500/15 text-purple-300 rounded flex items-center gap-1">
              <Star className="w-3 h-3" /> {t.puntos}
            </span>
          )}
          {t.tracked > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-300 rounded flex items-center gap-1" title="Tiempo real (tracked)">
              <Gauge className="w-3 h-3" /> {t.tracked}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-700/50 gap-2">
          {t.asignado && !hideAsignado ? (() => {
            const meta = getAsignadoMeta(t.asignado);
            return (
              <a
                href={`/persona/${meta.id ?? encodeURIComponent(t.asignado)}`}
                className="flex items-center gap-1.5 text-slate-400 hover:text-blue-300 truncate transition-colors min-w-0"
              >
                <Avatar name={meta.fullName} image={meta.image} size={18} />
                <span className="truncate">{t.asignado}</span>
              </a>
            );
          })() : (
            <span className="truncate">&nbsp;</span>
          )}
          <span className="shrink-0">{t.finEstimado || t.inicio || '—'}</span>
        </div>
      </div>
    );
  }
}

