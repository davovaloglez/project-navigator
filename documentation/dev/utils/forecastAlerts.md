# forecastAlerts

Agregador de alertas predictivas/temporales. Toma las salidas de [`forecastEngine`](./forecastEngine.md), [`stale`](./stale.md), [`anomalies`](./anomalies.md) y [`dependencies`](./dependencies.md) y produce un único array de `ForecastAlert` ordenadas por severidad. Complementa las alertas estáticas de [`generateAlerts`](./healthScore.md) en `healthScore.ts`.

**Source:** [../../../src/utils/forecastAlerts.ts](../../../src/utils/forecastAlerts.ts)

## Tipos públicos

```ts
type ForecastAlertType =
  | 'forecast-at-risk'
  | 'stale-data'
  | 'anomaly-stall'
  | 'anomaly-slowdown'
  | 'blocker-unresolved'
  | 'blocker-at-risk';

type ForecastAlertSeverity = 'critical' | 'warning' | 'info';

interface ForecastAlert {
  type: ForecastAlertType;
  severity: ForecastAlertSeverity;
  title: string;
  description: string;
  project: ProjectRecord;
}
```

## Funciones públicas

### `generateForecastAlerts(inputs)`

```ts
function generateForecastAlerts(inputs: {
  forecasts: ProjectForecast[];
  staleMap: Map<string, StaleInfo>;
  anomalies: ProjectAnomaly[];
  dependencies: ProjectDependency[];
}): ForecastAlert[]
```

#### Reglas de emisión

| Tipo | Condición | Severidad |
|---|---|---|
| `forecast-at-risk` | `f.risk === 'at-risk' \|\| 'stalled'` (y no `done`/`insufficient-data`) | `critical` |
| `stale-data` | `staleMap[folio].state === 'stale'` | `critical` si > 30 días, sino `warning` |
| `anomaly-stall` | Anomalía kind `stall` | `critical` |
| `anomaly-slowdown` | Anomalía kind `slowdown` | `critical` si la anomalía es crítica, sino `warning` |
| `blocker-at-risk` | Dependencia con ≥ 1 bloqueador en `at-risk` | `critical` |
| `blocker-unresolved` | Dependencia con bloqueadores `active` (sin `at-risk`) | `warning` |

#### Detalles por tipo

- **`forecast-at-risk`**: descripción incluye `+Xd vs fin estimado` y `% probabilidad a tiempo` si están disponibles. Fallback: `Motor clasifica como "<risk>"`.
- **`stale-data`**: usa el `reason` provisto por `computeStaleness` (ya prosa legible). Severidad escala con `daysSinceLastMove > 30`.
- **`anomaly-stall` / `anomaly-slowdown`**: copia el `reason` del `ProjectAnomaly`. La severidad para slowdown sigue al `anomaly.severity` (que ya considera `ratio < 0.15`).
- **`blocker-at-risk`**: lista hasta 3 nombres de actividades en riesgo, agrega `…` si hay más, y opcionalmente `+Xd por cascada` si `additionalSlippageDays`.
- **`blocker-unresolved`**: similar pero sólo bloqueadores `active`. Si no hay nombres legibles → no emite alerta (evita alerta sin contenido).

#### Orden

```ts
const severityOrder = { critical: 0, warning: 1, info: 2 };
out.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
```

### `forecastAlertTypeMeta(type)`

Helper para UI que devuelve `{ label }` legible por tipo. No incluye color/bg (el coloreado se hace por severidad).

## Quién lo usa

| Caller | Uso |
|---|---|
| [`AlertasSection`](../../../src/components/sections/AlertasSection.tsx) | Concatena `generateAlerts(projects)` + `generateForecastAlerts(...)` y rinde la lista unificada |

## Casos de borde

- **Proyecto en `done` o `insufficient-data`**: nunca emite `forecast-at-risk`. Otros tipos (stale/anomaly) tampoco aplican porque sus utilities ya excluyen `Done`/`On Hold` upstream.
- **Múltiples alertas para el mismo proyecto**: posible y esperado. Un proyecto puede ser simultáneamente `forecast-at-risk`, `stale-data` y `blocker-unresolved`. La UI las muestra como entradas independientes; el orden por severidad las agrupa naturalmente.
- **`staleMap` con folio no presente en `forecasts`**: la función busca `forecasts.find(f => f.project.folio === folio)`. Si no encuentra, skip silencioso. Evita emitir alertas para proyectos filtrados.
- **`unresolvedBlockerCount === 0`**: no se emite ninguna alerta tipo `blocker-*`.
- **Bloqueadores con `target = null`** (texto libre no identificado): cuentan como `unknown` en `ProjectDependency`. Si entran a `blockers.filter(b => b.status === 'active')` (lo cual no sucede porque `unknown !== 'active'`), no se mostrarían. Lo correcto es que `unknown` no cuente como bloqueador "real"; hoy se incluyen en `unresolvedBlockerCount` pero no en las listas con nombres legibles.

## Detalles no obvios

- **Sólo agrega; no recalcula**: la utility espera que sus 4 inputs vengan precomputados. `AlertasSection` los calcula una sola vez y los pasa.
- **Severidad escala con magnitud**: `stale-data` con 31+ días pasa a `critical`. Esto coincide con el `STALE_THRESHOLD_DAYS = 14` de [`stale`](./stale.md) (14 dispara la flag; 30+ promueve a critical).
- **No emite `info` para acceleration**: las anomalías de tipo `acceleration` se ignoran aquí (no son alerts negativas). Si quisiéramos mostrarlas en la página de alertas, habría que añadir un tipo `anomaly-acceleration` con severidad `info`.
- **`description` se construye en español hardcodeado**: si en el futuro se internacionaliza, este es uno de los lugares a tocar (junto con `healthScore.generateAlerts`).
- **No interactúa con `localStorage` ni endpoints**: utility pura sobre estructuras en memoria.
