# GET /api/cursos

Progreso de cursos del equipo. Lee la tab `cursos` y retorna un arreglo de `CursoRecord`, uno por colaborador inscrito.

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/cursos` |
| Auth | Requerida |
| Fuente | Google Sheet, tab `cursos`, range `cursos!A1:J50` |
| Cache | 5 min en memoria, por lambda (invalidado si `equipoEpoch()` cambia) |
| Source | [src/pages/api/cursos.ts](../../../src/pages/api/cursos.ts) |
| Response type | `CursoRecord[]` |

## Request

Sin query params ni body.

## Response

```json
[
  {
    "colaborador": "Lorenso Raquel Olmos Valdez",
    "emailColaborador": "lorenso@vortex-it.com",
    "ou": "Tech",
    "rol": "PM",
    "jefeDirecto": "Edgar Torres",
    "emailJefe": "edgar@vortex-it.com",
    "pidsCreados": 0,
    "progreso": 80,
    "equipoId": "lolvera",
    "jefeId": "edtorres"
  }
]
```

`CursoRecord` ([src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts)):

```ts
interface CursoRecord {
  colaborador: string;       // columna `nombre`
  emailColaborador: string;  // columna `email`
  ou: string;                // columna `departamento`
  rol: string;
  jefeDirecto: string;       // columna `jefe`
  emailJefe: string;         // columna `email_jefe`
  pidsCreados: number;       // siempre 0 — la hoja nueva no trae este campo
  progreso: number;          // 0..100, NO normalizado a fracción
  equipoId?: string;         // equipo.id (columna `id`; resolver como red de seguridad)
  jefeId?: string;           // equipo.id del jefe (columna `id_jefe`)
}
```

> **Cuidado**: `progreso` es entero 0-100, no fracción 0-1 (a diferencia de `ProjectRecord.progreso`).

## Mapping header → campo

| Header en Sheet | Campo | Parser |
|---|---|---|
| `nombre` | `colaborador` | string crudo (clave; filas sin nombre se descartan) |
| `email` | `emailColaborador` | string crudo |
| `departamento` | `ou` | string crudo |
| `rol` | `rol` | string crudo |
| `jefe` | `jefeDirecto` | string crudo |
| `email_jefe` | `emailJefe` | string crudo |
| `id` | `equipoId` | `cleanId()` → passthrough; resolver por nombre si vacío |
| `id_jefe` | `jefeId` | `cleanId()` → passthrough; resolver por nombre si vacío |
| `progreso` | `progreso` | `parseInt(... \|\| '0')` |
| *(no existe)* | `pidsCreados` | `0` siempre |

## Filtro de filas

Cualquier fila sin `nombre` (columna del colaborador) se descarta.

## Scoping por identidad (Fase 5)

El dataset completo se cachea. Por request, se aplica `cursoVisible(row, scope)` de [src/lib/requesterScope.ts](../../../src/lib/requesterScope.ts): roles sin restricción (`admin`, `directores`, `gerentes`, `ventas`) ven todos los cursos; `pm` y `dev` ven sólo la fila con su propio `equipoId` (fail-closed sin `equipoId` vinculado).

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Falla de Google API | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |

Sheet vacío → `[]` 200.

## Consumidores

- [`CursosSection`](../../../src/components/sections/CursosSection.tsx) — sección principal `/cursos`.
- [`PersonaDetailSection`](../../../src/components/sections/PersonaDetailSection.tsx) — progreso de cursos en el perfil de cada persona.
- [`DashboardSection`](../../../src/components/sections/DashboardSection.tsx) — widget de cursos.
- [`useSnapshotCapture`](../../../src/hooks/useSnapshotCapture.ts) — incluye cursos en el snapshot semanal.
- [`auto-capture`](snapshots-auto-capture.md) — lee este Sheet directamente para construir el snapshot.
- [`computeCourseForecasts()`](../../../src/utils/courseForecast.ts) — proyecta finalización usando ritmo de snapshots.

## Notas

- La hoja `cursos` (lowercase) reemplaza la antigua `Cursos` (con mayúscula). El range amplió de `A1:H50` a `A1:J50` por las nuevas columnas `id` y `id_jefe`.
- La hoja usa **nombres completos** (`"Lorena Raquel Olvera Rodriguez"`). El campo `equipoId` resuelve esta diferencia sin fuzzy matching. Ver [convenciones §11](../arquitectura/convenciones.md#11-resolución-de-identidad-de-personas-equipoid).
- `pidsCreados` siempre es 0. Si una sección mostraba ese dato, debe ocultarlo o eliminarlo.
- `jefeId` es nuevo y permite cruzar la jerarquía de reporte sin fuzzy matching.
- A diferencia de `proyectos`, los cursos no tienen columnas de fechas. El forecast se calcula derivando ritmo desde los snapshots.
