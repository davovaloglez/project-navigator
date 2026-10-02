# useSnapshotCapture

## Propósito

Mantener un histórico semanal del estado del portafolio (progreso de proyectos y cursos) sin esfuerzo del usuario ni de las secciones. Cuando una página con datos de proyectos se renderiza, este hook:

1. Sincroniza con el histórico compartido en Google Sheets.
2. Si no se capturó snapshot esta semana, captura uno con los datos actuales.

El histórico alimenta tres sistemas críticos del tablero: el detector de **proyectos stale** ([utils/stale.ts](../../../src/utils/stale.ts)), las **anomalías de ritmo** ([utils/anomalies.ts](../../../src/utils/anomalies.ts)) y el **pronóstico de cursos** ([utils/courseForecast.ts](../../../src/utils/courseForecast.ts)).

Cualquier sección que ya consuma `ProjectRecord[]` puede colaborar al histórico simplemente llamando este hook. Es **passive**: no devuelve nada y no controla cuándo se captura — el guard de 7 días en [utils/snapshots.ts](../../../src/utils/snapshots.ts) decide.

## Source

[../../../src/hooks/useSnapshotCapture.ts](../../../src/hooks/useSnapshotCapture.ts)

## Firma

```ts
export function useSnapshotCapture(
  projects: ProjectRecord[],
  cursos: CursoRecord[] = []
): void;
```

- `projects`: dataset completo (raw, **no filtrado por la UI**). Ver "Casos edge".
- `cursos`: opcional. Si no se pasa, el snapshot sólo registra proyectos.

Returns nada. Es un side-effect-only hook.

## Comportamiento

### Mount

`useEffect` con dependencia `[]` dispara `syncSnapshots()`:

1. `fetchRemoteSnapshots()` lee `GET /api/snapshots`.
2. Combina con los snapshots locales (`loadSnapshots()` de `localStorage['pn-weekly-snapshots']`).
3. Para semanas que existen sólo en local: las upsertea al server (`pushRemoteSnapshot()`).
4. Para semanas que existen sólo en server: las agrega al cache local.
5. Si falla, el `catch` traga el error y se sigue con cache local.

### Cuando llegan datos

Segundo `useEffect` con dependencia `[projects, cursos]`:

1. Si ambos arrays están vacíos, no hace nada (early return) — la sección sigue cargando.
2. Si el rol del usuario es **scopeado** (`pm` o `dev`) — detectado vía `isScopedRole(currentRole())` leyendo `window.__PN_PERMS__` — el hook hace early-return **sin capturar**. Los roles scopeados reciben proyectos/tareas filtrados por su identidad (Fase 5); capturar ese dataset parcial corrompería el histórico. El cron server-side `/api/snapshots/auto-capture` es la fuente autoritativa del snapshot completo.
3. En cuanto al menos uno tiene datos y el rol no está scopeado, llama `captureSnapshot(projects, cursos)`.

`captureSnapshot` internamente:

- Calcula el `weekKey` ISO de la semana actual (e.g. `2026-W19`).
- Lee los snapshots locales y busca si ya existe ese `weekKey`.
- Si la última captura tiene menos de 7 días, **no captura** (guard).
- Si pasa el guard, construye el `WeeklySnapshot` con progreso por proyecto y por curso, lo persiste en `localStorage['pn-weekly-snapshots']` y dispara `pushRemoteSnapshot()` para subirlo al Sheet.

### Re-render con datos cambiados

Si `projects` cambia de referencia (e.g. tras un refetch del endpoint), el effect vuelve a correr. El guard de 7 días previene capturas duplicadas. En la práctica esto es "no-op" la segunda vez.

### Unmount

Sin cleanup. `syncSnapshots()` y `captureSnapshot()` corren a fire-and-forget; si la promesa termina después del unmount no afecta al componente porque el hook no maneja estado React.

## Estado interno

Ninguno. No usa `useState` ni `useRef`. Toda la persistencia vive en [utils/snapshots.ts](../../../src/utils/snapshots.ts).

## Side effects

- **Red:**
  - 1 `GET /api/snapshots` en mount (vía `syncSnapshots`).
  - 1+ `POST /api/snapshots` si hay snapshots locales sin contraparte remota (vía `syncSnapshots`).
  - 1 `POST /api/snapshots` si pasa el guard de 7 días en `captureSnapshot`.
- **localStorage:** lecturas y escrituras a `pn-weekly-snapshots`. Format: `WeeklySnapshot[]` agrupado por `weekKey`. Ver [utils/snapshots.ts](../../../src/utils/snapshots.ts).
- **Sin timers, sin abort.** Las llamadas son fire-and-forget; un unmount rápido puede dejar una request en vuelo pero no causa leak porque no hay setState pendiente.

