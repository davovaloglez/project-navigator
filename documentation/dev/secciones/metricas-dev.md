# `/metricas-dev` — MetricasDevSection

Tabla comparativa de rendimiento por persona (Arquitecto / PM / Developer). Calcula 10 métricas por individuo (tasa de completación, salud promedio, puntualidad, etc.) y permite ordenar la tabla por cualquiera de ellas.

- **Componente:** [src/components/sections/MetricasDevSection.tsx](../../../src/components/sections/MetricasDevSection.tsx)
- **Página:** [src/pages/metricas-dev.astro](../../../src/pages/metricas-dev.astro)
- **LOC:** ~371
- **Filtro PM:** ✅ (`usePersistedFilters` key `metricas-dev`)
- **Snapshot capture:** ❌
- **No linkeada en el sidebar** por diseño (ver [CHANGELOG.md v1.1.0](../../../CHANGELOG.md)). Acceso por URL directa.

> **Razón del ocultamiento**: la sección expone métricas comparativas individuales por persona. Tener un link permanente en el sidebar genera fricción cultural (sensación de ranking público). Se mantiene como herramienta interna accesible para PMs y líderes que la necesiten.

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Source único — todas las métricas derivan de `ProjectRecord` |
| `usePersistedFilters('metricas-dev', ...)` | `/api/user-preferences` | `sortKey`, `sortDir`, `pmFilter` |

> **Nota**: aunque el CLAUDE.md menciona que la sección "usa tareas", el archivo actual sólo consume `/api/proyectos`. Las métricas se calculan a nivel de proyecto (no de tarea granular).

### Estado persistido

```ts
usePersistedFilters<{
  sortKey: keyof DevMetrics;
  sortDir: 'asc' | 'desc';
  pmFilter: Record<string, string[]>;
}>('metricas-dev', { sortKey: 'avgHealthScore', sortDir: 'desc', pmFilter: {} });
```

`selectedDev: string | null` es **no persistido** (selección de fila para abrir radar — exploratorio).

## Construcción de métricas

```ts
function add(name: string, role: string, p: ProjectRecord) {
  if (!name || name === '-') return;
  if (!map.has(name)) map.set(name, { roles: new Set(), projects: new Set(), records: [] });
  const entry = map.get(name)!;
  entry.roles.add(role);
  if (!entry.projects.has(p.folio)) {     // dedup por folio
    entry.projects.add(p.folio);
    entry.records.push(p);
  }
}

for (const p of data) {
  add(p.arquitecto, 'Arquitecto', p);
  add(p.pm, 'PM', p);
  for (const d of p.devs) add(d, 'Developer', p);
}
```

Dedup obligatorio: una persona arquitecta+dev del mismo proyecto sólo cuenta una vez para los conteos.

### Las 10 métricas

```ts
interface DevMetrics {
  name: string;
  totalProjects: number;
  activeProjects: number;       // estatus !== Done && !== On Hold
  doneProjects: number;          // estatus === Done
  atRiskProjects: number;        // estatus ∈ { At Risk, Blocked / Critical }
  completionRate: number;        // doneProjects / totalProjects * 100
  avgProgress: number;           // promedio de progreso * 100
  avgHealthScore: number;        // promedio de calcHealthScore(p).score
  totalPoints: number;
  donePoints: number;
  onTimeRate: number;            // -1 si no aplica
  avgPointsPerProject: number;
  roles: string[];
}
```

### Cálculo de `onTimeRate`

```ts
const withDates = done.filter(p => p.finReal && p.finEstimado);
const onTime = withDates.filter(p => new Date(p.finReal) <= new Date(p.finEstimado));
const onTimeRate = withDates.length > 0
  ? Math.round((onTime.length / withDates.length) * 100)
  : -1;
```

- Sólo se consideran proyectos **Done** con **ambas fechas** (real y estimada) cargadas.
- `-1` es centinela para "N/A" — se renderiza como `—` en la tabla.
- "On time" = `finReal ≤ finEstimado` (terminó en o antes de la fecha planeada).

## Sort dinámico

```ts
function toggleSort(key: keyof DevMetrics) {
  if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
  else { setSortKey(key); setSortDir('desc'); }
}
```

Click en un header de columna:

- Si ya estaba sorteado por esa key, invierte la dirección.
- Si no, cambia a esa key con dirección `desc` (queremos ver "los mejores" arriba por default).

```ts
const sorted = [...devMetrics].sort((a, b) => {
  const av = a[sortKey] as number;
  const bv = b[sortKey] as number;
  return sortDir === 'desc' ? bv - av : av - bv;
});
```

Cast a `number` es válido porque las columnas sorteables son todas numéricas. La columna `name` no es sorteable.

## Vista del DEV seleccionado

```ts
const selectedDevData = useMemo(() => {
  if (!selectedDev) return null;
  const metrics = devMetrics.find(d => d.name === selectedDev);
  const projects = data.filter(p =>
    p.arquitecto === selectedDev || p.pm === selectedDev || p.devs.includes(selectedDev)
  );
  const uniqueProjects = [...new Map(projects.map(p => [p.folio, p])).values()];
  return { metrics, projects: uniqueProjects };
}, [selectedDev, devMetrics, data]);
```

### Radar chart

5 ejes que normalizan métricas a escala 0-100:

```ts
const radarData = [
  { metric: 'Completación', value: m.completionRate },
  { metric: 'Progreso',     value: m.avgProgress },
  { metric: 'Salud',        value: m.avgHealthScore },
  { metric: 'Puntualidad',  value: m.onTimeRate >= 0 ? m.onTimeRate : 50 },  // ← N/A se muestra como 50 neutral
  { metric: 'Capacidad',    value: Math.min(100, m.totalProjects * 15) },     // ← 7 proyectos satura el eje
];
```

Decisiones de modelado:

- **Puntualidad N/A → 50**: si la persona no tiene proyectos Done con fechas, mostrarla en 0 sería injusto y en 100 sería falso. 50 es "neutral".
- **Capacidad = `min(100, total × 15)`**: 7 proyectos satura el eje. No es una métrica de calidad sino de "qué tan ocupado está el plato".

## Ranking chart

Bar chart horizontal ordenado descendente por `avgHealthScore`:

```ts
const rankingData = [...devMetrics]
  .sort((a, b) => b.avgHealthScore - a.avgHealthScore)
  .map(d => ({ name: d.name, score: d.avgHealthScore }));
```

Colores semánticos: verde ≥65, amarillo ≥45, rojo <45 (mismo umbral que el resto del tablero).

## Filtro PM

Aplica antes de calcular las métricas:

```ts
const data = useMemo(() => {
  const selected = pmFilter.pm || [];
  return selected.length ? allData.filter(p => selected.includes(p.pm)) : allData;
}, [allData, pmFilter]);
```

Caveat útil: cuando filtras por un PM, las métricas de cada persona se recalculan **sólo sobre proyectos de ese PM**. Si un Dev está en 3 proyectos del PM A y 2 del PM B, con filtro PM A activo verás solo sus 3 — su `totalProjects` será 3, no 5.

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global).
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — `sortKey`/`sortDir`/`pmFilter` persisten; `selectedDev` no.
- [Health Score](../utils/healthScore.md) — la métrica `avgHealthScore` usa `calcHealthScore` que cruza estatus, progreso esperado vs real, vencimiento, prioridad.
- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — `folioToSlug` para los links en la mini-lista de proyectos del radar.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — un tooltip por gráfica y por la tabla.
