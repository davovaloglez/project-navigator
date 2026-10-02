import { useMemo, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, LocateFixed, CheckCircle2, TrendingUp, BookOpen, ChevronDown } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import { useSnapshotCapture } from '../../hooks/useSnapshotCapture';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import type { ProjectRecord, TareaRecord, CursoRecord } from '../../utils/dataTransforms';
import { splitMulti } from '../../utils/dataTransforms';
import { getEstatusColor, estatusColors } from '../../utils/colors';
import { isTerminal } from '../../utils/projectStatus';
import { calcHealthScore } from '../../utils/healthScore';
import { forecastProjects, riskMeta } from '../../utils/forecastEngine';
import type { ProjectForecast } from '../../utils/forecastEngine';
import {
  HEALTH_BUCKETS,
  ESTATUS_VISUALS,
  estatusIconFor,
  healthIconFor,
  healthTextColor,
} from '../../utils/healthStatusVisuals';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import PageLink from '../auth/PageLink';

// Sólo el enum estable; Arquitecto/Cuatrimestre se derivan de los datos.
const STATIC_FILTER_CONFIGS = [
  { key: 'estatus', label: 'Estatus', options: ['On Track','At Risk','Blocked / Critical','Done','Hypercare','LaunchPhase','On Hold','Upcoming','Cancelado'].map(v => ({ value: v, label: v })), multi: true },
];

const ZOOM_LEVELS = [
  { label: 'Ajustar', dayWidth: 0 },
  { label: '3px/día', dayWidth: 3 },
  { label: '6px/día', dayWidth: 6 },
  { label: '12px/día', dayWidth: 12 },
  { label: '20px/día', dayWidth: 20 },
];

