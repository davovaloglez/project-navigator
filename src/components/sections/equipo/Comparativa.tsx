import { useMemo, useState, useRef, useEffect } from 'react';
import { Plus, X, Search, Trophy } from 'lucide-react';
import type { ProjectRecord, TareaRecord, CostoRecord } from '../../../utils/dataTransforms';
import { isTareaDone } from '../../../utils/dataTransforms';
import { calcHealthScore } from '../../../utils/healthScore';
import { estimatePersonCost, formatMoney } from '../../../utils/costEngine';
import Avatar from '../../ui/Avatar';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Tooltip } from 'recharts';

const DAY = 86400000;
const VELOCITY_WEEKS = 8;
const MAX_SELECTED = 3;
const PERSON_COLORS = ['#60a5fa', '#4ade80', '#fbbf24'];

export interface ComparativaMember {
  id: string;
  fullName: string;
  image: string | null;
  active: boolean;
  roleName?: string;
  title?: string;
  department?: string;
}

interface Props {
  equipo: ComparativaMember[];
  projects: ProjectRecord[];
  tareas: TareaRecord[];
  costos: CostoRecord[];
  costosForbidden: boolean;
}

interface PersonMetrics {
  // Throughput
  totalProjects: number;
  completedProjects: number;
  donePoints: number;
  velocity: number;
  tasksCompletadas: number;
  // Calidad
  avgHealth: number;
  onTimeRate: number;
  completionRate: number;
  tasksAtrasadas: number;
  avgProgress: number;
  // Carga
  atRisk: number;
  tasksActivas: number;
  pendingPoints: number;
  // Costo
  monthlyCost: number;
  hourlyCost: number;
  // Radar
  capacityScore: number;
}

function mondayOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function computeMetrics(
  personId: string,
  projects: ProjectRecord[],
  tareas: TareaRecord[],
  costos: CostoRecord[],
): PersonMetrics {
  const personProjects = projects.filter(
    (p) =>
      p.arquitectoIds.includes(personId) ||
      p.pmIds.includes(personId) ||
      p.devIds.includes(personId) ||
      p.poIds.includes(personId) ||
      p.sqaIds.includes(personId),
  );
  const personTareas = tareas.filter((t) => t.asignadoId === personId);

  const total = personProjects.length;
  const done = personProjects.filter((p) => p.estatus === 'Done');
  const atRisk = personProjects.filter(
    (p) => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical',
  ).length;
  const avgProgress = total > 0
    ? Math.round((personProjects.reduce((s, p) => s + p.progreso, 0) / total) * 100)
    : 0;
  const avgHealth = total > 0
    ? Math.round(personProjects.reduce((s, p) => s + calcHealthScore(p).score, 0) / total)
    : 0;
  const completionRate = total > 0 ? Math.round((done.length / total) * 100) : 0;
  const donePoints = done.reduce((s, p) => s + p.puntos, 0);
  const withDates = done.filter((p) => p.finReal && p.finEstimado);
  const onTime = withDates.filter((p) => new Date(p.finReal) <= new Date(p.finEstimado));
  const onTimeRate = withDates.length > 0
    ? Math.round((onTime.length / withDates.length) * 100)
    : -1;

  // Task stats
  let tasksCompletadas = 0;
  let tasksActivas = 0;
  let tasksAtrasadas = 0;
  let pendingPoints = 0;
  for (const t of personTareas) {
    const s = t.estatus?.toLowerCase() || '';
    if (isTareaDone(t.estatus)) {
      tasksCompletadas++;
    } else if (!s.includes('cancelad')) {
      pendingPoints += t.puntos ?? 0;
      if (
        s.includes('in progress') ||
        s.includes('review') ||
        s.includes('testing') ||
        s.includes('change') ||
        s.includes('pending') ||
        s.includes('pendiente')
      ) {
        tasksActivas++;
      }
    }
    if (t.salud?.toLowerCase().includes('atraz')) tasksAtrasadas++;
  }

  // Velocity
  const today = Date.now();
  const velocityStart = today - VELOCITY_WEEKS * 7 * DAY;
  const weekMap = new Map<number, number>();
  for (const t of personTareas) {
    if (!isTareaDone(t.estatus)) continue;
    const fr = Date.parse(t.finReal || '');
    if (isNaN(fr) || fr < velocityStart) continue;
    weekMap.set(mondayOf(fr), (weekMap.get(mondayOf(fr)) || 0) + (t.puntos || 0));
  }
  const velocity = weekMap.size > 0
    ? [...weekMap.values()].reduce((s, v) => s + v, 0) / weekMap.size
    : 0;

  const cost = estimatePersonCost(personId, projects, costos);
  const capacityScore = Math.min(100, total * 15);

  return {
    totalProjects: total,
    completedProjects: done.length,
    donePoints,
    velocity,
    tasksCompletadas,
    avgHealth,
    onTimeRate,
    completionRate,
    tasksAtrasadas,
    avgProgress,
    atRisk,
    tasksActivas,
    pendingPoints,
    monthlyCost: cost.monthlyCost,
    hourlyCost: cost.costoHora,
    capacityScore,
  };
}

