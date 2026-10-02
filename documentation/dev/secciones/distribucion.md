# `/distribucion` — DistribucionPuntosSection

Análisis de cómo se reparten los story points del portafolio entre clientes, épicas, cuentas y arquitectos.

- **Componente:** [src/components/sections/DistribucionPuntosSection.tsx](../../../src/components/sections/DistribucionPuntosSection.tsx)
- **Página:** [src/pages/distribucion.astro](../../../src/pages/distribucion.astro)
- **LOC:** ~253
- **Filtro PM:** ✅ (`usePersistedFilters` key `distribucion`)
- **Snapshot capture:** ❌ (no captura — la lectura ya está cubierta por otras secciones)

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Source único — todos los breakdowns derivan de `puntos` por proyecto |
| `usePersistedFilters('distribucion', { pmFilter: {} })` | `/api/user-preferences` | Filtro PM |

`allData` se mantiene raw para construir `pmOptions`; `data` es el dataset filtrado por PM usado en KPIs y breakdowns.

## Cálculos

### KPIs

```ts
const totalPoints = data.reduce((s, p) => s + p.puntos, 0);
const donePoints = data.filter(p => p.estatus === 'Done').reduce((s, p) => s + p.puntos, 0);
const activePoints = data
  .filter(p => p.estatus !== 'Done' && p.estatus !== 'On Hold')
  .reduce((s, p) => s + p.puntos, 0);
const avgPerProject = data.length > 0 ? Math.round(totalPoints / data.length) : 0;
```

`activePoints` excluye explícitamente `Done` y `On Hold` (los hold no consumen capacidad activa).

### Breakdowns

Todos usan el patrón `groupByField(data, key)` de [src/utils/dataTransforms.ts](../../../src/utils/dataTransforms.ts) y filtran `'Sin dato'`:

| Variable | Group key | Agregaciones |
|---|---|---|
| `byCliente` | `cliente` | `puntos` (suma), `proyectos` (count) |
| `byEpica` | `epica` | `puntos`, `proyectos`, `avgProgress` (promedio de `progreso * 100`) |
| `byCuenta` | `cuenta` | `puntos`, `proyectos` |
| `byArquitecto` | `arquitecto` | `puntos` total, `done` (puntos terminados), `pending` (puntos pendientes) |

Todos se ordenan descendente por `puntos` y filtran `puntos > 0` para que el gráfico no muestre slices vacíos.

```ts
const byArquitecto = Object.entries(groupByField(data, 'arquitecto'))
  .filter(([name]) => name && name !== 'Sin dato')
  .map(([name, items]) => ({
    name,
    puntos: items.reduce((s, p) => s + p.puntos, 0),
    done: items.filter(p => p.estatus === 'Done').reduce((s, p) => s + p.puntos, 0),
    pending: items.filter(p => p.estatus !== 'Done').reduce((s, p) => s + p.puntos, 0),
  }))
  .filter(x => x.puntos > 0)
  .sort((a, b) => b.puntos - a.puntos);
```

## Gráficas

| Gráfica | Tipo | Library | Notas |
|---|---|---|---|
| Puntos por Cliente | Donut (Pie) | Recharts | `innerRadius={50} outerRadius={85}`. Leyenda manual debajo |
| Puntos por Arquitecto | Stacked bar | Recharts | `stackId="a"` para Done + Pendiente. Done en verde, Pendiente en azul |
| Puntos por Épica | Horizontal bar | Recharts | Altura dinámica: `Math.max(250, byEpica.length * 32 + 40)` |
| Puntos por Cuenta | Horizontal bar | Recharts | Altura dinámica análoga; usa offset `+4` en `COLORS` para no repetir paleta con épicas |

Paleta `COLORS` local (12 valores). Para gráficas semánticas se prefiere `getEstatusColor`, `getOUColor`, etc. de [src/utils/colors.ts](../../../src/utils/colors.ts), pero aquí los breakdowns son categorías arbitrarias (clientes, épicas), así que se usa rotación.

## Reglas especiales

- **Snapshot integrity no aplica** — la sección no llama `useSnapshotCapture`, así que no hay riesgo de contaminar el histórico.
- **El filtro PM altera todos los KPIs y breakdowns**: cuando se filtra por un PM, `totalPoints`, `donePoints`, `avgPerProject` y todos los gráficos se recalculan sobre el subset filtrado. Comportamiento esperado: la sección responde "cómo se distribuye el portafolio **del PM seleccionado**".
- **Banner de PM activo**: cuando hay PM seleccionado, se muestra "Mostrando N proyecto(s) del PM ..." debajo del header.

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global).
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — sólo `pmFilter` persiste; no hay `search` ni `page`.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — un `info={infoFor(...)}` por KPI y por ChartCard.
