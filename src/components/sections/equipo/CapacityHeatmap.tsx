import { useMemo, useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown, Check, AlertTriangle, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import type { TareaRecord } from '../../../utils/dataTransforms';
import { isTareaDone } from '../../../utils/dataTransforms';
import { usePersistedFilters } from '../../../hooks/usePersistedFilters';
import Avatar from '../../ui/Avatar';
import GlossaryTooltip from '../../ui/GlossaryTooltip';

const DAY = 86400000;
const WINDOW_OPTIONS = [4, 8, 12] as const;
const VELOCITY_WINDOW_WEEKS = 8;

type SortBy = 'overload' | 'velocity' | 'name' | 'pending';
type CapStatus = 'empty' | 'unknown' | 'under' | 'fit' | 'tight' | 'over' | 'critical';

interface CapacityFilters {
  window: number;
  sortBy: SortBy;
  showIdle: boolean;
}

const DEFAULT_FILTERS: CapacityFilters = {
  window: 8,
  sortBy: 'overload',
  showIdle: false,
};

const STATUS_BG: Record<CapStatus, string> = {
  empty: 'bg-slate-800/30',
  unknown: 'bg-slate-600/30',
  under: 'bg-teal-500/15',
  fit: 'bg-green-500/30',
  tight: 'bg-yellow-500/40',
  over: 'bg-orange-500/60',
  critical: 'bg-red-500/75',
};

const STATUS_TEXT: Record<CapStatus, string> = {
  empty: 'text-slate-700',
  unknown: 'text-slate-300',
  under: 'text-teal-200',
  fit: 'text-green-100',
  tight: 'text-yellow-100',
  over: 'text-orange-50',
  critical: 'text-white',
};

const STATUS_LABEL: Record<CapStatus, string> = {
  empty: 'Sin carga',
  unknown: 'Sin velocidad histórica',
  under: 'Subutilizada',
  fit: 'Carga adecuada',
  tight: 'Carga ajustada',
  over: 'Sobrecarga',
  critical: 'Crítico',
};

const SORT_LABEL: Record<SortBy, string> = {
  overload: 'Sobrecarga',
  velocity: 'Velocidad',
  name: 'Nombre',
  pending: 'Pendiente',
};

function mondayOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function cellStatus(value: number, velocity: number): CapStatus {
  if (value === 0) return 'empty';
  if (velocity === 0) return 'unknown';
  const r = value / velocity;
  if (r < 0.5) return 'under';
  if (r < 0.9) return 'fit';
  if (r < 1.3) return 'tight';
  if (r < 1.8) return 'over';
  return 'critical';
}

interface CapCell {
  weekStart: number;
  label: string;
  isPast: boolean;
  isCurrent: boolean;
  pending: number;
  delivered: number;
  pendingTasks: number;
  deliveredTasks: number;
  status: CapStatus;
  displayValue: number;
}

interface CapRow {
  personId: string;
  fullName: string;
  image: string | null;
  velocity: number;
  totalPending: number;
  overduePending: number;
  weeksToClear: number | null;
  cells: CapCell[];
  overloadCount: number;
}

export interface EquipoMember {
  id: string;
  fullName: string;
  image: string | null;
  active: boolean;
  roleName?: string;
  title?: string;
}

interface Props {
  tareas: TareaRecord[];
  equipo: EquipoMember[];
}

/**
 * Heatmap de capacidad del equipo (NAV-74 + iteración post-ficha).
 * Filas = personas activas, columnas = semanas. Cada celda muestra puntos
 * (delivered en pasado, pending en futuro) coloreados según el ratio
 * value/velocity. Permite ver de un vistazo quién está sobrecargado o
 * subutilizado en el horizonte cercano.
 */
export default function CapacityHeatmap({ tareas, equipo }: Props) {
  const { state: filters, setState: setFilters, hydrated } = usePersistedFilters<CapacityFilters>(
    'equipo-capacidad',
    DEFAULT_FILTERS,
  );

  const { weeks, rows, summary } = useMemo(() => {
    const today = Date.now();
    const todayMonday = mondayOf(today);
    const totalWeeks = filters.window;
    const pastWeeks = Math.max(1, Math.floor(totalWeeks * 0.25));
    const firstWeekStart = todayMonday - pastWeeks * 7 * DAY;

    const weeks = Array.from({ length: totalWeeks }, (_, i) => {
      const start = firstWeekStart + i * 7 * DAY;
      return {
        start,
        label: new Date(start).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        isPast: i < pastWeeks,
        isCurrent: i === pastWeeks,
      };
    });
    const weekStartIdx = new Map(weeks.map((w, i) => [w.start, i] as const));

    const velocityStart = todayMonday - VELOCITY_WINDOW_WEEKS * 7 * DAY;
    const byPerson = new Map<string, TareaRecord[]>();
    for (const t of tareas) {
      const pid = t.asignadoId;
      if (!pid) continue;
      if (!byPerson.has(pid)) byPerson.set(pid, []);
      byPerson.get(pid)!.push(t);
    }

    const rows: CapRow[] = [];
    for (const person of equipo) {
      if (!person.active) continue;
      const tasks = byPerson.get(person.id) || [];

      // Velocidad histórica (8 semanas) = Σpts cerrados / # semanas con entregas
      const weekDelivery = new Map<number, number>();
      for (const t of tasks) {
        if (!isTareaDone(t.estatus)) continue;
        const fr = Date.parse(t.finReal || '');
        if (isNaN(fr) || fr < velocityStart) continue;
        const w = mondayOf(fr);
        weekDelivery.set(w, (weekDelivery.get(w) || 0) + (t.puntos || 0));
      }
      const velocity = weekDelivery.size > 0
        ? [...weekDelivery.values()].reduce((s, v) => s + v, 0) / weekDelivery.size
        : 0;

      const cellsRaw: Omit<CapCell, 'status' | 'displayValue'>[] = weeks.map((wk) => ({
        weekStart: wk.start,
        label: wk.label,
        isPast: wk.isPast,
        isCurrent: wk.isCurrent,
        pending: 0,
        delivered: 0,
        pendingTasks: 0,
        deliveredTasks: 0,
      }));

      let totalPending = 0;
      let overduePending = 0;
      for (const t of tasks) {
        const pts = t.puntos || 0;
        const status = t.estatus?.toLowerCase() || '';
        const done = isTareaDone(t.estatus);
        const cancelled = status.includes('cancelad');

        if (done) {
          const fr = Date.parse(t.finReal || '');
          if (!isNaN(fr)) {
            const idx = weekStartIdx.get(mondayOf(fr));
            if (idx !== undefined) {
              cellsRaw[idx].delivered += pts;
              cellsRaw[idx].deliveredTasks += 1;
            }
          }
        } else if (!cancelled) {
          totalPending += pts;
          const fe = Date.parse(t.finEstimado || '');
          if (!isNaN(fe)) {
            const wkStart = mondayOf(fe);
            if (wkStart < todayMonday) {
              // Overdue: cae al cubo de la semana actual
              overduePending += pts;
              const idx = weekStartIdx.get(todayMonday);
              if (idx !== undefined) {
                cellsRaw[idx].pending += pts;
                cellsRaw[idx].pendingTasks += 1;
              }
            } else {
              const idx = weekStartIdx.get(wkStart);
              if (idx !== undefined) {
                cellsRaw[idx].pending += pts;
                cellsRaw[idx].pendingTasks += 1;
              }
            }
          }
        }
      }

      const cells: CapCell[] = cellsRaw.map((c) => {
        const displayValue = c.isPast ? c.delivered : c.pending;
        return { ...c, displayValue, status: cellStatus(displayValue, velocity) };
      });
      const overloadCount = cells.filter((c) => c.status === 'over' || c.status === 'critical').length;
      const weeksToClear = velocity > 0 ? totalPending / velocity : null;

      rows.push({
        personId: person.id,
        fullName: person.fullName,
        image: person.image,
        velocity,
        totalPending,
        overduePending,
        weeksToClear,
        cells,
        overloadCount,
      });
    }

    const filteredRows = filters.showIdle
      ? rows
      : rows.filter((r) => r.velocity > 0 || r.totalPending > 0 || r.cells.some((c) => c.delivered > 0));

    filteredRows.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.fullName.localeCompare(b.fullName);
        case 'velocity':
          return b.velocity - a.velocity;
        case 'pending':
          return b.totalPending - a.totalPending;
        case 'overload':
        default:
          if (a.overloadCount !== b.overloadCount) return b.overloadCount - a.overloadCount;
          return b.totalPending - a.totalPending;
      }
    });

    const summary = {
      total: filteredRows.length,
      overloaded: filteredRows.filter((r) => r.overloadCount > 0).length,
      under: filteredRows.filter((r) => r.velocity > 0 && r.cells.every((c) => c.status === 'under' || c.status === 'empty')).length,
      overdue: filteredRows.reduce((s, r) => s + r.overduePending, 0),
    };

    return { weeks, rows: filteredRows, summary };
  }, [tareas, equipo, filters]);

  return (
    <div className="space-y-4">
      {/* Strip de resumen + filtros */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-0">
          <SummaryStat
            icon={Activity}
            value={summary.total}
            label="Personas analizadas"
            color="text-blue-400"
          />
          <SummaryStat
            icon={AlertTriangle}
            value={summary.overloaded}
            label="Con sobrecarga"
            color={summary.overloaded > 0 ? 'text-orange-400' : 'text-slate-400'}
            highlight={summary.overloaded > 0}
          />
          <SummaryStat
            icon={TrendingDown}
            value={summary.under}
            label="Subutilizadas"
            color={summary.under > 0 ? 'text-teal-400' : 'text-slate-400'}
          />
          <SummaryStat
            icon={AlertCircle}
            value={summary.overdue}
            label="Pts vencidos"
            color={summary.overdue > 0 ? 'text-red-400' : 'text-slate-400'}
            highlight={summary.overdue > 0}
            suffix=" pts"
          />
        </div>
        {hydrated && (
          <CapacityFilterMenu
            filters={filters}
            onChange={(next) => setFilters(() => next)}
          />
        )}
      </div>

      {/* Leyenda */}
      <Legend />

      {/* Heatmap */}
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-medium text-slate-300">Capacidad por persona</h3>
        <GlossaryTooltip id="equipo-capacity-heatmap" />
      </div>
      {rows.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-400">
            {filters.showIdle
              ? 'Sin personas activas en el equipo.'
              : 'Sin personas con carga ni velocidad en el período. Activa "Mostrar personas sin carga" para ver el resto.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-x-auto">
          <div className="min-w-190">
            <HeatmapHeader weeks={weeks} />
            <div className="divide-y divide-slate-700/30">
              {rows.map((row) => (
                <HeatmapRow key={row.personId} row={row} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeatmapHeader({ weeks }: { weeks: { start: number; label: string; isPast: boolean; isCurrent: boolean }[] }) {
  return (
    <div
      className="grid gap-1 px-3 py-2 border-b border-slate-700/50 bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-wider"
      style={{ gridTemplateColumns: `220px 56px 80px repeat(${weeks.length}, minmax(48px, 1fr))` }}
    >
      <div>Persona</div>
      <div className="text-right" title="Velocidad histórica: puntos/semana cerrados en las últimas 8 semanas">
        Veloc.
      </div>
      <div className="text-right" title="Puntos totales pendientes (no Done, no cancelados) y semanas para limpiarlos al ritmo actual">
        Pendiente
      </div>
      {weeks.map((w) => (
        <div
          key={w.start}
          className={`text-center text-[9px] ${w.isCurrent ? 'text-blue-300 font-semibold' : w.isPast ? 'text-slate-600' : 'text-slate-500'}`}
        >
          {w.label}
        </div>
      ))}
    </div>
  );
}

function HeatmapRow({ row }: { row: CapRow }) {
  return (
    <div
      className="grid gap-1 px-3 py-2 items-center hover:bg-slate-700/20 transition-colors"
      style={{ gridTemplateColumns: `220px 56px 80px repeat(${row.cells.length}, minmax(48px, 1fr))` }}
    >
      <a
        href={`/persona/${row.personId}`}
        className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
      >
        <Avatar name={row.fullName} image={row.image} size={28} />
        <span className="text-xs text-slate-200 truncate">{row.fullName}</span>
      </a>
      <div className="text-right text-xs font-medium text-slate-300">
        {row.velocity > 0 ? row.velocity.toFixed(1) : '—'}
      </div>
      <div className="text-right">
        <div className="text-xs font-medium text-slate-200">{row.totalPending}</div>
        {row.weeksToClear !== null && (
          <div className="text-[9px] text-slate-500">{row.weeksToClear.toFixed(1)} sem</div>
        )}
        {row.overduePending > 0 && (
          <div className="text-[9px] text-red-400">{row.overduePending} venc</div>
        )}
      </div>
      {row.cells.map((c, i) => {
        const r = row.velocity > 0 ? c.displayValue / row.velocity : 0;
        const ratioStr = row.velocity > 0 ? `${(r * 100).toFixed(0)}% de velocidad` : 'velocidad desconocida';
        const title = [
          `${c.label} · ${STATUS_LABEL[c.status]}`,
          c.isPast
            ? `Entregado: ${c.delivered} pts (${c.deliveredTasks} tareas)`
            : `Pendiente: ${c.pending} pts (${c.pendingTasks} tareas)`,
          row.velocity > 0 ? `Velocidad: ${row.velocity.toFixed(1)} pts/sem · ${ratioStr}` : 'Sin entregas históricas',
        ].join('\n');
        return (
          <div
            key={i}
            title={title}
            className={`h-10 rounded flex items-center justify-center text-[11px] font-medium ${STATUS_BG[c.status]} ${STATUS_TEXT[c.status]} ${c.isCurrent ? 'ring-1 ring-blue-400/40' : ''} cursor-help`}
          >
            {c.displayValue > 0 ? c.displayValue : ''}
          </div>
        );
      })}
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  value,
  label,
  color,
  highlight = false,
  suffix = '',
}: {
  icon: typeof Activity;
  value: number;
  label: string;
  color: string;
  highlight?: boolean;
  suffix?: string;
}) {
  return (
    <div className={`bg-slate-800 border rounded-xl p-3 flex items-center gap-3 ${highlight ? 'border-orange-500/30' : 'border-slate-700/50'}`}>
      <Icon className={`w-5 h-5 shrink-0 ${color}`} />
      <div>
        <p className={`text-lg font-bold ${color}`}>{value}{suffix}</p>
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Legend() {
  const entries: { status: CapStatus; range: string }[] = [
    { status: 'under', range: '< 50%' },
    { status: 'fit', range: '50-90%' },
    { status: 'tight', range: '90-130%' },
    { status: 'over', range: '130-180%' },
    { status: 'critical', range: '> 180%' },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
      <div className="flex items-center gap-1.5">
        <span>Carga vs velocidad</span>
        <GlossaryTooltip id="equipo-capacity-leyenda" />
      </div>
      <span className="text-slate-700">·</span>
      {entries.map((e) => (
        <div key={e.status} className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded ${STATUS_BG[e.status]}`} />
          <span>{STATUS_LABEL[e.status]} ({e.range})</span>
        </div>
      ))}
      <span className="text-slate-700">·</span>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-slate-600/30" />
        <span>Sin velocidad histórica</span>
      </div>
    </div>
  );
}

function CapacityFilterMenu({
  filters,
  onChange,
}: {
  filters: CapacityFilters;
  onChange: (next: CapacityFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dirty =
    filters.window !== DEFAULT_FILTERS.window ||
    filters.sortBy !== DEFAULT_FILTERS.sortBy ||
    filters.showIdle !== DEFAULT_FILTERS.showIdle;

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

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
          dirty
            ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
        }`}
        title="Filtros del heatmap"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filtros
        {dirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Ventana</label>
            <div className="flex gap-1">
              {WINDOW_OPTIONS.map((w) => (
                <button
                  key={w}
                  onClick={() => onChange({ ...filters, window: w })}
                  className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    filters.window === w
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  {w} sem
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Ordenar por</label>
            <div className="grid grid-cols-2 gap-1">
              {(Object.keys(SORT_LABEL) as SortBy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ ...filters, sortBy: s })}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    filters.sortBy === s
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  {SORT_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onChange({ ...filters, showIdle: !filters.showIdle })}
            className="flex items-center gap-2 w-full text-left text-[12px] text-slate-300 hover:text-white transition-colors"
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                filters.showIdle ? 'bg-blue-500 border-blue-500' : 'bg-slate-800 border-slate-600'
              }`}
            >
              {filters.showIdle && <Check className="w-3 h-3 text-white" />}
            </span>
            Mostrar personas sin carga
          </button>
          {dirty && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="w-full text-[10px] text-slate-500 hover:text-slate-300 text-center pt-1 transition-colors border-t border-slate-700"
            >
              Restaurar predeterminados
            </button>
          )}
        </div>
      )}
    </div>
  );
}
