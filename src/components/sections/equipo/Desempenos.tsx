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
  DIMENSION_KEYS,
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

interface PersonAggregate {
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
  const setSort = useCallback((k: SortKey) => {
    setPersisted((p) => {
      if (p.sortKey === k) return { ...p, sortDir: p.sortDir === 'asc' ? 'desc' : 'asc' };
      return { ...p, sortKey: k, sortDir: 'desc' };
    });
  }, [setPersisted]);

  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // NAV-78: modal de captura/edición para admins
  const { can } = usePermissions();
  const canManage = can('action:evaluacion:manage');
  const [modalTarget, setModalTarget] = useState<{
    person: { equipoId: string; name: string; image: string | null; knownPeriods: string[] };
    initial?: { periodo: string; scores: DimensionScores; notas: string } | null;
  } | null>(null);

  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rEval, rEq] = await Promise.all([
        fetch('/api/evaluaciones', { credentials: 'same-origin' }),
        fetch('/api/equipo', { credentials: 'same-origin' }),
      ]);
      if (rEval.status === 401 || rEq.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!rEval.ok) throw new Error(`HTTP ${rEval.status} al cargar evaluaciones`);
      if (!rEq.ok) throw new Error(`HTTP ${rEq.status} al cargar equipo`);
      const dEval = await rEval.json();
      const dEq = await rEq.json();
      setEvaluaciones(dEval.evaluaciones ?? []);
      setEquipo(dEq.equipo ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lista única de periodos (orden desc: Q1 2026, Q4 2025...)
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

  // Construimos lista de personas (sólo activas) con su eval del periodo seleccionado
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

  // Personas con evaluación en este periodo ordenadas desc por calificación (para chips)
  const chips = useMemo(() => {
    return filtered
      .filter((p): p is PersonAggregate & { calificacion: number } => p.calificacion != null)
      .sort((a, b) => b.calificacion - a.calificacion);
  }, [filtered]);

  // Filas de la tabla con sort
  const sortedTable = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      if (sortKey === 'name') {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (sortKey === 'calificacion') {
        va = a.calificacion ?? -Infinity;
        vb = b.calificacion ?? -Infinity;
      } else {
        va = a.scores ? a.scores[sortKey] : -Infinity;
        vb = b.scores ? b.scores[sortKey] : -Infinity;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  // Datos para el radar overlay (máx 3 personas seleccionadas con eval en el periodo)
  const radarData = useMemo(() => {
    const selectedPeople = selected
      .map((id) => peoplePeriod.find((p) => p.equipoId === id))
      .filter((p): p is PersonAggregate => !!p && p.scores != null);
    if (selectedPeople.length === 0) return null;

    return {
      people: selectedPeople,
      rows: DIMENSION_KEYS.map((k) => {
        const row: Record<string, string | number> = {
          dimension: DIMENSIONS[k].label,
        };
        selectedPeople.forEach((p) => {
          row[p.equipoId] = p.scores ? p.scores[k] : 0;
        });
        return row;
      }),
    };
  }, [selected, peoplePeriod]);

  // Conteos
  const totalActive = peoplePeriod.length;
  const captured = peoplePeriod.filter((p) => p.scores != null).length;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar desempeños</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={loadData}
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
      {/* Barra de filtros */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Período */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Período
            </span>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {periodos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
              Categoría
            </span>
            {(['Todos', ...CATEGORY_ORDER] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  categoria === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre o apodo…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs text-slate-500">
          {captured} de {totalActive} personas se autoevaluaron en {periodo}
          {filtered.length !== peoplePeriod.length && ` · ${filtered.length} en este filtro`}
        </p>
        <button onClick={clearPersisted} className="text-xs text-slate-400 hover:text-slate-200">
          Restablecer filtros
        </button>
      </div>

      {/* Chips ordenadas */}
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
                  className={`group flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 border-blue-500/60 ring-1 ring-blue-500/40'
                      : 'bg-slate-800 border-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <Avatar name={p.name} image={p.image} size="sm" />
                  <span className="text-xs text-slate-500 font-mono">#{rank}</span>
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white">
                    {p.name}
                  </span>
                  <span className={`text-xs font-bold ${calificacionColor(cal)}`}>
                    {cal.toFixed(1)}
                  </span>
                  {isSelected && <X className="w-3 h-3 text-blue-400 ml-0.5" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Nadie en este filtro tiene evaluación capturada para {periodo}.
          </p>
        )}
      </div>

      {/* Radar overlay (si hay selección con scores) */}
      {radarData && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-slate-200">Radar comparativo</h3>
              <GlossaryTooltip id="comparativa-radar" />
            </div>
            <button
              onClick={() => setSelected([])}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Limpiar selección
            </button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData.rows} outerRadius="75%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="dimension"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                {radarData.people.map((p, idx) => (
                  <Radar
                    key={p.equipoId}
                    name={p.name}
                    dataKey={p.equipoId}
                    stroke={RADAR_COLORS[idx % RADAR_COLORS.length]}
                    fill={RADAR_COLORS[idx % RADAR_COLORS.length]}
                    fillOpacity={0.25}
                  />
                ))}
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(val) => <span className="text-xs text-slate-300">{val}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla detallada */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-slate-200">Detalle por persona</h3>
            <GlossaryTooltip id="comparativa-tabla" />
          </div>
          <span className="text-xs text-slate-500">{sortedTable.length} personas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700/50">
              <tr>
                <th
                  onClick={() => setSort('name')}
                  className="px-4 py-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    Persona
                    {sortKey === 'name' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => setSort('calificacion')}
                  className="px-3 py-3 cursor-pointer hover:text-slate-200 text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    Calificación
                    {sortKey === 'calificacion' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                {DIMENSION_KEYS.map((k) => (
                  <th
                    key={k}
                    onClick={() => setSort(k)}
                    className="px-3 py-3 cursor-pointer hover:text-slate-200 text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      {DIMENSIONS[k].label}
                      {sortKey === k && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Histórico</th>
                {canManage && <th className="px-3 py-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {sortedTable.map((p) => {
                const isSelected = selected.includes(p.equipoId);
                const cal = p.calificacion;
                return (
                  <tr
                    key={p.equipoId}
                    onClick={() => toggleSelected(p.equipoId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-500/10 hover:bg-blue-500/15'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} image={p.image} size="sm" />
                        <div>
                          <p className="font-medium text-slate-200">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.roleName || 'Sin rol'} · {p.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {cal != null ? (
                        <span className={`font-bold ${calificacionColor(cal)}`}>
                          {cal.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    {DIMENSION_KEYS.map((k) => {
                      const score = p.scores ? p.scores[k] : null;
                      return (
                        <td key={k} className="px-3 py-3 text-right font-mono">
                          {score != null ? (
                            <span className={calificacionColor(score)}>{score}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right text-slate-400">
                      {p.evalCount > 0 ? `${p.evalCount} capturas` : '—'}
                    </td>
                    {canManage && (
                      <td
                        className="px-3 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setModalTarget({
                              person: {
                                equipoId: p.equipoId,
                                name: p.name,
                                image: p.image,
                                knownPeriods: p.knownPeriods,
                              },
                              initial: p.scores
                                ? {
                                    periodo,
                                    scores: p.scores,
                                    notas: p.notas ?? '',
                                  }
                                : null,
                            })
                          }
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title={p.scores ? `Editar evaluación de ${p.name}` : `Capturar evaluación para ${p.name}`}
                        >
                          {p.scores ? (
                            <Pencil className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalTarget && (
        <EvaluacionEditModal
          person={modalTarget.person}
          initial={modalTarget.initial}
          onClose={() => setModalTarget(null)}
          onSaved={() => {
            setModalTarget(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

