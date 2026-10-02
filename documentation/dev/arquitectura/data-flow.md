# Flujo de datos

Cómo viaja un dato desde el Google Sheet hasta el píxel renderizado.

## Lectura típica (90% de los casos)

```
[Google Sheet]
     │
     │ 1. service account (read-only scope)
     ▼
[/api/<recurso>.ts (SSR lambda)]
     │
     │ 2. parseo por header + cache 5 min
     ▼
[useSheetData<T>(endpoint)  (React hook)]
     │
     │ 3. fetch + retry + abort controller
     ▼
[Section component]
     │
     │ 4. useMemo: KPIs, filtros, agregaciones
     ▼
[Chart / UI components]
     │
     │ 5. props
     ▼
[DOM]
```

### Paso 1 — Google Sheets

Cada endpoint de lectura:

1. Carga `GOOGLE_CREDENTIALS` (JSON del service account) y `SHEET_ID` desde `import.meta.env`.
2. Instancia `google.auth.GoogleAuth` con scope `spreadsheets.readonly` (o `spreadsheets` si necesita escribir).
3. Llama `sheets.spreadsheets.values.get({ spreadsheetId, range })`.

El **range** es siempre la tab + un rango generoso (e.g. `Projects!A1:W200`). Esto asegura que crecer el Sheet no rompe el endpoint hasta que excede el rango.

### Paso 2 — Parseo por header

Patrón estándar (ejemplo en [src/pages/api/proyectos.ts](../../../src/pages/api/proyectos.ts)):

```ts
const headers = rows[0].map((h: string) => h.trim().toLowerCase());
const col = (row: string[], name: string): string => {
  const idx = headers.indexOf(name.toLowerCase());
  return idx >= 0 ? (row[idx] || '').trim() : '';
};

const data = rows.slice(1).map((row) => ({
  folio: col(row, 'folio'),
  actividad: col(row, 'actividad'),
  // …
})).filter((r) => r.folio);
```

**Implicaciones:**

- ✅ Reordenar columnas en el Sheet no rompe el endpoint.
- ✅ Agregar columnas no rompe nada (sólo se ignoran).
- ⚠️ Renombrar un header sí rompe (cae a string vacío). Hay que actualizar el endpoint cuando se renombra.
- ⚠️ Los headers son case-insensitive pero **el matching es exacto**: "Fin Estimado" y "fin estimado" son iguales, pero "fin estimado " (con espacio extra interno) no lo es. `trim()` resuelve los espacios al inicio/final.

**Caracteres especiales:** la tab `Projects` usa "Épica" con acento, parseado como `col(row, 'épica')`. Hay que respetar acentos exactos.

### Paso 3 — Cache en memoria

```ts
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cachedResponse;
```

- Por archivo (por endpoint).
- Por instancia de lambda. Amplify mantiene lambdas warm por unos minutos; entre warm/cold puede haber cache miss inesperados.
- **No** hay invalidación manual. El botón "Refresh" en el header de cada sección dispara un nuevo `fetch` al endpoint, pero si la cache está warm, recibe la misma data.
- Los endpoints **mutantes** (POST/PUT/DELETE de snapshots y user-preferences) **no cachean**.

### Paso 4 — `useSheetData<T>`

[src/hooks/useSheetData.ts](../../../src/hooks/useSheetData.ts) hace fetch con:

- **Retry automático** una sola vez ante error (no 401). El segundo error sí se reporta.
- **Abort controller** — si el endpoint cambia (o el componente se desmonta) cancela el request anterior.
- **401 → redirect a `/login`** con `?redirect=<path>` para volver tras autenticar. Esto cubre el caso de sesión expirada en mitad de una vista.
- **Loading** se mantiene `true` hasta que termina el fetch (o se aborta).

Las secciones consumen `{ data, loading, error, refetch }`.

### Paso 5 — Section component

Cada sección (en [src/components/sections/](../../../src/components/sections/)) sigue el mismo patrón:

```tsx
const { data, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
// otros endpoints si hace falta cruzar datos
const tareasQ = useSheetData<TareaRecord>('/api/tareas');

// Persistencia de filtros/toggles
const { state: persisted, setState, clear } = usePersistedFilters('seccion-key', defaults);

// Cálculos memoizados
const kpis = useMemo(() => /* … */, [data]);
const filtered = useMemo(() => /* … */, [data, persisted.filters, search]);

if (loading) return <SkeletonView />;
if (error) return <ErrorView />;
return <UI />;
```

