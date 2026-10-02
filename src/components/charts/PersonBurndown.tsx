import { useMemo, useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SlidersHorizontal, Check, ChevronDown } from 'lucide-react';
import type { ProjectRecord, TareaRecord } from '../../utils/dataTransforms';
import { isActive } from '../../utils/projectStatus';
import { isTareaDone } from '../../utils/dataTransforms';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import ChartCard from './ChartCard';
import { infoFor } from '../../data/glossary';

const DAY = 86400000;
const COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#2dd4bf', '#818cf8', '#e879f9', '#34d399'];
const SIN_PROYECTO_COLOR = '#94a3b8';
const SIN_PROYECTO_KEY = '__sin_proyecto__';
const MAX_IDEAL_LINES = 3;
const DONE_WINDOW_OPTIONS = [30, 60, 90] as const;

interface BurndownFilters {
  includeOrphans: boolean;
  includeDoneRecent: boolean;
  showIdeal: boolean;
  doneWindowDays: number;
}

const DEFAULT_FILTERS: BurndownFilters = {
  includeOrphans: true,
  includeDoneRecent: true,
  showIdeal: true,
  doneWindowDays: 30,
};

function isDefault(f: BurndownFilters): boolean {
  return (
    f.includeOrphans === DEFAULT_FILTERS.includeOrphans &&
    f.includeDoneRecent === DEFAULT_FILTERS.includeDoneRecent &&
    f.showIdeal === DEFAULT_FILTERS.showIdeal &&
    f.doneWindowDays === DEFAULT_FILTERS.doneWindowDays
  );
}

function mondayOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

interface ProjEntry {
  pid: string;
  name: string;
  finEstimado: string;
  total: number;
  items: TareaRecord[];
  isSinProyecto: boolean;
}

interface SeriesItem {
  key: string;
  name: string;
  color: string;
  isIdeal: boolean;
  projIdx?: number;
}

/**
 * Burndown personal (HU NAV-74). Trayectoria de puntos remanentes por
 * proyecto. Filtros configurables (persistidos en `persona-burndown`):
 * incluir bucket "Sin proyecto", incluir Done recientes (ventana 30/60/90 d),
 * mostrar línea ideal. Series individuales se muestran/ocultan vía click en
 * la leyenda nativa de Recharts (efímero, no persistido).
 */
