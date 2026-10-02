# useDashboardConfig

## Propósito

Gestionar la configuración del dashboard personalizable de `/`: qué widgets son visibles y en qué orden aparecen. Cada usuario decide su layout y se conserva entre recargas.

El hook resuelve dos problemas:

1. **Persistencia local** del layout en `localStorage` para que cada usuario tenga su tablero personalizado sin tocar el server.
2. **Forward-compat con widgets nuevos**: cuando un widget nuevo se agrega a `DEFAULT_WIDGETS` en el código, las sesiones existentes lo ven aparecer automáticamente al final de su lista en vez de quedar fuera para siempre.

A diferencia de `usePersistedFilters`, este hook **no sincroniza con Turso**. El layout es local-only — diferente dispositivo, diferente layout. Decisión consciente: el costo de tener configuraciones distintas entre laptop y tablet es menor al costo de mantener un endpoint y schema extra para algo que cada usuario ajusta una sola vez.

El hook aplica **defaults por rol** al construir el estado inicial: ciertos widgets arrancan visibles u ocultos dependiendo del rol del usuario. Esto es una preferencia reversible (el usuario puede cambiarla libremente), no un permiso de acceso. El gating real por permiso (`block:dashboard-*`) vive en `DashboardSection` y es independiente.

## Source

[../../../src/hooks/useDashboardConfig.ts](../../../src/hooks/useDashboardConfig.ts)

## Firma

```ts
export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
}

export function useDashboardConfig(): {
  config: DashboardConfig;
  toggleWidget: (id: string) => void;
  moveWidget: (id: string, direction: 'up' | 'down') => void;
  resetConfig: () => void;
  isVisible: (id: string) => boolean;
};
```

No tiene generics: el shape `WidgetConfig` es fijo. Los `id` son strings convenidos (e.g. `'kpis'`, `'health-summary'`) que la sección usa para condicionar el render de cada widget.

## Comportamiento

### Mount

`useState<DashboardConfig>(load)` corre `load()` síncrono:

1. Llama `roleDefaults()` que lee `readInlinePermissions().role` (síncrono, sin fetch) y aplica los overrides de `ROLE_WIDGET_DEFAULTS` sobre `DEFAULT_WIDGETS`:

   ```ts
   const ROLE_WIDGET_DEFAULTS: Record<string, Record<string, boolean>> = {
     dev:       { 'arquitecto-chart': false },
     pm:        { 'arquitecto-chart': false, 'dev-chart': true },
     gerentes:  { 'dev-chart': true },
     directores: { 'roadmap-progress': true },
     ventas:    { 'arquitecto-chart': false },
     // admin: sin overrides — ve el set canónico completo.
   };
   ```

2. Lee `localStorage['pn-dashboard-config']`.
3. Si no existe, devuelve `{ widgets: defaults }` (con los defaults del rol).
4. Si existe, parsea el JSON guardado y hace **merge con `defaults`** (los del rol, no el canónico):
   - Conserva el orden y `visible` de los widgets guardados.
   - Agrega al final los widgets de `defaults` cuyo `id` no aparece en el guardado.
5. Si el JSON está corrupto, devuelve defaults.

### `toggleWidget(id)`

1. `setConfig(prev => ...)` mapea `prev.widgets`, invierte `visible` en el widget con ese `id`, deja los demás iguales.
2. Llama `save(next)` que serializa a `localStorage`.

### `moveWidget(id, direction)`

1. Encuentra el índice del widget.
2. Calcula `swapIdx`: `idx - 1` para `'up'`, `idx + 1` para `'down'`.
3. Si `swapIdx` está fuera de rango, retorna `prev` sin cambios.
4. Hace swap de posiciones y guarda.

### `resetConfig()`

1. Llama `roleDefaults()` para obtener el default ajustado al rol actual.
2. `setConfig({ widgets: roleDefaults() })`.
3. Serializa a `localStorage`. Útil para que la próxima carga lea explícitamente el default y no haga merge de un guardado inexistente.

Nota: la sección `/cuenta` resetea el layout llamando directamente `localStorage.removeItem('pn-dashboard-config')`, lo que también funciona porque el próximo mount cae al branch "no existe → defaults". Ambos paths convergen.

### `isVisible(id)`

Helper read-only. Devuelve `config.widgets.find(...).visible` o `true` si el id no se conoce (fail-open: un widget nuevo cuyo `id` aún no está en `DEFAULT_WIDGETS` se muestra por default).

## Estado interno

