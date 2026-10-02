# forecastEngine

Motor determinista de pronóstico del portafolio. Calcula fechas de cierre, riesgo, probabilidad on-time, capacidad del equipo, fechas críticas, impacto económico del slippage y baseline histórico. **Sin ML, sin training**: extrapolación lineal de progreso + estadísticas de velocity sobre tareas completadas.

**Source:** [../../../src/utils/forecastEngine.ts](../../../src/utils/forecastEngine.ts)

## Tipos públicos

```ts
type ForecastConfidence = 'high' | 'medium' | 'low';
type ForecastRisk =
  | 'on-track' | 'slipping' | 'at-risk' | 'stalled' | 'done' | 'insufficient-data';

interface TeamVelocityStats {
  weeks: number;             // semanas usadas (≤ windowWeeks)
  meanPoints: number;        // pts/semana promedio
  stddevPoints: number;
  cv: number;                // coefficient of variation (stddev / mean)
  meanTasks: number;         // tareas/semana promedio
  observations: { week: string; puntos: number; tareas: number }[];
}

interface ProjectForecast {
  project: ProjectRecord;
  daysElapsed: number;
  daysPlanned: number | null;
  expectedProgress: number | null;
  actualProgress: number;
  forecastDate: string | null;        // ISO YYYY-MM-DD
  optimisticDate: string | null;
  pessimisticDate: string | null;
  slippageDays: number | null;        // forecast - finEstimado
  confidence: ForecastConfidence;
  risk: ForecastRisk;
  onTimeProbability: number | null;   // 0–1
  warnings: string[];
}
```

Otros tipos: `EstimationBias`, `PortfolioBaseline`, `PersonCapacity`, `HitoForecast`, `CapacityHorizon`, `CapacityStatus`, `CriticalEvent`, `CriticalWindow`, `ProjectCostImpact`, `SlippageCostImpact`.

## Funciones públicas

### `computeTeamVelocity(tareas, windowWeeks = 8)`

```ts
function computeTeamVelocity(tareas: TareaRecord[], windowWeeks?: number): TeamVelocityStats
```

Agrupa tareas completadas por semana ISO (lunes) usando `t.finReal`. Devuelve mean, stddev y CV de los puntos por semana sobre las últimas `windowWeeks` semanas.

- Filtro: `isTareaDone(t.estatus)` (de [dataTransforms.ts](../../../src/utils/dataTransforms.ts)). Reemplaza el anterior `includes('completado')` para coincidir con el campo `estatus` "Done" de la hoja unificada.
- Usa `t.finReal` (no `t.fin` — ese campo ya no existe en `TareaRecord`).
- `weekKey` interno: lunes de la semana de `t.finReal`.
- Si no hay tareas completadas, retorna ceros con `weeks: 0`.

### `computeEstimationBias(tareas)`

```ts
function computeEstimationBias(tareas: TareaRecord[]): { count: number; globalRatio: number }
```

Compara estimado (`t.puntos`) vs real (`t.tracked`) para **todas las tareas** con ambos campos > 0. Ya no filtra sólo App (`t.producto === 'App'`): la hoja unificada `actividades` permite medir el sesgo en todo el portafolio. `globalRatio = totalTracked / totalPuntos`. Devuelve `1` cuando no hay muestras.

### `forecastProject(p, velocity)`

Algoritmo de pronóstico por proyecto:

1. Si `p.estatus === 'Done'` → `risk: 'done'`, sin más cálculo.
2. `start = parseDate(p.fechaInicio) || parseDate(p.registro)`. Si falta → warning "Sin fecha de inicio" y `insufficient-data`.
3. `daysElapsed = max(0, today - start)`. `daysPlanned = start → finEstimado` (mínimo 1).
4. `expectedProgress = min(1, daysElapsed / daysPlanned)`.
5. Si `progreso >= 1` → cierre hoy. `slippage = today - finEstimado`. `risk: 'done'`.
6. Si `progreso <= 0`:
   - `Upcoming` → `insufficient-data`.
   - Cualquier otro estado → `stalled`.
7. Si `daysElapsed < 3` → warning de proyección volátil (continúa el cálculo).
8. `dailyRate = progreso / max(1, daysElapsed)`.
9. `daysToFinishFromToday = (1 - progreso) / dailyRate`.
10. `forecastDate = today + round(daysToFinishFromToday)`.
11. Bandas optimista/pesimista: `spread = clamp(cv, 0.15, 0.6)`. `optimisticDays = daysToFinish * (1 - spread)`, `pessimisticDays = daysToFinish * (1 + spread)`.
12. `slippageDays = forecastDate - finEstimado` (null si no hay `finEstimado`).
13. Clasificación por slippage:
    - `null` → `insufficient-data`.
    - `≤ 3` → `on-track`.
    - `≤ 14` → `slipping`.
    - `> 14` → `at-risk`.
