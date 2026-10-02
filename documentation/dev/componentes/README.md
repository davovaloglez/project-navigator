# Componentes — índice

UI compartida (`src/components/ui/`) y charts (`src/components/charts/`). Todos:

- Reciben datos por **props** — nunca llaman hooks de datos.
- Son tipados, idealmente con interfaces explícitas.
- Pueden tener estado **local** de UI (hover, expand, etc.).

## Reglas globales

1. **Sin side effects de datos.** Ningún componente UI llama `useSheetData`, `usePersistedFilters` ni `useSnapshotCapture`.
2. **Sin `fetch` directo.** Excepción: nada en `componentes/`. Si hay que mutar, el handler vive en la section que pasó el callback.
3. **Sin imports de `data/glossary.ts`.** Excepción: `KPICard` y `ChartCard` aceptan prop `info` con el shape `{ description, glossaryAnchor }`; la section es responsable de pasar `infoFor('id')`.
4. **Tipos genéricos** cuando aplique. `DataTable<T>` es el ejemplo canónico.

## Catálogo

### Capas estructurales

| Componente | Source | Uso |
|---|---|---|
| `Breadcrumbs` | [ui/Breadcrumbs.tsx](../../../src/components/ui/Breadcrumbs.tsx) | Migas de pan en detail pages (Portafolio › Folio, Equipo › Nombre) |
| `Tabs` | [ui/Tabs.tsx](../../../src/components/ui/Tabs.tsx) | Tab navigation con keyboard support |

### KPIs y tarjetas

| Componente | Source | Uso |
|---|---|---|
| `KPICard` | [ui/KPICard.tsx](../../../src/components/ui/KPICard.tsx) | Tarjeta grande con icono + value + label + tooltip opcional |
| `StatusBadge` | [ui/StatusBadge.tsx](../../../src/components/ui/StatusBadge.tsx) | Badge pequeño con label + color (bg + text). Tamaños sm/md |
| `ProgressBar` | [ui/ProgressBar.tsx](../../../src/components/ui/ProgressBar.tsx) | Barra de progreso con color semáforo |
| `ProjectCard` | [ui/ProjectCard.tsx](../../../src/components/ui/ProjectCard.tsx) | Card de proyecto en /portafolio. Recibe `project` + `forecast?` + `stale?` |

### Tooltips e info

| Componente | Source | Uso |
|---|---|---|
| `InfoTooltip` | [ui/InfoTooltip.tsx](../../../src/components/ui/InfoTooltip.tsx) | Tooltip primitivo con viewport-aware positioning |
| `GlossaryTooltip` | [ui/GlossaryTooltip.tsx](../../../src/components/ui/GlossaryTooltip.tsx) | Wrapper sobre InfoTooltip que resuelve description/anchor desde `glossary.ts` por `id` |
| `MarkdownText` / `InlineMarkdown` | [ui/MarkdownText.tsx](../../../src/components/ui/MarkdownText.tsx) | Renderer ligero (bold, code, lists, code blocks) |

### Filtros

| Componente | Source | Uso |
|---|---|---|
| `FilterDropdowns` | [ui/FilterDropdowns.tsx](../../../src/components/ui/FilterDropdowns.tsx) | Múltiples dropdowns + búsqueda + botón limpiar. Acepta config con `{ key, label, options: [{value,label}], multi }` |
| `FilterBar` | [ui/FilterBar.tsx](../../../src/components/ui/FilterBar.tsx) | Wrapper más simple (legacy, usado en pocas secciones) |

### Tablas

| Componente | Source | Uso |
|---|---|---|
| `DataTable<T>` | [ui/DataTable.tsx](../../../src/components/ui/DataTable.tsx) | Tabla genérica con columnas tipadas: `{ key, header, render: (row) => ReactNode }` |

### Drawers y diálogos

