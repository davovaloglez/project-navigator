# GET /api/costos-modelo

Modelo financiero de pricing. Lee la sección **inferior** de la tab `Costos` (las filas que tienen el campo `Rol` vacío y usan columnas alternativas para describir steps de cálculo: Costo Operativo → Valor de la Experiencia → Costo Administrativo → Margen → Subtotal → IVA → Total).

Retorna un arreglo con un único `FinancialModel` (no varios) para mantener la firma compatible con `useSheetData<FinancialModel>`.

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/costos-modelo` |
| Auth | Requerida |
| Fuente | Google Sheet, tab `Costos`, range `Costos!A1:G50` (mismas filas que `/api/costos`, pero filtradas inversamente) |
| Cache | 5 min en memoria, por lambda |
| Source | [src/pages/api/costos-modelo.ts](../../../src/pages/api/costos-modelo.ts) |
| Response type | `[FinancialModel]` (siempre arreglo con un único elemento o vacío) |

## Request

Sin query params ni body.

## Response

```json
[
  {
    "steps": [
      { "label": "Costo Operativo", "factor": null, "value": 100000, "kind": "base" },
      { "label": "Valor de la Experiencia", "factor": 0.4, "value": 40000, "kind": "markup" },
      { "label": "Costo Administrativo", "factor": 0.15, "value": 21000, "kind": "markup" },
      { "label": "Margen", "factor": 0.3, "value": 48300, "kind": "markup" },
      { "label": "Subtotal", "factor": null, "value": 209300, "kind": "subtotal" },
      { "label": "IVA", "factor": 0.16, "value": 33488, "kind": "tax" },
      { "label": "Total", "factor": null, "value": 242788, "kind": "total" }
    ],
    "costoOperativo": 100000,
    "valorExperienciaRate": 0.4,
    "costoAdminRate": 0.15,
    "margenRate": 0.3,
    "ivaRate": 0.16,
    "total": 242788
  }
]
```

Tipos ([src/utils/dataTransforms.ts:67-84](../../../src/utils/dataTransforms.ts)):

```ts
type FinancialStepKind = 'base' | 'markup' | 'subtotal' | 'tax' | 'total';

interface FinancialStep {
  label: string;
  factor: number | null;   // sólo para 'markup' y 'tax'; null en base/subtotal/total
  value: number;           // monto absoluto
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

## Detección de filas y columnas

El endpoint **no** usa los headers para los datos; los lee posicionalmente porque la sección inferior reutiliza headers semánticamente distintos. La lógica:

1. Lee headers normalmente (`rol`, `costo/mensual`, `horas`, `total`).
2. Itera filas **descartando** las que tienen `rol` no vacío (esas pertenecen a `/api/costos`).
3. Para cada fila restante:
   - Si la columna `Costo/Mensual` trae texto no numérico → ese texto es el `label` del step y la columna `Horas` (si es numérica) es el `factor`.
   - Si `Costo/Mensual` está vacío pero `Horas` trae texto → `Horas` es el label y no hay factor.
   - La columna `Total` siempre es el `value` (monto absoluto, parseado con `parseNumber()`).

```ts
if (colMensual && !isNumericString(colMensual)) {
  label = colMensual;
  factor = isNumericString(colHoras) ? parseNumber(colHoras) : null;
} else if (colHoras && !isNumericString(colHoras)) {
  label = colHoras;
  factor = null;
}
```

## Clasificación de steps (`kind`)

```ts
function classify(label: string): FinancialStepKind {
  const l = label.toLowerCase().trim();
  if (l === 'iva') return 'tax';
  if (l === 'total') return 'total';
  if (l.includes('subtotal')) return 'subtotal';
  if (l.includes('costo operativo')) return 'base';
  return 'markup';
}
```

Por construcción:

- Sólo el step exacto `"IVA"` (case-insensitive) cuenta como `tax`.
- Sólo el step exacto `"Total"` cuenta como `total`.
- Labels que contienen `"subtotal"` son `subtotal`.
- `"Costo Operativo"` (substring) es la `base`.
- Todo lo demás (incluyendo `"Valor de la Experiencia"`, `"Costo Administrativo"`, `"Margen"`) es `markup`.

## Normalización de factor

El factor entra como decimal o como porcentaje (`40%` se escribe como `40` o `0.4` según el formato de celda). Para uniformar:

```ts
// Normalize: if factor is > 1, it's in percentage form (e.g. "40%" → 40). Divide to get decimal.
if (factor !== null && factor > 1) factor = factor / 100;
```

Resultado: `factor` siempre en rango 0..1.

Para `kind !== 'markup'` se fuerza `factor = null` (no aplica a base, subtotal, total). El `tax` es excepción: se recalcula post-hoc.

## Cálculo de `ivaRate`

`IVA` viene como monto absoluto en `Total`. Para derivar la tasa:

```ts
const ivaRate = ivaStep && lastSubtotal > 0 ? ivaStep.value / lastSubtotal : 0.16;
if (ivaStep) ivaStep.factor = ivaRate;
```

Es decir: `IVA / último_subtotal_previo`. Si no hay subtotal previo (Sheet incompleto), default a `0.16` (16% México).

## Helpers laterales del modelo

```ts
const findStep = (match: string) => steps.find((s) => s.label.toLowerCase().includes(match.toLowerCase()));

valorExperienciaRate: findStep('valor de la experiencia')?.factor ?? 0,
costoAdminRate:       findStep('costo administrativo')?.factor ?? 0,
margenRate:           findStep('margen')?.factor ?? 0,
total:                steps.find((s) => s.kind === 'total')?.value ?? 0,
```

Esto da accesos directos a las tasas más usadas por [`applyFinancialModel()`](../../../src/utils/costEngine.ts) sin tener que iterar `steps`.

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Falla de Google API o parseo | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "Unauthorized" }` |

Sheet vacío o sin steps válidos → retorna `[]` (no `[{model con ceros}]`).

## Consumidores

- [`CostosSection`](../../../src/components/sections/CostosSection.tsx) — muestra la tabla del modelo y aplica `applyFinancialModel()` a costos estimados.
- [`PronosticoDetailSection`](../../../src/components/sections/PronosticoDetailSection.tsx) — calcula impacto en costo del slippage en el panel what-if.
- [`costEngine.applyFinancialModel()`](../../../src/utils/costEngine.ts) — aplica el modelo a un costo base.

## Notas

- Si se agregan steps nuevos al Sheet (e.g. "Contingencia") con label libre, el clasificador los marca como `markup` por default — lo cual es correcto siempre que vayan **entre** Costo Operativo y Subtotal.
- Si el orden de los steps cambia (e.g. IVA antes que Subtotal), `ivaRate` se calcula con el subtotal disponible al momento del parsing, lo cual puede dar resultados inesperados. El Sheet debe respetar el orden contable estándar.
- No hay validación de que `steps` tenga al menos un `base` y un `total`. El consumidor debe defenderse.
