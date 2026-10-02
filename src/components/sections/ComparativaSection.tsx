import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Trophy, X, Star, Pencil, Plus } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import Header from '../layout/Header';
import Avatar from '../ui/Avatar';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { usePermissions } from '../../hooks/usePermissions';
import EvaluacionEditModal from './comparativa/EvaluacionEditModal';
import {
  DIMENSIONS,
  DIMENSION_KEYS,
  calcCalificacion,
  calificacionColor,
  comparePeriodos,
  quarterOf,
  type Dimension,
  type DimensionScores,
} from '../../utils/evaluacion';
import { roleCategory, CATEGORY_ORDER, type TeamCategory } from '../../utils/roleCategory';

/**
 * Vista admin de comparativa (NAV-78, Modo A). Combina P1 + P2:
 *  - Chips arriba: avatar + calificación, orden desc. (P1)
 *  - Multi-select hasta 3 personas → radar overlay 7 ejes. (P1)
 *  - Tabla sortable con dimensiones individuales + calificación. (P2)
 *  - Filtro por categoría de rol (Tecnología / Management / etc.) — resuelve
 *    el "PM vs PM, DEV vs DEV" sin perder UX, Servicio, Dirección.
 *
 * Gateada por `action:evaluacion:view-all` en middleware + `/api/evaluaciones`.
 */

interface EvaluacionRow {
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

interface EquipoRow {
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

export default function ComparativaSection() {
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
  }>('comparativa', {
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
      const evData = (await evRes.json()) as { evaluaciones: EvaluacionRow[] };
      const eqData = (await eqRes.json()) as { equipo: EquipoRow[] };
      setEvaluaciones(evData.evaluaciones);
      setEquipo(eqData.equipo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Períodos disponibles (los que tienen al menos una fila) + el actual.
  const periodOptions = useMemo(() => {
    const set = new Set<string>([quarterOf()]);
    for (const e of evaluaciones) set.add(e.periodo);
    return [...set].sort((a, b) => comparePeriodos(b, a));
  }, [evaluaciones]);

  // Agregado por persona, para el período seleccionado. Si no hay evaluación
  // en ese período, la persona aparece con scores=null (calificación "—").
  const peoplePeriod = useMemo<PersonAggregate[]>(() => {
    const byEquipo = new Map<string, EvaluacionRow[]>();
    for (const e of evaluaciones) {
      if (!byEquipo.has(e.equipoId)) byEquipo.set(e.equipoId, []);
      byEquipo.get(e.equipoId)!.push(e);
    }
    const out: PersonAggregate[] = [];
    for (const m of equipo) {
      if (!m.active) continue;
      const rows = byEquipo.get(m.id) ?? [];
      const inPeriod = rows.find((r) => r.periodo === periodo) ?? null;
      const scores: DimensionScores | null = inPeriod
        ? DIMENSION_KEYS.reduce(
            (acc, k) => ({ ...acc, [k]: inPeriod[k] as number }),
            {} as DimensionScores,
          )
        : null;
      out.push({
        equipoId: m.id,
        name: m.tag || m.fullName || m.nickname || m.id,
        image: m.image,
        roleId: m.roleId,
        roleName: m.roleName,
        category: roleCategory(m.roleId),
        latestPeriodo: rows.length > 0
          ? rows.map((r) => r.periodo).sort(comparePeriodos).at(-1) ?? null
          : null,
        scores,
        notas: inPeriod?.notas ?? null,
        calificacion: scores ? calcCalificacion(scores) : null,
        evalCount: rows.length,
        knownPeriods: rows.map((r) => r.periodo).sort(comparePeriodos),
      });
    }
    return out;
  }, [evaluaciones, equipo, periodo]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return peoplePeriod.filter((p) => {
      if (categoria !== 'Todos' && p.category !== categoria) return false;
      if (term && !p.name.toLowerCase().includes(term)) return false;
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
      <div>
        <Header title="Comparativa" />
        <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-40" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <Header title="Comparativa" onRefresh={load} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <p className="text-red-400 font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  const totalActive = peoplePeriod.length;
  const captured = peoplePeriod.filter((p) => p.scores).length;

  return (
    <div>
      <Header title="Comparativa" onRefresh={load} />
      <p className="text-xs text-slate-500 -mt-2 mb-4">
        Auto-evaluaciones trimestrales · sólo visible para admin
        {canManage && ' · puedes capturar/editar evaluaciones de cualquier miembro'}
      </p>

      {/* Controles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 mb-1 block">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {periodOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 mb-1 block">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as TeamCategory | 'Todos')}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="Todos">Todos</option>
            {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-slate-500 mb-1 block">Buscar persona</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
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
