# `/` — DashboardSection

Dashboard personalizable con widgets. Cada usuario configura qué widgets ve y en qué orden (persistido en `localStorage`).

- **Componente:** [src/components/sections/DashboardSection.tsx](../../../src/components/sections/DashboardSection.tsx)
- **Página:** [src/pages/index.astro](../../../src/pages/index.astro)
- **LOC:** ~582
- **Filtro PM:** ✅ (`usePersistedFilters` key `dashboard`)
- **Snapshot capture:** ✅ (sobre `allData` raw, antes de filtrar por PM)

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Datos raw del portafolio |
| `useSheetData<CursoRecord>` | `/api/cursos` | Pasado a `useSnapshotCapture` para histórico |
| `useSheetData<CostoRecord>` | `/api/costos` | Sólo lo consume `CostOverviewWidget` (lazy en su propio hook interno) |
| `useSheetData<TareaRecord>` | `/api/tareas` | Sólo lo consumen `TareasOverviewWidget` y `CriticalForecastWidget` |
| `useDashboardConfig` | `localStorage['pn-dashboard-config']` | Visibilidad + orden de widgets |
| `useSnapshotCapture(allData, cursosQ.data)` | — | Captura semanal pasiva |
| `usePersistedFilters('dashboard', { pmFilter: {} })` | `/api/user-preferences` | Selección de PM |

> **Importante:** `CostOverviewWidget`, `TareasOverviewWidget` y `CriticalForecastWidget` llaman `useSheetData` **internamente**. Es la única excepción a la regla "sólo sections llaman hooks de datos"; estos widgets son sub-componentes definidos *inline* en el archivo de la sección, no UI reusable.

## Arquitectura de widgets

```ts
const CHART_WIDGETS: Record<string, React.ComponentType<{ data: ProjectRecord[] }>> = {
  'estatus-chart': EstatusDonutChart,
  'salud-chart': SaludDonutChart,
  'prioridad-chart': PrioridadBarChart,
  'arquitecto-chart': ProgresoArquitectoChart,
  'hito-chart': HitoProgressChart,
  'dev-chart': DevWorkloadChart,
};

const SPECIAL_WIDGETS: Record<string, React.ComponentType<{ data: ProjectRecord[] }>> = {
  'health-summary': HealthSummaryWidget,
  'alerts-preview': AlertsPreviewWidget,
  'at-risk-projects': AtRiskProjectsWidget,
  'upcoming-deadlines': UpcomingDeadlinesWidget,
  'critical-forecast': CriticalForecastWidget,
  'roadmap-progress': RoadmapProgressWidget,
  'points-distribution': PointsDistributionWidget,
  'cost-overview': CostOverviewWidget,
  'tareas-overview': TareasOverviewWidget,
};

const ALL_WIDGETS = { ...CHART_WIDGETS, ...SPECIAL_WIDGETS };
```

Cada widget recibe **siempre** `{ data: ProjectRecord[] }` (los que necesitan más datos los traen ellos vía `useSheetData`).

El render itera `config.widgets` (orden persistido) y filtra por `visible && ALL_WIDGETS[w.id]`.

## Widgets especiales — lógica

| Widget | Cálculo |
|---|---|
| `HealthSummaryWidget` | Score promedio de activos vía `calcHealthScore`. Buckets Excelente/Bueno/Medio/Bajo/Crítico. Color del ring: verde ≥65, amarillo ≥45, rojo <45. |
| `AlertsPreviewWidget` | `generateAlerts(data)` → top 5. Severidad → dot color (rojo/ámbar/azul). |
| `AtRiskProjectsWidget` | Activos ordenados ascendente por `calcHealthScore`, top 5. |
| `UpcomingDeadlinesWidget` | Activos con `finEstimado` en ventana `[-7, +30]` días, top 6 ascendente. Cromo: rojo (overdue), ámbar (≤7d), gris (≤30d). |
| `CriticalForecastWidget` | `forecastProjects(data, tareas) → computeCriticalDates(forecasts, [30, 60])`. Aplana en 6 eventos. Carga lazy `tareas`. |
| `RoadmapProgressWidget` | Agrupa por `hito`, suma puntos, calcula progreso promedio. Color barra: verde ≥80%, amarillo ≥40%, rojo <40%. |
| `PointsDistributionWidget` | KPIs total/done/active por puntos. Top 5 arquitectos. |
| `CostOverviewWidget` | Lazy `/api/costos`. Total mensual + top 5 roles. |
| `TareasOverviewWidget` | Lazy `/api/tareas`. KPIs completadas/activas/bloqueadas. Conteo App vs Core. |

