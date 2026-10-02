# NAVs-90 — Plan de acción: Nuevos estatus `Cancelado` y `LaunchPhase`

## Objetivo (de la historia)

Añadir dos estatus al catálogo de proyectos:

- **`Cancelado`** — un proyecto cancelado **ya no debe contabilizar para la SALUD general** (ni para KPIs de activos, costos, alertas ni pronóstico). Sigue **visible** en roadmap/portafolio.
- **`LaunchPhase`** — fase **previa a Hypercare**: se prepara el lanzamiento de la funcionalidad. Es un estatus **activo** (cuenta normal).

Requisitos extra: iconos y colores representativos, y que el estatus se vea en el **roadmap**.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Color/icono `Cancelado` | **Rojo + icono X (`XCircle`)** — confirmado por la leyenda de ejemplo del PM |
| Color/icono `LaunchPhase` | **Violeta + icono `Rocket`** — confirmado por la leyenda de ejemplo del PM |
| Orden en leyenda/chips | `… Hypercare → LaunchPhase → Cancelado` (LaunchPhase tras Hypercare, Cancelado al final) |
| Alcance de exclusión de `Cancelado` | **Centralizar predicados** (`isActive`/`countsForHealth`/`isTerminal`) como fuente única y excluir en todo (health, KPIs de activos, alertas, costos, pronóstico). Refactor de los ~15 filtros duplicados. |

✅ **Sin colisión de iconos:** el ejemplo del PM usa **`XCircle` (X) rojo** para `Cancelado`, distinto del símbolo "no"/`Ban` de `Blocked / Critical`. No hay que tocar `Blocked / Critical`.

---

## Fase 0 — Fuente única de verdad de estatus (nuevo módulo)

Crear **`src/utils/projectStatus.ts`** para eliminar los ~15 filtros duplicados `p.estatus !== 'Done' && p.estatus !== 'On Hold'`:

```ts
export const ESTATUS_ORDER = [
  'Upcoming', 'On Track', 'LaunchPhase', 'Hypercare',
  'At Risk', 'Blocked / Critical', 'On Hold', 'Done', 'Cancelado',
] as const;

export const isCancelled = (e: string) => e === 'Cancelado';
export const isTerminal  = (e: string) => e === 'Done' || e === 'Cancelado';
/** Reemplazo de `!== 'Done' && !== 'On Hold'`; ahora excluye Cancelado. */
export const isActive    = (e: string) => e !== 'Done' && e !== 'On Hold' && e !== 'Cancelado';
/** Cancelado nunca pesa en la SALUD general. */
export const countsForHealth = (e: string) => e !== 'Cancelado';
```

Espejar en **`mcp-server/src/data/projectStatus.ts`** (mirror intencional, igual que `healthScore.ts`/`types.ts`).

---

## Fase 1 — Colores e iconos (presentación)

1. **`src/utils/colors.ts`** (`estatusColors`, ~L1-9): agregar
   - `'LaunchPhase'`: `bg-violet-500/20` / `text-violet-400` / `dot bg-violet-400` / `chart '#a78bfa'`
   - `'Cancelado'`: rojo, p.ej. `bg-red-500/20` / `text-red-400` / `dot bg-red-400` / `chart '#ef4444'`. Se diferencia de `Blocked / Critical` (`#f87171`) por el **icono X** (no por el color), tal como el ejemplo del PM.
   - `getEstatusColor()` ya cae a fallback, así que no rompe nada existente.

2. **`src/utils/healthStatusVisuals.ts`** (`ESTATUS_VISUALS`, ~L39-50): **agregar al final, en este orden** (igual que la leyenda de ejemplo)
   - `{ label: 'LaunchPhase', icon: Rocket }`
   - `{ label: 'Cancelado', icon: XCircle }`
   - Importar `Rocket` y `XCircle` de `lucide-react`. **No** se toca `Blocked / Critical` (conserva `Ban`).

---

## Fase 2 — Lógica de SALUD / health / alertas

3. **`src/utils/healthScore.ts`**
   - `calcHealthScore` (~L31-37): agregar rama `LaunchPhase` (activo, positivo, similar a Hypercare): `score += 12; factors.push('En fase de lanzamiento')`.
   - `Cancelado`: early-return de un `HealthDetail` neutro/`N/A` (no debe puntuar). Su exclusión de **agregados** se logra vía `isActive`/`countsForHealth` en los consumidores.
   - `generateAlerts` (~L111): cambiar `if (p.estatus === 'Done' || p.estatus === 'On Hold') continue;` → `if (!isActive(p.estatus)) continue;` (excluye Cancelado de alertas).

4. **`mcp-server/src/data/healthScore.ts`**: replicar exactamente lo anterior (mirror).

---

## Fase 3 — Refactor de filtros "activos" a `isActive()` (excluye Cancelado en todo)

Reemplazar `p.estatus !== 'Done' && p.estatus !== 'On Hold'` por `isActive(p.estatus)` en:

- `src/components/sections/DashboardSection.tsx` (L45 y conteos relacionados L54-56, 136, 167, 221, 255-256, 513-515)
- `src/components/sections/ResumenSection.tsx` (L53)
- `src/utils/costEngine.ts` (L100, L156) — proyectos que generan costo
- `src/components/sections/CostosSection.tsx` (L112, 123, 134, 145)
- `src/components/charts/HealthDistributionChart.tsx` (L27)
- `src/components/charts/PersonBurndown.tsx` (L84-86)
- `src/components/sections/DistribucionPuntosSection.tsx` (L52)
- `src/components/sections/persona-detalle/shared.tsx` (L55)
- `mcp-server/src/tools/portfolio.ts` (L27), `mcp-server/src/tools/people.ts` (L58)

Casos a revisar con criterio (no todos son `isActive`):
- `src/utils/stale.ts` (L54), `src/utils/anomalies.ts` (L65): `Done || On Hold` → usar `!isActive` (excluir Cancelado del análisis de ritmo).
- `src/utils/dependencies.ts` (L110): `target.estatus === 'Done' → 'resolved'` → usar `isTerminal` (Cancelado también "resuelve"/no bloquea).
- `src/utils/forecastEngine.ts` (L75, 175, 204, 291, 338, 432, 452): saltar Cancelado del pronóstico (tratarlo como terminal/`isTerminal` o `!isActive` según la rama).
- `src/utils/backtest.ts` (L63): mantiene `=== 'Done'` (solo completados cuentan en backtest) — **sin cambio**.

---

## Fase 4 — Filtros, orden y "Incluir terminados"

5. **`src/components/sections/TimelineSection.tsx`** (L27): array **hardcodeado** de estatus en el filtro estático → agregar `'LaunchPhase'` y `'Cancelado'` (idealmente reordenar según `ESTATUS_ORDER`). Revisar leyenda (L457) que itera `ESTATUS_VISUALS` (ya cubierta por Fase 1).
6. **Toggle "Incluir terminados"** (`ProyectosSection` L129/149, `RoadmapSection` L112/138, `TimelineSection` L146): extender el concepto de "terminado" a `isTerminal` para que el filtro oculte/mu­estre **Done + Cancelado** juntos. Default: ocultos; con el toggle ON se ven (cumple "en roadmap sí veo el estatus").
7. **Filtros dinámicos** de `RoadmapSection` (L85) y `ProyectosSection`: derivan opciones de `data.map(p => p.estatus)` → **automáticos**, no requieren cambio (aparecen al llegar datos con el nuevo estatus).
8. **`mcp-server/src/tools/projects.ts`** (L61): enum Zod hardcodeado → agregar `'LaunchPhase'` y `'Cancelado'`.

---

## Fase 5 — Glosario y documentación

9. **`src/data/glossary.ts`**: actualizar entradas que enumeran estatus (KPIs "En riesgo"/"Bloqueados"/"Completados", leyendas de Timeline/Roadmap, Distribución) y documentar explícitamente que **`Cancelado` no cuenta para la SALUD** y que **`LaunchPhase` precede a Hypercare**. Correr el **validador de cross-refs** del `CLAUDE.md` antes de commitear.
10. **`CLAUDE.md`**: si lista estatus, añadir los dos nuevos (mención breve).

---

## Fase 6 — Verificación

- `npx astro check` (TypeScript strict).
- `npm run build`.
- Validador de cross-refs del glosario (snippet en `CLAUDE.md`).
- Verificación manual: cargar una fila de prueba con cada estatus en el Sheet (o mock) y revisar:
  - Roadmap/Portafolio/Timeline muestran el chip con color/icono correctos.
  - Un proyecto `Cancelado` **no** mueve la SALUD general ni el conteo de activos/costos/alertas.
  - `LaunchPhase` aparece entre On Track y Hypercare y cuenta como activo.

---

## Resumen de archivos a tocar

**Nuevos:** `src/utils/projectStatus.ts`, `mcp-server/src/data/projectStatus.ts`.

**Presentación:** `colors.ts`, `healthStatusVisuals.ts`.

**Lógica:** `healthScore.ts` (+ mirror mcp), `costEngine.ts`, `forecastEngine.ts`, `stale.ts`, `anomalies.ts`, `dependencies.ts`.

**Secciones/charts:** Dashboard, Resumen, Costos, Timeline, Roadmap, Proyectos, DistribucionPuntos, HealthDistributionChart, PersonBurndown, persona-detalle/shared.

**MCP:** `tools/projects.ts` (Zod), `tools/portfolio.ts`, `tools/people.ts`, `data/healthScore.ts`.

**Docs:** `glossary.ts`, `CLAUDE.md`.

> Nota de fuente de datos: los estatus vienen del Google Sheet (`Projects`). El catálogo nuevo solo "existe" cuando el Sheet contenga filas con `Cancelado`/`LaunchPhase`; el código solo debe estar listo para recibirlos. No requiere migración de Turso.
