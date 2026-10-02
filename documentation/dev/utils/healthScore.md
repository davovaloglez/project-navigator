# healthScore

Score 0–100 por proyecto cruzando estatus, salud manual, progreso vs esperado, vencimiento, acciones pendientes y prioridad. También expone `generateAlerts`, que emite alertas estáticas (no temporales) por proyecto.

**Source:** [../../../src/utils/healthScore.ts](../../../src/utils/healthScore.ts)

## Tipos públicos

```ts
interface HealthDetail {
  score: number;        // 0-100
  label: string;        // 'Crítico' | 'Bajo' | 'Medio' | 'Bueno' | 'Excelente'
  color: string;        // tailwind text class
  bgColor: string;      // tailwind bg class
  chartColor: string;   // hex para Recharts
  factors: string[];    // explicaciones legibles
}

type AlertType =
  | 'overdue' | 'blocked' | 'at-risk'
  | 'low-progress' | 'action-needed' | 'upcoming-deadline';

interface Alert {
  type: AlertType;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  project: ProjectRecord;
}
```

## Funciones públicas

### `calcHealthScore(p)`

```ts
function calcHealthScore(p: ProjectRecord): HealthDetail
```

#### Algoritmo

Si el proyecto tiene `estatus === 'Cancelado'`, se retorna inmediatamente un `HealthDetail` neutro con `score: 0`, `label: 'Cancelado'`, color slate y factor `'Proyecto cancelado — no cuenta para la salud'`. El score `0` no se usa en agregados: los consumidores filtran por `countsForHealth(estatus)` de [projectStatus.ts](./projectStatus.md).

Para el resto de proyectos: score inicial `60` (neutro). Se suman/restan ajustes y al final se clampa a `[0, 100]`.

**1. Estatus** (rango efectivo: −25 a +30):

| Estatus | Δ | Factor |
|---|---|---|
| `Done` | +30 | "Proyecto completado" |
| `On Track` | +15 | "Estatus On Track" |
| `LaunchPhase` | +12 | "En fase de lanzamiento" |
| `Hypercare` | +10 | "En Hypercare" |
| `Upcoming` | +5 | "Próximo a iniciar" |
| `On Hold` | −5 | "Proyecto pausado" |
| `At Risk` | −15 | "Estatus At Risk" |
| `Blocked / Critical` | −25 | "Bloqueado / Crítico" |

**2. Salud manual** (±10):

| Salud | Δ |
|---|---|
| `Estable` | +10 (sin factor — no se reporta) |
| `Requiere atencion` | −5 |
| `En riesgo` | −10 |

**3. Progreso vs esperado** (sólo si tiene `finEstimado`, `fechaInicio || registro` y no es `Done`):

- `totalDays = end - start`, `elapsed = today - start`.
- `expectedProgress = min(elapsed / totalDays, 1)`.
- `diff = progreso - expectedProgress`.

| Condición | Δ |
|---|---|
| `diff >= 0.1` | +10 ("Progreso adelantado") |
| `diff >= -0.1` | 0 (on track) |
| `diff >= -0.3` | −10 ("Progreso rezagado") |
| `diff < -0.3` | −20 ("Progreso muy rezagado") |

**4. Vencimiento** (sólo si `finEstimado` y estatus no es `Done`/`On Hold` y `today > finEstimado`):

| Días vencido | Δ |
|---|---|
| `> 30` | −15 |
| `> 7` | −10 |
| resto | −5 |

**5. Acciones pendientes**: `accionRequerida` no vacío y estatus ≠ `Done` → −5.

**6. Prioridad** (sólo si no es `Done`):

| Prioridad | Δ |
|---|---|
| `Bloqueadora` | −5 |
| `Crítica` | −3 |

**Clamp:** `max(0, min(100, score))`.

**Etiquetas** (con color Tailwind y hex de chart):

| Score | Label | Text | Hex |
|---|---|---|---|
| `≥ 85` | Excelente | `text-green-400` | `#4ade80` |
| `≥ 65` | Bueno | `text-blue-400` | `#60a5fa` |
| `≥ 45` | Medio | `text-yellow-400` | `#facc15` |
| `≥ 25` | Bajo | `text-orange-400` | `#fb923c` |
| `< 25` | Crítico | `text-red-400` | `#f87171` |