type Direction = 'higher' | 'lower' | 'neutral';
type Category = 'Throughput' | 'Calidad' | 'Carga' | 'Costo';

interface MetricDef {
  key: string;
  category: Category;
  label: string;
  get: (m: PersonMetrics) => number;
  format: (v: number) => string;
  direction: Direction;
  /** Si la métrica no aplica para este valor (e.g. onTimeRate < 0 = N/A). */
  isNA?: (v: number) => boolean;
}

const METRICS: MetricDef[] = [
  // Throughput
  { key: 'totalProjects', category: 'Throughput', label: 'Proyectos asignados', get: (m) => m.totalProjects, format: (v) => String(v), direction: 'neutral' },
  { key: 'completedProjects', category: 'Throughput', label: 'Proyectos completados', get: (m) => m.completedProjects, format: (v) => String(v), direction: 'higher' },
  { key: 'donePoints', category: 'Throughput', label: 'Pts entregados', get: (m) => m.donePoints, format: (v) => String(v), direction: 'higher' },
  { key: 'velocity', category: 'Throughput', label: 'Velocidad (pts/sem)', get: (m) => m.velocity, format: (v) => v.toFixed(1), direction: 'higher' },
  { key: 'tasksCompletadas', category: 'Throughput', label: 'Tareas completadas', get: (m) => m.tasksCompletadas, format: (v) => String(v), direction: 'higher' },
  // Calidad
  { key: 'avgHealth', category: 'Calidad', label: 'Health score', get: (m) => m.avgHealth, format: (v) => String(v), direction: 'higher' },
  { key: 'onTimeRate', category: 'Calidad', label: 'Puntualidad', get: (m) => m.onTimeRate, format: (v) => `${v}%`, direction: 'higher', isNA: (v) => v < 0 },
  { key: 'completionRate', category: 'Calidad', label: 'Tasa de completación', get: (m) => m.completionRate, format: (v) => `${v}%`, direction: 'higher' },
  { key: 'avgProgress', category: 'Calidad', label: 'Progreso promedio', get: (m) => m.avgProgress, format: (v) => `${v}%`, direction: 'higher' },
  { key: 'tasksAtrasadas', category: 'Calidad', label: 'Tareas atrasadas', get: (m) => m.tasksAtrasadas, format: (v) => String(v), direction: 'lower' },
  // Carga
  { key: 'atRisk', category: 'Carga', label: 'Proyectos en riesgo', get: (m) => m.atRisk, format: (v) => String(v), direction: 'neutral' },
  { key: 'tasksActivas', category: 'Carga', label: 'Tareas activas', get: (m) => m.tasksActivas, format: (v) => String(v), direction: 'neutral' },
  { key: 'pendingPoints', category: 'Carga', label: 'Pts pendientes', get: (m) => m.pendingPoints, format: (v) => String(v), direction: 'neutral' },
  // Costo
  { key: 'monthlyCost', category: 'Costo', label: 'Costo mensual', get: (m) => m.monthlyCost, format: (v) => v > 0 ? formatMoney(v) : '—', direction: 'neutral', isNA: (v) => v <= 0 },
  { key: 'hourlyCost', category: 'Costo', label: 'Costo por hora', get: (m) => m.hourlyCost, format: (v) => v > 0 ? `$${v}/hr` : '—', direction: 'neutral', isNA: (v) => v <= 0 },
];

