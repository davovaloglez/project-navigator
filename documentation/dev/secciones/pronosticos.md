# `/pronosticos` — PronosticosSection

Hub del motor determinista de pronóstico. Cruza Projects + tareas (App/Core) + snapshots semanales para producir fechas proyectadas, etiquetas de riesgo, capacidad, dependencias, fechas críticas, costos de slippage y backtesting — todo en seis tabs.

- **Componente:** [src/components/sections/PronosticosSection.tsx](../../../src/components/sections/PronosticosSection.tsx)
- **Página:** [src/pages/pronosticos.astro](../../../src/pages/pronosticos.astro)
- **LOC:** ~1340 (incluye sub-componentes `MethodologyTab` y `MethodCard`)
- **Filtro PM:** ✅ (vía `FilterDropdowns` en la tab Proyectos, no a nivel sección)
- **Snapshot capture:** ✅ (`useSnapshotCapture(projects, cursos)`)

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Base para todos los forecasts |
| `useSheetData<TareaRecord>` | `/api/tareas` | Velocity + estimation bias + capacity por persona |
| `useSheetData<CostoRecord>` | `/api/costos` | `computeSlippageCostImpact()` |
| `useSheetData<CursoRecord>` | `/api/cursos` | Snapshot capture + `computeCourseForecasts` |
| `loadSnapshots()` | `localStorage['pn-weekly-snapshots']` | Backtest, anomalías, stale, course forecast |
| `useSnapshotCapture(projects, cursos)` | — | Captura semanal pasiva con guard de 7 días |
| `usePersistedFilters` | key `pronosticos` — `{ tab, filters: {}, sortBy, pageSize: 50 }` | Estado UI persistido |

## Estado persistido (key `pronosticos`)

```ts
{
  tab: 'proyectos' | 'planeacion' | 'dependencias' | 'personas' | 'contexto' | 'metodologia';
  filters: Record<string, string[]>;           // risk / pm / hito
  sortBy: 'risk' | 'slippage' | 'forecast';
  pageSize: PageSize;                          // default 50; compartido por tab Proyectos y tab Personas
}
```

`page` y `capacityPage` quedan como `useState` local (transitorios). `pageSize` es compartido por las dos listas paginadas de la sección (pronósticos por proyecto en tab Proyectos, y capacidad por persona en tab Personas); al cambiar `pageSize` ambas listas resetean a la página 0.

## Tabs

| Tab | Bloques principales | Utils que alimentan |
|---|---|---|
| **proyectos** | Legend + filtros (risk/pm/hito) + sort + grid de `ForecastCard` paginado (`pageSize`, default 50) | `forecastProjects()`, `riskMeta()`, `computeStaleness()` |
| **planeacion** | Anomalías → costo de slippage → capacidad 4/8/12 sem → cierre por hito → fechas críticas 30/60/90 | `detectAnomalies()`, `computeSlippageCostImpact()`, `computeCapacityProjection()`, `aggregateByHito()`, `computeCriticalDates()` |
| **dependencias** | Grid de `DependencyCard` para proyectos con `requiereDe` poblado + bloqueadores de tipo persona con avatar y link | `analyzeDependencies(projects, forecastById, equipoLookup)` |
| **personas** | Capacidad por persona (paginado con `pageSize` compartido) + finalización de cursos | `computePersonCapacity()`, `computeCourseForecasts(cursos, snapshots)` |
| **contexto** | Backtest del motor + estado de snapshots + velocity + estimation bias + baseline histórico + método resumido | `runBacktest()`, `snapshotStats()`, `computeTeamVelocity()`, `computeEstimationBias()`, `computePortfolioBaseline()` |
| **metodologia** | 13 `MethodCard` documentando cada método del motor + limitaciones honestas + ideas de mejora | (sólo prosa, ningún cálculo) |

## KPIs (cabecera, 6 tarjetas)

`useMemo` sobre `activeForecasts` (excluye `risk === 'done'`):

| KPI | Definición |
|---|---|
| Proyectos proyectados | `activeForecasts.length` |
| En tiempo | count de `risk === 'on-track'` |
| Deslizando | count de `risk === 'slipping'` |
| En riesgo | count de `risk === 'at-risk' \|\| 'stalled'` (highlight si > 0) |
| Desvío promedio | Media de `slippageDays` no-null. Color: rojo > 7d, ámbar > 0d, verde ≤ 0d |
| Datos stale | `staleCount(staleMap)` (proyectos sin avance ≥14d según snapshots) |

## Cálculos memoizados

