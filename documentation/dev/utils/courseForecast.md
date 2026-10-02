# courseForecast

Pronóstico de fecha de finalización de cursos por colaborador. El Sheet `Cursos` no tiene fechas, así que la velocidad sólo se puede derivar comparando snapshots semanales.

**Source:** [../../../src/utils/courseForecast.ts](../../../src/utils/courseForecast.ts)

## Tipos públicos

```ts
type CourseForecastSource = 'snapshots' | 'none';
type CourseTrend = 'advancing' | 'stalled' | 'unknown' | 'done';

interface CourseForecast {
  colaborador: string;
  ou: string;
  rol: string;
  progresoActual: number;            // 0–100
  pidsCreados: number;
  velocityPerWeek: number | null;    // pp/sem
  weeksToFinish: number | null;
  forecastFinishDate: string | null; // ISO YYYY-MM-DD
  source: CourseForecastSource;
  trend: CourseTrend;
  snapshotsUsed: number;
}
```

## Funciones públicas

### `computeCourseForecasts(cursos, snapshots)`

```ts
function computeCourseForecasts(
  cursos: CursoRecord[],
  snapshots: WeeklySnapshot[],
): CourseForecast[]
```

#### Algoritmo

1. Indexa snapshots por colaborador: `Map<colaborador, { weekKey, progreso }[]>`.
2. Para cada `CursoRecord`:
   - Si `progreso >= 100` → `trend: 'done'`. Sin más cálculo.
   - Si hay historial con ≥ 1 snapshot:
     - `first = history[0]`, `firstDate = parseIso(first.weekKey)`.
     - `weeksSinceFirst = max(1, (today - firstDate) / (MS_DAY * 7))`.
     - `delta = c.progreso - first.progreso`.
     - `velocityPerWeek = delta / weeksSinceFirst`.
     - `source = 'snapshots'`.
     - Trend:
       - `velocityPerWeek > 0.5` → `advancing`.
       - `velocityPerWeek > -0.5` → `stalled` (incluye 0, no es "advancing" pero tampoco regresión severa).
       - resto (rate muy negativo) → `stalled`.
   - Si no hay snapshots → `source: 'none'`, `trend: 'unknown'`.
3. Si `progreso < 100` y `velocityPerWeek > 0`:
   - `weeksToFinish = (100 - progreso) / velocityPerWeek`.
   - Sólo si `isFinite` y `> 0` → `forecastFinishDate = today + round(weeksToFinish * 7)`.

Orden de la salida (función `rank`): `advancing` (0) → `stalled` (1) → `unknown` (2) → `done` (3). Tiebreak por `progresoActual` desc.

### `courseTrendMeta(t)`

Devuelve `{ label, color, bg }` con clases Tailwind:

| Trend | Label |
|---|---|
| `advancing` | "Avanzando" (verde) |
| `stalled` | "Sin ritmo" (ámbar) |
| `done` | "Completado" (gris) |
| `unknown` | "Sin datos" (gris claro) |

## Quién lo usa

| Caller | Uso |
|---|---|
| [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) | Tab "Personas" → cards de cursos por persona |
| [`CourseForecastCard`](../../../src/components/ui/CourseForecastCard.tsx) | Render por curso + `courseTrendMeta` |

## Casos de borde

- **Cursos en `progreso 0–100`** (no 0–1 como en `ProjectRecord`): consistente con el Sheet. Los cálculos respetan esta escala (`weeksToFinish = (100 - progreso) / vpw`).
- **Sin snapshots**: `source: 'none'`, todos los campos predictivos en `null`. La UI muestra prompt de "esperar a acumular snapshots".
- **Un solo snapshot con `weeksSinceFirst < 1`**: el código requiere `>= 1` para calcular velocity. Skip → `source: 'none'`. En la práctica esto sucede sólo si el primer snapshot fue esta semana.
- **Velocity negativa** (progreso bajó entre snapshots): aún se calcula `velocityPerWeek` pero `weeksToFinish` no se calcula (la guarda `velocityPerWeek > 0` previene división rara). Trend va a `stalled`.
- **Progreso ya en 100%**: corto-circuito a `trend: 'done'`. El `forecastFinishDate` queda `null`.
- **`weeksToFinish` infinito** (velocity prácticamente 0): el `isFinite` filtra y deja `null`.

## Detalles no obvios

- **Velocity desde el primer snapshot, no entre los dos más recientes**: con muestras escasas (típicamente 4–12 semanas), promediar desde el inicio es más estable que comparar puntos cercanos. La métrica refleja "ritmo promedio histórico" no "ritmo actual".
- **No usa la `forecastFinishDate` para promediar entre cursos**: cada colaborador es independiente. El total agregado del equipo no se calcula aquí.
- **No reutiliza `anomalies.ts`** aunque ambos comparen rates: las anomalías son señales puntuales sobre baseline; este utility sólo proyecta linealmente. Si en el futuro quisiéramos detectar "el colaborador X bajó el ritmo" haría falta un análisis dedicado, pero la frecuencia y granularidad de los datos hoy no lo justifica.
- **Threshold de `0.5 pp/sem` para "advancing"**: por debajo de eso (≤ 0.5 pp/sem ≈ 26 pp/año) consideramos el curso prácticamente parado a efectos de ETA. Calibrado contra los cursos reales del equipo.
- **`pidsCreados` se pasa raw al output**: no se usa en cálculos, sólo para que la UI lo muestre junto al progreso.