/**
 * Comparativa side-by-side de 2-3 personas del equipo. Render horizontal:
 * cada fila es una métrica, cada columna una persona. Highlight (★) en la
 * mejor por métrica direccional. Radar arriba para vista de conjunto.
 *
 * Estado de selección es efímero (no persiste entre recargas — la
 * comparativa es típicamente one-shot para una decisión puntual).
 */
export default function Comparativa({ equipo, projects, tareas, costos, costosForbidden }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const equipoById = useMemo(() => new Map(equipo.map((m) => [m.id, m] as const)), [equipo]);
  const selectedMembers = useMemo(
    () => selectedIds.map((id) => equipoById.get(id)).filter((m): m is ComparativaMember => !!m),
    [selectedIds, equipoById],
  );

  const personMetrics = useMemo(
    () => selectedMembers.map((m) => ({ member: m, metrics: computeMetrics(m.id, projects, tareas, costos) })),
    [selectedMembers, projects, tareas, costos],
  );

  const add = (id: string) => setSelectedIds((prev) => (prev.includes(id) || prev.length >= MAX_SELECTED ? prev : [...prev, id]));
  const remove = (id: string) => setSelectedIds((prev) => prev.filter((x) => x !== id));
  const clear = () => setSelectedIds([]);

  const visibleMetrics = useMemo(() => {
    if (costosForbidden || personMetrics.length === 0) {
      return METRICS.filter((m) => m.category !== 'Costo');
    }
    // Si nadie tiene datos de costo, ocultar la categoría
    const anyCost = personMetrics.some(({ metrics }) => metrics.monthlyCost > 0 || metrics.hourlyCost > 0);
    return anyCost ? METRICS : METRICS.filter((m) => m.category !== 'Costo');
  }, [personMetrics, costosForbidden]);

  const grouped = useMemo(() => {
    const map = new Map<Category, MetricDef[]>();
    for (const m of visibleMetrics) {
      const arr = map.get(m.category) || [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return [...map.entries()];
  }, [visibleMetrics]);

  // Radar
  const radarData = useMemo(() => {
    const axes: { metric: string; key: keyof PersonMetrics }[] = [
      { metric: 'Completación', key: 'completionRate' },
      { metric: 'Progreso', key: 'avgProgress' },
      { metric: 'Salud', key: 'avgHealth' },
      { metric: 'Puntualidad', key: 'onTimeRate' },
      { metric: 'Capacidad', key: 'capacityScore' },
    ];
    return axes.map((axis) => {
      const row: Record<string, string | number> = { metric: axis.metric };
      for (const { member, metrics } of personMetrics) {
        const raw = metrics[axis.key] as number;
        row[member.id] = raw < 0 ? 0 : raw;
      }
      return row;
    });
  }, [personMetrics]);

  return (
    <div className="space-y-4">
      {/* Header con selectores */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Personas a comparar</h3>
          <GlossaryTooltip id="equipo-comparativa" />
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {selectedMembers.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-2 py-1 rounded-lg border"
              style={{ borderColor: `${PERSON_COLORS[i]}40`, backgroundColor: `${PERSON_COLORS[i]}1a` }}
            >
              <Avatar name={m.fullName} image={m.image} size={20} />
              <span className="text-xs text-slate-200">{m.fullName}</span>
              <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedIds.length < MAX_SELECTED && (
            <PersonPicker
              equipo={equipo}
              excludeIds={selectedIds}
              onPick={add}
            />
          )}
          {selectedIds.length > 0 && (
            <button onClick={clear} className="text-[11px] text-slate-500 hover:text-slate-300">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {selectedMembers.length < 2 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-300 mb-1">
            {selectedMembers.length === 0
              ? 'Selecciona 2 o 3 personas para comparar.'
              : 'Agrega al menos una persona más para empezar a comparar.'}
          </p>
          <p className="text-[11px] text-slate-500">
            Útil para evaluaciones, retroalimentación, asignación de proyectos o decisiones de promoción.
          </p>
        </div>
      ) : (
        <>
          {/* Radar */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <h4 className="text-sm font-medium text-slate-300">Vista de conjunto</h4>
              <GlossaryTooltip id="equipo-comparativa-radar" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {personMetrics.map(({ member }, i) => (
                  <Radar
                    key={member.id}
                    name={member.fullName}
                    dataKey={member.id}
                    stroke={PERSON_COLORS[i]}
                    fill={PERSON_COLORS[i]}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de métricas */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
            {/* Person header row */}
            <div
              className="grid gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/80"
              style={{ gridTemplateColumns: `200px repeat(${personMetrics.length}, 1fr)` }}
            >
              <div />
              {personMetrics.map(({ member }, i) => (
                <div key={member.id} className="flex items-center gap-2 min-w-0">
                  <div className="w-1 h-8 rounded shrink-0" style={{ backgroundColor: PERSON_COLORS[i] }} />
                  <Avatar name={member.fullName} image={member.image} size={32} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{member.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {member.title || member.roleName || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Categories + métricas */}
            {grouped.map(([category, metrics]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-slate-900/40 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/30">
                  {category}
                </div>
                {metrics.map((metric) => (
                  <MetricRow
                    key={metric.key}
                    metric={metric}
                    personMetrics={personMetrics}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MetricRow({
  metric,
  personMetrics,
}: {
  metric: MetricDef;
  personMetrics: { member: ComparativaMember; metrics: PersonMetrics }[];
}) {
  const values = personMetrics.map(({ metrics }) => metric.get(metrics));
  const naFlags = values.map((v) => metric.isNA?.(v) ?? false);
  const validValues = values.filter((_, i) => !naFlags[i]);
  const max = validValues.length > 0 ? Math.max(...validValues) : 0;
  const min = validValues.length > 0 ? Math.min(...validValues) : 0;
  const showBars = max > 0 && personMetrics.length >= 2;

  // Determinar ganadores (puede haber empate)
  const winners = new Set<number>();
  if (metric.direction !== 'neutral' && validValues.length >= 2) {
    const target = metric.direction === 'higher' ? max : min;
    values.forEach((v, i) => {
      if (!naFlags[i] && v === target && validValues.length >= 2 && max !== min) {
        winners.add(i);
      }
    });
  }

  return (
    <div
      className="grid gap-3 px-4 py-3 border-b border-slate-700/20 hover:bg-slate-700/10 transition-colors"
      style={{ gridTemplateColumns: `200px repeat(${personMetrics.length}, 1fr)` }}
    >
      <div className="text-xs text-slate-400 self-center">{metric.label}</div>
      {personMetrics.map(({ member }, i) => {
        const isNA = naFlags[i];
        const value = values[i];
        const display = isNA ? 'N/A' : metric.format(value);
        const widthPct = showBars && !isNA && max > 0 ? Math.max(2, (value / max) * 100) : 0;
        const isWinner = winners.has(i);

        return (
          <div key={member.id} className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-sm font-medium ${isNA ? 'text-slate-500' : 'text-slate-100'}`}>
                {display}
              </span>
              {isWinner && (
                <Trophy
                  className="w-3 h-3 text-amber-400 shrink-0"
                  aria-label={metric.direction === 'higher' ? 'Mayor valor entre los seleccionados' : 'Menor valor entre los seleccionados'}
                />
              )}
            </div>
            {showBars && !isNA && (
              <div className="mt-1 w-full bg-slate-700/40 rounded-full h-1">
                <div
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: PERSON_COLORS[i],
                    opacity: isWinner ? 1 : 0.6,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PersonPicker({
  equipo,
  excludeIds,
  onPick,
}: {
  equipo: ComparativaMember[];
  excludeIds: string[];
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const available = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return equipo
      .filter((m) => m.active && !excludeIds.includes(m.id))
      .filter((m) =>
        !ql ||
        m.fullName.toLowerCase().includes(ql) ||
        m.title?.toLowerCase().includes(ql) ||
        m.roleName?.toLowerCase().includes(ql),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, 40);
  }, [equipo, excludeIds, q]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar persona
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar..."
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {available.length === 0 ? (
              <p className="p-3 text-[11px] text-slate-500 text-center">Sin resultados.</p>
            ) : (
              available.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onPick(m.id);
                    setOpen(false);
                    setQ('');
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left hover:bg-slate-700/40 transition-colors"
                >
                  <Avatar name={m.fullName} image={m.image} size={24} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200 truncate">{m.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {m.title || m.roleName || '—'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