| Componente | Source | Uso |
|---|---|---|
| `DetailDrawer` | [ui/DetailDrawer.tsx](../../../src/components/ui/DetailDrawer.tsx) | Drawer lateral genérico |
| `ProjectDetailDrawer` | [ui/ProjectDetailDrawer.tsx](../../../src/components/ui/ProjectDetailDrawer.tsx) | Wrapper para mostrar un `ProjectRecord` (legacy — el detalle hoy vive en `/proyecto/[folio]`) |
| `DashboardCustomizer` | [ui/DashboardCustomizer.tsx](../../../src/components/ui/DashboardCustomizer.tsx) | Drawer del dashboard con checkboxes + move + reset |

### Cards del motor de pronóstico

Todas reciben datos pre-calculados (no llaman a `forecastEngine.ts`):

| Componente | Source | Datos esperados |
|---|---|---|
| `ForecastCard` | [ui/ForecastCard.tsx](../../../src/components/ui/ForecastCard.tsx) | `ProjectForecast` — render del riesgo + fechas + slippage |
| `HitoForecastCard` | [ui/HitoForecastCard.tsx](../../../src/components/ui/HitoForecastCard.tsx) | `HitoForecast` |
| `PersonCapacityCard` | [ui/PersonCapacityCard.tsx](../../../src/components/ui/PersonCapacityCard.tsx) | `PersonCapacity` |
| `CapacityHorizonCard` | [ui/CapacityHorizonCard.tsx](../../../src/components/ui/CapacityHorizonCard.tsx) | `CapacityHorizon` con barra de utilización |
| `CriticalDatesList` | [ui/CriticalDatesList.tsx](../../../src/components/ui/CriticalDatesList.tsx) | `CriticalWindow[]` (buckets de 30/60/90d) |
| `SlippageCostCard` | [ui/SlippageCostCard.tsx](../../../src/components/ui/SlippageCostCard.tsx) | `SlippageCostImpact` |
| `CourseForecastCard` | [ui/CourseForecastCard.tsx](../../../src/components/ui/CourseForecastCard.tsx) | `CourseForecast` |
| `DependencyCard` | [ui/DependencyCard.tsx](../../../src/components/ui/DependencyCard.tsx) | `DependencyAnalysis` items |
| `AnomalyCard` | [ui/AnomalyCard.tsx](../../../src/components/ui/AnomalyCard.tsx) | `Anomaly` items |
| `BacktestCard` | [ui/BacktestCard.tsx](../../../src/components/ui/BacktestCard.tsx) | `BacktestResult` |
| `SnapshotStatusCard` | [ui/SnapshotStatusCard.tsx](../../../src/components/ui/SnapshotStatusCard.tsx) | Estado del histórico semanal |

### Charts (Recharts)

| Componente | Source | Datos esperados |
|---|---|---|
| `ChartCard` | [charts/ChartCard.tsx](../../../src/components/charts/ChartCard.tsx) | Wrapper con título + tooltip + container |
| `EstatusDonutChart` | [charts/EstatusDonutChart.tsx](../../../src/components/charts/EstatusDonutChart.tsx) | `ProjectRecord[]` — donut por estatus |
| `SaludDonutChart` | [charts/SaludDonutChart.tsx](../../../src/components/charts/SaludDonutChart.tsx) | `ProjectRecord[]` — donut por salud |
| `PrioridadBarChart` | [charts/PrioridadBarChart.tsx](../../../src/components/charts/PrioridadBarChart.tsx) | `ProjectRecord[]` — bar chart por prioridad |
| `HitoProgressChart` | [charts/HitoProgressChart.tsx](../../../src/components/charts/HitoProgressChart.tsx) | `ProjectRecord[]` — progreso por hito |
| `ProgresoArquitectoChart` | [charts/ProgresoArquitectoChart.tsx](../../../src/components/charts/ProgresoArquitectoChart.tsx) | `ProjectRecord[]` — progreso por arquitecto |
| `DevWorkloadChart` | [charts/DevWorkloadChart.tsx](../../../src/components/charts/DevWorkloadChart.tsx) | `ProjectRecord[]` — carga por dev |
| `CursosProgressChart` | [charts/CursosProgressChart.tsx](../../../src/components/charts/CursosProgressChart.tsx) | `CursoRecord[]` — progreso de cursos |

Ver detalle por familia: [ui.md](ui.md) y [charts.md](charts.md).