14. Override por gap de progreso esperado:
    - `gap > 0.3` → al menos `slipping`.
    - `gap > 0.5` → fuerza `at-risk`.
15. Confidence:
    - `weeks < 3` → `low`.
    - `cv < 0.3` → `high`.
    - `cv < 0.6` → `medium`.
    - resto → `low`.
16. On-time probability: distribución normal con `μ = daysToFinishFromToday` y `σ = daysToFinishFromToday * spread`. `P = Φ(-slippageDays / σ)`. `Φ` se calcula con aproximación de Abramowitz–Stegun (función `erf`).

### `forecastProjects(projects, tareas)`

```ts
function forecastProjects(projects, tareas): {
  forecasts: ProjectForecast[]; velocity: TeamVelocityStats; bias: EstimationBias;
}
```

Excluye `On Hold` (se asume que no avanza, no aporta señal). Llama a `forecastProject` para cada uno y calcula velocity + bias una sola vez.

### `riskMeta(risk)` · `confidenceMeta(c)` · `probabilityMeta(p)` · `capacityStatusMeta(s)`

Helpers de presentación. Devuelven `{ label, color, bg, … }` con clases Tailwind por estado. Los componentes usan esto en lugar de hardcodear colores para mantener consistencia visual.

`probabilityMeta`:
- `≥ 75%` → verde.
- `≥ 50%` → azul.
- `≥ 25%` → ámbar.
- resto → rojo.

### `computePortfolioBaseline(projects)`

Solo proyectos `Done` con `finEstimado` y `finReal`. Calcula:
- `meanSlippage`, `medianSlippage`, `mae` (mean absolute error) en días.
- `onTimeRate` = % con `|slippage| ≤ 7`.
- `distribution`: 5 buckets (`> 30d antes`, `7–30d antes`, `±7d (en fecha)`, `7–30d tarde`, `> 30d tarde`).
- `worst` / `best`: proyecto con `|slippage|` máximo y mínimo.

Si no hay samples, retorna struct vacío con ceros.

### `computePersonCapacity(tareas, windowWeeks = 8)`

Velocity + carga pendiente por persona:

1. Recolecta todos los `t.asignado` no vacíos.
2. Canonicaliza nombres: si `A` y `B` matchean por `assigneeMatches` (lowercase + `includes` bidireccional) y `B` es más corto, `A` se mapea a `B`. Esto agrupa "Lore" con "Lorena Raquel Olvera Rodriguez".
3. Para cada nombre canónico:
   - Velocity: misma lógica que `computeTeamVelocity` pero por persona, últimas `windowWeeks` semanas. Usa `isTareaDone()` para identificar completadas y `t.finReal` como fecha.
   - Pendientes: tareas donde `!isTareaDone(t.estatus)` y estatus no incluye `cancelado`. Suma `t.puntos`.
   - Overdue: pendientes con `t.finEstimado < today`.
   - `weeksToClear`: si hay puntos pendientes y `velocityPointsWeek > 0` → `pendingPoints / velocityPointsWeek`. Fallback a `pendingTasks / velocityTasksWeek` si no hay puntos. Si no se puede calcular → `null`.
   - `forecastClearDate = today + weeksToClear * 7` cuando aplica.

Orden: personas con backlog primero, luego por `weeksToClear` desc.

### `aggregateByHito(forecasts)`

Agrupa forecasts por `project.hito` ("Sin hito" como fallback). Por grupo:
- `worstRisk`: el de mayor severidad entre forecasts **activos** (no `done`); si todos están `done`, sobre el conjunto completo.
- `aggregateSlippage`: max(forecastDate) - max(plannedDate) en días.
- Conteos por bucket (`at-risk`+`stalled`, `slipping`, `on-track`, `done`).

Orden: por severidad de `worstRisk` desc; tiebreak por `aggregateSlippage` desc. Severidad: `at-risk=5, stalled=4, slipping=3, insufficient-data=2, on-track=1, done=0`.

### `computeCapacityProjection(forecasts, velocity, horizons = [4, 8, 12])`

Supply vs demand para horizontes en semanas:

- `supplyPoints = velocity.meanPoints * weeks`.
- Para cada proyecto activo con `forecastDate`:
  - `remaining = puntos * max(0, 1 - actualProgress)`.
  - `daysRemainingForecast = forecastDate - today` (mínimo 1).
  - `capturedFraction = min(1, horizonDays / daysRemainingForecast)` — qué porción del trabajo cae dentro del horizonte.
  - `demand += remaining * capturedFraction`.
- `utilization = demand / supply`.
- Status:
  - `< 0.7` → `free` ("Holgura").
  - `≤ 0.95` → `healthy` ("Sano").
  - `≤ 1.15` → `saturated` ("Saturado").
  - resto → `overloaded` ("Sobrecarga").

