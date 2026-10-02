# `/pronosticos/[id]` — PronosticoDetailSection

Vista profunda de un proyecto bajo el motor de pronóstico. Combina la fecha proyectada, los factores que la mueven, la banda optimista–pesimista, el costo proyectado por desvío y un panel **what-if** para simular extensiones del compromiso.

- **Componente:** [src/components/sections/PronosticoDetailSection.tsx](../../../src/components/sections/PronosticoDetailSection.tsx)
- **Página:** [src/pages/pronosticos/[id].astro](../../../src/pages/pronosticos/[id].astro)
- **LOC:** ~937
- **Filtro PM:** — (vista de un solo proyecto)
- **Snapshot capture:** — (sólo lee snapshots para `staleInfo`)

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Encuentra proyecto por `id` |
| `useSheetData<TareaRecord>` | `/api/tareas` | `computeTeamVelocity()` para banda y σ |
| `useSheetData<CostoRecord>` | `/api/costos` | `estimateProjectCost()` → costo mensual prorrateado |
| `loadSnapshots()` (mount) | `localStorage['pn-weekly-snapshots']` | `computeStaleness` para detectar progreso obsoleto |

`folio` se resuelve con `slugToFolio(folio)` (URL-safe `H--PROJECT-34` → `H/PROJECT-34`).

## Cálculos memoizados

```ts
const project    = projectsQ.data.find(p => p.folio === realFolio) ?? null;
const velocity   = useMemo(() => computeTeamVelocity(tareasQ.data),                       [tareasQ.data]);
const baseline   = useMemo(() => computePortfolioBaseline(projectsQ.data),                [projectsQ.data]);
const forecast   = useMemo(() => project ? forecastProject(project, velocity) : null,     [project, velocity]);
const staleInfo  = useMemo(() => computeStaleness([project], snapshots).get(folio)|| null,[project, snapshots]);
const projectCost = useMemo(() => estimateProjectCost(project, projects, costos),          [project, projects, costos]);
```

Ver [utils/forecastEngine.ts](../../../src/utils/forecastEngine.ts) para `forecastProject()` (extrapolación lineal + banda CV + etiqueta de riesgo + probabilidad CDF normal).

## Bloques visuales

| Bloque | Contenido | Glossary id |
|---|---|---|
| Hero | Nombre + chip riesgo + chip probabilidad + confianza + hito + PM + CTA "Ver proyecto" | `pronosticos-detalle-hero` |
| Metric row (4) | Progreso actual, fin estimado, fecha pronóstico, desvío vs plan | `pronosticos-detalle-*` |
| Timeline | Barra horizontal con marcadores Inicio / Hoy / Fin estimado / Pronóstico + banda optimista–pesimista | `pronosticos-detalle-timeline` |
| Factores del pronóstico | Lista de `RiskFactor` (positive/neutral/warn/bad) | `pronosticos-detalle-factores` |
| Escenarios | Tres fechas: optimista / más probable / pesimista | `pronosticos-detalle-escenarios` |
| WhatIfPanel | Slider de días + comparación lado a lado + delta de costo | `pronosticos-detalle-whatif` |
| Context row (3) | Velocity del equipo / Baseline del portafolio / Reglas del riesgo | `pronosticos-detalle-velocity / baseline / reglas-riesgo` |

## Factores (lista derivada)

`useMemo<RiskFactor[]>` que clasifica señales en `positive | neutral | warn | bad`:

| Disparador | Tono | Detalle |
|---|---|---|
| `gap progreso > 30pp` | bad | "Gap de progreso severo (escala riesgo)" |
| `gap progreso > 10pp` | warn | "Gap moderado" |
| `gap progreso < −10pp` | positive | "Progreso adelantado" |
| `slippageDays > 14` | bad | "Desvío significativo (>14d)" |
| `slippageDays > 3` | warn | "Desvío moderado (4–14d)" |
| `slippageDays < −3` | positive | "Entrega anticipada proyectada" |
| `velocity.weeks > 0` | tono por CV | "Variabilidad del equipo: N%" (verde <30%, ámbar 30–60%, rojo ≥60%) |
| `velocity.weeks === 0` | warn | "Sin historial de velocity — banda por defecto" |
| `forecast.warnings[]` | warn | "Aviso del motor" (cada warning del engine) |
| `risk === 'stalled'` | bad | "Proyecto sin avance" |
| `staleInfo.state === 'stale'` | warn | "Datos potencialmente obsoletos" |

