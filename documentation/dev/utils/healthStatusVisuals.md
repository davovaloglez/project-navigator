# healthStatusVisuals.ts

Mapeos de iconos y colores semánticos para los niveles de salud (`calcHealthScore`) y los estados declarados de proyecto (`estatus`). Centraliza la presentación de estos dos ejes de información para que todos los componentes (Timeline, leyendas, chips) sean consistentes sin duplicar lógica.

- **Source:** [src/utils/healthStatusVisuals.ts](../../../src/utils/healthStatusVisuals.ts)

## Exports públicos

### `HEALTH_BUCKETS`

```ts
export const HEALTH_BUCKETS: {
  label: string;
  range: string;
  icon: LucideIcon;
  textColor: string;  // clase Tailwind text-* para el icono y etiquetas
}[]
```

Cinco buckets de salud, del mejor al peor:

| Label | Rango | Color |
|---|---|---|
| Excelente | ≥ 85 | verde |
| Bueno | 65-84 | azul |
| Medio | 45-64 | amarillo |
| Bajo | 25-44 | naranja |
| Crítico | < 25 | rojo |

Cada bucket incluye un `LucideIcon` (Star / TrendingUp / Minus / TrendingDown / AlertTriangle) para representar visualmente el nivel sin texto.

### `ESTATUS_VISUALS`

```ts
export const ESTATUS_VISUALS: {
  label: string;
  icon: LucideIcon;
}[]
```

Icono por cada estatus declarado del proyecto. Orden: Done → On Track → Upcoming → On Hold → At Risk → Blocked / Critical → Hypercare → LaunchPhase → Cancelado.

### `healthIconFor(label: string): LucideIcon`

Retorna el icono del bucket cuya `label` coincida. Fallback: `Minus`.

```ts
healthIconFor('Excelente')  // Star
healthIconFor('Crítico')    // AlertTriangle
healthIconFor('XYZ')        // Minus (fallback)
```

### `healthTextColor(label: string): string`

Retorna la clase `text-*` del bucket para colorear el icono de salud en el rail y en el tooltip de la barra. Fallback: `'text-slate-400'`.

### `estatusIconFor(estatus: string): LucideIcon`

Retorna el icono del estatus declarado. Fallback: `Minus`.

```ts
estatusIconFor('Done')              // Check
estatusIconFor('Blocked / Critical')// Ban
estatusIconFor('Upcoming')          // Clock
estatusIconFor('Estado inválido')   // Minus (fallback)
```

## Quién lo usa

| Caller | Uso |
|---|---|
| [`TimelineSection.tsx`](../../../src/components/sections/TimelineSection.tsx) | Rail con chip de estatus + icono de salud; barra con `[icono estatus][pct%][icono salud]`; leyenda colapsable (NAV-72 / NAV-84) |

## Detalles no obvios

- Los `label` de salud deben coincidir con lo que retorna `calcHealthScore(p).label` de [src/utils/healthScore.ts](../../../src/utils/healthScore.ts). Si se renombra un bucket en `healthScore`, hay que actualizar el `label` correspondiente aquí.
- Los `label` de estatus deben coincidir con los valores del campo `estatus` en `ProjectRecord`. Si se agrega un nuevo estatus al Sheet, añadir la entrada a `ESTATUS_VISUALS`; de lo contrario caerá al fallback `Minus`.
- Los maps internos (`HEALTH_INDEX`, `ESTATUS_INDEX`) usan `new Map` sobre los arrays exportados, por lo que agregar al array actualiza automáticamente los lookups.
