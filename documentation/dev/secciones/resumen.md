# `/resumen` — ResumenSection

Resumen ejecutivo del portafolio: un score global de salud + comparativa por hito + lo mejor y lo peor.

- **Componente:** [src/components/sections/ResumenSection.tsx](../../../src/components/sections/ResumenSection.tsx)
- **Página:** [src/pages/resumen.astro](../../../src/pages/resumen.astro)
- **LOC:** ~329
- **Filtro PM:** ✅ (`usePersistedFilters` key `resumen`)
- **Snapshot capture:** ✅ (sobre `allData` raw)

## Datos de entrada

| Hook | Endpoint |
|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` |
| `useSheetData<CostoRecord>` | `/api/costos` |
| `useSheetData<CursoRecord>` | `/api/cursos` (sólo para snapshot capture) |
| `usePersistedFilters` | key `resumen` — `{ pmFilter: {} }` |
| `useSnapshotCapture(allData, cursosQ.data)` | — |

## Cálculos

```ts
const activeProjects = data.filter((p) => p.estatus !== 'Done' && p.estatus !== 'On Hold');
const healthScores = activeProjects.map((p) => ({ project: p, health: calcHealthScore(p) }));
const avgHealth = Math.round(mean(healthScores.map(h => h.health.score)));
```

### Distribución de salud

Buckets fijos: `{ Excelente, Bueno, Medio, Bajo, Crítico }`. Asignación según el `label` que retorna `calcHealthScore` (thresholds 85/65/45/25).

Filtrado a `value > 0` antes de pasar al chart.

Colores hex (NO de paleta tailwind dinámica):

```ts
const healthColors = {
  Excelente: '#4ade80',
  Bueno: '#60a5fa',
  Medio: '#facc15',
  Bajo: '#fb923c',
  'Crítico': '#f87171',
};
```

### Comparativa por hito

```ts
const hitoData = Object.entries(groupByField(activeProjects, 'hito'))
  .filter(([name]) => name && name !== 'Sin dato')
  .map(([name, items]) => ({
    name,
    progreso: Math.round(mean(items.map(p => p.progreso)) * 100),
    salud: Math.round(mean(items.map(p => calcHealthScore(p).score))),
    count: items.length,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
```

Cada hito muestra **dos barras** (progreso y salud) con colores semáforo en mismos thresholds (verde ≥80/≥65, amarillo ≥40/≥45, rojo <40/<45).

### Worst / Best projects

```ts
const worstProjects = [...healthScores].sort((a, b) => a.health.score - b.health.score).slice(0, 5);
const bestProjects  = [...healthScores].sort((a, b) => b.health.score - a.health.score).slice(0, 5);
```

Cada card de "worst" muestra hasta 2 `factors` del `HealthDetail` separados por ` · ` (explicación humana del por qué del score).

### Banner header

```ts
const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
const totalCostMensual = sum(costosData.data.map(c => c.total));
```

Ring color del score: verde ≥65, amarillo ≥45, rojo <45. Fondo del banner siguen el mismo semáforo (`bg-green-500/10`, `border-green-500/30`, etc.).

KPIs del banner: Completados / On Track / Riesgo (At Risk + Blocked) / Costo mensual.

## Quick links (footer)

Tres CTAs estáticos a `/alertas`, `/timeline`, `/portafolio`.

## Convenciones

- Filtro PM idéntico al de Dashboard (mismo patrón).
- Snapshots pasan `allData` antes de filtrar — la integridad del histórico no depende del filtro UI.
- Tooltips de glosario en cada bloque (`infoFor(...)` o `GlossaryTooltip id="..."`).
