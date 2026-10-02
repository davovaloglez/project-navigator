# dataTransforms

Interfaces compartidas (single source of truth de los tipos del dominio) y helpers genéricos de agregación por campo. Ningún cálculo de negocio; sólo tipos y `Record<string, …>` builders.

**Source:** [../../../src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts)

## Interfaces

### `ProjectRecord`

```ts
interface ProjectRecord {
  /** Identidad canónica (columna `id` numérica de la hoja). ÚNICA.
   *  El routing usa `/proyecto/[id]`; los snapshots usan este campo.
   *  `folio` NO es único (p.ej. H/PROJECT-5 puede corresponder a dos proyectos). */
  id: string;
  folio: string;
  /** Título del proyecto (columna `nombre`; expuesto como `actividad` por compat). */
  actividad: string;
  finEstimado: string;       // ISO yyyy-mm-dd
  arquitecto: string;        // raw CSV del Sheet (display)
  salud: string;
  requiereDe: string;
  accionRequerida: string;
  fechaAccion: string;
  /** Alias de `producto` (compat con consumidores anteriores). */
  cliente: string;
  progreso: number;          // 0–1
  tipo: string;
  prioridad: string;
  epica: string;
  /** Alias de `cuatrimestre`. La hoja no tiene "hito" a nivel proyecto;
   *  se mantiene el nombre por compat con Roadmap, forecast y cards. */
  hito: string;
  /** Horizonte de planeación (p.ej. "2026 Q2"). = `hito`. */
  cuatrimestre: string;
  /** Siempre '' — la hoja nueva no tiene columna `cuenta`. */
  cuenta: string;
  puntos: number;
  registro: string;          // ISO yyyy-mm-dd (fallback de fechaInicio)
  fechaInicio: string;       // ISO yyyy-mm-dd (preferida)
  finReal: string;           // ISO yyyy-mm-dd cuando Done; '' si no
  pm: string;                // raw CSV
  devs: string[];            // split por coma
  estatus: string;
  url: string;
  /** Línea de producto / cliente externo (Academic, Atrevus, Togie, …). */
  producto: string;
  /** Core / APP / "Core, App". */
  servicio: string;
  /** Aliado/partner (UNIMEL, Defontana, …; "Ninguno" si no aplica). */
  aliado: string;
  /** Sprint asociado (S17/S18; puede venir vacío). */
  sprint: string;
  /** Product Owner(s) — raw CSV. */
  po: string;
  /** QA responsable(s) — raw CSV. */
  sqa: string;
  // --- Ids resueltos por equipoResolver (aditivos). Todos los roles
  //     son MULTI-persona: la hoja trae "Luis, George" separado por coma.
  //     [] si no resuelve. El campo singular (`pmId`, `arquitectoId`) ya NO existe. ---
  pmIds: string[];
  arquitectoIds: string[];
  devIds: string[];
  poIds: string[];
  sqaIds: string[];
  /** Ids de los bloqueadores (columna `Requiere_ID`). */
  requiereIds?: string[];
}
```

Producida por [`/api/proyectos`](../api/proyectos.md) leyendo `proyectos!A1:AH300`. Parseo por header name → reordenar columnas en el Sheet no rompe nada. La hoja trae columnas `*_ID` (csv paralelas a los nombres); el `equipoResolver` actúa sólo como red de seguridad cuando vienen vacías. Dedup por `id`: si hay filas duplicadas, gana la de `registro` más reciente.

### `CursoRecord`

```ts
interface CursoRecord {
  colaborador: string;       // columna `nombre` de la hoja
  emailColaborador: string;  // columna `email`
  ou: string;                // columna `departamento`
  rol: string;
  jefeDirecto: string;       // columna `jefe`
  emailJefe: string;         // columna `email_jefe`
  pidsCreados: number;       // siempre 0 — la hoja nueva no trae este campo
  progreso: number;          // 0..100, NO normalizado a fracción
  equipoId?: string;         // equipo.id (columna `id`; resolver como red de seguridad)
  jefeId?: string;           // equipo.id del jefe directo (columna `id_jefe`)
}
```

Producida por [`/api/cursos`](../api/cursos.md) leyendo `cursos!A1:J50`. Nota: `progreso` es entero 0-100, no fracción 0-1 (a diferencia de `ProjectRecord.progreso`). `pidsCreados` siempre es 0 porque la hoja nueva no registra ese campo.

### `SprintRecord`

```ts
/** Calendario de sprints (hoja `sprint`). */
interface SprintRecord {
  sprint: string;          // "S17"
  mes: string;             // "Junio"
  dias: number;            // días hábiles del sprint
  inicioEstimado: string;  // ISO
  inicioReal: string;      // ISO
  finEstimado: string;     // ISO
  finReal: string;         // ISO
  desfase: string;         // texto libre de días de desfase
  capacidadHoras: number;  // horas totales del sprint (columna "Capacidad / HRS")
  puntos: number;          // puntos comprometidos (columna "pts")
}
```

