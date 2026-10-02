# Convenciones del codebase

Reglas que aplican transversalmente. Cualquier sección o componente nuevo debe respetarlas.

## 1. Sections son los únicos consumidores de hooks de datos

Sólo los componentes en [src/components/sections/](../../../src/components/sections/) llaman `useSheetData`, `usePersistedFilters` o `useSnapshotCapture`. Charts y UI reciben datos por props.

**Por qué:** mantiene los componentes reusables y testeables. Permite componer (Storybook, Persona detalle reutilizando el mismo chart, etc.).

**Excepción legítima:** ningún componente UI llama hooks de datos.

## 2. FilterDropdowns usa `{ value, label }`

```tsx
const filterConfigs = [
  { key: 'estatus', label: 'Estatus', options: [{ value: 'On Track', label: 'On Track' }], multi: true },
  // …
];
```

Nunca pasar arrays de strings directamente. El `value` es lo que se compara; `label` es lo que se muestra. Esto permite valores técnicos diferentes de la presentación.

## 3. DataTable es genérica con columnas tipadas

```tsx
<DataTable<MyRecord>
  data={items}
  columns={[
    { key: 'folio', header: 'Folio', render: (row) => row.folio },
    // …
  ]}
/>
```

No crear tablas custom desde cero. Si DataTable no cubre el caso, mejorarla.

## 4. API routes parsean por nombre de header

Patrón obligatorio en cualquier endpoint nuevo que lea Sheets. **Nunca** acceder por índice de columna.

```ts
const headers = rows[0].map((h) => h.trim().toLowerCase());
const col = (row: string[], name: string): string =>
  (row[headers.indexOf(name.toLowerCase())] || '').trim();
```

**Razón:** permite reordenar columnas en el Sheet sin tocar código. Ya pasó varias veces con `Projects`.

## 5. Quoting de ranges con espacios

```ts
// ❌ NO — falla silenciosamente
range: 'Mi Tab!A1:B10'

// ✅ SÍ
range: "'Mi Tab'!A1:B10"
```

## 6. Fechas en la hoja `actividades`: formato legible (ya no seriales de Excel)

La hoja `actividades` (que reemplaza las antiguas `app` y `Core`) usa fechas en formato `dd/mm/yyyy`. El helper `parseDate()` en [src/pages/api/tareas.ts](../../../src/pages/api/tareas.ts) **ya no convierte seriales de Excel** — sólo acepta `dd/mm/yyyy` y fallback a `new Date(trimmed)`. Si algún endpoint nuevo lee una hoja que sí use seriales, debe reintroducir la detección `10000 < n < 80000` de la versión anterior.

## 7. Dashboard config: merge con defaults de rol

Cuando agregas un widget nuevo a `DEFAULT_WIDGETS` en [src/hooks/useDashboardConfig.ts](../../../src/hooks/useDashboardConfig.ts), debe aparecer automáticamente en sesiones existentes. El hook construye primero los "defaults de rol" aplicando `ROLE_WIDGET_DEFAULTS` sobre `DEFAULT_WIDGETS`, y luego hace **merge** entre el config guardado y esos defaults de rol: los widgets nuevos se insertan al final con el `visible` del default del rol del usuario (no el canónico).

Si un widget nuevo debe arrancar diferente para algún rol, agregar su override en `ROLE_WIDGET_DEFAULTS` además de push a `DEFAULT_WIDGETS`. Si un widget nuevo no tiene override de rol, todos los roles lo verán con el `visible` canónico de `DEFAULT_WIDGETS`.

**Test:** abre el dashboard con un `localStorage` viejo y verifica que el widget nuevo aparezca con la visibilidad correcta para tu rol.

## 8. Theme key

`localStorage['project-navigator-theme']` para dark/light. Ver [src/utils/theme.tsx](../../../src/utils/theme.tsx).

## 9. Filtro por PM (global)

Disponible en 10 secciones que muestran datos derivados de proyectos:

`/`, `/resumen`, `/alertas`, `/portafolio`, `/roadmap`, `/timeline`, `/distribucion`, `/costos`, `/metricas-dev`, `/pronosticos`.

Reglas para mantener consistencia:

- **Componente único**: usar `FilterDropdowns` existente con `multi: false`. No crear dropdowns custom de PM.
- **Opciones dinámicas**: el campo `p.pm` puede traer varios nombres separados por coma (`"Lore, George"`). Usar `splitMulti` de [src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts):

  ```ts
  import { splitMulti } from '../../utils/dataTransforms';

  const pmOptions = [...new Set(data.flatMap(p => splitMulti(p.pm)))].sort();
  ```

  El valor `'-'` y los vacíos se excluyen dentro de `splitMulti`.

