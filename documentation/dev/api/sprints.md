# GET /api/sprints

Calendario de sprints del equipo. Lee la hoja `sprint` y retorna un arreglo de `SprintRecord[]`, uno por sprint definido.

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/sprints` |
| Auth | Requerida (sesión Better-Auth, role-open) |
| Fuente | Google Sheet, tab `sprint`, range `sprint!A1:J20` |
| Cache | 5 min en memoria, por lambda |
| Source | [src/pages/api/sprints.ts](../../../src/pages/api/sprints.ts) |
| Response type | `SprintRecord[]` |

## Request

Sin query params ni body.

## Response

```json
[
  {
    "sprint": "S17",
    "mes": "Junio",
    "dias": 22,
    "inicioEstimado": "2026-06-01",
    "inicioReal": "2026-06-02",
    "finEstimado": "2026-06-30",
    "finReal": "",
    "desfase": "+1d",
    "capacidadHoras": 176,
    "puntos": 48
  }
]
```

Ver `SprintRecord` en [src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts).

## Mapping header → campo

| Header en Sheet | Campo | Parser |
|---|---|---|
| `sprint` | `sprint` | string crudo (clave; filas sin sprint se descartan) |
| `mes` | `mes` | string crudo |
| `dias` | `dias` | `intSafe()` |
| `inicio estimado` | `inicioEstimado` | `parseDate()` |
| `inicio real` | `inicioReal` | `parseDate()` |
| `fin estimado` | `finEstimado` | `parseDate()` |
| `fin real` | `finReal` | `parseDate()` |
| `desfase` | `desfase` | string crudo |
| `capacidad / hrs` | `capacidadHoras` | `intSafe()` |
| `pts` | `puntos` | `intSafe()` |

## Filtro de filas

Filas sin `sprint` (tras trim) se descartan.

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Falla de Google API | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |

## Consumidores

- [`EquipoSection`](../../../src/components/sections/EquipoSection.tsx) — determina el sprint vigente para mostrar "Capacidad {sprint}: Xh · Vac Yh" en cada tarjeta de persona.
- Cualquier sección que necesite el horizonte de planeación del sprint actual.

## Notas

- El range `sprint!A1:J20` cubre hasta ~19 sprints. Ampliar si se define más horizonte.
- El tab se llama `sprint` (singular, minúsculas). Diferente a la convención de tabs anteriores (`Projects`, `Cursos`).
- `capacidadHoras` es la capacidad total del sprint para todo el equipo (suma de todos). La capacidad individual por persona viene de [`/api/capacidades`](capacidades.md).
