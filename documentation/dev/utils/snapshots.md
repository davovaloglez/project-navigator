# snapshots

Persistencia semanal del estado del portafolio. Capa híbrida `localStorage` + Google Sheets que alimenta a [`stale`](./stale.md), [`anomalies`](./anomalies.md), [`backtest`](./backtest.md) y [`courseForecast`](./courseForecast.md). Es el único utility con side-effects.

**Source:** [../../../src/utils/snapshots.ts](../../../src/utils/snapshots.ts)

## Por qué existe

El Sheet `proyectos` no guarda historia: el `progreso` se sobreescribe cada semana. Para detectar proyectos estancados, anomalías de ritmo y validar el motor de pronóstico, necesitamos snapshots periódicos. La solución elegida:

1. **Cliente captura**: cada usuario que abra el tablero, si pasaron ≥ 7 días desde el último snapshot, captura uno nuevo en su `localStorage` y lo sube a **Turso** (`tabla snapshot`) vía `POST /api/snapshots`.
2. **Cron (scheduler externo)**: cada lunes 9 UTC, un scheduler externo (AWS EventBridge Scheduler) invoca [`/api/snapshots/auto-capture`](../api/snapshots-auto-capture.md), que corre server-side y upserta en Turso. Garantiza que haya snapshot semanal incluso si nadie abre el tablero.
3. **Sync al cargar**: el hook [`useSnapshotCapture`](../hooks/useSnapshotCapture.md) hace merge de remote → local al mount, manteniendo cross-device.

El almacenamiento ya **no es la tab `Snapshots` del Sheet** — desde mayo 2026 es la tabla `snapshot` de Turso. El identifier de proyecto es `ProjectRecord.id` (antes era `folio`). La tab del Sheet queda como historial de auditoría pasiva.

## Constantes

```ts
const STORAGE_KEY = 'pn-weekly-snapshots';
const MAX_WEEKS = 52;        // poda histórica
const MS_DAY = 86400000;
```

## Tipos públicos

```ts
interface ProjectSnapshotEntry {
  id: string;           // ProjectRecord.id — identidad canónica (NUEVO)
  folio: string;        // display; preservado en payload para render
  actividad: string;
  progreso: number;
  finEstimado: string;
  finReal: string;
  estatus: string;
}

interface CursoSnapshotEntry {
  colaborador: string;  // nombre display (del payload); identifier puede ser equipo.id o fullName
  progreso: number;
}

interface WeeklySnapshot {
  weekKey: string;      // ISO date del lunes (YYYY-MM-DD)
  capturedAt: string;   // ISO timestamp
  projects: ProjectSnapshotEntry[];
  cursos: CursoSnapshotEntry[];
}
```

## Funciones públicas

### `loadSnapshots()`

```ts
function loadSnapshots(): WeeklySnapshot[]
```

Lee y parsea `localStorage[STORAGE_KEY]`. Filtra entradas inválidas y ordena por `weekKey` asc. SSR-safe: si no hay `window`, retorna `[]`.

### `saveSnapshots(snapshots)`

```ts
function saveSnapshots(snapshots: WeeklySnapshot[]): void
```

Escribe a `localStorage`. Trunca a los últimos `MAX_WEEKS` (52 semanas = 1 año). Silencia errores de quota (try/catch sin throw).

### `captureSnapshot(projects, cursos, opts?)`

```ts
function captureSnapshot(
  projects: ProjectRecord[],
  cursos: CursoRecord[],
  opts?: { force?: boolean }
): { captured: boolean; snapshot: WeeklySnapshot | null }
```

#### Guard de 7 días

1. Si no hay `window` o ambos datasets están vacíos: retorna `{ captured: false }`.
2. Carga snapshots existentes.
3. `currentWeek = weekKey(today)` (lunes ISO).
4. Si `!force && existing.length > 0`:
   - Si el último snapshot es de la semana actual → retorna `{ captured: false, snapshot: last }`.
   - Si el último snapshot es de hace `< 7` días (medido contra `weekKey`) → retorna `{ captured: false, snapshot: last }`.
5. Si pasa el guard: construye `snapshot` minimal (sólo los campos que necesitan stale/anomalies/backtest/courseForecast).
6. Reemplaza cualquier snapshot existente del mismo `weekKey` (de-dupe), persiste local, y lanza `pushRemoteSnapshot(snapshot)` fire-and-forget.

#### `weekKey` algorithm

```ts
function weekKey(d: Date): string {
  const day = d.getDay();              // 0=Sun, 1=Mon, ..., 6=Sat
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().split('T')[0];
}
```

Para un domingo, `(0 + 6) % 7 = 6` días atrás → lunes pasado. Para un lunes, `0` días. Esto produce el ISO date del lunes de la semana.

### `fetchRemoteSnapshots()` · `pushRemoteSnapshot(snapshot)`

Wrappers de `fetch` contra [`/api/snapshots`](../api/snapshots.md):

```ts
function fetchRemoteSnapshots(): Promise<WeeklySnapshot[]>
function pushRemoteSnapshot(snapshot: WeeklySnapshot): Promise<boolean>
```

