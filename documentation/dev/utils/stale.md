# stale

Detecta proyectos cuyo `progreso` no se mueve a lo largo de los snapshots semanales. Marca como `stale` los que tienen ≥ 14 días sin cambio meaningful (≤ 1 punto porcentual de movimiento).

**Source:** [../../../src/utils/stale.ts](../../../src/utils/stale.ts)

## Constantes

```ts
const STALE_THRESHOLD_DAYS = 14;
const STALE_PROGRESS_PP = 0.01;   // 1pp de tolerancia (rounding noise)
```

## Tipos públicos

```ts
type StaleState = 'fresh' | 'stale' | 'unknown';

interface StaleInfo {
  state: StaleState;
  daysSinceLastMove: number | null;
  progressAtLastMove: number | null;
  progressNow: number;
  reason: string;
}
```

## Funciones públicas

### `computeStaleness(projects, snapshots)`

```ts
function computeStaleness(
  projects: ProjectRecord[],
  snapshots: WeeklySnapshot[],
): Map<string, StaleInfo>
```

#### Algoritmo

1. Construye `byId: Map<id, { weekKey, progreso }[]>` agrupando entradas de todos los snapshots por `ProjectRecord.id` (antes era por `folio`).
2. Para cada proyecto:
   - Si `!isActive(estatus)` (i.e. `Done`, `On Hold` o `Cancelado`) → skip (no se mide). Ver [projectStatus.ts](./projectStatus.md).
   - Si no hay historial → `unknown`, razón "Sin snapshots para comparar todavía".
   - Recorre el historial de más reciente a más antiguo buscando el último snapshot cuya diferencia con el progreso actual exceda `STALE_PROGRESS_PP` (1pp). Ese es el "último movimiento".
   - Si no encuentra ningún movimiento (siempre estuvo igual):
     - Calcula días desde el primer snapshot.
     - `>= 14` días → `stale` ("Sin movimiento en X días desde el primer snapshot").
     - `< 14` → `fresh` ("Sin historial suficiente para flagear").
   - Si encontró movimiento:
     - `daysSince = today - moveDate`.
     - `>= 14` → `stale` ("Progreso sin cambios en X días").
     - `< 14` → `fresh` ("Último movimiento hace X días").

### `staleCount(map)`

```ts
function staleCount(map: Map<string, StaleInfo>): number
```

Conveniencia: cuenta cuántos `state === 'stale'` hay en el mapa.

## Quién lo usa

| Caller | Uso |
|---|---|
| [`ProyectosSection`](../../../src/components/sections/ProyectosSection.tsx) | Badge `stale` en `ProjectCard` |
| [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) | Métrica + lista |
| [`PronosticoDetailSection`](../../../src/components/sections/PronosticoDetailSection.tsx) | Panel del proyecto |
| [`AlertasSection`](../../../src/components/sections/AlertasSection.tsx) | Pasa el `StaleInfo` a `generateForecastAlerts` |
| [`ProjectCard`](../../../src/components/ui/ProjectCard.tsx), [`ForecastCard`](../../../src/components/ui/ForecastCard.tsx) | Reciben el `StaleInfo` por props |

## Casos de borde

- **Proyecto sin snapshots**: `unknown`. No genera alerta; sólo aparece sin badge. Mejorará automáticamente cuando se acumulen snapshots.
- **Proyecto con un solo snapshot**: si los 14 días pasaron desde ese snapshot y el progreso actual no se movió → `stale` ("desde el primer snapshot"). Si pasaron menos días → `fresh`.
- **Snapshots con `weekKey` inválido** (no debería ocurrir, pero defensivo): `parseIso` retorna `null` y `daysSince` queda `null`. Estado: `fresh` con razón "Sin datos".
- **Rounding noise**: el `STALE_PROGRESS_PP = 0.01` (1 punto porcentual sobre 0–1) tolera cambios cosméticos. Un proyecto que pasó de 0.42 a 0.421 sigue contando como "sin movimiento".
- **`Done`, `On Hold` o `Cancelado`**: excluidos por `isActive(estatus)`. Un proyecto cerrado, pausado o cancelado no se espera que avance.
- **Filtros temporales en los snapshots**: el caller (sections) puede pasar un subset de snapshots si quiere medir staleness sólo en una ventana específica. La función no asume nada sobre el rango.

## Detalles no obvios

- **Walk de más reciente a más antiguo**: se busca el "último movimiento", no el primero. Esto asegura que si un proyecto se movió hace 20 días pero antes había estado quieto por meses, se reporten los 20 días recientes.
- **Comparación con `progreso` actual (live), no con el último snapshot**: si el último snapshot tiene `progreso = 0.5` y el proyecto ahora marca `0.6`, hay movimiento. Esto permite detectar proyectos que se mueven entre capturas semanales.
- **No clasifica severidad**: sólo `fresh`/`stale`/`unknown`. La severidad la asigna [`forecastAlerts`](./forecastAlerts.md): `critical` si > 30 días, `warning` si no.
- **`daysSinceLastMove`** puede usarse para ordenar la lista de proyectos stale (más antiguos primero) en la UI.