## KPIs (cabecera)

`useMemo` sobre `data` (filtrado por PM):

- `total` — `data.length`
- `avgProgress` — promedio de `p.progreso * 100`
- `atRisk` — `estatus ∈ { At Risk, Blocked / Critical }`
- `blocked` — `estatus === 'Blocked / Critical'`
- `done` — `estatus === 'Done'`
- `totalPoints` — suma de `puntos`
- `alertCount` — alertas con `severity === 'critical'`

## Filtro PM

```tsx
const { state: persisted, setState: setPersisted, clear: clearPersisted } =
  usePersistedFilters<{ pmFilter: Record<string, string[]> }>('dashboard', { pmFilter: {} });

const data = useMemo(() => {
  const selected = persisted.pmFilter.pm || [];
  return selected.length ? allData.filter((p) => selected.includes(p.pm)) : allData;
}, [allData, persisted.pmFilter]);
```

Opciones derivadas de `allData` con `[...new Set(...)]` y `filter(pm && pm !== '-')`.

**Snapshot integrity:** `useSnapshotCapture(allData, cursosQ.data)` recibe `allData` raw — el filtro no contamina los snapshots.

## Persistencia

| Qué | Dónde | Cuándo |
|---|---|---|
| Selección de PM | Turso `user_preferences` + localStorage `pn-prefs-dashboard` | Cada cambio (debounce 500ms) |
| Orden + visibilidad de widgets | localStorage `pn-dashboard-config` | Cada toggle/move/reset |
| Snapshot semanal de portafolio + cursos | localStorage `pn-weekly-snapshots` + Sheet `Snapshots` | Sólo si han pasado ≥7 días desde la última captura |

## Estado loading / error / empty

- **Loading:** 6 skeletons de KPI + 4 skeletons de widget (h-28 / h-80).
- **Error:** card roja con `Reintentar`.
- **Empty (sin widgets visibles + sin KPIs):** mensaje "No hay widgets visibles" con CTA al botón "Personalizar".

## Personalización

[DashboardCustomizer](../componentes/ui.md#dashboardcustomizer) es un drawer con drag handles + checkboxes + botón "Restablecer". Llama `toggleWidget(id)`, `moveWidget(id, dir)`, `resetConfig()` del hook `useDashboardConfig`.

## Agregar un widget nuevo

1. Crear el componente (puede ser inline si es de un solo uso) tipado como `({ data }: { data: ProjectRecord[] }) => JSX.Element`.
2. Agregarlo a `CHART_WIDGETS` o `SPECIAL_WIDGETS`.
3. Agregar entrada a `DEFAULT_WIDGETS` en [src/hooks/useDashboardConfig.ts](../../../src/hooks/useDashboardConfig.ts) con `{ id, label, visible: true }`.
4. Agregar tooltip en [src/data/glossary.ts](../../../src/data/glossary.ts) con id `dashboard-<widget-slug>` y pasarlo via `info={infoFor('dashboard-<widget-slug>')}`.
5. Verificar que sesiones existentes ven el widget nuevo (el hook hace merge con defaults).

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global) — usar `FilterDropdowns` con `multi: false`, derivar opciones, separar `allData` de `data`.
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — usar `usePersistedFilters` y nunca persistir search/page.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — un tooltip por bloque visual.
