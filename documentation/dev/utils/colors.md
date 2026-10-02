# colors

Paleta centralizada para badges (clases Tailwind) y charts (hex). Todas las dimensiones categóricas que tienen color consistente en el tablero viven aquí. Cuando un componente necesita pintar un estatus, salud o tipo de tarea, **siempre** debe pasar por esta utility para mantener coherencia visual.

**Source:** [../../../src/utils/colors.ts](../../../src/utils/colors.ts)

## Mapas exportados

| Constante | Dominio | Campos por entrada |
|---|---|---|
| `estatusColors` | Done, On Track, Hypercare, At Risk, Upcoming, On Hold, Blocked / Critical, LaunchPhase, Cancelado | `bg`, `text`, `dot`, `chart` |
| `saludColors` | Estable, Requiere atencion, En riesgo | `bg`, `text`, `chart` |
| `prioridadColors` | Bloqueadora, Crítica, Mayor, Menor, Trivial | `bg`, `text`, `chart` |
| `tipoTareaColors` | API, Store Procedure, App, Web, Web/API, Análisis, SQA, Prototipo | `bg`, `text`, `chart` |
| `ouColors` | Tech Ambition, Growth Experiences, Allies Networking, Analytics Solutions | `bg`, `text`, `chart` |

`bg` / `text` son clases Tailwind con opacidad (e.g. `bg-green-500/20`, `text-green-400`). `dot` se usa para los pequeños indicadores circulares de la tabla. `chart` es el hex que consume Recharts en `Cell` o como `fill` directo.

## Funciones públicas (lookups con fallback)

```ts
function getEstatusColor(estatus: string): { bg; text; dot; chart };
function getSaludColor(salud: string): { bg; text; chart };
function getPrioridadColor(prioridad: string): { bg; text; chart };
function getOUColor(ou: string): { bg; text; chart };
function getTipoTareaColor(tipo: string): { bg; text; chart };
```

Las funciones `getEstatusColor`, `getSaludColor`, `getPrioridadColor` y `getOUColor` buscan por clave exacta y, si no existe, devuelven un fallback gris (`slate-500/20` + `slate-400` + `#94a3b8`).

`getTipoTareaColor` tiene dos niveles de fallback:

1. **Match semántico** (exacto, luego case-insensitive) contra `tipoTareaColors`.
2. **Si el tipo es desconocido**: elige un color estable de una paleta de 10 por hash del string del tipo — mismo tipo → mismo color siempre. Ya **no** retorna gris genérico para tipos desconocidos; esto permite que tipos nuevos de la hoja sean visualmente distinguibles entre sí sin tocar el código.

## Convenciones de uso

```ts
import { getEstatusColor } from '../../utils/colors';

const c = getEstatusColor(project.estatus);
return <span className={`${c.bg} ${c.text} px-2 py-1 rounded`}>{project.estatus}</span>;
```

Para Recharts:

```ts
import { getEstatusColor } from '../../utils/colors';
import { Cell } from '../../utils/recharts';

<Cell fill={getEstatusColor(entry.name).chart} />
```

## Quién lo usa

| Caller | Funciones |
|---|---|
| [`ProjectCard`](../../../src/components/ui/ProjectCard.tsx) | `getEstatusColor`, `getSaludColor`, `getPrioridadColor` |
| [`ProjectDetailDrawer`](../../../src/components/ui/ProjectDetailDrawer.tsx) | Idem + `getTipoTareaColor` |
| [`EstatusDonutChart`](../../../src/components/charts/EstatusDonutChart.tsx) · [`SaludDonutChart`](../../../src/components/charts/SaludDonutChart.tsx) · [`PrioridadBarChart`](../../../src/components/charts/PrioridadBarChart.tsx) | El campo `chart` |
| [`CronogramaSection`](../../../src/components/sections/CronogramaSection.tsx) | `getTipoTareaColor` para badges por tipo |
| [`CursosSection`](../../../src/components/sections/CursosSection.tsx) | `getOUColor` |
| [`DashboardSection`](../../../src/components/sections/DashboardSection.tsx), [`ResumenSection`](../../../src/components/sections/ResumenSection.tsx), [`TimelineSection`](../../../src/components/sections/TimelineSection.tsx), [`MetricasDevSection`](../../../src/components/sections/MetricasDevSection.tsx), [`ProyectoDetailSection`](../../../src/components/sections/ProyectoDetailSection.tsx), [`PersonaDetailSection`](../../../src/components/sections/PersonaDetailSection.tsx) | Varios |

## Casos de borde

- **Estatus no listado** (e.g. el Sheet introduce un valor nuevo): cae al fallback gris. La UI no rompe; el reviewer ve el valor sin color hasta agregarlo aquí.
- **Cadenas con espacio extra o capitalización distinta**: el lookup es por clave exacta. Si llega "on track" (lowercase), no matchea con `'On Track'`. La normalización es responsabilidad del endpoint que produce el dato.
- **Tailwind v4 + clases dinámicas**: Tailwind purga clases que no detecta en el código. Como aquí las clases viven como strings literales en el módulo, el compilador las preserva.

## Detalles no obvios

- **`tipoTareaColors` tiene 8 entradas pero el Sheet puede contener variantes**: por ejemplo "Backend API" no matchea con "API". Antes de esta versión el desconocido salía en gris; ahora recibe un color determinista por hash que lo distingue visualmente del resto.
- **`getTipoTareaColor` busca primero exacto, luego case-insensitive**: `"api"` matchea con `"API"` del mapa.
- **Paleta de hash**: 10 colores en `tipoTareaFallback`. El módulo (hash positivo) se usa como índice. Mismo tipo siempre obtiene el mismo color en cualquier render.
- **`getTipoTareaColor` con fondo más oscuro para valores vacíos**: cuando `tipo` es `''` o `undefined`, retorna `bg-slate-700/60` + `text-slate-300` (fallback especial para vacío, no para desconocido).
- **No hay tema dark/light en `colors.ts`**: todas las clases asumen fondo oscuro. El theme switch ([theme.tsx](./theme.md)) modifica el shell, pero los badges mantienen su paleta. Si en el futuro hace falta diferenciar, habría que cambiar las clases a variantes `dark:`/`light:` o exponer dos paletas.
- **Los hex y las clases Tailwind no son redundantes**: Tailwind v4 con plugin Vite no permite extraer el hex de la clase en runtime sin parsing del CSS generado. Es más simple mantener ambos.