- **Snapshot integrity**: si la sección invoca `useSnapshotCapture`, separar `allData` (raw, pasado al hook) de `data` (filtrado, usado por la UI). **El filtro PM nunca debe contaminar los snapshots semanales** — el snapshot es del portafolio completo.

  ```tsx
  const { data: allData } = useSheetData<ProjectRecord>('/api/proyectos');
  useSnapshotCapture(allData, cursosData);  // ← raw
  const data = useMemo(() => filterByPm(allData), [allData, pmFilter]);  // ← UI
  ```

- **Costos prorrateados**: si la sección calcula shares de costo entre proyectos (e.g. `/costos`), los divisores deben seguir usando el dataset completo aunque el iterador esté filtrado por PM. De lo contrario el share se infla artificialmente.

- **Secciones excluidas a propósito**:
  - `/cronograma` — `TareaRecord` no tiene `pm` ni `folio`.
  - `/cursos` — no relacionado con proyectos.
  - `/equipo` — directorio, no métricas.

## 10. Persistencia de filtros (cross-session)

Toda sección con filtros usa `usePersistedFilters<T>(sectionKey, defaults)` ([src/hooks/usePersistedFilters.ts](../../../src/hooks/usePersistedFilters.ts)) para que las selecciones del usuario sobrevivan recargas y sincronicen entre dispositivos vía Turso.

### Qué persistir

| Persistir | NO persistir |
|---|---|
| Dropdowns (filtros) | Search libre (`search`) |
| Toggles booleanos (`includeDone`, `showForecast`) | Paginación (`page`) |
| Toggles numéricos (`zoomIdx`) | Datos transitorios |
| `sortBy`, `tab` | Estado de hover/expand |
| `pageSize` (resultados por página) | — |

Razón: `page` y `search` son **exploratorios**; al persistir, el usuario los olvida y vuelve a ver resultados confusos en otra sesión. `pageSize` en cambio refleja una preferencia duradera del usuario (quiero ver 50 resultados, no 12), por eso sí se persiste.

### Shape del estado

Agrupar todo en un solo objeto pasado al hook:

```tsx
const { state, setState, clear } = usePersistedFilters<{
  filters: Record<string, string[]>;
  includeDone: boolean;
  sortBy: string;
}>('proyectos', { filters: {}, includeDone: false, sortBy: 'progreso' });
```

Las secciones que antes tenían múltiples `useState` separados derivan setters con `useCallback`:

```tsx
const setActiveFilters = useCallback(
  (updater) => setState((prev) => ({
    ...prev,
    filters: typeof updater === 'function' ? updater(prev.filters) : updater,
  })),
  [setState],
);
```

### Section keys ya en uso

12 secciones ya integradas: `proyectos`, `timeline`, `cronograma`, `cursos`, `dashboard`, `resumen`, `alertas`, `pronosticos`, `costos`, `distribucion`, `metricas-dev`, `roadmap`.

Para una sección nueva, elige un slug en kebab-case que matchee `/^[a-z0-9-]{1,64}$/` (validado server-side en [/api/user-preferences](../../../src/pages/api/user-preferences.ts)).

### Botón "Limpiar"

`FilterDropdowns` provee el botón (aparece sólo si `hasActiveFilters`). Cablear `onClear={clear}` para que resetee estado a defaults + borre la fila en Turso + limpie el `localStorage`.

Si la sección también tiene `search` (no persistido), envolver:

```tsx
onClear={() => { clear(); setSearch(''); }}
```

### Sync entre tabs/dispositivos

Sólo al cargar/recargar página. **No hay polling** ni `visibilitychange`. El hook hace un único GET al mount.

### Valores stale

Si un valor persistido (e.g. PM "Lore") deja de existir en el dataset, el `FilterDropdowns` no lo muestra como opción pero el estado interno lo conserva. El filtro no matchea nada → no oculta proyectos. **Aceptable**; si molesta, agregar `pruneStaleFilters(state, validOptions)` en un `useEffect` post-data-load.

### Limpieza global

`/cuenta` → Preferencias → "Limpiar todos" hace `DELETE /api/user-preferences` (sin `?section=`) + barre todas las keys `pn-prefs-*` del localStorage.

## 11. Resolución de identidad de personas (`equipo.id`)