## Timeline (visualización)

```ts
buildTimelineRange({ start, today, planned, forecast, optimistic, pessimistic })
  → { minIso, maxIso, ...todas las marcas }
```

- Eje: `minIso → maxIso` (rango que cubre todos los marcadores).
- Segmento gris claro = "transcurrido" (start → today).
- Banda azul translúcida = `[optimisticIso, pessimisticIso]`.
- Marcadores verticales + diamond marker en `start | today | planned | forecast`.
- Labels en *lanes* con `assignLanes()` para evitar overlap: si dos marcadores están a < 18% de distancia, se apilan en lanes consecutivos.
- Alineación de etiquetas: `start` (left), `end` (right), centro (translate −50%).

## What-if (`WhatIfPanel`)

Sub-componente local que simula la extensión del compromiso sin tocar datos.

### Input editable

- **Slider:** `extraDays` en `[-30, +60]` días, step 1.
- **Botones rápidos:** `-7 / 0 / +7 / +14 / +30`.

### Recalculado on the fly (mismas reglas del motor)

```ts
const simulatedDate = baseDate + extraDays * MS_DAY;
const newSlip       = (forecast.slippageDays ?? 0) + extraDays;

// Riesgo (misma escalera del engine):
//   > 14 → at-risk
//   > 3  → slipping
//   ≤ 3  → on-track
// + gap progreso escalador (>30% → slipping; >50% → at-risk)

// Probabilidad (misma fórmula del engine):
const sigma  = daysToFinish * clamp(velocity.cv || 0.3, 0.15, 0.6);
const newProb = sigma > 0 ? normalCDF(-newSlip / sigma) : null;

// Costo:
const dailyCost              = monthlyCost / 30;
const baseAdditionalCost     = max(0, baseSlip) * dailyCost;
const simulatedAdditionalCost = max(0, newSlip) * dailyCost;
const deltaCost              = simulatedAdditionalCost − baseAdditionalCost;
```

### Renderizado

- Dos cards lado a lado: **Pronóstico actual** (gris) vs **Escenario simulado** (cyan resaltado si `extraDays !== 0`).
- Cada card: fecha + riesgo + desvío + probabilidad + costo adicional.
- Resumen del delta de costo abajo: verde si se reduce, rojo si aumenta, gris si igual.
- `formatMoney` para mostrar abreviado (`$2.3K`), `formatMoneyFull` para tooltip.

### No modifica datos

El simulador es puro: nunca persiste ni hace fetch. Reconstruye los valores con las mismas reglas que `forecastEngine.ts` para que la comparación sea consistente.

## Helpers locales

```ts
const MS_DAY = 86400000;
function today0(): Date            // medianoche local
function erf(x): number            // aprox. Abramowitz para CDF normal
function normalCDF(z): number      // 0.5 * (1 + erf(z/√2))
function buildTimelineRange(...)   // rango y marcas para TimelineBar
function assignLanes(markers)      // lane asignment para labels sin overlap
```

`erf` y `normalCDF` están duplicados aquí y en `forecastEngine.ts` — aceptable porque mantener la fórmula sincronizada es trivial, y evita importar internals.

## Loading / error / empty

- **Loading:** Breadcrumb + hero skeleton + grid skeleton (h-32 / h-60).
- **Error / no encontrado:** card roja "Proyecto no encontrado" o `projectsQ.error`.
- **Sin `forecast`:** mismo render de error (el motor devolvió null por falta de datos).

## Convenciones aplicables

- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — el folio llega URL-safe, se decodifica con `slugToFolio` y se vuelve a codificar con `folioToSlug` para los enlaces.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — un `GlossaryTooltip` por bloque + `MetricTile` con `infoId`.
- [Costos](../arquitectura/convenciones.md#11-costos-prorrateados) — `estimateProjectCost()` reparte el costo mensual del equipo entre todos los proyectos activos asignados a esa persona; no inflar dividiendo por el filtrado.
