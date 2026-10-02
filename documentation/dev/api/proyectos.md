# GET /api/proyectos

Portafolio principal. Lee la tab `proyectos` del Google Sheet y retorna un arreglo de `ProjectRecord`. Es el endpoint más consumido (lo invocan al menos 12 secciones).

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/proyectos` |
| Auth | Requerida (sesión Better-Auth, vía middleware) |
| Fuente | Google Sheet, tab `proyectos`, range `proyectos!A1:AH300` |
| Cache | 5 min en memoria, por lambda (invalidado si `equipoEpoch()` cambia) |
| Source | [src/pages/api/proyectos.ts](../../../src/pages/api/proyectos.ts) |
| Response type | `ProjectRecord[]` (ver [src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts)) |

## Request

Sin query params ni body.

```http
GET /api/proyectos
Cookie: better-auth.session_token=<token>
```

## Response

`200 OK` con `Content-Type: application/json` y arreglo de proyectos:

```json
[
  {
    "id": "42",
    "folio": "H/PROJECT-34",
    "actividad": "Migración de API legacy",
    "finEstimado": "2026-06-15",
    "arquitecto": "Edgar",
    "salud": "Verde",
    "requiereDe": "H/PROJECT-12, definición de SLA",
    "accionRequerida": "Aprobar contrato",
    "fechaAccion": "2026-05-20",
    "cliente": "Academic",
    "producto": "Academic",
    "servicio": "Core",
    "aliado": "Ninguno",
    "cuatrimestre": "2026 Q2",
    "sprint": "S17",
    "po": "Lore",
    "sqa": "Yorch",
    "progreso": 0.65,
    "tipo": "API",
    "prioridad": "Alta",
    "epica": "Modernización",
    "hito": "2026 Q2",
    "cuenta": "",
    "puntos": 21,
    "registro": "2026-01-10",
    "fechaInicio": "2026-01-15",
    "finReal": "",
    "pm": "Lore",
    "devs": ["Ale", "Dave"],
    "estatus": "In Progress",
    "url": "https://...",
    "pmIds": ["lolvera"],
    "arquitectoIds": ["edtorres"],
    "devIds": ["avazquez", "dlopez"],
    "poIds": ["lolvera"],
    "sqaIds": ["jenriquez"]
  }
]
```

Ver `ProjectRecord` completo en [src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts).

## Mapping header → campo

El orden de columnas en el Sheet no importa; el matching es por nombre (case-insensitive).

| Header en Sheet | Campo | Parser |
|---|---|---|
| `id` | `id` | `cleanId()` (clave; filas sin `id` se descartan) |
| `Folio` | `folio` | string crudo (display; ya no único) |
| `Nombre` | `actividad` | string crudo |
| `Fin Estimado` | `finEstimado` | `parseDate()` |
| `Arquitecto` | `arquitecto` | string crudo |
| `Salud` | `salud` | string crudo |
| `Requiere de` | `requiereDe` | string crudo |
| `Accion Requerida` | `accionRequerida` | string crudo |
| `Fecha de Accion` | `fechaAccion` | `parseDate()` |
| `Producto` | `producto` y `cliente` | string crudo (`cliente` = alias de `producto`) |
| `Progreso` | `progreso` | `parseProgress()` → 0..1 |
| `Tipo` | `tipo` | string crudo |
| `Prioridad` | `prioridad` | string crudo |
| `Épica (Producto)` | `epica` | string crudo |
| `Cuatrimestre` | `cuatrimestre` y `hito` | string crudo (`hito` = alias de `cuatrimestre`) |
| `Puntos` | `puntos` | `parseInt(... \|\| '0')` |
| `Registro` | `registro` | `parseDate()` |
| `Fecha Inicio` | `fechaInicio` | `parseDate()` |
| `Fin Real` | `finReal` | `parseDate()` |
| `PM` | `pm` | string crudo (CSV) |
| `Devs` | `devs` | `split(',').map(trim).filter(s !== '' && s !== '-')` |
| `Estatus` | `estatus` | string crudo |
| `URL` | `url` | string crudo |
| `Servicio` | `servicio` | string crudo |
| `Aliado` | `aliado` | string crudo |
| `Sprint` | `sprint` | string crudo |
| `PO` | `po` | string crudo (CSV) |
| `SQA` | `sqa` | string crudo (CSV) |
| `Arquitecto_ID` | `arquitectoIds` | `roleIds()` → confía en CSV de ids; resolver por nombre si vacío |
| `PM_ID` | `pmIds` | `roleIds()` |
| `DEVs_ID` | `devIds` | `roleIds()` |
| `PO_ID` | `poIds` | `roleIds()` |
| `SQA_ID` | `sqaIds` | `roleIds()` |
| `Requiere_ID` | `requiereIds` | `splitIds()` |
| *(no existe en hoja)* | `cuenta` | `''` siempre |

### Helpers locales

**`parseDate(value)`** — Intenta dos formatos: `dd/mm/yyyy` o `dd-mm-yyyy`; fallback a `new Date(trimmed)`. Retorna `yyyy-mm-dd` si válido. **Cualquier valor no parseable — incluidos los centinelas del Sheet como `"-"` y `"N/A"` — retorna `''` (string vacío)**, nunca el string crudo. Esto garantiza que los fallbacks del cliente del estilo `finReal || finEstimado` funcionen correctamente: un `"-"` truthy ya no "gana" sobre `finEstimado`.

**`parseProgress(value)`** — Acepta `"65%"`, `"65"`, `"0.65"` → fracción 0..1. Cualquier `> 1` se divide entre 100.

**`cleanId(value)`** — Sanea centinelas de Sheets (`#N/A`, `#REF!`, `-`, `---`, vacío) → `''`.

**`splitIds(value)`** — Split CSV → ids saneados con `cleanId`, sin duplicados.

**`roleIds(nameRaw, idRaw)`** — Confía primero en la columna `*_ID` (csv de ids). Si está vacía, cae al resolver por nombre. Retorna `string[]`.

## Filtro de filas y dedup

Las filas sin `id` (campo vacío tras `cleanId()`) se descartan. Luego se aplica dedup por `id`: si dos filas tienen el mismo `id` (caso PROJECT-15 con dos fases), gana la de `registro` más reciente.

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Falla auth de Google, range inválido, error de red | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` (middleware) |

Sheet vacío (< 2 filas) → `[]` 200.

## Consumidores

- [`useSheetData<ProjectRecord>('/api/proyectos')`](../../../src/hooks/useSheetData.ts) en prácticamente todas las secciones.
- [`auto-capture`](snapshots-auto-capture.md) lee el Sheet directamente (no este endpoint) para construir el snapshot semanal.

## Notas

- El range `proyectos!A1:AH300` cubre hasta 299 proyectos con las ~34 columnas actuales. Si el portafolio crece, ampliar.
- El cache incluye el `equipoEpoch()` como parte de la clave: si cambia el registro canónico del equipo (tras `POST/PUT /api/admin/equipo`), la siguiente request invalida el cache y re-fetch.
- La identidad canónica es `id` (numérico, único). El `folio` se conserva sólo para display y para la columna `Requiere_ID`. El routing usa `id` directamente (`/proyecto/[id]`); ya no se necesita `slugs.ts` para esas rutas.
- Todos los roles son MULTI-persona. El helper `roleIds()` maneja tanto el caso singular como el múltiple de forma uniforme.