### `computeCriticalDates(forecasts, windows = [30, 60, 90])`

Buckets de eventos de cierre pronosticado por ventana de días, sólo proyectos no `done`. El primer bucket es `[0, w₀]`; los siguientes son `(wᵢ₋₁, wᵢ]`.

### `computeSlippageCostImpact(forecasts, allProjects, costos)`

Costo extra esperado por días de slippage:

- Filtra forecasts con `risk` ≠ `done`/`insufficient-data` y `slippageDays > 0`.
- Para cada uno: `cost = estimateProjectCost(project, allProjects, costos)` (de `costEngine`).
- Si `estimatedMonthlyCost <= 0` → `uncoveredProjects++` y se descarta.
- Si hay costo: `additional = (monthlyCost / 30) * slippageDays`.
- Suma totales, ordena items por `additionalCost` desc.

## Quién lo usa

| Caller | Funciones consumidas |
|---|---|
| [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) | `forecastProjects`, `computePortfolioBaseline`, `computePersonCapacity`, `aggregateByHito`, `computeCapacityProjection`, `computeCriticalDates`, `computeSlippageCostImpact` y todos los `*Meta` |
| [`PronosticoDetailSection`](../../../src/components/sections/PronosticoDetailSection.tsx) | `forecastProject` + `riskMeta`, `confidenceMeta`, `probabilityMeta` (con what-if) |
| [`AlertasSection`](../../../src/components/sections/AlertasSection.tsx) | `forecastProjects` (alimenta `generateForecastAlerts`) |
| [`DashboardSection`](../../../src/components/sections/DashboardSection.tsx) | `forecastProjects` (widgets de pronóstico) |
| [`TimelineSection`](../../../src/components/sections/TimelineSection.tsx) | `forecastProjects` (overlay ghost bar + diamond marker) |
| [`ProyectosSection`](../../../src/components/sections/ProyectosSection.tsx) | `forecastProjects` (chip de riesgo en cards) |
| `ForecastCard`, `HitoForecastCard`, `PersonCapacityCard`, `CapacityHorizonCard`, `CriticalDatesList`, `SlippageCostCard`, `ProjectCard` | Reciben tipos por props |

## Casos de borde

- **Proyecto sin fecha de inicio**: retorna `insufficient-data` con warning. Cae fuera de `forecastDate`.
- **Proyecto con progreso = 0 estando ya iniciado**: `stalled`, sin fecha proyectada.
- **`Upcoming` con progreso 0**: `insufficient-data`, no `stalled` (no ha empezado).
- **CV muy alto o muy bajo**: `spreadFromCV` clampa a `[0.15, 0.6]` para evitar bandas absurdas (CV de 0.05 daría ±5%, lo cual da una falsa precisión).
- **Pocas semanas de historia**: `confidenceFromCV` devuelve `low` si `weeks < 3` independientemente del CV.
- **Sin tareas completadas**: `velocity = {weeks: 0, meanPoints: 0, …}`. Los pronósticos individuales no usan velocity para la fecha (sólo para el spread/probabilidad), así que siguen funcionando.
- **`finEstimado` ausente**: `slippageDays` queda `null`, `risk` baja a `insufficient-data`.
- **Probabilidad on-time**: si `σ <= 0` (caso degenerado con `daysToFinish` o `spread` 0) → `null`.
- **`computePortfolioBaseline` sin samples**: struct vacío, no rompe la UI.
- **`computePersonCapacity` con dos nombres ambiguos**: si "Ale" matchea "Alejandro" y "Alejandra", el primero más corto encontrado gana (no determinista en orden de `Set`). Aceptable porque el caller usa esto como aproximación, no como fuente de verdad.

## Detalles no obvios

- **`assigneeMatches`** vive aquí (no exportada) porque el matching de personas en tareas necesita ser robusto a nicknames. Mismo principio que `nameMatches` en `costEngine.ts` y `PersonaDetailSection.tsx`. No reusa: cada uno con su firma para mantenerlas autónomas.
- **`weekKey`** se calcula localmente (no importado de `snapshots.ts`) para evitar acoplar el motor a la capa de persistencia.
- **`normalCDF` con aproximación de erf**: error < 1.5×10⁻⁷, suficiente para mostrar % redondeado en la UI. No vale la pena traer una lib estadística.
- **`forecastProjects` excluye `On Hold`** pero **`computeSlippageCostImpact` opera sobre los forecasts ya filtrados**, por lo que proyectos `On Hold` no aportan costo extra (correcto: si está pausado, no genera quemado de equipo asignable).
- **Aggregation de hito**: `aggregateSlippage` usa el max de `forecastDate` entre proyectos activos contra el max de `finEstimado` entre todos (incluyendo `done`). Esto refleja "cuándo se cerrará el hito" vs "cuándo se prometió".