const DAY_MS = 86400000;
const ROW_H = 48;
const HEADER_H = 36;

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(s: string): string {
  const d = parseDate(s);
  if (!d) return '';
  // Las fechas vienen como ISO date-only (medianoche UTC); formatear en UTC
  // evita el off-by-one en zonas detrás de UTC (1 jul mostraba "30 jun").
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function fmtDateFull(s: string): string {
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function TimelineSection() {
  const { isScoped } = useScopeView();
  const { data, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const tareasQ = useSheetData<TareaRecord>('/api/tareas');
  const cursosQ = useSheetData<CursoRecord>('/api/cursos');
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    filters: Record<string, string[]>;
    includeDone: boolean;
    zoomIdx: number;
    showForecast: boolean;
    showLegend: boolean;
  }>('timeline', { filters: {}, includeDone: false, zoomIdx: 0, showForecast: true, showLegend: true });
  const { filters: activeFilters, includeDone, zoomIdx, showForecast, showLegend } = persisted;
  const setActiveFilters = useCallback(
    (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) =>
      setPersisted((prev) => ({ ...prev, filters: typeof updater === 'function' ? updater(prev.filters) : updater })),
    [setPersisted],
  );
  const setIncludeDone = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) =>
      setPersisted((prev) => ({ ...prev, includeDone: typeof updater === 'function' ? updater(prev.includeDone) : updater })),
    [setPersisted],
  );
  const setZoomIdx = useCallback(
    (updater: number | ((prev: number) => number)) =>
      setPersisted((prev) => ({ ...prev, zoomIdx: typeof updater === 'function' ? updater(prev.zoomIdx) : updater })),
    [setPersisted],
  );
  const setShowForecast = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) =>
      setPersisted((prev) => ({ ...prev, showForecast: typeof updater === 'function' ? updater(prev.showForecast) : updater })),
    [setPersisted],
  );
  const setShowLegend = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) =>
      setPersisted((prev) => ({ ...prev, showLegend: typeof updater === 'function' ? updater(prev.showLegend) : updater })),
    [setPersisted],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Drag-to-pan: estado efímero (no React state para evitar re-renders en cada mousemove). */
  const dragRef = useRef<{ active: boolean; startX: number; startScrollLeft: number; moved: boolean }>(
    { active: false, startX: 0, startScrollLeft: 0, moved: false },
  );
  /** Tras un zoom con wheel, dejamos esta scrollLeft pendiente para que el día bajo el cursor no se mueva. */
  const pendingScrollTarget = useRef<number | null>(null);

  useSnapshotCapture(data, cursosQ.data);

  const toOpts = (vals: Iterable<string>) => [...new Set(vals)].sort().map((v) => ({ value: v, label: v }));
  const pmOptions = useMemo(() => toOpts(data.flatMap((p) => splitMulti(p.pm))), [data]);
  const arquitectoOptions = useMemo(
    () => toOpts(data.flatMap((p) => splitMulti(p.arquitecto))),
    [data],
  );
  const cuatrimestreOptions = useMemo(
    () => toOpts(data.map((p) => p.cuatrimestre).filter(Boolean)),
    [data],
  );

  // Scopeado (pm/dev): PM y Arquitecto no aplican (ya ve un subconjunto por id).
  const filterConfigs = useMemo(() => {
    const base = [
      ...STATIC_FILTER_CONFIGS,
      { key: 'cuatrimestre', label: 'Q de entrega', options: cuatrimestreOptions, multi: true },
    ];
    if (isScoped) return base;
    return [
      ...base,
      { key: 'arquitecto', label: 'Arquitecto', options: arquitectoOptions, multi: true },
      { key: 'pm', label: 'PM', options: pmOptions, multi: false },
    ];
  }, [pmOptions, isScoped, arquitectoOptions, cuatrimestreOptions]);

  const forecastMap = useMemo(() => {
    const { forecasts } = forecastProjects(data, tareasQ.data);
    const map = new Map<string, ProjectForecast>();
    for (const f of forecasts) map.set(f.project.id, f);
    return map;
  }, [data, tareasQ.data]);

  const projects = useMemo(() => {
    let result = data.filter((p) => p.fechaInicio || p.inicioEstimado || p.finReal || p.finEstimado);
    const estatusSelected = activeFilters.estatus || [];
    // "Terminados" = Done + Cancelado; ocultos por defecto salvo selección explícita.
    if (!includeDone) {
      result = result.filter((p) => !isTerminal(p.estatus) || estatusSelected.includes(p.estatus));
    }
    for (const [key, values] of Object.entries(activeFilters)) {
      if (!values.length) continue;
      if (key === 'arquitecto') {
        result = result.filter((p) => splitMulti(p.arquitecto).some((a) => values.includes(a)));
      } else if (key === 'pm') {
        result = result.filter((p) => splitMulti(p.pm).some((pm) => values.includes(pm)));
      } else {
        result = result.filter((p) => values.includes(String((p as unknown as Record<string, unknown>)[key] || '')));
      }
    }
    return result;
  }, [data, activeFilters, includeDone]);

  const hiddenDoneCount = useMemo(() => {
    if (includeDone) return 0;
    const estatusSelected = activeFilters.estatus || [];
    return data.filter((p) => isTerminal(p.estatus) && !estatusSelected.includes(p.estatus) && (p.fechaInicio || p.inicioEstimado || p.finReal || p.finEstimado)).length;
  }, [data, includeDone, activeFilters.estatus]);

  const sorted = useMemo(() =>
    [...projects].sort((a, b) => (parseDate(a.fechaInicio || a.inicioEstimado)?.getTime() || 0) - (parseDate(b.fechaInicio || b.inicioEstimado)?.getTime() || 0)),
  [projects]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    let min = Infinity, max = -Infinity;
    const now = Date.now();
    for (const p of projects) {
      const s = parseDate(p.fechaInicio || p.inicioEstimado);
      const e = parseDate(p.finReal || p.finEstimado);
      if (s) min = Math.min(min, s.getTime());
      if (e) max = Math.max(max, e.getTime());
    }
    if (min === Infinity) min = now;
    if (max === -Infinity) max = now + 90 * DAY_MS;
    min -= 14 * DAY_MS;
    max += 21 * DAY_MS;
    return { minDate: min, maxDate: max, totalDays: Math.max(1, Math.round((max - min) / DAY_MS)) };
  }, [projects]);

  const dayWidth = ZOOM_LEVELS[zoomIdx].dayWidth;

  const monthMarkers = useMemo(() => {
    const markers: { label: string; day: number }[] = [];
    const s = new Date(minDate);
    s.setDate(1);
    s.setMonth(s.getMonth() + 1);
    while (s.getTime() < maxDate) {
      markers.push({ label: s.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }), day: (s.getTime() - minDate) / DAY_MS });
      s.setMonth(s.getMonth() + 1);
    }
    return markers;
  }, [minDate, maxDate]);

  const todayDay = (Date.now() - minDate) / DAY_MS;

  const scrollToToday = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    if (dayWidth === 0) {
      const pct = todayDay / totalDays;
      el.scrollLeft = Math.max(0, pct * el.scrollWidth - el.clientWidth / 2);
    } else {
      el.scrollLeft = Math.max(0, todayDay * dayWidth - el.clientWidth / 2);
    }
  }, [dayWidth, todayDay, totalDays]);

  useEffect(() => {
    const t = setTimeout(scrollToToday, 80);
    return () => clearTimeout(t);
  }, [scrollToToday, sorted.length]);

  // Tras un wheel-zoom, restaurar scrollLeft para que el día bajo el cursor se quede ahí.
  useEffect(() => {
    if (pendingScrollTarget.current !== null && scrollRef.current) {
      scrollRef.current.scrollLeft = pendingScrollTarget.current;
      pendingScrollTarget.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomIdx]);

  /**
   * Wheel handler:
   *  - Sin modificador: convierte deltaY del mouse a scroll horizontal (mantiene
   *    el swipe trackpad horizontal nativo cuando |deltaX| > |deltaY|).
   *  - Ctrl/Cmd + wheel: zoom centrado en el cursor — el día bajo el cursor se
   *    queda bajo el cursor tras cambiar de zoom level.
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!el) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const direction = e.deltaY < 0 ? 1 : -1; // wheel up = zoom in
        const newIdx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomIdx + direction));
        if (newIdx === zoomIdx) return;
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorXInContent = el.scrollLeft + cursorX;
        // Convertir cursor → día actual con el dayWidth efectivo (Ajustar usa scrollWidth/totalDays).
        const currentDayWidth = dayWidth === 0 ? el.scrollWidth / Math.max(1, totalDays) : dayWidth;
        const dayAtCursor = cursorXInContent / Math.max(1, currentDayWidth);
        const newDayWidth = ZOOM_LEVELS[newIdx].dayWidth;
        if (newDayWidth > 0) {
          pendingScrollTarget.current = Math.max(0, dayAtCursor * newDayWidth - cursorX);
        }
        setZoomIdx(newIdx);
      } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // Mouse wheel vertical → scroll horizontal.
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
      // else: trackpad horizontal swipe — dejar pasar al browser.
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomIdx, dayWidth, totalDays, setZoomIdx]);

  /**
   * Drag-to-pan: click-y-arrastrar mueve la timeline horizontalmente. Funciona
   * incluso sobre las barras (links). Si el usuario movió >3px, el click
   * subsecuente se suprime para no abrir el proyecto. Sólo se bypasa en inputs
   * (preservar edición de texto nativa).
   */
  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    el.style.cursor = 'grabbing';
  }

  // mousemove / mouseup globales (sigue funcionando aunque el cursor salga del área).
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = scrollRef.current;
      if (!el || !dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 3) dragRef.current.moved = true;
      el.scrollLeft = dragRef.current.startScrollLeft - dx;
    }
    function onUp() {
      const el = scrollRef.current;
      if (!el) return;
      if (dragRef.current.active) {
        dragRef.current.active = false;
        el.style.cursor = '';
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Suprimir el click cuando hubo drag real, y prevenir el drag-and-drop nativo
  // de links (que arrastraría la URL fuera del browser, rompiendo la UX).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onClickCapture(e: MouseEvent) {
      if (dragRef.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current.moved = false;
      }
    }
    function onDragStart(e: Event) {
      e.preventDefault();
    }
    el.addEventListener('click', onClickCapture, { capture: true });
    el.addEventListener('dragstart', onDragStart);
    return () => {
      el.removeEventListener('click', onClickCapture, { capture: true });
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  // Position helpers
  function x(day: number) {
    return dayWidth === 0 ? `${(day / totalDays) * 100}%` : `${day * dayWidth}px`;
  }
  function w(days: number) {
    return dayWidth === 0 ? `${Math.max(1.5, (days / totalDays) * 100)}%` : `${Math.max(24, days * dayWidth)}px`;
  }

  if (loading) {
    return (
      <div>
        <Header title="Timeline" onRefresh={refetch} loading />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Timeline" onRefresh={refetch} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">Reintentar</button>
        </div>
      </div>
    );
  }

  const contentW = dayWidth === 0 ? '100%' : `${totalDays * dayWidth}px`;
  const bodyH = sorted.length * ROW_H;

  return (
    <div>
      <Header title="Timeline" onRefresh={refetch} loading={loading} />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <FilterDropdowns
            filters={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={(key, vals) => setActiveFilters((prev) => ({ ...prev, [key]: vals }))}
            onClear={clearPersisted}
          />
          <button
            onClick={() => setIncludeDone((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              includeDone
                ? 'bg-green-500/15 text-green-300 border-green-500/40'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
            }`}
            title={includeDone ? 'Ocultar proyectos terminados' : 'Mostrar proyectos terminados'}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{includeDone ? 'Terminados visibles' : 'Incluir terminados'}</span>
          </button>
          <button
            onClick={() => setShowForecast((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showForecast
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
            }`}
            title={showForecast ? 'Ocultar fecha pronóstico' : 'Mostrar fecha pronóstico'}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>{showForecast ? 'Pronóstico visible' : 'Mostrar pronóstico'}</span>
          </button>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              showLegend
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500'
            }`}
            title={showLegend ? 'Ocultar leyenda' : 'Mostrar leyenda'}
            aria-expanded={showLegend}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Leyenda</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${showLegend ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoomIdx((z) => Math.max(0, z - 1))} disabled={zoomIdx === 0} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors" title="Alejar">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-500 w-16 text-center">{ZOOM_LEVELS[zoomIdx].label}</span>
          <button onClick={() => setZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors" title="Acercar">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={scrollToToday} className="p-2 rounded-lg bg-blue-500/15 text-blue-400 hover:text-blue-300 transition-colors" title="Ir a hoy">
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <p className="text-sm text-slate-400">
          {sorted.length} proyectos
          {hiddenDoneCount > 0 && (
            <span className="text-slate-500"> · {hiddenDoneCount} terminado{hiddenDoneCount !== 1 ? 's' : ''} oculto{hiddenDoneCount !== 1 ? 's' : ''}</span>
          )}
        </p>
        <GlossaryTooltip id="timeline-gantt" />
      </div>

      {/* Leyenda colapsable (NAV-72). Persistida vía usePersistedFilters; abierta
          por default la primera vez, cerrada después si el usuario la cerró. */}
      {showLegend && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-4 space-y-3">
          {/* Jerarquía de lectura (NAV-84): Estatus > % > Salud — Estatus primero. */}
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0 mt-1">
              Estatus (chip)
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2 flex-1">
              {ESTATUS_VISUALS.map((v) => {
                const Icon = v.icon;
                const ec = estatusColors[v.label] ?? getEstatusColor(v.label);
                return (
                  <div key={v.label} className="flex items-center gap-1.5 text-[11px]">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${ec.bg}`}>
                      <Icon className={`w-3 h-3 ${ec.text}`} />
                    </span>
                    <span className="text-slate-300">{v.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-start gap-3 flex-wrap pt-3 border-t border-slate-700/40">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0 mt-1">
              Salud (icono)
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2 flex-1">
              {HEALTH_BUCKETS.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="flex items-center gap-1.5 text-[11px]">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${b.textColor}`} />
                    <span className="text-slate-300">{b.label}</span>
                    <span className="text-slate-500">({b.range})</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic">
            Chip e icono codifican <strong>dimensiones distintas</strong>: el chip es el estatus que reporta el PM, el icono es la salud calculada (0-100). Si disienten — chip "On Track" con salud crítica — hay un riesgo no declarado.
          </p>
        </div>
      )}

      {/* Timeline container */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden flex">
        {/* Fixed label column */}
        <div className="shrink-0 w-52 sm:w-60 border-r border-slate-700/50 z-20 bg-slate-800">
          {/* Header */}
          <div className="border-b border-slate-700/50 px-3 flex items-center gap-1.5" style={{ height: `${HEADER_H}px` }}>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Proyecto</span>
            <GlossaryTooltip id="timeline-forecast-overlay" />
          </div>
          {/* Rows */}
          {sorted.map((p) => {
            const health = calcHealthScore(p);
            const ec = getEstatusColor(p.estatus);
            const StatusIcon = estatusIconFor(p.estatus);
            const HealthIcon = healthIconFor(health.label);
            // Tooltip de salud: score + top factores que lo movieron (max 3).
            const healthTitle = `Salud: ${health.label} (${health.score}/100)${
              health.factors.length > 0 ? `\n${health.factors.slice(0, 3).join(' · ')}` : ''
            }`;
            return (
              <a
                key={p.id}
                href={`/proyecto/${p.id}`}
                className="flex items-center gap-1.5 px-3 border-b border-slate-700/20 hover:bg-slate-700/30 transition-colors"
                style={{ height: `${ROW_H}px` }}
              >
                {/* Orden de lectura (NAV-84): Estatus (chip 22px) | Salud (icono con color) */}
                <span
                  className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full shrink-0 ${ec.bg}`}
                  title={`Estatus: ${p.estatus}`}
                  aria-label={`Estatus ${p.estatus}`}
                >
                  <StatusIcon className={`w-3 h-3 ${ec.text}`} />
                </span>
                <span
                  className="inline-flex shrink-0"
                  title={healthTitle}
                  aria-label={`Salud ${health.label}, ${health.score} de 100`}
                >
                  <HealthIcon className={`w-3.5 h-3.5 ${healthTextColor(health.label)}`} />
                </span>
                <div className="min-w-0 ml-1">
                  <p className="text-xs font-medium text-slate-200 truncate">{p.actividad}</p>
                  <p className="text-[10px] text-slate-500 truncate">{p.folio} · {p.arquitecto}</p>
                </div>
              </a>
            );
          })}
        </div>

        {/* Scrollable timeline area — wheel/zoom/drag UX (NAV-72 follow-up).
            cursor-grab indica que se puede arrastrar; cambia a grabbing en mousedown. */}
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          className="flex-1 overflow-x-auto cursor-grab select-none"
          style={{ scrollbarColor: '#475569 #1e293b' }}
        >
          <div style={{ width: contentW, minWidth: '100%' }}>
            {/* Month header bar */}
            <div className="relative border-b border-slate-700/50 bg-slate-800/90 z-10" style={{ height: `${HEADER_H}px` }}>
              {monthMarkers.map((m) => (
                <div key={m.label} className="absolute top-0 h-full flex items-center" style={{ left: x(m.day) }}>
                  <div className="border-l border-slate-600/40 h-full" />
                  <span className="text-[10px] text-slate-500 ml-1.5 whitespace-nowrap">{m.label}</span>
                </div>
              ))}
              {/* TODAY in header */}
              <div className="absolute top-0 h-full z-20" style={{ left: x(todayDay) }}>
                <div className="w-0.5 h-full bg-blue-400" />
                <span className="absolute top-1 -translate-x-1/2 text-[9px] font-bold text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded-sm whitespace-nowrap">HOY</span>
              </div>
            </div>

            {/* Bars area */}
            <div className="relative" style={{ height: `${bodyH}px` }}>
              {/* Month grid lines — full height */}
              {monthMarkers.map((m) => (
                <div key={m.label} className="absolute top-0 border-l border-slate-700/15" style={{ left: x(m.day), height: `${bodyH}px` }} />
              ))}

              {/* TODAY line — full height, prominent */}
              <div className="absolute top-0 z-10" style={{ left: x(todayDay), height: `${bodyH}px` }}>
                <div className="w-0.5 h-full bg-blue-400/50" />
              </div>

              {/* Project rows */}
              {sorted.map((p, idx) => {
                const start = parseDate(p.fechaInicio || p.inicioEstimado);
                const end = parseDate(p.finReal || p.finEstimado);
                const isOverdue = !p.finReal && end && end.getTime() < Date.now() && p.estatus !== 'Done';

                let barDay = 0, barDays = 30;
                if (start && end) {
                  barDay = (start.getTime() - minDate) / DAY_MS;
                  barDays = Math.max(3, (end.getTime() - start.getTime()) / DAY_MS);
                } else if (end) {
                  barDay = Math.max(0, (end.getTime() - 30 * DAY_MS - minDate) / DAY_MS);
                }

                const ec = getEstatusColor(p.estatus);
                const pct = Math.round(p.progreso * 100);
                const health = calcHealthScore(p);
                const top = idx * ROW_H;

                // Forecast overlay
                const fc = forecastMap.get(p.id);
                const forecastDate = fc?.forecastDate ? parseDate(fc.forecastDate) : null;
                const plannedEnd = parseDate(p.finEstimado);
                const showFcOverlay =
                  showForecast &&
                  fc &&
                  fc.risk !== 'done' &&
                  fc.risk !== 'insufficient-data' &&
                  forecastDate &&
                  plannedEnd &&
                  !p.finReal;
                let fcDay: number | null = null;
                let ghostDay = 0;
                let ghostDays = 0;
                let fcColor = '';
                if (showFcOverlay && forecastDate && plannedEnd) {
                  fcDay = (forecastDate.getTime() - minDate) / DAY_MS;
                  if (forecastDate.getTime() > plannedEnd.getTime()) {
                    ghostDay = (plannedEnd.getTime() - minDate) / DAY_MS;
                    ghostDays = (forecastDate.getTime() - plannedEnd.getTime()) / DAY_MS;
                  }
                  const meta = riskMeta(fc!.risk);
                  fcColor = meta.color.includes('red')
                    ? '#f87171'
                    : meta.color.includes('amber')
                      ? '#fbbf24'
                      : '#4ade80';
                }

                return (
                  <div key={p.id} className="absolute left-0 right-0 border-b border-slate-700/10" style={{ top: `${top}px`, height: `${ROW_H}px` }}>
                    <a
                      href={`/proyecto/${p.id}`}
                      className="peer/bar absolute flex items-center rounded-md overflow-hidden hover:brightness-125 transition-all"
                      style={{ left: x(barDay), width: w(barDays), top: '8px', height: `${ROW_H - 16}px` }}
                    >
                      <div className="absolute inset-0 opacity-20" style={{ backgroundColor: isOverdue ? '#ef4444' : ec.chart }} />
                      <div className="absolute inset-y-0 left-0 opacity-50 rounded-l-md" style={{ width: `${pct}%`, backgroundColor: ec.chart }} />
                      <div className="absolute inset-0 border rounded-md" style={{ borderColor: isOverdue ? 'rgba(239,68,68,0.5)' : ec.chart + '44' }} />
                      {/* Jerarquía de lectura (NAV-84): Estatus > % > Salud */}
                      <span className="relative z-10 inline-flex items-center gap-1 text-[10px] text-white font-medium px-2 truncate whitespace-nowrap">
                        {(() => {
                          const BarIcon = estatusIconFor(p.estatus);
                          const BarHealthIcon = healthIconFor(health.label);
                          return (
                            <>
                              <BarIcon className="w-2.5 h-2.5 shrink-0" />
                              {pct}%
                              <BarHealthIcon className={`w-2.5 h-2.5 shrink-0 ${healthTextColor(health.label)}`} />
                            </>
                          );
                        })()}
                      </span>
                    </a>
                    {/* Tooltip de fechas (CSS-only, peer-hover sobre la barra). Hermano
                        de la <a> porque la barra tiene overflow-hidden y lo clipearía. */}
                    <div
                      className="absolute z-30 pointer-events-none opacity-0 transition-opacity duration-100 peer-hover/bar:opacity-100 peer-focus-visible/bar:opacity-100"
                      style={{ left: x(barDay), bottom: `${ROW_H - 6}px` }}
                      role="tooltip"
                    >
                      <div className="rounded-md bg-slate-900 border border-slate-600/60 shadow-xl px-2.5 py-1.5 text-[10px] whitespace-nowrap space-y-0.5">
                        <p className="font-medium text-slate-200">
                          {p.estatus} · {pct}% · <span className={healthTextColor(health.label)}>Salud {health.label}</span>
                        </p>
                        <p>
                          <span className="text-slate-400">{p.fechaInicio ? 'Inicio' : 'Inicio est.'}</span>{' '}
                          <span className="text-slate-100">{fmtDateFull(p.fechaInicio || p.inicioEstimado)}</span>
                          <span className="text-slate-500 mx-1">→</span>
                          <span className="text-slate-400">{p.finReal ? 'Fin real' : 'Fin est.'}</span>{' '}
                          <span className="text-slate-100">{fmtDateFull(p.finReal || p.finEstimado)}</span>
                        </p>
                      </div>
                    </div>
                    {/* Forecast slippage ghost bar */}
                    {showFcOverlay && ghostDays > 0 && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: x(ghostDay),
                          width: w(ghostDays),
                          top: '14px',
                          height: `${ROW_H - 28}px`,
                          backgroundColor: fcColor,
                          opacity: 0.18,
                          borderTop: `1px dashed ${fcColor}`,
                          borderBottom: `1px dashed ${fcColor}`,
                        }}
                        title={`Desvío proyectado: ${fc!.slippageDays}d`}
                      />
                    )}
                    {/* Forecast date marker (diamond) */}
                    {showFcOverlay && fcDay !== null && (
                      <PageLink
                        pageKey="pronosticos"
                        href={`/pronosticos/${p.id}`}
                        className="absolute z-10"
                        deniedClassName="absolute z-10"
                        style={{ left: x(fcDay), top: `${ROW_H / 2 - 6}px`, transform: 'translateX(-50%)' }}
                        title={`Pronóstico: ${fc!.forecastDate}${fc!.slippageDays !== null ? ` (${fc!.slippageDays > 0 ? '+' : ''}${fc!.slippageDays}d)` : ''}`}
                      >
                        <div
                          className="w-3 h-3 rotate-45 border-2"
                          style={{ backgroundColor: fcColor, borderColor: '#0f172a' }}
                        />
                      </PageLink>
                    )}
                    {/* Date labels */}
                    {start && (
                      <span className="absolute text-[7px] text-slate-600" style={{ left: x(barDay), bottom: '1px' }}>{fmtDate(p.fechaInicio || p.inicioEstimado)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