Las secciones son el **único** lugar donde se mezclan side-effects (hooks de datos) con lógica de presentación.

### Paso 6 — Charts y UI

Reciben sólo props (datos ya transformados + handlers). Idealmente:

- Sin `useEffect`.
- Sin llamadas a hooks de datos.
- Pueden tener estado local de UI (hover, expand, etc.).

## Escritura (snapshots)

```
[useSnapshotCapture(data, cursosData)]    ← drop-in en cualquier sección
     │
     │ 1. guard 7 días (no escribe si ya hay snapshot reciente)
     ▼
[snapshots.ts → buildWeekly + saveToLocal]
     │
     │ 2. localStorage 'pn-weekly-snapshots' (estado optimista)
     ▼
[POST /api/snapshots]
     │
     │ 3. upsert por weekKey (limpia filas del mismo weekKey antes de insertar)
     ▼
[Google Sheet: tab 'Snapshots']
```

El motor de pronóstico ([utils/forecastEngine.ts](../../../src/utils/forecastEngine.ts)) consume snapshots para detectar staleness, anomalías y proyectar fechas.

Ver detalle en [hooks/useSnapshotCapture.md](../hooks/useSnapshotCapture.md) y [utils/snapshots.md](../utils/snapshots.md).

## Persistencia de filtros (server-side)

```
[Section: usePersistedFilters('section-key', defaults)]
     │
     │ 1. mount: load síncrono de localStorage 'pn-prefs-<section-key>'  ← anti-flash
     ▼
[Estado React inicial = local cache OR defaults]
     │
     │ 2. mount: GET /api/user-preferences (async)
     ▼
[Si hay valor remoto: merge con defaults y setState]
     │
     │ 3. cualquier setState:
     │    - update local cache (síncrono)
     │    - debounce 500ms
     │    - PUT /api/user-preferences { sectionKey, value }  ← abort en vuelo
     ▼
[Turso: user_preferences]
```

**Sólo sync al mount.** No hay polling ni websocket. Si abres dos tabs y cambias filtros en una, la otra no se entera hasta que recargues.

Ver [hooks/usePersistedFilters.md](../hooks/usePersistedFilters.md).

## Cruces de datos entre fuentes

Muchas secciones combinan endpoints. Ejemplos:

| Sección | Endpoints que cruza | Razón |
|---|---|---|
| Dashboard | `/api/proyectos` + `/api/cursos` + `/api/costos` + `/api/tareas` | Widgets heterogéneos |
| Pronósticos | `/api/proyectos` + `/api/tareas` | Velocity del equipo viene de tareas, no de proyectos |
| Costos | `/api/proyectos` + `/api/costos` + `/api/costos-modelo` | Estimar costo por proyecto + aplicar modelo |
| Persona detalle | `/api/proyectos` + `/api/tareas` + `/api/cursos` | Perfil completo de la persona |

**Cuidado con el name matching:** los `Projects` usan apodos cortos ("Lore", "Ale") mientras que `Cursos` y `app/Core` usan nombres completos ("Lorena Raquel Olvera Rodriguez"). Cualquier cruce entre estas fuentes debe usar fuzzy bidireccional (`includes()` en ambas direcciones). Ver [arquitectura/convenciones.md](convenciones.md) sección "Name matching".

## Errores y degradación

| Capa | Si falla… | Comportamiento |
|---|---|---|
| Sheets API (cuota / red) | endpoint retorna `500 { error }` | `useSheetData` reintenta 1 vez, luego muestra error en pantalla con botón "Reintentar" |
| Auth (sesión expirada) | endpoint retorna `401` | `useSheetData` redirige a `/login?redirect=<path>` |
| Cache miss en lambda fría | primera carga más lenta | nada visible al usuario más allá de ~1-2s extra |
| Turso (prefs) | hidratación falla silenciosamente | la sección usa cache local + defaults; el user puede operar normal |
| Snapshot write falla | la captura no se realiza esa semana | el `useSnapshotCapture` no bloquea la UI; próxima visita reintenta |