Producida por [`/api/sprints`](../api/sprints.md) leyendo `sprint!A1:J20`.

### `CapacidadRecord`

```ts
/** Capacidad por persona por sprint (hoja `capacidades`). */
interface CapacidadRecord {
  /** equipo.id (columna `user_id`; resolver como red de seguridad). */
  equipoId: string;
  /** id numérico de la hoja (columna `id_team`); crudo. */
  teamNum: string;
  nombre: string;          // columna `Nombre`
  sprint: string;          // columna `id_sprint` (p.ej. "S17")
  vacaciones: number;      // horas de vacaciones en el sprint
  capacidad: number;       // horas disponibles en el sprint
}
```

Producida por [`/api/capacidades`](../api/capacidades.md) leyendo `capacidades!A1:F60`.

### `CostoRecord` y `FinancialModel`

```ts
interface CostoRecord {
  rol: string;
  recursos: number;
  horasRecurso: number;
  costoMensual: number;
  costoHora: number;
  horas: number;
  total: number;
}

type FinancialStepKind = 'base' | 'markup' | 'subtotal' | 'tax' | 'total';

interface FinancialStep {
  label: string;
  factor: number | null;
  value: number;
  kind: FinancialStepKind;
}

interface FinancialModel {
  steps: FinancialStep[];
  costoOperativo: number;
  valorExperienciaRate: number;
  costoAdminRate: number;
  margenRate: number;
  ivaRate: number;
  total: number;
}
```

`CostoRecord` viene de [`/api/costos`](../api/costos.md) (filas 1–12 de la tab `Costos`). `FinancialModel` viene de [`/api/costos-modelo`](../api/costos-modelo.md) (filas 13–21). Ver [costEngine](./costEngine.md) para cómo se aplica.

### `TareaRecord`

```ts
interface TareaRecord {
  /** Id sintético estable, generado en `/api/tareas` por hash de
   *  `[proyectoId, folio, nombre, asignado, sprint]`. Único por tarea;
   *  no persiste si esos campos cambian en el Sheet. Usado por `/tarea/[id]`. */
  id: string;
  /** ProjectRecord.id al que pertenece; '' = "Sin proyecto". */
  proyectoId: string;
  /** Nombre del proyecto (columna `Proyecto`; suele venir vacío). */
  proyecto: string;
  /** OU / línea de producto (p.ej. "Academic"). Ya NO es 'App'|'Core'. */
  producto: string;
  sprint: string;            // S16/S17
  folio: string;             // "AM-I-560 | Historia de usuario"; '' si no aplica
  url: string;
  /** Título de la actividad (columna `Actividad`). */
  nombre: string;
  asignado: string;
  estatus: string;
  salud: string;
  fase: string;              // Desarrollo, SQA, Soporte, Análisis, …
  tipo: string;
  prioridad: string;
  dificultad: string;
  epica: string;
  hito: string;
  cuenta: string;
  /** Puntos estimados (columna `Puntos`). */
  puntos: number;
  /** Tiempo real traqueado en puntos (columna `Traking`). */
  tracked: number;
  avance: number;            // 0..1
  registro: string;          // ISO
  inicio: string;            // ISO
  finEstimado: string;       // ISO
  finReal: string;           // ISO; '' si no está Done
  /** Rol del asignado en la actividad (Dev Jr, ARQ, SQA, PO, …). */
  rol: string;
  asignadoId?: string;       // equipo.id resuelto por equipoResolver; '' si no resuelve
}
```

Producido por [`/api/tareas`](../api/tareas.md) leyendo la hoja `actividades!A1:Z500` (hoja unificada que reemplaza las antiguas `app` + `Core`). El discriminador `producto: 'App' | 'Core'` ya no existe; ahora `producto` es la OU/línea de producto (string libre). Las fechas vienen en formato `dd/mm/yyyy` — ya no son seriales de Excel. El campo `puntos` es el estimado; `tracked` es el real en puntos (columna `Traking`).

### `isTareaDone(estatus)`

```ts
function isTareaDone(estatus: string | undefined): boolean
```

Exportada desde `dataTransforms.ts`. Devuelve `true` si `estatus` incluye `'done'` o `'completad'` (case-insensitive). Usada por `forecastEngine` y `cronogramaSection` para identificar tareas completadas sin hardcodear el literal.

## Helpers exportados

### `isTareaDone`

Ver sección de `TareaRecord` arriba.

### `splitMulti`

```ts
function splitMulti(value: string | undefined | null): string[]
```

