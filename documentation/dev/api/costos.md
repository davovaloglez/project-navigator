# GET /api/costos

Costos y presupuesto por rol. Lee la sección **superior** de la tab `Costos` (filas con la columna `Rol` llena) y retorna un arreglo de `CostoRecord`. La sección **inferior** del mismo Sheet — el modelo financiero de pricing — se expone aparte en [`/api/costos-modelo`](costos-modelo.md).

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/costos` |
| Auth | Requerida |
| Fuente | Google Sheet, tab `Costos`, range `Costos!A1:G50` |
| Cache | 5 min en memoria, por lambda |
| Source | [src/pages/api/costos.ts](../../../src/pages/api/costos.ts) |
| Response type | `CostoRecord[]` |

## Request

Sin query params ni body.

## Response

`200 OK` con arreglo:

```json
[
  {
    "rol": "Backend Developer",
    "recursos": 3,
    "horasRecurso": 160,
    "costoMensual": 45000,
    "costoHora": 281.25,
    "horas": 480,
    "total": 135000
  }
]
```

`CostoRecord` ([src/utils/dataTransforms.ts:39-47](../../../src/utils/dataTransforms.ts)):

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
```

## Mapping header → campo

| Header en Sheet | Campo | Parser |
|---|---|---|
| `Rol` | `rol` | string crudo (clave; filas sin rol se descartan → permite que la sección de modelo financiero coexista sin contaminar este endpoint) |
| `Recursos` | `recursos` | `parseInt(... \|\| '0')` |
| `Horas/Recurso` | `horasRecurso` | `parseNumber()` |
| `Costo/Mensual` | `costoMensual` | `parseNumber()` |
| `Costo/Hora` | `costoHora` | `parseNumber()` |
| `Horas` | `horas` | `parseNumber()` |
| `Total` | `total` | `parseNumber()` |

### Helper local

**`parseNumber(value)`** — Limpia símbolos de moneda y separadores antes de parsear:

```ts
const cleaned = value.replace(/[$,\s]/g, '');
return parseFloat(cleaned) || 0;
```

Acepta `"$45,000"`, `"45000"`, `"45,000.50"`, etc. Retorna `0` si no parsea.

## Filtro de filas

Sólo se incluyen filas con `rol` no vacío. Esto descarta:

- Filas vacías al final del range.
- Filas del **modelo financiero** (filas ~13-21 del Sheet) que tienen `Rol` vacío y usan otras columnas para labels (`Costo/Mensual`, `Horas`, `Total`).

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Falla de Google API o parseo | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` (middleware) |

Sheet vacío → `[]` 200.

## Consumidores

- [`CostosSection`](../../../src/components/sections/CostosSection.tsx) (sección principal `/costos`).
- [`DashboardSection`](../../../src/components/sections/DashboardSection.tsx) — widget de presupuesto.
- [costEngine.ts](../../../src/utils/costEngine.ts) — `estimateProjectCost()` consume estos costos para prorratear por proyecto.

## Notas

- El range `A1:G50` cubre tanto los datos de roles (filas ~2-12) como la sección de modelo financiero (filas ~13-21). El filtro `r.rol` separa las dos partes.
- `costoHora` está pre-calculado en el Sheet (no se deriva acá de `costoMensual / horasRecurso`).
- Si se renombra el header `Horas/Recurso` el endpoint silenciosamente cae a `0`. No hay validación de schema.