### `generateAlerts(projects)`

```ts
function generateAlerts(projects: ProjectRecord[]): Alert[]
```

Emite alertas para cada proyecto que sea activo según `isActive(estatus)` de [projectStatus.ts](./projectStatus.md) — excluye `Done`, `On Hold` y `Cancelado`. Tipos:

| Tipo | Disparador | Severidad |
|---|---|---|
| `overdue` | `today > finEstimado` | `critical` si > 14 días, `warning` si no |
| `upcoming-deadline` | `0 ≤ daysLeft ≤ 7` y `progreso < 0.9` | `warning` |
| `blocked` | `estatus === 'Blocked / Critical'` | `critical` |
| `at-risk` | `estatus === 'At Risk'` | `warning` |
| `low-progress` | `progreso < 0.2` y prioridad `Bloqueadora`/`Crítica` y no `Upcoming` | `warning` |
| `action-needed` | `accionRequerida` no vacío | `info` |

Orden final: critical → warning → info.

Cada alerta incluye `title` con la actividad y `description` con el folio entrecomillado para coherencia con la UI.

## Quién lo usa

| Caller | Funciones |
|---|---|
| [`ResumenSection`](../../../src/components/sections/ResumenSection.tsx) | `calcHealthScore` (KPI + gauge), `generateAlerts` |
| [`AlertasSection`](../../../src/components/sections/AlertasSection.tsx) | `generateAlerts` (combina con `generateForecastAlerts`) |
| [`DashboardSection`](../../../src/components/sections/DashboardSection.tsx) | `calcHealthScore` para widget de health |
| [`ProyectoDetailSection`](../../../src/components/sections/ProyectoDetailSection.tsx) | `calcHealthScore` (factores en panel lateral) |
| [`PersonaDetailSection`](../../../src/components/sections/PersonaDetailSection.tsx) | `calcHealthScore` (promedio por persona) |
| [`MetricasDevSection`](../../../src/components/sections/MetricasDevSection.tsx) | `calcHealthScore` (columna en tabla) |
| [`TimelineSection`](../../../src/components/sections/TimelineSection.tsx) | `calcHealthScore` (color de barras) |

## Casos de borde

- **`fechaInicio` ausente**: cae al fallback `p.registro`. Si ambos faltan, la sección 3 se omite (no aporta señal).
- **`finEstimado` ausente**: secciones 3 y 4 se omiten. Score depende sólo de estatus + salud + acciones + prioridad.
- **`Done` con vencimiento**: la sección 4 lo excluye (`estatus !== 'Done'`). Un proyecto cerrado tarde igualmente sale como `Excelente` por el +30 del estatus.
- **`On Hold` vencido**: también excluido de la sección 4. Asumimos que la pausa justifica el atraso.
- **Score negativo o > 100**: imposible por el clamp final, pero los ajustes intermedios sí pueden salirse antes del clamp.
- **`upcoming-deadline` y `overdue` simultáneos**: imposibles por construcción (`daysLeft >= 0` vs `today > end`).
- **`low-progress` excluye `Upcoming`** porque un proyecto que aún no empieza no debe verse alertado por progreso bajo.

## Detalles no obvios

- **`TODAY` se calcula una vez al cargar el módulo** (`const TODAY = new Date(); TODAY.setHours(0,0,0,0)`). En tests o sesiones muy largas el valor queda fijo; en práctica la página se monta fresh por request SSR, así que no es problema.
- **El factor "Estatus On Track" no incluye un signo positivo en su texto**: la UI muestra los factores en orden de importancia, no en sentido pos/neg. El consumer interpreta el factor en contexto del score.
- **El label `'Bueno'` se rinde con `text-blue-400` en `HealthDetail`**: pero el comentario inline en el código menciona `Alto`. El comentario está desactualizado; la implementación devuelve `'Bueno'` (que es lo correcto según la UI).
- **Las alertas de `generateAlerts` NO usan snapshots ni forecasts**: para señales temporales/predictivas existe `generateForecastAlerts` en [forecastAlerts.md](./forecastAlerts.md). Ambas se concatenan en `/alertas`.
