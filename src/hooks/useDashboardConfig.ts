import { useState, useCallback } from 'react';
import { readInlinePermissions } from './usePermissions';

const STORAGE_KEY = 'pn-dashboard-config';

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'kpis', label: 'KPIs', visible: true },
  { id: 'health-summary', label: 'Salud del Portafolio', visible: true },
  { id: 'health-distribution', label: 'Distribución de Salud', visible: true },
  { id: 'alerts-preview', label: 'Alertas Recientes', visible: true },
  { id: 'at-risk-projects', label: 'Proyectos en Riesgo', visible: true },
  { id: 'estatus-chart', label: 'Gráfica de Estatus', visible: true },
  { id: 'salud-chart', label: 'Gráfica de Salud', visible: true },
  { id: 'prioridad-chart', label: 'Gráfica de Prioridad', visible: false },
  { id: 'arquitecto-chart', label: 'Progreso por Arquitecto', visible: false },
  { id: 'proyectos-arquitecto', label: 'Proyectos por Arquitecto', visible: true },
  { id: 'hito-chart', label: 'Progreso por Cuatrimestre', visible: false },
  { id: 'dev-chart', label: 'Carga por DEV', visible: true },
  { id: 'upcoming-deadlines', label: 'Próximos Vencimientos', visible: true },
  { id: 'critical-forecast', label: 'Próximas Fechas Críticas (Pronóstico)', visible: true },
  { id: 'roadmap-progress', label: 'Progreso del Roadmap', visible: false },
  { id: 'points-distribution', label: 'Distribución de Puntos', visible: false },
  { id: 'cost-overview', label: 'Resumen de Costos', visible: false },
  { id: 'tareas-overview', label: 'Resumen de Cronograma', visible: true },
];

/**
 * Deltas de visibilidad por defecto según el rol (sólo overrides; lo no
 * listado hereda el default canónico). Es una PREFERENCIA, no un permiso: el
 * usuario puede reactivar cualquier widget oculto. El gating real por permiso
 * (block:dashboard-*) vive en DashboardSection y es independiente de esto.
 */
const ROLE_WIDGET_DEFAULTS: Record<string, Record<string, boolean>> = {
  dev: { 'arquitecto-chart': false, 'proyectos-arquitecto': false },
  pm: { 'arquitecto-chart': false, 'proyectos-arquitecto': false },
  directores: { 'roadmap-progress': true },
  ventas: { 'arquitecto-chart': false, 'proyectos-arquitecto': false },
  // admin / gerentes: sin overrides — ven el set canónico completo.
};

function roleDefaults(): WidgetConfig[] {
  const role = readInlinePermissions().role;
  const ov = ROLE_WIDGET_DEFAULTS[role];
  if (!ov) return DEFAULT_WIDGETS;
  return DEFAULT_WIDGETS.map((w) => (w.id in ov ? { ...w, visible: ov[w.id] } : w));
}

function load(): DashboardConfig {
  if (typeof window === 'undefined') return { widgets: DEFAULT_WIDGETS };
  const defaults = roleDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { widgets: defaults };
    const saved = JSON.parse(raw) as DashboardConfig;
    // Merge: respeta las elecciones guardadas; los widgets nuevos adoptan el
    // default del rol (no el canónico) para que la personalización aplique.
    const savedIds = new Set(saved.widgets.map((w) => w.id));
    const merged = [
      ...saved.widgets,
      ...defaults.filter((w) => !savedIds.has(w.id)),
    ];
    return { widgets: merged };
  } catch {
    return { widgets: defaults };
  }
}

function save(config: DashboardConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(load);

  const toggleWidget = useCallback((id: string) => {
    setConfig((prev) => {
      const next = {
        widgets: prev.widgets.map((w) =>
          w.id === id ? { ...w, visible: !w.visible } : w
        ),
      };
      save(next);
      return next;
    });
  }, []);

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    setConfig((prev) => {
      const idx = prev.widgets.findIndex((w) => w.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.widgets.length) return prev;
      const widgets = [...prev.widgets];
      [widgets[idx], widgets[swapIdx]] = [widgets[swapIdx], widgets[idx]];
      const next = { widgets };
      save(next);
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    const next = { widgets: roleDefaults() };
    save(next);
    setConfig(next);
  }, []);

  const isVisible = useCallback(
    (id: string) => config.widgets.find((w) => w.id === id)?.visible ?? true,
    [config]
  );

  return { config, toggleWidget, moveWidget, resetConfig, isVisible };
}
