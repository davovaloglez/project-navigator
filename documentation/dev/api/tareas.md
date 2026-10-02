# GET /api/tareas

Tareas granulares del cronograma. Lee la hoja `actividades` (antes eran dos tabs separadas `app` y `Core`) y retorna un arreglo `TareaRecord[]`.

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/tareas` |
| Auth | Requerida |
| Fuente | Google Sheet, tab `actividades`, range `actividades!A1:Z500` |
| Cache | 5 min en memoria, por lambda (invalidado si `equipoEpoch()` cambia) |
| Source | [src/pages/api/tareas.ts](../../../src/pages/api/tareas.ts) |
| Response type | `TareaRecord[]` |

## Request

Sin query params ni body.

## Response

```json
[
  {
    "id": "1k3m7z",
    "proyectoId": "42",
    "proyecto": "",
    "producto": "Academic",
    "sprint": "S17",
    "folio": "AM-I-560 | Historia de usuario",
    "url": "https://...",
    "nombre": "Implementar login con Google",
    "asignado": "Edgar Torres",
    "estatus": "In Progress",
    "salud": "Verde",
    "fase": "Desarrollo",
    "tipo": "API",
    "prioridad": "Alta",
    "dificultad": "Media",
    "epica": "Auth",
    "hito": "",
    "cuenta": "",
    "puntos": 5,
    "tracked": 3,
    "avance": 0.6,
    "registro": "2026-05-01",
    "inicio": "2026-05-10",
    "finEstimado": "2026-05-20",
    "finReal": "",
    "rol": "Dev Jr",
    "asignadoId": "edtorres"
  }
]
```

Ver `TareaRecord` completo en [src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts).

## Mapping header → campo

Range único: `actividades!A1:Z500`. Una sola hoja reemplaza las antiguas `app` y `Core`.

| Header en Sheet | Campo | Parser |
|---|---|---|
| *(no existe en hoja)* | `id` | `makeTareaId()` — hash estable de `[proyectoId, folio, nombre, asignado, sprint]`; asignado tras parsear todas las filas |
| `ProyectoId` | `proyectoId` | `clean()` — `ProjectRecord.id`; '' = sin proyecto |
| `Proyecto` | `proyecto` | string crudo |
| `Producto` | `producto` | string crudo (OU libre: "Academic", "Atrevus", …; ya NO 'App'\|'Core') |
| `Sprint` | `sprint` | string crudo |
| `Folio` | `folio` | `clean()` |
| `URL` | `url` | `clean()` |
| `Actividad` | `nombre` | string crudo (clave; filas sin actividad se descartan) |
| `Asignado` | `asignado` | string crudo |
| `Estatus` | `estatus` | string crudo |
| `Salud` | `salud` | `clean()` |
| `Fase` | `fase` | string crudo |
| `Tipo` | `tipo` | string crudo |
| `Prioridad` | `prioridad` | string crudo |
| `Dificultad` | `dificultad` | `clean()` |
| `Épica` | `epica` | string crudo |
| `Hito` | `hito` | `clean()` |
| `Cuenta` | `cuenta` | `clean()` |
| `Puntos` | `puntos` | `parseIntSafe()` — estimado |
| `Traking` | `tracked` | `parseIntSafe()` — real en puntos |
| `Avance` | `avance` | `parseProgress()` → 0..1 |
| `Registro` | `registro` | `parseDate()` |
| `Fecha Inicio` | `inicio` | `parseDate()` |
| `Fin Estimado` | `finEstimado` | `parseDate()` |
| `Fin Real` | `finReal` | `parseDate()` |
| `Rol` | `rol` | string crudo |
| `AsignadoId` | `asignadoId` | `clean()` → passthrough; resolver por nombre si vacío |

### Helpers locales

**`parseDate(value)`** — Acepta `dd/mm/yyyy` y `dd-mm-yyyy`; fallback a `new Date()`. Retorna `yyyy-mm-dd`. Las fechas de la hoja `actividades` ya son legibles (ya NO son seriales de Excel).

**`parseIntSafe(value)`** — `parseInt(value.replace(/[,\s]/g, ''))`, retorna 0 si NaN.

**`parseProgress(value)`** — Acepta `"60%"`, `"0.6"`, `"60"` → fracción 0..1.

**`clean(value)`** — Sanea centinelas de Sheets (`#N/A`, `#REF!`, `-`, `---`, vacío) → `''`.

## Filtro de filas

Una fila se descarta si el campo `nombre` (columna `Actividad`) está vacío tras el trim.

## Resolución de identidad

Tras parsear todas las filas, el endpoint llama a `getEquipoResolver()` y rellena `asignadoId` para las filas donde la columna `AsignadoId` vino vacía o con centinela. El resolver cae al fuzzy por nombre si el passthrough no alcanza.

## Scoping (Fase 5)

El endpoint aplica `taskVisible(t, scope)` de [src/lib/requesterScope.ts](../../../src/lib/requesterScope.ts) para filtrar tareas según la identidad del solicitante. El cache es RAW (compartido); el filtro se aplica por request.

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Falla de Google API | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |

Sheet vacío → `[]` 200.

## Consumidores

- [`CronogramaSection`](../../../src/components/sections/CronogramaSection.tsx) — sección `/cronograma` con KPIs, filtros por sprint/fase/rol, throughput semanal, precisión estimado-vs-tracked.
- [`TareaDetailSection`](../../../src/components/sections/TareaDetailSection.tsx) — sección `/tarea/[id]`; busca la tarea por `t.id` sobre el dataset completo.
- [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) — `computeTeamVelocity()` y `computeEstimationBias()`.
- [`PersonaDetailSection`](../../../src/components/sections/PersonaDetailSection.tsx) — tareas del cronograma filtradas por `asignadoId`.
- [`computeEstimationBias()`](../../../src/utils/forecastEngine.ts) — compara `puntos` (estimado) vs `tracked` (real) para todas las tareas con ambos > 0.

## Notas

- La hoja `actividades` reemplaza las antiguas tabs `app` y `Core`. Ya no hay discriminador `'App'|'Core'` en `producto` — ahora es la OU/línea de producto (string libre).
- El campo `puntos` es el **estimado** (columna `Puntos`); `tracked` es el **real** (columna `Traking`). No mezclar en agregaciones.
- Las fechas ya no son seriales de Excel: vienen en `dd/mm/yyyy` directamente de la hoja unificada.
- El range `actividades!A1:Z500` cubre ~499 tareas con las ~26 columnas actuales. Si crece, ampliar.
- El `proyectoId` vincula tareas con `ProjectRecord.id`, no con el folio. Cruce entre tareas y proyectos debe hacerse por `proyectoId === project.id`.
