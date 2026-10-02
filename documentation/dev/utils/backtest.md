# backtest

Valida el motor de pronóstico contra la historia: para cada proyecto `Done` con `finReal`, reconstruye el pronóstico que el motor habría dado en un snapshot intermedio y compara con la fecha real. Reporta MAE, sesgo medio, mediana, y porcentaje de aciertos dentro de ±7 y ±14 días.

**Source:** [../../../src/utils/backtest.ts](../../../src/utils/backtest.ts)

## Tipos públicos

```ts
interface BacktestEntry {
  project: ProjectRecord;
  snapshotWeek: string;
  snapshotProgress: number;
  predictedDate: string;       // ISO
  actualDate: string;          // ISO (finReal)
  errorDays: number;           // finReal - predictedDate
}

interface BacktestResult {
  sampleSize: number;
  mae: number;                 // mean absolute error en días
  meanError: number;           // bias signado
  medianError: number;
  within7d: number;            // 0–1
  within14d: number;
  entries: BacktestEntry[];    // ordenadas por |errorDays| desc
}
```

## Función pública

### `runBacktest(snapshots, projects)`

```ts
function runBacktest(snapshots: WeeklySnapshot[], projects: ProjectRecord[]): BacktestResult
```

#### Algoritmo

1. Si no hay snapshots → struct vacío con ceros.
2. Para cada proyecto `Done`:
   - Requiere `finReal` y `fechaInicio || registro`. Skip si faltan.
   - Busca el **primer** snapshot con progreso `≥ 0.2` y `< 0.95` para este folio. Esto define "una semana intermedia, no demasiado temprano ni demasiado tarde".
   - Si no encuentra ese snapshot → skip.
   - Reconstruye el pronóstico que el motor habría dado en ese momento:
     - `daysElapsed = daysBetween(fechaInicio, snapshotDate)`.
     - `dailyRate = snapshotProgress / daysElapsed`.
     - `daysToFinish = (1 - snapshotProgress) / dailyRate`.
     - `predictedDate = snapshotDate + daysToFinish * MS_DAY`.
   - `errorDays = daysBetween(finReal, predictedDate) = finReal - predictedDate`. Positivo = el motor predijo antes (proyecto se atrasó).
3. Agregados:
   - `mae = mean(|errors|)`.
   - `meanError = mean(errors)` (sesgo signado: ¿somos optimistas o pesimistas en promedio?).
   - `medianError = mediana(errors)`.
   - `within7d = % con |errorDays| ≤ 7`.
   - `within14d = % con |errorDays| ≤ 14`.
4. Orden de `entries`: por `|errorDays|` desc (los peores arriba para auditar).

## Quién lo usa

| Caller | Uso |
|---|---|
| [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) | Tab "Metodología" → muestra el resultado |
| [`BacktestCard`](../../../src/components/ui/BacktestCard.tsx) | Render del summary + entries |

## Casos de borde

- **Snapshots vacíos**: struct vacío inmediato.
- **Proyectos `Done` sin `finReal`**: skip. La validación requiere ambas fechas.
- **`fechaInicio` faltante**: cae a `registro`. Si ambos faltan → skip.
- **Sin snapshot intermedio (proyecto pasó de < 20% a 100% entre dos capturas)**: skip silencioso. No se puede backtest sin un punto intermedio confiable.
- **`dailyRate <= 0`** (snapshot con progreso negativo o 0): skip para evitar dividir por cero o producir fechas absurdas.
- **`daysElapsed <= 0`**: significa que el snapshot es anterior a `fechaInicio` (inconsistencia). Skip.
- **`sampleSize` chico**: cuando hay menos de 5 muestras los porcentajes son ruidosos. La UI lo señala con texto explicativo; el utility no añade caveat.

## Detalles no obvios

- **Ventana 20–95% de progreso**: por debajo de 20% el rate es muy volátil (típicamente exagerado al inicio); por encima de 95% queda poco margen para errar. Esa ventana es un compromise entre "muestras representativas" y "tener historia suficiente".
- **`errorDays = finReal - predictedDate`**: signo positivo significa que el motor era optimista (predijo cierre antes del cierre real). Negativo: pesimista. En la práctica el equipo tiende a +bias (atrasos > adelantos).
- **No reusa `forecastEngine.forecastProject`**: la lógica de extrapolación lineal está duplicada aquí (sin bandas, sin probabilidad, sin gap-de-progreso override). El motivo: el backtest necesita ser **estable**, sin las heurísticas que pueden cambiar entre versiones del motor. Si añades un override nuevo a `forecastProject`, considerá si el backtest debería reflejarlo o si conviene mantener este baseline.
- **Sólo un snapshot por proyecto en el cálculo**: no se promedian múltiples puntos intermedios. La razón: queremos un dato comparable entre proyectos (¿cómo le habría ido al motor con la primera mitad de información?), no un análisis estadístico denso.
- **`finReal` debe ser ISO date**: el endpoint `/api/proyectos` ya lo devuelve así. Si llegara un valor con formato distinto, `parseDate` retorna `null` y el proyecto se skipea.
- **El backtest no incluye proyectos `On Hold` ni cancelados**: sólo `Done`, que son los únicos con `finReal` y por lo tanto los únicos verificables.
