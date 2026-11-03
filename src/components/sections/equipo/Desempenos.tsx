import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Trophy, X, Star, Pencil, Plus } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import Avatar from '../../ui/Avatar';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import { usePersistedFilters } from '../../../hooks/usePersistedFilters';
import { usePermissions } from '../../../hooks/usePermissions';
import EvaluacionEditModal from '../comparativa/EvaluacionEditModal';
import {
  DIMENSIONS,
  calcCalificacion,
  calificacionColor,
  comparePeriodos,
  quarterOf,
  type Dimension,
  type DimensionScores,
} from '../../../utils/evaluacion';
import { roleCategory, CATEGORY_ORDER, type TeamCategory } from '../../../utils/roleCategory';

export interface EvaluacionRow {
  id: number;
  equipoId: string;
  periodo: string;
  actitud: number;
  aptitudes: number;
  comunicacion: number;
  velocidad: number;
  analisis: number;
  calidad: number;
  autogestion: number;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipoRow {
  id: string;
  fullName: string;
  nickname: string;
  tag: string;
  roleId: string;
  roleName: string;
  active: boolean;
  image: string | null;
}

export interface PersonAggregate {
  equipoId: string;
  name: string;
  image: string | null;
  roleId: string;
  roleName: string;
  category: TeamCategory;
  latestPeriodo: string | null;
  scores: DimensionScores | null;
  notas: string | null;
  calificacion: number | null;
  evalCount: number;
  knownPeriods: string[];
}

const RADAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

type SortKey = 'name' | 'calificacion' | Dimension;
type SortDir = 'asc' | 'desc';

export default function Desempenos() {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionRow[]>([]);
  const [equipo, setEquipo] = useState<EquipoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persistimos categoría + período + sort. Multi-select de personas NO
  // persiste (es exploratorio).
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    categoria: TeamCategory | 'Todos';
    periodo: string;
    sortKey: SortKey;
    sortDir: SortDir;
  }>('desempenos', {
    categoria: 'Todos',
    periodo: quarterOf(),
    sortKey: 'calificacion',
    sortDir: 'desc',
  });
  const { categoria, periodo, sortKey, sortDir } = persisted;
  const setCategoria = useCallback((v: TeamCategory | 'Todos') =>
    setPersisted((p) => ({ ...p, categoria: v })), [setPersisted]);
  const setPeriodo = useCallback((v: string) =>
    setPersisted((p) => ({ ...p, periodo: v })), [setPersisted]);
  const setSort = useCallback((k: SortKey) =>
    setPersisted((p) => ({
      ...p,
      sortKey: k,
      sortDir: p.sortKey === k && p.sortDir === 'desc' ? 'asc' : 'desc',
    })), [setPersisted]);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<PersonAggregate | null>(null);
  const [creatingFor, setCreatingFor] = useState<PersonAggregate | null>(null);

