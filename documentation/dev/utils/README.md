# Utils — Índice

Lógica pura de cálculo y transformación. **Sin side-effects** (excepto `snapshots.ts` que toca `localStorage` y `theme.tsx` que toca `document`). Cada utilidad es independiente, testable en aislamiento y reutilizable desde cualquier section component.

Regla: si un cálculo se repite en dos sections, vive en `utils/`. Si depende del DOM o del fetch, no es utility — pertenece a hooks/ o components/.

## Por categoría

### Motores de cálculo

| Util | Resume |
|---|---|
| [forecastEngine.md](./forecastEngine.md) | Motor determinista de pronóstico: velocity, fechas de cierre por proyecto, capacidad del equipo, criticidad, impacto económico del slippage |
| [healthScore.md](./healthScore.md) | Score 0–100 por proyecto cruzando estatus, salud, progreso vs esperado, vencimiento, acciones y prioridad. Genera también alertas estáticas |
| [costEngine.md](./costEngine.md) | Costo prorrateado por proyecto y por persona + modelo financiero del Excel (experiencia → admin → margen → IVA) |

### Persistencia

| Util | Resume |
|---|---|
| [snapshots.md](./snapshots.md) | Snapshot semanal en `localStorage` + sync con la tab `Snapshots` del Sheet. Base para stale/anomalies/backtest/courseForecast |

### Análisis derivado

| Util | Resume |
|---|---|
| [stale.md](./stale.md) | Marca proyectos cuyo `progreso` no se mueve en ≥ 14 días |
| [anomalies.md](./anomalies.md) | Detección de slowdown / stall / acceleration vs baseline histórica |
| [dependencies.md](./dependencies.md) | Parser de `requiereDe` + cascada de bloqueadores |
| [courseForecast.md](./courseForecast.md) | ETA de cursos derivado de velocity entre snapshots |
| [forecastAlerts.md](./forecastAlerts.md) | Agrega forecast + stale + anomalies + dependencies en alertas para `/alertas` |
| [backtest.md](./backtest.md) | Valida el motor de pronóstico contra proyectos `Done` con `finReal` |

### Semántica de dominio

| Util | Resume |
|---|---|
| [projectStatus.md](./projectStatus.md) | Predicados `isActive`, `isTerminal`, `isCancelled`, `countsForHealth` + `ESTATUS_ORDER`. Fuente única de la semántica de estatus de proyecto (NAV-90) |

### Tipos y transformaciones genéricas

| Util | Resume |
|---|---|
| [dataTransforms.md](./dataTransforms.md) | Interfaces `ProjectRecord`, `CursoRecord`, `CostoRecord`, `TareaRecord`, `FinancialModel` + helpers `countByField` / `groupByField` |

### Evaluaciones

| Util | Resume |
|---|---|
| [evaluacion.md](./evaluacion.md) | 7 dimensiones de auto-evaluación, calificación promedio, utilidades de período (`YYYY-Qn`) |

### Presentación / utilidades de UI

| Util | Resume |
|---|---|
| [colors.md](./colors.md) | Paleta centralizada (estatus, salud, prioridad, OU, tipo de tarea) para badges y charts |
| [healthStatusVisuals.md](./healthStatusVisuals.md) | Iconos y dot-colors para buckets de salud y estatus de proyecto — usado en el rail del Timeline (NAV-72) |
| [slugs.md](./slugs.md) | Folio `↔` slug URL-safe (escapa `/`) |
| [recharts.md](./recharts.md) | Re-export tipado de `Cell` para evitar el warning de `@deprecated` |
| [theme.md](./theme.md) | Hook `useTheme` con persistencia en `localStorage` y evento global |
| [changelog.md](./changelog.md) | Parser del `CHANGELOG.md` para la página `/novedades` |
| [imageResize.md](./imageResize.md) | Redimensiona imágenes en el cliente (canvas, sin deps) antes de subir avatares |

## Reglas globales

- **Sin imports de hooks de React** (excepto `theme.tsx` que es por definición un hook).
- **Sin `fetch` ni acceso a Sheets**: ese es trabajo de `/api/*` y de los hooks.
- **Determinismo**: para los mismos inputs, el mismo output. `snapshots.captureSnapshot` es la única función con un side-effect documentado (escribe `localStorage` y dispara `pushRemoteSnapshot` fire-and-forget).
- **Sin `any`**: TypeScript strict obliga a tipar entradas y salidas. `npx astro check` debe pasar con 0 errores.
- **Test-friendly**: cada función exportada se puede testar con datos sintéticos. Los `Date.now()` se materializan en helpers locales (`today0()`) para que los tests puedan mockear `Date` globalmente.
- **Excepción DOM**: `imageResize.ts` usa `document`, `FileReader`, `Image` y `canvas` — sólo puede ejecutarse en el cliente (componentes React). No importar en código server-side.

## Mapa de dependencias internas

```
projectStatus ────────────────────────► (sin deps internas)

healthScore  ──► projectStatus
costEngine   ──► dataTransforms

forecastEngine ──► dataTransforms + costEngine  (computeSlippageCostImpact)

snapshots    ──► dataTransforms
stale        ──► dataTransforms + snapshots (tipo) + projectStatus
anomalies    ──► dataTransforms + snapshots (tipo)
dependencies ──► dataTransforms + forecastEngine (tipo) + equipoMatch (lib)
courseForecast ──► dataTransforms + snapshots (tipo)
backtest     ──► dataTransforms + snapshots (tipo)

forecastAlerts ──► dataTransforms + forecastEngine + stale + anomalies + dependencies

evaluacion   ──► (sin deps internas — puro helper de dominio)
healthStatusVisuals ──► lucide-react (íconos)
```

`forecastAlerts` es el agregador "top": consume todas las otras señales. `forecastEngine` es el "centro" del subsistema predictivo.