## Persistencia

- **Cliente:** `localStorage['pn-weekly-snapshots']` con un array de `WeeklySnapshot`. Ver shape en [src/utils/snapshots.ts](../../../src/utils/snapshots.ts).
- **Server:** tab `Snapshots` del Google Sheet (columnas: `weekKey`, `capturedAt`, `kind`, `identifier`, `payload` JSON). Upsert por `weekKey` — al insertar una semana, borra primero las filas existentes con ese `weekKey`. Requiere permiso Editor del service account. Ver [api/snapshots.md](../api/snapshots.md).

## Casos edge

- **Roles scopeados (Fase 5):** usuarios con rol `pm` o `dev` reciben un dataset filtrado por identidad desde `/api/proyectos`. El hook detecta el rol vía `isScopedRole(currentRole())` y cancela la captura para no persistir un snapshot parcial. El sync (`syncSnapshots()`) sí corre para todos los roles.
- **Snapshot integrity y filtros de UI:** el hook **debe recibir el dataset completo**, no la versión filtrada por PM o estatus. Si una sección hace `useSnapshotCapture(filtered, ...)` los snapshots sólo verán al PM seleccionado y el histórico queda corrupto. La convención (`allData` para el hook, `data` para la UI) está en [arquitectura/convenciones.md](../arquitectura/convenciones.md).
- **Drop-in en múltiples secciones:** llamar el hook en `/portafolio`, `/dashboard` y `/resumen` al mismo tiempo es seguro. El guard de 7 días asegura que sólo la primera captura efectivamente escribe. Las demás llamadas hacen `syncSnapshots()` (sin daño) y `captureSnapshot()` (no-op por guard).
- **Cron semanal en paralelo:** el endpoint `/api/snapshots/auto-capture` corre los lunes 9am UTC. Si un usuario abre el tablero el mismo lunes antes de las 9, el cliente puede capturar primero; cuando el cron corre encuentra el `weekKey` ya escrito y lo sobrescribe (upsert). Ambos llegan al mismo resultado.
- **Sesión sin localStorage (SSR):** el hook corre en cliente (`client:load`) así que `window` siempre existe. Pero si fuera renderizado server-side, `loadSnapshots()` y `saveLocalSnapshot()` retornan early con `typeof window === 'undefined'`.
- **Sheet sin tab `Snapshots`:** el endpoint la crea automáticamente la primera vez (ver [api/snapshots.md](../api/snapshots.md)).
- **Falla de red:** `syncSnapshots().catch(...)` y `captureSnapshot()` cada uno tiene su catch interno. La sección no ve errores; el snapshot queda sólo en local hasta que la próxima visita lo suba.
- **Reloj del cliente desincronizado:** el guard de 7 días se calcula con `Date.now()` del navegador. Un reloj atrasado podría re-capturar; uno adelantado podría saltarse una semana. Tolerable.

## Patrón de uso

```tsx
// src/components/sections/ProyectosSection.tsx
import { useSheetData } from '../../hooks/useSheetData';
import { useSnapshotCapture } from '../../hooks/useSnapshotCapture';
import type { ProjectRecord, CursoRecord } from '../../utils/dataTransforms';

export default function ProyectosSection() {
  const { data, loading, error } = useSheetData<ProjectRecord>('/api/proyectos');
  const cursosQ = useSheetData<CursoRecord>('/api/cursos');

  // Pasa el dataset RAW al hook. El filtrado de UI viene después.
  useSnapshotCapture(data, cursosQ.data);

  const filtered = useMemo(() => applyFilters(data, activeFilters), [data, activeFilters]);

  return <Grid projects={filtered} />;
}
```

Variante para una sección sin cursos:

```tsx
useSnapshotCapture(data); // cursos default a []
```

Variante en una sección que sólo tiene cursos (raro):

```tsx
useSnapshotCapture([], cursosQ.data);
```

## Convenciones relacionadas

- [arquitectura/convenciones.md](../arquitectura/convenciones.md) — sección "Filtro por PM (convención global)" tiene la regla `allData` vs `data` para snapshot integrity.
- [utils/snapshots.md](../utils/snapshots.md) — detalle de `WeeklySnapshot`, `captureSnapshot`, `syncSnapshots`, el guard de 7 días.
- [api/snapshots.md](../api/snapshots.md) — contrato de `/api/snapshots` (GET/POST) y de `/api/snapshots/auto-capture` (cron).
