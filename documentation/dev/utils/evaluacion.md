# evaluacion.ts

Helpers compartidos del módulo de autoevaluación trimestral (HU NAV-78). Exporta las 7 dimensiones, sus metadatos, el cálculo de calificación y utilidades de período. Es la fuente de verdad para cliente y servidor: los endpoints deben coincidir con las dimensiones declaradas aquí.

- **Source:** [src/utils/evaluacion.ts](../../../src/utils/evaluacion.ts)

## Exports públicos

### `Dimension`

```ts
export type Dimension =
  | 'actitud' | 'aptitudes' | 'comunicacion' | 'velocidad'
  | 'analisis' | 'calidad' | 'autogestion';
```

Las 7 claves que componen una evaluación.

### `DIMENSIONS: DimensionMeta[]`

```ts
export interface DimensionMeta {
  key: Dimension;
  label: string;    // etiqueta en español para la UI
  hint: string;     // descripción breve para tooltip del slider
}
```

Array ordenado de las 7 dimensiones con etiqueta + hint. Úsalo para renderizar el formulario dinámicamente.

### `DIMENSION_KEYS: Dimension[]`

Subconjunto de sólo las claves, derivado de `DIMENSIONS`. Útil para iterar sin cargar metadatos.

### `DimensionScores`

```ts
export type DimensionScores = Record<Dimension, number>;
```

La forma que viaja por el endpoint y se guarda en BD: un entero 1-10 por cada dimensión.

### `calcCalificacion(scores: DimensionScores): number`

Calificación general = promedio aritmético de las 7 dimensiones. La BD no persiste este valor — se recalcula siempre en cliente.

```ts
function calcCalificacion(scores: DimensionScores): number {
  const sum = DIMENSION_KEYS.reduce((acc, k) => acc + (scores[k] ?? 0), 0);
  return sum / DIMENSION_KEYS.length;
}
```

### `quarterOf(date?: Date): string`

Devuelve el período `"YYYY-Qn"` para una fecha. Sin argumento usa `new Date()` (trimestre actual).

```ts
quarterOf()               // "2026-Q2" (si estamos en jun 2026)
quarterOf(new Date('2026-01-15'))  // "2026-Q1"
```

### `parsePeriodo(periodo: string): { year: number; q: number } | null`

Parsea `"YYYY-Qn"`. Retorna `null` si el formato es inválido.

### `comparePeriodos(a: string, b: string): number`

Comparador para `Array.sort`. Retorna negativo si `a < b` (orden ascendente).

### `recentPeriodos(count?: number): string[]`

Genera los últimos N períodos hasta el actual (incluido), en **orden descendente**. Por defecto `count = 8` (2 años).

```ts
recentPeriodos(4)  // ['2026-Q2', '2026-Q1', '2025-Q4', '2025-Q3']
```

Útil para poblar el selector de período en el formulario y en el filtro de `/comparativa`.

### `calificacionColor(score: number): string`

Retorna una clase Tailwind `text-*` según el bucket:

| Rango | Clase |
|---|---|
| ≥ 9 | `text-green-400` |
| ≥ 8 | `text-emerald-400` |
| ≥ 7 | `text-blue-400` |
| ≥ 6 | `text-yellow-400` |
| ≥ 5 | `text-orange-400` |
| < 5 | `text-red-400` |

### `calificacionBg(score: number): string`

Igual que `calificacionColor` pero retorna clases `bg-*/border-*` para chips/badges con fondo.

## Quién lo usa

| Caller | Uso |
|---|---|
| [`ComparativaSection.tsx`](../../../src/components/sections/ComparativaSection.tsx) | Tabla, ranking y radar en `/comparativa` |
| [`EvaluacionEditModal.tsx`](../../../src/components/sections/comparativa/EvaluacionEditModal.tsx) | Modal de edición admin |
| [`/api/admin/evaluaciones.ts`](../../../src/pages/api/admin/evaluaciones.ts) | Validación server-side (hardcoded pero en sync con este archivo) |

## Detalles no obvios

- La validación server-side en los endpoints **hardcodea** las dimensiones (no importa este archivo) por simplicidad. Si añades o renombras una dimensión en `DIMENSIONS`, debes actualizar también ambos endpoints y la migración SQL.
- `calcCalificacion` no redondea — retorna un `number` con decimales. La UI decide cuántos dígitos mostrar.
- Los hints de cada dimensión están pensados para el tooltip del slider en el formulario, no para el glosario (el glosario tiene su propia prosa en `src/data/glossary.ts`).
