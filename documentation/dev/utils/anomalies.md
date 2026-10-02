# anomalies

Detecta cambios abruptos de ritmo en proyectos activos: desaceleración, detención total y aceleración. Compara el rate reciente (último snapshot → today) contra el baseline (primer snapshot → último snapshot).

**Source:** [../../../src/utils/anomalies.ts](../../../src/utils/anomalies.ts)

## Tipos públicos

```ts
type AnomalyKind = 'slowdown' | 'stall' | 'acceleration';
type AnomalySeverity = 'info' | 'warning' | 'critical';

interface ProjectAnomaly {
  project: ProjectRecord;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  recentRatePerWeek: number;     // pp/sem
  baselineRatePerWeek: number;
  ratio: number;
  reason: string;
  snapshotsUsed: number;
}
```

## Funciones públicas

### `detectAnomalies(projects, snapshots)`

```ts
function detectAnomalies(
  projects: ProjectRecord[],
  snapshots: WeeklySnapshot[],
): ProjectAnomaly[]
```

#### Algoritmo

1. Agrupa snapshots por folio.
2. Para cada proyecto activo según `isActive(estatus)` de [projectStatus.ts](./projectStatus.md) (excluye `Done`, `On Hold` y `Cancelado`) con ≥ 2 snapshots:
   - `lastSnap = history[N-1]`, `firstSnap = history[0]`.
   - **Recent**: desde `lastSnap.weekKey` hasta `today`, usando `current = project.progreso` (valor live).
     - `weeksRecent = days / 7` (mínimo 1 día).
     - `deltaRecent = current - lastSnap.progreso`.
     - `recentRatePerWeek = deltaRecent / weeksRecent`.
   - **Baseline**: desde `firstSnap.weekKey` hasta `lastSnap.weekKey`.
     - Necesita `weeksBaseline >= 1` para considerarse — si no hay 1 semana de historia, skip.
     - `deltaBaseline = lastSnap.progreso - firstSnap.progreso`.
     - `baselineRatePerWeek = deltaBaseline / weeksBaseline`.
   - `ratio = recentRatePerWeek / baselineRatePerWeek` (cuando baseline > 0).
3. Clasifica:

| Condición | Kind | Severidad |
|---|---|---|
| `baseline >= 0.5` y `recent <= 0.1` | `stall` | `critical` |
| `baseline >= 0.5` y `0 < ratio <= 0.3` | `slowdown` | `critical` si `ratio < 0.15`, sino `warning` |
| `baseline > 0` y `ratio >= 2` | `acceleration` | `info` |

4. Ordena: critical → warning → info; tiebreak por `|ratio - 1|` desc (los más extremos primero).

### `anomalyMeta(kind)`

Devuelve `{ label, color, bg, border }` con clases Tailwind:

| Kind | Label | Color |
|---|---|---|
| `stall` | "Detenido" | rojo |
| `slowdown` | "Desaceleración" | ámbar |
| `acceleration` | "Aceleración" | verde |

## Quién lo usa

| Caller | Uso |
|---|---|
| [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) | Tab "Proyectos" → lista de anomalías |
| [`AlertasSection`](../../../src/components/sections/AlertasSection.tsx) | Pasa a `generateForecastAlerts` |
| [`AnomalyCard`](../../../src/components/ui/AnomalyCard.tsx) | Render por anomalía + `anomalyMeta` |

## Casos de borde

- **Snapshots vacíos**: retorna `[]`.
- **Proyecto con `< 2` snapshots**: skip; no hay suficiente historia.
- **`weeksBaseline < 1`** (snapshots demasiado cercanos): skip.
- **`baselineRatePerWeek <= 0`**: nunca se categoriza como `slowdown` ni `acceleration` (necesitan baseline > 0). Sí podría salir como `stall` si baseline está negativo, pero la condición `baseline >= 0.5` filtra esos casos.
- **Stall vs slowdown**: ambos requieren `baseline >= 0.5`. La diferencia: stall mira valor absoluto (`recent <= 0.1`), slowdown mira ratio (`<= 0.3`). Un proyecto con baseline 0.6 y recent 0.05 entraría a stall, no a slowdown.
- **Acceleration es `info`**: no se promueve a alerta crítica porque no es necesariamente malo (a veces es esperado tras un blocker que se libera).
- **`ratio` se calcula sólo cuando `baseline > 0`**: si baseline es 0 (proyecto estancado desde siempre) → `ratio = 0`, no se clasifica como acceleration aunque `recent` sea alto.

## Detalles no obvios

- **Valor live como "punto reciente"**: en lugar de comparar últimos dos snapshots, usa `project.progreso` actual. Esto detecta movimientos sub-semanales y permite reaccionar antes del próximo cron.
- **Unidad: "pp/sem" (puntos porcentuales por semana)**: como `progreso` es 0–1, un rate de `0.05` significa 5 puntos porcentuales por semana. El `reason` lo formatea con `.toFixed(1)` para mostrar `5.0 pp/sem`.
- **Solo proyectos activos**: igual que [`stale`](./stale.md), los `Done`/`On Hold` se excluyen. Tiene sentido: la anomalía busca señalar urgencia, y un proyecto pausado no la genera.
- **El ratio para slowdown crítico es 0.15** (15% del baseline): un proyecto que avanzaba 6 pp/sem y ahora avanza menos de 1 pp/sem es crítico. Si avanza entre 1.0–1.8 pp/sem (15–30% de 6) es warning.
- **No reusa código de [`forecastEngine`](./forecastEngine.md)**: aunque ambos calculan velocidades, esta utility trabaja sobre snapshots de progreso de proyecto (no tareas completadas). La granularidad es distinta: forecastEngine usa tareas con `fin` y `puntos`; anomalies usa el progreso global del proyecto.
