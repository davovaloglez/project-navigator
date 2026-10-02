# recharts

Re-export tipado de `Cell` desde `recharts`. Existe únicamente para silenciar el warning de `@deprecated` que el package marca en su d.ts: en `recharts v3` el componente `Cell` sigue siendo la API correcta para styling por-item, pero los maintainers lo marcaron `@deprecated` por error (issue conocido).

**Source:** [../../../src/utils/recharts.ts](../../../src/utils/recharts.ts)

## Implementación

```ts
import type { ComponentType } from 'react';
import * as _Recharts from 'recharts';

export const Cell: ComponentType<{ fill?: string; stroke?: string }> =
  (_Recharts as any)['Cell'];
```

El cast a `any` y la re-exportación con un tipo limpio quita el warning del IDE / TypeScript sin perder funcionalidad.

## Uso

```ts
import { Cell } from '../../utils/recharts';
import { getEstatusColor } from '../../utils/colors';
import { Pie, PieChart, Tooltip } from 'recharts';

<PieChart>
  <Pie data={data} dataKey="value">
    {data.map((entry, i) => (
      <Cell key={i} fill={getEstatusColor(entry.name).chart} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

## Quién lo usa

Todos los charts que necesitan colorear items individualmente:
- [`EstatusDonutChart`](../../../src/components/charts/EstatusDonutChart.tsx)
- [`SaludDonutChart`](../../../src/components/charts/SaludDonutChart.tsx)
- [`PrioridadBarChart`](../../../src/components/charts/PrioridadBarChart.tsx)
- [`CursosProgressChart`](../../../src/components/charts/CursosProgressChart.tsx)
- [`ProgresoArquitectoChart`](../../../src/components/charts/ProgresoArquitectoChart.tsx)

Y secciones que arman charts ad-hoc: [`CronogramaSection`](../../../src/components/sections/CronogramaSection.tsx), [`CursosSection`](../../../src/components/sections/CursosSection.tsx), [`CostosSection`](../../../src/components/sections/CostosSection.tsx), [`DistribucionPuntosSection`](../../../src/components/sections/DistribucionPuntosSection.tsx), [`MetricasDevSection`](../../../src/components/sections/MetricasDevSection.tsx), [`PersonaDetailSection`](../../../src/components/sections/PersonaDetailSection.tsx), [`ResumenSection`](../../../src/components/sections/ResumenSection.tsx).

## Detalles no obvios

- **Sólo expone `Cell`**: el resto de imports de Recharts (`Pie`, `PieChart`, `Tooltip`, etc.) se hacen directo desde `'recharts'`. Sólo `Cell` tiene el warning de deprecation.
- **Si Recharts arregla el d.ts**: este wrapper se puede eliminar. Mientras tanto, importar `Cell` desde aquí, no desde `'recharts'`.
- **El tipo expuesto sólo declara `fill` y `stroke`**: en realidad `Cell` acepta más props (radius, strokeWidth, etc.), pero limitamos al subset que usamos. Si necesitas otra prop, agrégala al tipo del export.