Las personas tienen un registro canónico en la tabla Turso `equipo`. Cada fila del Sheet (`Projects.pm`, `Projects.arquitecto`, `Projects.devs`, `app/Core.asignado`, `Cursos.colaborador`) se resuelve a un `equipo.id` estable **en los endpoints del servidor**, no en el cliente.

### Stack de resolución

| Archivo | Rol |
|---|---|
| [src/lib/equipoMatch.ts](../../../src/lib/equipoMatch.ts) | Matcher PURO y client-safe: recibe filas `{ id, nickname, full_name }` y un nombre libre; retorna `equipo.id` o `null` si no resuelve / es ambiguo |
| [src/lib/equipoResolver.ts](../../../src/lib/equipoResolver.ts) | Wrapper server-side con cache Turso (TTL 5 min, mismo que Sheets). Exporta `getEquipoResolver()` para usar una vez por request |

### Algoritmo de `resolveId` (equipoMatch)

Prioridad decreciente:

1. **Alias curado** (`ALIAS: Record<string, string>`) — casos que el fuzzy no puede resolver sin ambigüedad (e.g. `"yorch"` → `"jenriquez"`). Configurar aquí cualquier apodo especial.
2. **Nickname exacto único** — normaliza con `norm()` (lowercase + NFD + strip non-alphanum) y busca en `equipo.nickname`. Si hay exactamente un match → retorna su id.
3. **`full_name` exacto único** — mismo normalizador, busca en `equipo.full_name`.
4. **Fuzzy por token** — `tokenMatch()`: tokens ≥ 3 caracteres, prefijo/sufijo. Si el match es único → retorna id. **Si es ambiguo → retorna `null`** (mejor no resolver que resolver mal).

```ts
import { resolveId, buildMembers, ALIAS } from 'src/lib/equipoMatch';

// Server (en endpoint):
const resolver = await getEquipoResolver();
const id = resolver.resolve(nombreDesdeSheet); // string | null

// Cliente (PersonaDetailSection — ya tiene las filas del registro):
const personId = resolveId(nombre, buildMembers(registry));
```

### Campos enriquecidos por los endpoints

| Endpoint | Campos añadidos |
|---|---|
| `/api/proyectos` | `pmIds`, `arquitectoIds`, `devIds`, `poIds`, `sqaIds` (arrays multi-persona, resueltos por `roleIds()` + `getEquipoResolver` como red de seguridad) |
| `/api/tareas` | `asignadoId` |
| `/api/cursos` | `equipoId`, `jefeId` |
| `/api/capacidades` | `equipoId` (resuelto por `user_id` → `getEquipoResolver`) |

### Comparación en la UI

Toda comparación de personas en secciones y utils **DEBE** hacerse por `id`, no por nombre. Los roles en `ProjectRecord` son ahora arrays:

```ts
// ✅ Correcto — multi-persona
projects.filter(p => p.pmIds.includes(personId))
projects.filter(p => p.arquitectoIds.includes(personId))
projects.filter(p => p.devIds.includes(personId))
projects.filter(p => p.poIds.includes(personId))
projects.filter(p => p.sqaIds.includes(personId))
tareas.filter(t => t.asignadoId === personId)

// ❌ Incorrecto — usar nameMatches() o campos singulares obsoletos
projects.filter(p => p.pmId === personId)         // pmId ya no existe
projects.filter(p => nameMatches(p.pm, nombre))   // no usar
```

### Casos de borde

- Si `resolveId` retorna `null` (nombre ambiguo o no encontrado), los campos `pmId`/`asignadoId`/`equipoId` quedan como `''`. La UI trata string vacío como "no identificado" y no rompe.
- `PersonaDetailSection` acepta tanto apodos cortos como nombres completos en el parámetro de ruta; resuelve vía `buildMembers(registry)` usando las filas que ya tiene del fetch a `/api/equipo`.
- `ALIAS` se actualiza manualmente cuando un apodo en el Sheet es inherentemente ambiguo para el fuzzy. Agregar un alias = un entry en el `Record<string, string>` exportado de `equipoMatch.ts`.
- `invalidateEquipoCache()` (exportado de `equipoResolver.ts`) limpia la cache Turso; se llama tras cada `POST/PUT` a `/api/admin/equipo`.

## 12. Routing por `id` de proyecto (ya no por folio)

El routing de proyectos y pronósticos usa **`ProjectRecord.id`** (numérico, único) directamente:

- `/proyecto/[id]` — detalle de proyecto.
- `/pronosticos/[id]` — detalle de pronóstico.

