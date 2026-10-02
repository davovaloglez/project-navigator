# projectStatus

Fuente única de verdad para la semántica de los estatus de proyecto (columna `estatus` de `ProjectRecord`). Centraliza los predicados que antes estaban duplicados como `estatus !== 'Done' && estatus !== 'On Hold'` por toda la app, de modo que agregar o renombrar un estatus terminal sea un solo cambio.

Introducido en NAV-90 junto con los estatus `LaunchPhase` (activo, previo a Hypercare) y `Cancelado` (terminal, excluido de la SALUD).

- **Source:** [src/utils/projectStatus.ts](../../../src/utils/projectStatus.ts)
- **Espejo en MCP:** [mcp-server/src/data/projectStatus.ts](../../../mcp-server/src/data/projectStatus.ts) — mantener sincronizados si se agregan estatus.

## Exports públicos

### `ESTATUS_ORDER`

```ts
export const ESTATUS_ORDER = [
  'Done', 'On Track', 'Upcoming', 'On Hold',
  'At Risk', 'Blocked / Critical', 'Hypercare',
  'LaunchPhase', 'Cancelado',
] as const;
```

Orden canónico para leyendas, chips y agrupaciones (coincide con la leyenda del Timeline).

### `isCancelled(estatus)`

```ts
export const isCancelled = (estatus: string): boolean => estatus === 'Cancelado';
```

Proyecto cancelado: terminal y excluido de toda métrica de SALUD/actividad.

### `isTerminal(estatus)`

```ts
export const isTerminal = (estatus: string): boolean =>
  estatus === 'Done' || estatus === 'Cancelado';
```

Estados terminales (cerrados): completado o cancelado. Usado por el toggle "Mostrar terminados" en vistas de portafolio y timeline.

### `isActive(estatus)`

```ts
export const isActive = (estatus: string): boolean =>
  estatus !== 'Done' && estatus !== 'On Hold' && estatus !== 'Cancelado';
```

Proyecto "activo" para conteos, costos, burndown y agregados. Reemplaza el patrón `estatus !== 'Done' && estatus !== 'On Hold'`; ahora además excluye `Cancelado`.

### `countsForHealth(estatus)`

```ts
export const countsForHealth = (estatus: string): boolean => estatus !== 'Cancelado';
```

`true` para todo lo que debe pesar en el health score agregado del portafolio. Un proyecto cancelado nunca contribuye al promedio de salud — ni con score bajo ni con score neutro.

## Estatus definidos

| Estatus | `isActive` | `isTerminal` | `countsForHealth` | Notas |
|---|---|---|---|---|
| `Done` | ✗ | ✅ | ✅ | Completado exitosamente |
| `On Track` | ✅ | ✗ | ✅ | — |
| `Upcoming` | ✅ | ✗ | ✅ | Aún no iniciado |
| `On Hold` | ✗ | ✗ | ✅ | Pausado temporalmente |
| `At Risk` | ✅ | ✗ | ✅ | — |
| `Blocked / Critical` | ✅ | ✗ | ✅ | — |
| `Hypercare` | ✅ | ✗ | ✅ | Post-launch con seguimiento activo |
| `LaunchPhase` | ✅ | ✗ | ✅ | Activo, previo a Hypercare (violeta, ícono Rocket) |
| `Cancelado` | ✗ | ✅ | ✗ | Terminal; no pesa en SALUD; color rojo, ícono XCircle |

## Quién lo usa

| Caller | Función usada |
|---|---|
| [`healthScore.ts`](./healthScore.md) | `isCancelled` (early-return), `isActive` (en `generateAlerts`) |
| [`stale.ts`](./stale.md) | `isActive` (skip de proyectos terminados/pausados) |
| [`ProyectosSection`](../../../src/components/sections/ProyectosSection.tsx) | `isTerminal` (toggle "Mostrar terminados") |
| [`TimelineSection`](../../../src/components/sections/TimelineSection.tsx) | `isTerminal`, `ESTATUS_ORDER` (leyenda) |
| [`ResumenSection`](../../../src/components/sections/ResumenSection.tsx) | `countsForHealth`, `isActive` |
| `mcp-server` | Espejo exacto para respuestas del servidor MCP |

## Detalles no obvios

- **`Cancelado` vs `Done`**: ambos son terminales (`isTerminal = true`), pero sólo `Cancelado` se excluye de la salud (`countsForHealth = false`). Un proyecto `Done` sí aporta al health score (con +30 de estatus), porque cierra bien. Un proyecto `Cancelado` no debe arrastrar el promedio hacia abajo ni inflar la cuenta de proyectos activos.
- **`On Hold` no es terminal**: el toggle "Mostrar terminados" lo incluye junto a activos. El proyecto pausado sigue siendo visible en la lista normal.
- **Agregar un estatus nuevo**: (1) añadir a `ESTATUS_ORDER`; (2) definir su predicado con `isActive`/`isTerminal`/`countsForHealth`; (3) agregar color en [colors.ts](./colors.md) (`estatusColors`); (4) agregar ícono en [healthStatusVisuals.ts](./healthStatusVisuals.md) (`ESTATUS_VISUALS`); (5) actualizar el espejo en `mcp-server/src/data/projectStatus.ts`.