Separa un campo multi-persona (`"Luis, George"`) en nombres individuales, descartando vacíos y el placeholder `'-'`. Los roles `pm` y `arquitecto` de `ProjectRecord` pueden traer varias personas en una sola celda separada por coma. Usar **siempre** este helper al derivar opciones de filtro, agrupar o cruzar por esos campos.

```ts
splitMulti('Luis, George')  // ['Luis', 'George']
splitMulti('-')             // []
splitMulti('')              // []
splitMulti(undefined)       // []
```

Reemplaza el patrón anterior `.split(',').map(s => s.trim()).filter(...)` disperso en secciones. Ver [arquitectura/convenciones.md §9](../arquitectura/convenciones.md#9-filtro-por-pm-global) para la convención de opciones de filtro PM.

### `countByField`

```ts
function countByField<T>(data: T[], field: keyof T): Record<string, number>
```

Cuenta ocurrencias por valor de un campo. Casos: vacío o `null` → `'Sin dato'`.

```ts
countByField(projects, 'estatus');
// { 'On Track': 12, 'At Risk': 3, 'Sin dato': 1, ... }
```

Útil para alimentar donuts y barras categóricas.

### `groupByField`

```ts
function groupByField<T>(data: T[], field: keyof T): Record<string, T[]>
```

Agrupa items por valor de un campo. Mismo fallback `'Sin dato'`.

## Quién lo usa

`ProjectRecord` y los demás tipos los importan **prácticamente todos** los sections, charts y utils del subsistema de proyectos. `countByField` y `groupByField` son menos usados; la mayoría de las secciones prefieren `Map<string, …>` para mantener tipado fuerte y operaciones más explícitas. Casos típicos:

- [`EstatusDonutChart`](../../../src/components/charts/EstatusDonutChart.tsx): `countByField(projects, 'estatus')`.
- [`SaludDonutChart`](../../../src/components/charts/SaludDonutChart.tsx): `countByField(projects, 'salud')`.
- [`PrioridadBarChart`](../../../src/components/charts/PrioridadBarChart.tsx): `countByField`.
- [`DistribucionPuntosSection`](../../../src/components/sections/DistribucionPuntosSection.tsx): `groupByField` por arquitecto, dev, etc.

## Casos de borde

- **Campo no string**: `String(item[field])` coerciona números, booleanos, etc. Para arrays (`devs`) genera `"Lore,Edgar"`, lo cual raramente es lo deseado. Para esos casos hay que hacer la agregación a mano.
- **Valores vacíos**: tanto `''` como `null`/`undefined` caen al bucket `'Sin dato'`.
- **`progreso` en `ProjectRecord` vs `CursoRecord`**: 0–1 en proyectos, 0–100 en cursos. Es fuente común de bugs; revisar al cruzar fuentes.

## Detalles no obvios

- **Identidad de proyecto es `id`, no `folio`**: el `folio` ya no es único. Routing, snapshots y todos los cruces inter-fuente deben usar `id`. Los consumidores que usan `folio` para lookup (como la navegación prev/next en `ProyectoDetailSection`) deben actualizarse o usar `id` como clave de ruta.
- **`devs` es `string[]`** pero el Sheet guarda CSV. La conversión sucede en `/api/proyectos`. Todos los roles (arquitecto, PM, PO, SQA, devs) se manejan ahora de manera uniforme como arrays CSV.
- **Los campos `pmIds`/`arquitectoIds`/`devIds`/`poIds`/`sqaIds` reemplazaron los singulares** (`pmId`, `arquitectoId`). El código existente que usaba singulares debe migrar a arrays. El costEngine y el forecastEngine ya los consumen por index o `includes`.
- **`pidsCreados` en `CursoRecord` siempre es 0**: la hoja nueva no trae esa columna. Si una sección mostraba ese dato, debe ocultarlo.
- **Fechas en `TareaRecord` son `dd/mm/yyyy`, no seriales de Excel**: la hoja `actividades` usa fechas legibles. El endpoint las convierte a ISO antes de entregar. El parseo de seriales de Excel ya no es necesario para tareas.
- **`producto` en `TareaRecord` es OU string, no enum**: ya no existe `'App'|'Core'` como discriminador. Código que filtraba por `t.producto === 'App'` debe adaptarse (e.g. `CronogramaSection` ahora filtra por `sprint`/`fase`/`rol`).
- **El campo `tipo` en `TareaRecord` no es enum**: viene libre del Sheet. Los valores conocidos están en [`colors.tipoTareaColors`](./colors.md): API, Store Procedure, App, Web, Web/API, Análisis, SQA, Prototipo. Cualquier otro cae al fallback gris.
- **No hay validación runtime de los shapes**: TypeScript es checkpoint en build; en runtime, si el Sheet introduce un valor inesperado, el utility downstream debe ser defensivo (e.g. `p.devIds?.includes(...) ?? false`).