  const { can } = usePermissions();
  const canManage = can('action:evaluacion:manage');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, eqRes] = await Promise.all([
        fetch('/api/evaluaciones', { credentials: 'same-origin' }),
        fetch('/api/equipo', { credentials: 'same-origin' }),
      ]);
      if (!evRes.ok) throw new Error(`HTTP ${evRes.status} en /api/evaluaciones`);
      if (!eqRes.ok) throw new Error(`HTTP ${eqRes.status} en /api/equipo`);
      const evJson = await evRes.json();
      const eqJson = await eqRes.json();
      setEvaluaciones(evJson.evaluaciones ?? []);
      setEquipo(eqJson.equipo ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Lista única de períodos (orden desc: Q1 2026, Q4 2025...)
  const periodos = useMemo(() => {
    const set = new Set<string>();
    set.add(quarterOf());
    evaluaciones.forEach((e) => set.add(e.periodo));
    return Array.from(set).sort(comparePeriodos);
  }, [evaluaciones]);

  // Indexamos evaluaciones: Map<equipoId, Map<periodo, EvaluacionRow>>
  const evalIndex = useMemo(() => {
    const map = new Map<string, Map<string, EvaluacionRow>>();
    for (const e of evaluaciones) {
      let sub = map.get(e.equipoId);
      if (!sub) {
        sub = new Map();
        map.set(e.equipoId, sub);
      }
      sub.set(e.periodo, e);
    }
    return map;
  }, [evaluaciones]);

  // Construimos lista de personas (sólo activas) con su eval del período seleccionado
  const peoplePeriod = useMemo<PersonAggregate[]>(() => {
    return equipo
      .filter((p) => p.active)
      .map((p) => {
        const sub = evalIndex.get(p.id);
        const ev = sub?.get(periodo);
        const scores: DimensionScores | null = ev
          ? {
              actitud: ev.actitud,
              aptitudes: ev.aptitudes,
              comunicacion: ev.comunicacion,
              velocidad: ev.velocidad,
              analisis: ev.analisis,
              calidad: ev.calidad,
              autogestion: ev.autogestion,
            }
          : null;
        const cal = scores ? calcCalificacion(scores) : null;
        const knownPeriods = sub ? Array.from(sub.keys()).sort(comparePeriodos) : [];
        return {
          equipoId: p.id,
          name: p.tag || p.fullName,
          image: p.image,
          roleId: p.roleId,
          roleName: p.roleName,
          category: roleCategory(p.roleId),
          latestPeriodo: ev ? periodo : null,
          scores,
          notas: ev?.notas ?? null,
          calificacion: cal,
          evalCount: sub ? sub.size : 0,
          knownPeriods,
        };
      });
  }, [equipo, evalIndex, periodo]);

  // Filtros aplicados
  const filtered = useMemo(() => {
    return peoplePeriod.filter((p) => {
      if (categoria !== 'Todos' && p.category !== categoria) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesRole = p.roleName?.toLowerCase().includes(q);
        if (!matchesName && !matchesRole) return false;
      }
      return true;
    });
  }, [peoplePeriod, categoria, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortKey === 'calificacion') {
        const av = a.calificacion ?? -Infinity;
        const bv = b.calificacion ?? -Infinity;
        return (av - bv) * dir;
      }
      const av = a.scores?.[sortKey] ?? -Infinity;
      const bv = b.scores?.[sortKey] ?? -Infinity;
      return (av - bv) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  // Chips ordenadas por calificación (independiente del sort de la tabla).
  const chips = useMemo(() =>
    [...filtered]
      .filter((p) => p.calificacion != null)
      .sort((a, b) => (b.calificacion ?? 0) - (a.calificacion ?? 0)),
  [filtered]);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const selectedPeople = useMemo(
    () => selected.map((id) => peoplePeriod.find((p) => p.equipoId === id)).filter(Boolean) as PersonAggregate[],
    [selected, peoplePeriod],
  );

  const radarData = useMemo(() => {
    return DIMENSIONS.map((d) => {
      const row: Record<string, string | number> = { metric: d.label };
      for (const p of selectedPeople) {
        if (p.scores) row[p.name] = p.scores[d.key];
      }
      return row;
    });
  }, [selectedPeople]);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-40" />
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400 font-medium mb-2">Error al cargar datos de desempeños</p>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={load}
          className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const captured = filtered.filter((p) => p.scores != null).length;
  const total = filtered.length;

  return (
    <div>
      {/* Controles de filtro */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Categoría */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mr-1">Categoría</span>
            {(['Todos', ...CATEGORY_ORDER] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  categoria === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Período */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">Período</span>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {periodos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Búsqueda */}
            <div className="relative min-w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar persona..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-xs text-slate-400">
          <span className="text-slate-200 font-medium">{captured}</span> de {total} autoevaluaron en {periodo}
          {selected.length > 0 && (
            <span className="text-blue-300 ml-2">({selected.length} seleccionados para radar)</span>
          )}
        </p>
        <button
          onClick={clearPersisted}
          className="text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Restablecer filtros
        </button>
      </div>

      {/* Ranking de chips */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-medium text-slate-200">Ranking</h3>
          <GlossaryTooltip id="comparativa-ranking" />
          <span className="text-[11px] text-slate-500">click para añadir al radar (máx 3)</span>
        </div>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((p, idx) => {
              const isSelected = selected.includes(p.equipoId);
              const rank = idx + 1;
              const cal = p.calificacion ?? 0;
              return (
                <button
                  key={p.equipoId}
                  onClick={() => toggleSelected(p.equipoId)}
                  className={`group flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all text-left ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-500/60 ring-1 ring-blue-500/40'
                      : 'bg-slate-800 border-slate-700/50 hover:border-slate-500'
                  }`}
                  title={`${p.name} · ${p.roleName || '—'} · calif. ${cal.toFixed(2)}`}
                >
                  <Avatar name={p.name} image={p.image} size={26} />
                  <span className="text-xs text-slate-400 tabular-nums">#{rank}</span>
                  <span className="text-sm text-slate-200 truncate max-w-32">{p.name}</span>
                  <span className={`text-sm font-bold tabular-nums ${calificacionColor(cal)}`}>{cal.toFixed(2)}</span>
                  {isSelected && <X className="w-3.5 h-3.5 text-blue-300" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nadie capturó evaluación en este período / filtro.</p>
        )}
      </div>

      {/* Radar overlay */}
      {selectedPeople.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-medium text-slate-200">Radar comparativo</h3>
              <GlossaryTooltip id="comparativa-radar" />
            </div>
            <button onClick={() => setSelected([])} className="text-xs text-slate-400 hover:text-slate-200">
              Limpiar selección
            </button>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                {selectedPeople.map((p, i) => (
                  <Radar
                    key={p.equipoId}
                    name={p.name}
                    dataKey={p.name}
                    stroke={RADAR_COLORS[i]}
                    fill={RADAR_COLORS[i]}
                    fillOpacity={0.25}
                  />
                ))}
                <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 mb-6">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <h3 className="text-sm font-medium text-slate-200">Tabla por persona</h3>
          <GlossaryTooltip id="comparativa-tabla" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-700/50">
                <SortableTh label="Persona" k="name" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="left" />
                <SortableTh label="Calif." k="calificacion" sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
                {DIMENSIONS.map((d) => (
                  <SortableTh key={d.key} label={d.label} k={d.key} sortKey={sortKey} sortDir={sortDir} onClick={setSort} align="right" />
                ))}
                <th className="text-right py-2 px-3 font-medium">Histórico</th>
                {canManage && <th className="text-right py-2 px-3 font-medium">Acción</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const cal = p.calificacion;
                const hasInPeriod = p.scores != null;
                return (
                  <tr
                    key={p.equipoId}
                    className={`border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer ${
                      selected.includes(p.equipoId) ? 'bg-blue-500/5' : ''
                    }`}
                    onClick={() => toggleSelected(p.equipoId)}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={p.name} image={p.image} size={28} />
                        <div className="min-w-0">
                          <a
                            href={`/persona/${p.equipoId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-200 hover:text-blue-300 truncate block"
                          >
                            {p.name}
                          </a>
                          <p className="text-[10px] text-slate-500">{p.roleName || '—'} · {p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`py-2 px-3 text-right font-bold tabular-nums ${cal != null ? calificacionColor(cal) : 'text-slate-600'}`}>
                      {cal != null ? cal.toFixed(2) : '—'}
                    </td>
                    {DIMENSIONS.map((d) => {
                      const v = p.scores?.[d.key];
                      return (
                        <td key={d.key} className={`py-2 px-3 text-right tabular-nums ${v != null ? calificacionColor(v) : 'text-slate-600'}`}>
                          {v ?? '—'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right text-xs text-slate-500">
                      {p.evalCount > 0 ? `${p.evalCount} eval` : '—'}
                    </td>
                    {canManage && (
                      <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {hasInPeriod ? (
                          <button
                            onClick={() => setEditing(p)}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-300 px-2 py-1 rounded"
                            title={`Editar evaluación de ${p.name} en ${periodo}`}
                          >
                            <Pencil className="w-3 h-3" /> Editar
                          </button>
                        ) : (
                          <button
                            onClick={() => setCreatingFor(p)}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-300 px-2 py-1 rounded"
                            title={`Capturar evaluación para ${p.name} en ${periodo}`}
                          >
                            <Plus className="w-3 h-3" /> Capturar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(editing || creatingFor) && (() => {
        const target = editing ?? creatingFor!;
        const initial = editing
          ? {
              periodo,
              scores: editing.scores!,
              notas: editing.notas ?? '',
            }
          : null;
        return (
          <EvaluacionEditModal
            person={{
              equipoId: target.equipoId,
              name: target.name,
              image: target.image,
              knownPeriods: target.knownPeriods,
            }}
            initial={initial}
            onClose={() => { setEditing(null); setCreatingFor(null); }}
            onSaved={load}
          />
        );
      })()}
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  align: 'left' | 'right';
}) {
  const active = sortKey === k;
  const dirIcon = active ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : null;
  return (
    <th
      className={`py-2 px-3 cursor-pointer hover:text-slate-200 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onClick(k)}
    >
      <span className={`inline-flex items-center gap-1 ${active ? 'text-blue-300' : ''}`}>
        {label}{dirIcon}
      </span>
    </th>
  );
}
