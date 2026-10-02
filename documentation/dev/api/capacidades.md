# GET /api/capacidades

Capacidad individual por persona por sprint. Lee la hoja `capacidades` y retorna un arreglo de `CapacidadRecord[]`. Cada fila representa la disponibilidad de una persona en un sprint específico.

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/capacidades` |
| Auth | Requerida (sesión Better-Auth, role-open) |
| Fuente | Google Sheet, tab `capacidades`, range `capacidades!A1:F60` |
| Cache | 5 min en memoria, por lambda (invalidado si `equipoEpoch()` cambia) |
| Source | [src/pages/api/capacidades.ts](../../../src/pages/api/capacidades.ts) |
| Response type | `CapacidadRecord[]` |

## Request

Sin query params ni body.

## Response

```json
[
  {
    "equipoId": "edtorres",
    "teamNum": "5",
    "nombre": "Edgar Torres",
    "sprint": "S17",
    "vacaciones": 8,
    "capacidad": 160
  }
]
```

Ver `CapacidadRecord` en [src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts).

## Mapping header → campo

| Header en Sheet | Campo | Parser |
|---|---|---|
| `user_id` | `equipoId` | `cleanId()` → passthrough; resolver por nombre si vacío |
| `id_team` | `teamNum` | string crudo |
| `Nombre` | `nombre` | string crudo |
| `id_sprint` | `sprint` | string crudo (p.ej. "S17") |
| `vacaciones` | `vacaciones` | `numSafe()` (horas) |
| `capacidad` | `capacidad` | `numSafe()` (horas disponibles) |

## Filtro de filas

Filas sin `nombre` ni `equipoId` (tras resolver) se descartan.

## Scoping por identidad (Fase 5)

El dataset completo se cachea. Por request, se aplica `capacidadVisible(row, scope)` de [src/lib/requesterScope.ts](../../../src/lib/requesterScope.ts): los roles `admin`, `directores`, `gerentes` y `ventas` ven todos los registros; `pm` y `dev` ven sólo la fila con su propio `equipoId` (fail-closed sin `equipoId` vinculado).

## Resolución de identidad

El campo `user_id` de la hoja es el `equipo.id` canónico (local-part del email). El endpoint usa `cleanId()` para sanearlo y cae al `equipoResolver.resolve(nombre)` si viene vacío.

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Falla de Google API | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |

Sheet vacío → `[]` 200.

## Consumidores

- [`EquipoSection`](../../../src/components/sections/EquipoSection.tsx) — cruza por `equipo.id` con el sprint vigente (de [`/api/sprints`](sprints.md)) para mostrar "Capacidad {sprint}: Xh · Vac Yh" en cada tarjeta de persona.

## Notas

- El range `capacidades!A1:F60` cubre hasta ~59 filas (múltiples sprints × personas). Ampliar si crece el equipo o el horizonte.
- `capacidad` es la disponibilidad real en horas del sprint (ya descontando vacaciones u otras ausencias reportadas). No confundir con `capacidadHoras` de `SprintRecord` que es el total del equipo.
- El cache se invalida cuando `equipoEpoch()` cambia (igual que `/api/proyectos` y `/api/tareas`), garantizando que si se agrega un miembro al registro canónico, las capacidades se recargan con los ids actualizados.