| Slot | Tipo | Para qué |
|---|---|---|
| `config` | `useState<DashboardConfig>` | Lista actual de widgets. Inicializada síncrono desde `localStorage`. |

Sin refs, sin timers, sin controllers. Es el más simple de los cuatro hooks.

## Side effects

- **localStorage:** lectura síncrona en mount; escritura síncrona en cada `toggleWidget`, `moveWidget`, `resetConfig`. Key: `pn-dashboard-config`.
- **Sin red.** Todo el estado vive en el cliente.

## Persistencia

- **Cache local:** `localStorage['pn-dashboard-config']` con el JSON completo `{ widgets: [{ id, label, visible }, ...] }`.
- **Sin server.** Si el usuario limpia su caché o cambia de navegador, vuelve a los defaults.

`DEFAULT_WIDGETS` es la fuente de verdad del listado completo y vive en el mismo archivo del hook:

```ts
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'kpis', label: 'KPIs', visible: true },
  { id: 'health-summary', label: 'Salud del Portafolio', visible: true },
  { id: 'alerts-preview', label: 'Alertas Recientes', visible: true },
  // ... 13 más
  { id: 'tareas-overview', label: 'Resumen de Cronograma', visible: true },
];
```

Algunos widgets están `visible: false` por default (e.g. `prioridad-chart`, `hito-chart` — "Progreso por Cuatrimestre", `dev-chart`, `roadmap-progress`, `points-distribution`, `cost-overview`) porque son menos comunes y se prefiere un dashboard limpio inicial.

## Casos edge

- **JSON corrupto:** el `catch` en `load()` devuelve defaults. La próxima escritura sobrescribe el JSON malo.
- **Quota error en `save`:** no hay try/catch. Si `localStorage` está lleno, la escritura lanza y rompe el `setConfig`. En la práctica nunca ocurre porque el config es pequeño (<2KB). Si llegara a pasar, sería oportunidad para agregar un `try/catch` similar al de `usePersistedFilters`.
- **Widget nuevo agregado al código:** el merge en `load()` lo agrega al final de la lista del usuario con su `visible` según el default del rol (no el canónico). El usuario lo ve aparecer en su dashboard sin acción manual.
- **Widget removido del código:** el merge no lo limpia. La entrada queda en el localStorage del usuario pero el render lo ignora (la sección no encuentra el `id` en su switch/map). Inofensivo; se limpia solo cuando el usuario hace `resetConfig`.
- **`moveWidget` en los extremos:** retorna `prev` sin cambios. La UI debe deshabilitar las flechas en el primer y último item para no confundir.
- **`isVisible` de un id desconocido:** retorna `true` (fail-open). Evita que un widget nuevo quede oculto por error.

## Patrón de uso

```tsx
// src/components/sections/DashboardSection.tsx
import { useDashboardConfig } from '../../hooks/useDashboardConfig';

export default function DashboardSection() {
  const { config, toggleWidget, moveWidget, resetConfig, isVisible } = useDashboardConfig();

  return (
    <>
      <DashboardCustomizer
        widgets={config.widgets}
        onToggle={toggleWidget}
        onMove={moveWidget}
        onReset={resetConfig}
      />

      {config.widgets.map((widget) => {
        if (!widget.visible) return null;
        switch (widget.id) {
          case 'kpis': return <KPIsWidget key={widget.id} data={projects} />;
          case 'health-summary': return <HealthSummaryWidget key={widget.id} data={projects} />;
          case 'alerts-preview': return <AlertsPreviewWidget key={widget.id} data={alerts} />;
          // ...
          default: return null;
        }
      })}
    </>
  );
}
```

Notas concretas:

- Iterar sobre `config.widgets` (no sobre un array hardcoded) respeta tanto el orden del usuario como su selección de visibilidad.
- `isVisible(id)` es alternativa cuando ya tienes el orden fijo pero sólo quieres condicionar el render: `{isVisible('kpis') && <KPIsWidget />}`.
- Agregar un widget nuevo: 1) push a `DEFAULT_WIDGETS` con id único, 2) si el widget debe arrancar diferente para algún rol, añadir overrides en `ROLE_WIDGET_DEFAULTS`, 3) agregar el `case` en el switch del map. Los usuarios existentes lo ven al final con el `visible` del default de su rol.

## Convenciones relacionadas

- [arquitectura/convenciones.md](../arquitectura/convenciones.md) — sección "Dashboard config persiste en localStorage" tiene la regla del merge con defaults.
- [secciones/dashboard.md](../secciones/dashboard.md) — cómo se construye el dashboard sobre este hook.