```ts
const { forecasts, velocity, bias } = useMemo(
  () => forecastProjects(projectsQ.data, tareasQ.data),
  [projectsQ.data, tareasQ.data]
);

const baseline       = useMemo(() => computePortfolioBaseline(projectsQ.data),                   [projectsQ.data]);
const capacity       = useMemo(() => computePersonCapacity(tareasQ.data),                        [tareasQ.data]);
const hitoForecasts  = useMemo(() => aggregateByHito(forecasts),                                 [forecasts]);
const capacityHorizons = useMemo(() => computeCapacityProjection(forecasts, velocity),           [forecasts, velocity]);
const criticalWindows  = useMemo(() => computeCriticalDates(forecasts),                          [forecasts]);
const slippageCost     = useMemo(() => computeSlippageCostImpact(forecasts, projects, costos),   [forecasts, projects, costos]);
const courseForecasts  = useMemo(() => computeCourseForecasts(cursosQ.data, snapshots),          [cursosQ.data, snapshots]);
const backtest         = useMemo(() => runBacktest(snapshots, projectsQ.data),                   [snapshots, projectsQ.data]);
const staleMap         = useMemo(() => computeStaleness(projectsQ.data, snapshots),              [projectsQ.data, snapshots]);
const anomalies        = useMemo(() => detectAnomalies(projectsQ.data, snapshots),               [projectsQ.data, snapshots]);
const dependencies     = useMemo(() => analyzeDependencies(projectsQ.data, forecastByFolio),     [projectsQ.data, forecastByFolio]);
```

Ver [utils/forecastEngine.ts](../../../src/utils/forecastEngine.ts) para firmas completas.

## Filtrado y orden (tab Proyectos)

```ts
const filtered = activeForecasts.filter(f =>
  (!filters.risk?.length  || filters.risk.includes(f.risk))         &&
  (!filters.pm?.length    || filters.pm.includes(f.project.pm))     &&
  (!filters.hito?.length  || filters.hito.includes(f.project.hito))
);

const RISK_ORDER: ForecastRisk[] = ['at-risk', 'stalled', 'slipping', 'on-track', 'done', 'insufficient-data'];

// sortBy:
//   'risk'      → RISK_ORDER index, tie-break por slippageDays desc
//   'slippage'  → slippageDays desc (nulls al final)
//   'forecast'  → forecastDate asc (cronológico)
```

PM options se derivan dinámicamente de `activeForecasts` (no hardcoded).

## Anti-patrón conocido

- **Anomalías y dependencias mezcladas en distintos tabs.** Las anomalías viven en *Planeación* (vista táctica del PM) pero el bloqueador de dependencias está en su propio tab. Si en el futuro se unifica "señales que afectan al pronóstico" en un solo lugar, considerar mover ambas a *Contexto*.
- **`MethodologyTab` está inline en el archivo.** 13 `MethodCard` × ~30 líneas cada uno hacen que el archivo supere 1300 LOC. Extraerlo a `src/components/forecast/MethodologyTab.tsx` reduciría carga cognitiva al editar lógica de la sección principal.

## Sub-componentes especializados

| Componente | Propósito |
|---|---|
| `ForecastCard` | Tarjeta por proyecto con riesgo, fecha, banda, badge stale |
| `HitoForecastCard` | Agregado por hito con peor riesgo y cierre proyectado |
| `CapacityHorizonCard` | Tarjeta de oferta/demanda por horizonte (4/8/12 sem) |
| `CriticalDatesList` | Lista cronológica de fechas en ventanas 30/60/90 |
| `SlippageCostCard` | Impacto monetario agregado del slippage del portafolio |
| `PersonCapacityCard` | Velocity + pendientes + ETA por persona |
| `CourseForecastCard` | Proyección de cierre de curso por colaborador |
| `BacktestCard` | MAE + sesgo + % dentro de ±7d/±14d |
| `SnapshotStatusCard` | Estado del histórico de snapshots + acciones (capturar/sync) |
| `AnomalyCard` | Slowdown/stall/aceleración detectada |
| `DependencyCard` | Bloqueadores resueltos/activos del proyecto |

Todos viven en [src/components/ui/](../../../src/components/ui/).

## Loading / error / empty

- **Loading:** 5 KPI skeletons (h-28) + 6 grid skeletons (h-44).
- **Error:** card roja con `Reintentar` (refetch de proyectos y tareas).
- **Empty en Proyectos:** "Sin proyectos para proyectar con los filtros actuales."
- **Empty en Dependencias:** "Ningún proyecto tiene dependencias declaradas en `requiereDe`."
- **Empty en Personas/cursos:** mensaje específico explicando que el ritmo requiere snapshots acumulados.

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global) — opciones derivadas, sin contaminar `useSnapshotCapture`.
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — `tab`, `filters`, `sortBy` y `pageSize` persistidos; `page`, `capacityPage` no.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — 1 `GlossaryTooltip` por bloque + `infoFor()` en KPIs.
- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — `ForecastCard` enlaza a `/pronosticos/<folioSlug>` y `/proyecto/<folioSlug>`.
