# `/portafolio` — ProyectosSection

Grid paginado de proyectos con filtros, búsqueda, chip de riesgo de pronóstico y badge stale.

- **Componente:** [src/components/sections/ProyectosSection.tsx](../../../src/components/sections/ProyectosSection.tsx)
- **Página:** [src/pages/portafolio.astro](../../../src/pages/portafolio.astro)
- **LOC:** ~234
- **Filtro PM:** ✅ (`usePersistedFilters` key `proyectos`)
- **Snapshot capture:** ✅

## Datos de entrada

| Hook | Endpoint |
|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` |
| `useSheetData<TareaRecord>` | `/api/tareas` (para `forecastProjects`) |
| `useSheetData<CursoRecord>` | `/api/cursos` (para snapshot capture) |
| `usePersistedFilters` | key `proyectos` — `{ filters: {}, includeDone: false, pageSize: 50 }` |
| `useSnapshotCapture(data, cursosQ.data)` | — |

## Constantes y configuración de filtros

Los filtros estáticos (estatus, salud, prioridad) se definen en `STATIC_FILTER_CONFIGS`. Los filtros dinámicos (arquitecto, DEV, PM, cuatrimestre) se derivan de los datos en `useMemo` para reflejar siempre los valores reales de la hoja:

```ts
const STATIC_FILTER_CONFIGS = [
  { key: 'estatus', label: 'Estatus', options: [
    'On Track','At Risk','Blocked / Critical','Done','Hypercare','On Hold','Upcoming'
  ].map(v => ({ value: v, label: v })), multi: true },
  { key: 'salud', label: 'Salud', options: ['Estable','Requiere atencion','En riesgo']
    .map(v => ({ value: v, label: v })), multi: true },
  { key: 'prioridad', label: 'Prioridad', options: ['Bloqueadora','Crítica','Mayor','Menor','Trivial']
    .map(v => ({ value: v, label: v })), multi: true },
];
```

Arquitecto, DEV, PM y cuatrimestre se generan con `splitMulti` sobre los datos reales del Sheet. Esto evita la necesidad de actualizar listas hardcoded al incorporar personas nuevas o cambiar hitos.

Los filtros `arquitecto` y `dev` se ocultan para roles scopeados (`pm`/`dev`) vía `useScopeView().isScoped`. El filtro PM también se suprime en ese caso (el usuario scopeado ya ve únicamente sus proyectos):

```ts
const filterConfigs = useMemo(
  () => [
    ...STATIC_FILTER_CONFIGS.filter(
      (c) => !isScoped || (c.key !== 'arquitecto' && c.key !== 'dev'),
    ),
    ...(isScoped ? [] : [{ key: 'pm', label: 'PM', options: pmOptions, multi: false }]),
  ],
  [pmOptions, isScoped],
);
```

## Estado persistido vs no persistido

| Estado | Persistido | Razón |
|---|---|---|
| `filters` (Record<string, string[]>) | ✅ | El usuario espera que sus filtros sobrevivan |
| `includeDone` (boolean) | ✅ | Toggle de "incluir terminados" |
| `pageSize` (PageSize) | ✅ | Preferencia duradera del usuario |
| `search` (string) | ❌ | Exploratorio — molesta volver y ver una búsqueda olvidada |
| `page` (number) | ❌ | Paginación es transitoria |
| `snapshots` (WeeklySnapshot[]) | ❌ | Cache local, refresca al mount |

## Filtrado

```ts
const filtered = useMemo(() => {
  let result = data;

  // search
  if (search) {
    result = result.filter((p) =>
      p.actividad.toLowerCase().includes(q) || p.folio.toLowerCase().includes(q)
    );
  }

  // includeDone (off por default; oculta Done)
  if (!includeDone && !activeFilters.estatus?.includes('Done')) {
    result = result.filter((p) => p.estatus !== 'Done');
  }

  // filtros dinámicos
  for (const [key, values] of Object.entries(activeFilters)) {
    if (!values.length) continue;
    if (key === 'dev') {
      // multi-value en p.devs[]
      result = result.filter((p) => p.devs.some((d) => values.includes(d)));
    } else {
      // match exacto contra el campo
      result = result.filter((p) => values.includes(String((p as any)[key] || '')));
    }
  }

  return result;
}, [data, activeFilters, search, includeDone]);
```

Casos especiales:

- **`dev`** es el único filtro que cruza un array (proyecto tiene múltiples devs). `some()` para "al menos un dev coincide".
- **`Done`** está oculto por default. Si el user incluye "Done" como filtro de estatus, se respeta independientemente del toggle.

### Hidden done counter

```ts
const hiddenDoneCount = useMemo(() => {
  if (includeDone || activeFilters.estatus?.includes('Done')) return 0;
  return data.filter((p) => p.estatus === 'Done').length;
}, [data, includeDone, activeFilters.estatus]);
```

Se muestra como "· N terminados ocultos" debajo del contador principal.

## Forecast map + stale map

```ts
const forecastMap = useMemo(() => {
  const { forecasts } = forecastProjects(data, tareasQ.data);
  const map = new Map<string, typeof forecasts[number]>();
  for (const f of forecasts) map.set(f.project.folio, f);
  return map;
}, [data, tareasQ.data]);

const staleMap = useMemo(() => computeStaleness(data, snapshots), [data, snapshots]);
```

Cada `ProjectCard` recibe `forecast={forecastMap.get(folio)}` y `stale={staleMap.get(folio)}`:

- **forecast** → chip de riesgo (En tiempo / Deslizando / En riesgo / Estancado).
- **stale** → badge "Sin avance N días" si el progreso no se ha movido en ≥14 días según snapshots.

Ver [utils/stale.md](../utils/stale.md) y [utils/forecastEngine.md](../utils/forecastEngine.md).

## Paginación

La sección usa `PaginationControls` de [src/components/ui/PaginationControls.tsx](../../../src/components/ui/PaginationControls.tsx) con el helper `paginate()`:

```ts
const { paged, totalPages, safePage } = paginate(filtered, page, pageSize);
```

`pageSize` es de tipo `PageSize` (number | `'all'`) con default `50`. Las opciones disponibles son las del componente estándar: 12, 24, 50, 100 y Todos. El valor se persiste en `usePersistedFilters` junto al resto del estado.

`safePage` (calculado por `paginate`) protege contra cambios de filtros que reducirían `totalPages` por debajo del `page` actual.

Reset automático a página 0 cuando cambian los filtros o el `pageSize`:

```ts
useMemo(() => setPage(0), [filtered.length]);
// setPageSize también llama setPage(0) explícitamente
```

> **Anti-patrón:** el `useMemo` con side effect (`setPage(0)`) es lo de menos limpio del archivo. Funciona porque React es tolerante, pero idealmente debería ser un `useEffect`. No tocar sin probar — el comportamiento depende del orden de re-renders.

## Botón "Limpiar"

```tsx
onClear={() => { clearPersisted(); setSearch(''); }}
```

Search no está persistido pero sí se limpia junto con los filtros para una UX consistente.

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global).
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session).
- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — `ProjectCard` usa `folioToSlug` para los enlaces.