export default function PersonBurndown({ tareas, projects }: { tareas: TareaRecord[]; projects: ProjectRecord[] }) {
  const { state: filters, setState: setFilters, hydrated } = usePersistedFilters<BurndownFilters>(
    'persona-burndown',
    DEFAULT_FILTERS,
  );

  const { rows, series, allFlat } = useMemo(() => {
    const today = Date.now();
    const recentThreshold = today - filters.doneWindowDays * DAY;

    // Proyectos relevantes según filtros.
    const relevantIds = new Set<string>();
    for (const p of projects) {
      if (isActive(p.estatus)) {
        relevantIds.add(p.id);
      } else if (p.estatus === 'Done' && filters.includeDoneRecent) {
        const fr = Date.parse(p.finReal || '');
        if (!isNaN(fr) && fr >= recentThreshold) relevantIds.add(p.id);
      }
    }
    const projById = new Map(projects.map((p) => [p.id, p] as const));

    const byProj = new Map<string, TareaRecord[]>();
    for (const t of tareas) {
      if (!t.puntos || t.puntos <= 0) continue;
      const inRelevant = t.proyectoId && relevantIds.has(t.proyectoId);
      if (inRelevant) {
        if (!byProj.has(t.proyectoId)) byProj.set(t.proyectoId, []);
        byProj.get(t.proyectoId)!.push(t);
      } else if (filters.includeOrphans) {
        if (!byProj.has(SIN_PROYECTO_KEY)) byProj.set(SIN_PROYECTO_KEY, []);
        byProj.get(SIN_PROYECTO_KEY)!.push(t);
      }
    }

    const projEntries: ProjEntry[] = [...byProj.entries()]
      .map(([pid, items]) => ({
        pid,
        name: pid === SIN_PROYECTO_KEY ? 'Sin proyecto' : (projById.get(pid)?.actividad || 'Proyecto'),
        finEstimado: pid === SIN_PROYECTO_KEY ? '' : (projById.get(pid)?.finEstimado || ''),
        total: items.reduce((s, t) => s + (t.puntos || 0), 0),
        items,
        isSinProyecto: pid === SIN_PROYECTO_KEY,
      }))
      .filter((p) => p.total > 0)
      .sort((a, b) => (a.isSinProyecto ? 1 : 0) - (b.isSinProyecto ? 1 : 0) || b.total - a.total)
      .slice(0, 8);

    const dates: number[] = [];
    for (const p of projEntries) {
      for (const t of p.items) {
        const fe = Date.parse(t.finEstimado || '');
        if (!isNaN(fe)) dates.push(fe);
        const fr = Date.parse(t.finReal || '');
        if (!isNaN(fr)) dates.push(fr);
      }
    }
    if (projEntries.length === 0 || dates.length === 0) {
      return { rows: [] as Record<string, number | string>[], series: [] as SeriesItem[], allFlat: false };
    }
    const first = mondayOf(Math.min(Math.min(...dates), today));
    const last = mondayOf(Math.max(Math.max(...dates), today));
    const weeks = Math.min(40, Math.max(2, Math.round((last - first) / (7 * DAY)) + 1));

    const projSeries: SeriesItem[] = projEntries.map((p, i) => ({
      key: `p${i}`,
      name: p.name,
      color: p.isSinProyecto ? SIN_PROYECTO_COLOR : COLORS[i % COLORS.length],
      isIdeal: false,
    }));

    const realProjs = filters.showIdeal
      ? projEntries
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => !p.isSinProyecto && !isNaN(Date.parse(p.finEstimado || '')))
          .slice(0, MAX_IDEAL_LINES)
      : [];
    const idealSeries: SeriesItem[] = realProjs.map(({ p, i }) => ({
      key: `i${i}`,
      name: `Ideal · ${p.name.length > 25 ? p.name.slice(0, 25) + '…' : p.name}`,
      color: COLORS[i % COLORS.length],
      isIdeal: true,
      projIdx: i,
    }));

    const rows: Record<string, number | string>[] = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = first + w * 7 * DAY;
      const weekEnd = weekStart + 6 * DAY;
      const row: Record<string, number | string> = {
        label: new Date(weekStart).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      };
      projEntries.forEach((p, i) => {
        const done = p.items.reduce((s, t) => {
          const fr = Date.parse(t.finReal || '');
          return s + (isTareaDone(t.estatus) && !isNaN(fr) && fr <= weekEnd ? (t.puntos || 0) : 0);
        }, 0);
        row[`p${i}`] = Math.max(0, p.total - done);
      });
      idealSeries.forEach((s) => {
        const p = projEntries[s.projIdx!];
        const targetMs = mondayOf(Date.parse(p.finEstimado));
        const totalWeeks = Math.max(1, Math.round((targetMs - first) / (7 * DAY)));
        row[s.key] = w >= totalWeeks ? 0 : Math.round(Math.max(0, p.total - (p.total * w) / totalWeeks));
      });
      rows.push(row);
    }

    const hasPendingWork = projSeries.some((s) => {
      const v = rows[0]?.[s.key];
      return typeof v === 'number' && v > 0;
    });
    const allFlat = hasPendingWork && projSeries.every((s) => {
      const f = rows[0]?.[s.key];
      const l = rows[rows.length - 1]?.[s.key];
      return typeof f === 'number' && typeof l === 'number' && f === l;
    });

    return { rows, series: [...projSeries, ...idealSeries], allFlat };
  }, [tareas, projects, filters]);

  return (
    <ChartCard title="Burndown por Proyecto" info={infoFor('persona-detalle-burndown')}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[11px] text-slate-500 flex-1">
          Puntos restantes por semana — una línea por proyecto. Líneas punteadas = trayectoria ideal hasta <code className="text-slate-400">finEstimado</code>.
        </p>
        {hydrated && (
          <BurndownFilterMenu
            filters={filters}
            onChange={(next) => setFilters(() => next)}
          />
        )}
      </div>
      {rows.length >= 2 ? (
        <>
          {allFlat && (
            <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300">
              <span className="font-medium">Sin movimiento en este período.</span> Ninguna tarea de los proyectos mostrados cerró dentro del rango. Si esperabas ver progreso, revisa el campo <code className="text-amber-200">finReal</code> de las tareas.
            </div>
          )}
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: unknown, _n, item) => [`${value} pts`, (item as { name?: string })?.name ?? '']}
              />
              <Legend wrapperStyle={{ fontSize: '10px', cursor: 'pointer' }} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={s.isIdeal ? 1.5 : 2}
                  strokeDasharray={s.isIdeal ? '4 4' : undefined}
                  strokeOpacity={s.isIdeal ? 0.55 : 1}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </>
      ) : (
        <p className="text-[11px] text-slate-500 italic py-8 text-center">
          Sin tareas con puntos asignadas a esta persona todavía.
        </p>
      )}
    </ChartCard>
  );
}

function BurndownFilterMenu({
  filters,
  onChange,
}: {
  filters: BurndownFilters;
  onChange: (next: BurndownFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dirty = !isDefault(filters);

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
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
          dirty
            ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
        }`}
        title="Filtros del burndown"
      >
        <SlidersHorizontal className="w-3 h-3" />
        Filtros
        {dirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 space-y-2">
          <FilterCheck
            label='Incluir "Sin proyecto"'
            checked={filters.includeOrphans}
            onToggle={() => onChange({ ...filters, includeOrphans: !filters.includeOrphans })}
          />
          <FilterCheck
            label="Incluir Done recientes"
            checked={filters.includeDoneRecent}
            onToggle={() => onChange({ ...filters, includeDoneRecent: !filters.includeDoneRecent })}
          />
          <FilterCheck
            label="Mostrar línea ideal"
            checked={filters.showIdeal}
            onToggle={() => onChange({ ...filters, showIdeal: !filters.showIdeal })}
          />
          <div className={`border-t border-slate-700 pt-2 mt-2 ${filters.includeDoneRecent ? '' : 'opacity-50'}`}>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
              Ventana Done
            </label>
            <div className="flex gap-1">
              {DONE_WINDOW_OPTIONS.map((d) => (
                <button
                  key={d}
                  disabled={!filters.includeDoneRecent}
                  onClick={() => onChange({ ...filters, doneWindowDays: d })}
                  className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:cursor-not-allowed ${
                    filters.doneWindowDays === d
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {dirty && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="w-full text-[10px] text-slate-500 hover:text-slate-300 text-center pt-1 transition-colors"
            >
              Restaurar predeterminados
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterCheck({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left text-[12px] text-slate-300 hover:text-white transition-colors"
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'bg-blue-500 border-blue-500' : 'bg-slate-800 border-slate-600'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>
      {label}
    </button>
  );
}
