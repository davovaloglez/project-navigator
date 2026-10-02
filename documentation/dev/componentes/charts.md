# Charts (Recharts)

Componentes de visualización en [src/components/charts/](../../../src/components/charts/). Todos basados en Recharts, todos puramente presentacionales (reciben `ProjectRecord[]` o `CursoRecord[]` y calculan agregaciones inline o en `useMemo`).

## ChartCard (wrapper)

```tsx
interface ChartCardProps {
  title: string;
  className?: string;
  info?: { description: string; glossaryAnchor?: string };
  children: ReactNode;
}
```

Wrapper estándar para cualquier chart. Provee:

- Card con `bg-slate-800 border border-slate-700/50 rounded-xl p-5`.
- Header con título + `InfoTooltip` si hay `info`.
- Slot para el chart.

**Gating de bloque:** si `info.glossaryAnchor` está denegado para el usuario, `ChartCard` retorna `null` (mismo comportamiento que `KPICard`). Usa `canWith(readInlinePermissions(), ...)` — sin hooks.

**Convención:** todo chart custom debe envolverse en `ChartCard` para mantener consistencia visual.

```tsx
<ChartCard title="Estatus" info={infoFor('dashboard-estatus-chart')}>
  <EstatusDonutChart data={data} />
</ChartCard>
```

## Charts disponibles

Todos en `src/components/charts/`. Cada uno recibe `data: ProjectRecord[]` (o `CursoRecord[]`) por props y renderiza un `ResponsiveContainer` con la gráfica.

### EstatusDonutChart

Donut con conteo por `p.estatus`. Colores de `getEstatusColor()`.

```tsx
<EstatusDonutChart data={projects} />
```

### SaludDonutChart

Donut con conteo por `p.salud` (Estable / Requiere atencion / En riesgo). Colores de `getSaludColor()`.

### PrioridadBarChart

Bar chart horizontal con conteo por `p.prioridad` (Bloqueadora / Crítica / Mayor / Menor / Trivial).

### HitoProgressChart

`ComposedChart` (bar + line, eje doble) agrupado por `p.hito` (alias de `p.cuatrimestre`, e.g. "2026 Q2"). El título del widget en el dashboard es "Progreso por Cuatrimestre". Eje izquierdo: progreso promedio (0-100); eje derecho: número de proyectos por cuatrimestre (línea amarilla).

### ProgresoArquitectoChart

Bar chart agrupado por arquitecto. Maneja campos multi-arquitecto: `p.arquitecto` puede contener `"Luis, George"`, por lo que el componente hace `p.arquitecto.split(',').map(s => s.trim()).filter(...)` para contar cada arquitecto por separado. Cada barra muestra el progreso promedio ponderado; el color sigue el semáforo estándar (verde ≥80%, amarillo ≥40%, rojo <40%).

### DevWorkloadChart

Bar chart con carga por dev (cada `p.devs` cuenta como asignación). Stacked: Done vs Active.

### CursosProgressChart

Bar chart con `c.progreso` por `c.colaborador`. Color según rango (≥80 verde, ≥40 amarillo, <40 rojo).

## Convenciones de Recharts en el proyecto

### Cell re-export

```ts
// src/utils/recharts.ts
export { Cell } from 'recharts';
```

`Cell` viene marcado como `@deprecated` en algunos types de Recharts. Re-exportarlo desde un módulo propio silencia el warning. Usar:

```tsx
import { Cell } from '../../utils/recharts';
```

### Tooltip styling consistente

```tsx
<Tooltip
  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
  itemStyle={{ color: '#e2e8f0' }}
  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
/>
```

Estas tres props van a casi todos los `Tooltip` del proyecto. Si las cambias, sé consistente.

### Axes minimal

```tsx
<XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
<YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
```

Sin líneas de eje ni ticks, sólo labels. Es el estilo que adoptamos en todo el tablero.

### Bar radius

```tsx
<Bar dataKey="value" radius={[6, 6, 0, 0]} />
```

Esquinas redondeadas arriba (típico para bars verticales). Para horizontales: `[0, 6, 6, 0]`.

### Donuts

```tsx
<PieChart>
  <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
    {data.map((entry) => <Cell key={entry.name} fill={colorFor(entry.name)} />)}
  </Pie>
  <Tooltip … />
</PieChart>
```

`paddingAngle={2}` da una separación pequeña entre slices. `innerRadius`/`outerRadius` definen el grosor del donut.

### Responsive

Todos los charts van envueltos en `<ResponsiveContainer width="100%" height={H}>` donde `H` típicamente es 200-280. Si el chart necesita ser variable, calcular `H` en el componente padre:

```ts
const chartHeight = Math.max(200, data.length * 36 + 60);
```

## Crear un chart nuevo

1. Crear `src/components/charts/MiChart.tsx` con interfaz tipada.
2. Calcular agregación en `useMemo` con dependencia en `data`.
3. Usar tooltips/axes con los estilos del proyecto (ver arriba).
4. Importar colores desde `utils/colors.ts`, **no hardcoded**.
5. Envolverlo en `ChartCard` desde la section padre, no internamente.
6. Agregar entrada al glosario y pasar `info={infoFor('section-mi-chart')}`.

## Anti-patrones a evitar

- ❌ Hardcoded hex en el chart (`fill="#ff0000"`). Usar paleta.
- ❌ `useSheetData` dentro del chart. La section lo provee.
- ❌ Chart sin tooltip (los users esperan poder hover para ver valores exactos).
- ❌ Chart sin `ResponsiveContainer` (en mobile se rompe).
- ❌ Usar `Pie` o `Bar` sin `Cell` cuando necesitas colores distintos por slice.