`slugs.ts` (`folioToSlug`/`slugToFolio`) ya **no se usa** para estas rutas. El `id` no contiene caracteres especiales que requieran encoding. Los links se construyen así:

```ts
// ✅ Correcto
<a href={`/proyecto/${project.id}`}>{project.actividad}</a>

// ❌ Antiguo — no usar para la ruta principal
import { folioToSlug } from '../../utils/slugs';
<a href={`/proyecto/${folioToSlug(project.folio)}`}>...
```

`folioToSlug`/`slugToFolio` pueden seguir usándose si en algún contexto se necesita pasar el `folio` como parte de una URL (e.g. referencias externas), pero no son la clave de routing.

## 13. Tooltips y glosario

Todo bloque visual (KPI, ChartCard, tabla agrupada, hero) debe tener tooltip. Single source of truth: [src/data/glossary.ts](../../../src/data/glossary.ts).

Reglas:

- **KPICard / ChartCard**: pasar `info={infoFor('id-del-bloque')}`.
- **Bloques custom** (h3, etc.): envolver con `<GlossaryTooltip id="..." />`.
- **No** poner tooltips en filtros, search inputs ni toggles puros.
- Cada nuevo bloque agregado al UI debe tener su entrada en `glossary.ts` y referencia en `GLOSSARY_SECTIONS`.

Validador de cross-refs (ejecutar antes de commitear cambios a glossary):

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/data/glossary.ts', 'utf8');
const sectionsBlock = src.match(/export const GLOSSARY_SECTIONS[\s\S]+?^\];/m)[0];
const sectionSlugs = new Set();
const objRe = /^\s\s\{[\s\S]*?slug:\s'([a-z][a-z0-9-]*)'/gm;
let m; while ((m = objRe.exec(sectionsBlock)) !== null) sectionSlugs.add(m[1]);
const relatedRefs = [];
const introRelRe = /related:\s*\[([\s\S]*?)\]/g;
while ((m = introRelRe.exec(sectionsBlock)) !== null) {
  const slugRe = /slug:\s*'([a-z][a-z0-9-]*)'/g;
  let s; while ((s = slugRe.exec(m[1])) !== null) relatedRefs.push(s[1]);
}
const broken = relatedRefs.filter(r => !sectionSlugs.has(r));
console.log('Broken refs:', broken.length || 'NONE');
if (broken.length) console.log(broken);
"
```

## 14. Markdown ligero en glosario

[src/components/ui/MarkdownText.tsx](../../../src/components/ui/MarkdownText.tsx) soporta:

- `**bold**`
- `` `code` ``
- listas `- `
- bloques ` ``` `

**No** usar HTML literal en el contenido de glossary.

## 15. Renombrado de archivos / componentes

Si renombras un section component:

1. Renombrar el archivo en [src/components/sections/](../../../src/components/sections/).
2. Actualizar el import en la página `.astro` correspondiente.
3. Buscar referencias cross-file: `grep -r 'OldNameSection' src/`.
4. Actualizar entradas en [src/data/glossary.ts](../../../src/data/glossary.ts) si las hay.
5. Actualizar esta documentación.

## 16. Cuándo crear un nuevo endpoint vs ampliar uno existente

| Caso | Decisión |
|---|---|
| Nuevo recurso (otra tab del Sheet) | Nuevo endpoint en [src/pages/api/](../../../src/pages/api/) |
| Misma tab, diferente shape de respuesta | Considerar parámetro de query (`?view=summary`) en el endpoint existente |
| Datos que mutan | Endpoint separado para `POST/PUT/DELETE`, sin cache |
| Crosses entre tabs | Hacerlo en la sección (cliente) o en una util — no en el endpoint |

## 17. Estados loading consistentes

Cada section debe mostrar:

- **Loading**: skeletons con `animate-pulse`, dimensiones similares al UI final.
- **Error**: card roja con mensaje + botón "Reintentar" que llama `refetch`.
- **Empty**: mensaje neutral ("Sin resultados", "Sin datos suficientes") sin alarmismo.

Patrón estándar:

```tsx
if (loading) return <SkeletonView />;
if (error) return <ErrorView error={error} refetch={refetch} />;
if (!data.length) return <EmptyView />;
return <NormalView data={data} />;
```

## 18. Imports relativos

Usar paths relativos (`../../utils/colors`) — el proyecto **no** usa `paths` aliases. Razón histórica: simplicidad y compatibilidad con tooling de Astro.