Cualquier error (red, 401, parse) se silencia retornando `[]` o `false`. La capa local sigue siendo source-of-truth en sesión.

### `syncSnapshots()`

```ts
function syncSnapshots(): Promise<{
  synced: boolean;
  total: number;
  snapshots: WeeklySnapshot[];
}>
```

Merge bidireccional remote ↔ local:

1. Lee local + remote.
2. Construye `Map<weekKey, WeeklySnapshot>` insertando local primero, luego remote (**remote wins** por `weekKey` duplicado: la fuente compartida es source of truth).
3. Persiste el resultado en `localStorage`.
4. Para snapshots local-only (existen local, no remote): los empuja fire-and-forget con `pushRemoteSnapshot`.
5. Retorna el set unificado.

### `clearSnapshots()`

Borra la entrada de `localStorage`. Útil para tests/reset; no toca el Sheet.

### `snapshotStats(snapshots)`

```ts
function snapshotStats(snapshots): {
  weeks: number;
  firstWeek: string | null;
  lastWeek: string | null;
  projectsTracked: number;
  cursosTracked: number;
}
```

Agregados rápidos para mostrar "12 semanas, 47 proyectos seguidos, 18 colaboradores" en `SnapshotStatusCard`.

## Quién lo usa

| Caller | Funciones |
|---|---|
| [`useSnapshotCapture`](../../../src/hooks/useSnapshotCapture.ts) | `syncSnapshots` + `captureSnapshot` al mount. Punto de entrada principal |
| [`SnapshotStatusCard`](../../../src/components/ui/SnapshotStatusCard.tsx) | `snapshotStats` |
| [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) | `loadSnapshots` para alimentar stale/anomalies/backtest/courseForecast |
| [`PronosticoDetailSection`](../../../src/components/sections/PronosticoDetailSection.tsx) | `loadSnapshots` |
| [`ProyectosSection`](../../../src/components/sections/ProyectosSection.tsx) | `loadSnapshots` (chip stale en cards) |
| [`AlertasSection`](../../../src/components/sections/AlertasSection.tsx) | `loadSnapshots` (alimenta `forecastAlerts`) |
| Indirecta: [`stale`](./stale.md), [`anomalies`](./anomalies.md), [`backtest`](./backtest.md), [`courseForecast`](./courseForecast.md) | importan el tipo `WeeklySnapshot` |

## Casos de borde

- **SSR**: `loadSnapshots`/`saveSnapshots`/`captureSnapshot` chequean `typeof window === 'undefined'` y retornan early. No revientan durante render server.
- **`localStorage` deshabilitado o quota exceeded**: el try/catch en `saveSnapshots` lo silencia; el snapshot vive sólo en memoria de la sesión actual.
- **Datasets vacíos**: `captureSnapshot` retorna `{ captured: false }` para evitar guardar snapshots inútiles.
- **Snapshot duplicado de la misma semana**: `captureSnapshot` lo reemplaza (filtra y reinserta). El endpoint POST hace upsert por `weekKey` en el Sheet.
- **Remote OK pero local desactualizado**: `syncSnapshots` baja remote y reemplaza local (remote wins). Cualquier captura local pendiente que no esté en remote se sube.
- **Push fallido**: la captura local persiste; en el próximo `syncSnapshots` se vuelve a intentar empujar.
- **Snapshots > 52 semanas**: `saveSnapshots` poda al guardar. Si quieres histórico completo, lee del Sheet (la tab `Snapshots` no se poda automáticamente).
- **Forzar captura**: `captureSnapshot(p, c, { force: true })` salta el guard de 7 días. Útil para QA / debugging; no se llama en producción.

## Detalles no obvios

- **Fire-and-forget en `pushRemoteSnapshot`**: la captura local sucede primero y de forma síncrona. El POST se dispara después con `.catch(() => {})` para que el caller no espere I/O ni reciba errores de red. Próximo `syncSnapshots` reconciliará.
- **No cachea el endpoint**: a diferencia de `/api/proyectos` etc., `/api/snapshots` no tiene cache de 5 min (escribe y lee estado mutable).
- **`weekKey` con base "lunes"**: alinea con el ciclo de standup semanal del equipo. Si el cron corre lunes 9 UTC, el primer snapshot de la semana se asigna a esa misma fecha.
- **Tipo `WeeklySnapshot` lo importan stale/anomalies/backtest/courseForecast**: estos utils no llaman funciones de snapshots, sólo reciben el array tipado. Esto permite testar cada uno con snapshots sintéticos sin tocar `localStorage`.
- **`MAX_WEEKS = 52` en cliente, sin límite en Sheet**: la tab `Snapshots` puede acumular indefinidamente; el cliente sólo conserva lo reciente. Si necesitas backfill de >1 año, llama directamente a `fetchRemoteSnapshots`.
- **El snapshot NO incluye `actividad` de cursos** (los cursos sí incluyen `colaborador` pero no el nombre del curso). Esto fue decisión consciente: el Sheet de Cursos no tiene curso individual, sólo "% global" por persona.
