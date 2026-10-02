# Componentes UI

Detalle de los componentes en [src/components/ui/](../../../src/components/ui/). Para el índice completo (incluyendo charts), ver [componentes/README.md](README.md).

## KPICard

```tsx
interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accentColor?: string;       // tailwind color class para el icono (default 'text-blue-400')
  highlight?: boolean;        // resalta border en rojo según contexto
  subtitle?: string;          // línea pequeña debajo del valor
  info?: { description: string; glossaryAnchor?: string };
}
```

Tarjeta con icono, valor grande y label. Si `info`, renderiza `<InfoTooltip />` al lado del título con link al glosario.

**Gating de bloque:** si `info.glossaryAnchor` está denegado para el usuario (`block:<id>` en `blockDenies`), `KPICard` retorna `null` y desaparece del DOM. El componente usa `canWith(readInlinePermissions(), ...)` — sin hooks, sin re-renders. Ver [arquitectura/auth.md — Sistema de permisos](../arquitectura/auth.md#sistema-de-permisos).

**Convención:** todas las secciones que muestran KPIs pasan `info={infoFor('<id>')}` para que el tooltip esté siempre disponible. Ver [arquitectura/convenciones.md §13](../arquitectura/convenciones.md#13-tooltips-y-glosario).

## PaginationControls

Paginación unificada (NAV-82). Selector de "Resultados por página" + navegación prev/next con chevrons. Se auto-oculta si `total <= minOption` (no hay nada que paginar).

- **Source:** [src/components/ui/PaginationControls.tsx](../../../src/components/ui/PaginationControls.tsx)

```tsx
interface PaginationControlsProps {
  total: number;            // total post-filtros (no la página actual)
  page: number;             // página actual 0-based (salida de paginate())
  totalPages: number;
  pageSize: PageSize;       // number | 'all'
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  options?: PageSize[];     // default: [12, 24, 50, 100, 'all']
  variant?: 'dark' | 'light';  // default: 'dark'
  className?: string;
}
```

**Helpers exportados:**

- `paginate<T>(items, page, pageSize)` — retorna `{ paged, totalPages, safePage }`. Con `pageSize === 'all'` devuelve todos los items en página 0.
- `sanitizePageSize(value, fallback?)` — valida un valor leído de storage (puede traer basura de versiones viejas); retorna un `PageSize` seguro.
- `DEFAULT_PAGE_SIZE` — `50` (número por defecto).
- `PAGE_SIZE_OPTIONS` — `[12, 24, 50, 100, 'all']`.

**Variantes:** `dark` (para fondos oscuros, por ejemplo el tablero principal) y `light` (para fondos blancos, por ejemplo la tabla de tickets de CS 360).

**Persistencia del `pageSize`:** la sección es responsable de persistir `pageSize` en `usePersistedFilters` (o en `localStorage` para contextos sin `usePersistedFilters` como CS 360). La página actual **nunca** se persiste — ver [convenciones §10](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session).

```tsx
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  paginate,
  sanitizePageSize,
  type PageSize,
} from '../ui/PaginationControls';

const { paged, totalPages, safePage } = paginate(filtered, page, pageSize);

<PaginationControls
  total={filtered.length}
  page={safePage}
  totalPages={totalPages}
  pageSize={pageSize}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
/>
```

## StatusBadge

```tsx
interface StatusBadgeProps {
  label: string;
  bg: string;       // tailwind bg class (e.g. 'bg-green-500/15')
  text: string;     // tailwind text class
  size?: 'sm' | 'md';
}
```

Badge pequeño usado para estatus, salud, prioridad. Los colores **no son dinámicos** — la section consulta [utils/colors.ts](../../../src/utils/colors.ts) (`getEstatusColor`, `getSaludColor`, etc.) y pasa el resultado spreaded:

```tsx
const ec = getEstatusColor(project.estatus);
<StatusBadge label={project.estatus} {...ec} />
```

## ProgressBar

```tsx
interface ProgressBarProps {
  value: number;       // 0-1 o 0-100, autodetecta
  color?: string;      // override tailwind bg (default según semáforo)
  height?: 'sm' | 'md';
}
```

Barra con color semáforo automático: verde ≥80%, amarillo ≥40%, rojo <40%.

## ProjectCard

```tsx
interface ProjectCardProps {
  project: ProjectRecord;
  forecast?: ProjectForecast;
  stale?: StaleInfo;
}
```

Card usada en `/portafolio`. Render:

- Folio + actividad (link a `/proyecto/<slug>`).
- Badges: estatus, salud, prioridad.
- Progreso bar.
- PM + arquitecto + devs.
- Hito.
- Si `forecast`: chip de riesgo (verde/ámbar/rojo según `forecast.risk`).
- Si `stale`: badge "Sin avance N días".

Recibe `forecast` y `stale` como props porque el cálculo es caro y se hace una vez en la section (no por card).

## FilterDropdowns

El componente de filtros canónico. Lo usan 12+ secciones.

```tsx
interface FilterDropdownsProps {
  filters: FilterConfig[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  onClear?: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  multi: boolean;        // true = checkbox multi-select; false = radio
}
```

**Regla:** opciones siempre como `{ value, label }`. **No** pasar strings directamente.

**Botón limpiar:** aparece automáticamente cuando `hasActiveFilters = Object.values(activeFilters).some(v => v.length > 0) || searchValue` y se cablea con `onClear`. Las secciones que usan `usePersistedFilters` típicamente pasan:

```tsx
onClear={() => { clearPersisted(); setSearch(''); }}
```

## DataTable<T>

```tsx
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}
```

Tabla genérica con sort opcional por columna. Render headers + body con `data.map(row => columns.map(col => col.render(row)))`.

## Breadcrumbs

```tsx
interface BreadcrumbsProps {
  items: { label: string; href?: string }[];
}
```

El último item siempre sin `href` (current page). Render: `link › link › current`.

## Tabs

```tsx
interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeId: string;
  onChange: (id: string) => void;
}
```

Tab navigation con underline animado. Usado en `/pronosticos` (6 tabs).

Para tabs que persisten, la section es responsable de hacer:

```tsx
const [tab, setTab] = useState(persisted.tab ?? 'proyectos');
<Tabs ... onChange={(id) => { setTab(id); setPersisted(p => ({ ...p, tab: id })); }} />
```

## InfoTooltip

Primitivo de tooltip con viewport-aware positioning. Detecta automáticamente si renderizar arriba/abajo y a izquierda/centro/derecha para no salirse de viewport.

```tsx
interface InfoTooltipProps {
  description: string;
  glossaryAnchor?: string;    // si presente, agrega link "Ver definición completa →"
  label?: string;             // accesible
}
```

Trigger: hover en desktop, click en mobile. Cierra con click-outside o Escape.

## GlossaryTooltip

Wrapper de conveniencia sobre `InfoTooltip`:

```tsx
<GlossaryTooltip id="dashboard-kpi-total" />
// Resuelve description y glossaryAnchor desde glossary.ts
```

Útil cuando NO estás usando `KPICard` o `ChartCard` (que aceptan `info` directamente).

## MarkdownText / InlineMarkdown

Renderers ligeros (sin dependencias) que soportan:

- `**bold**`
- `` `code` ``
- listas `- item`
- bloques ` ```code``` `

`MarkdownText` es multi-línea (renderiza párrafos, listas, bloques). `InlineMarkdown` es single-line (sólo bold, code y links inline).

**No HTML libre.** Si necesitas algo no soportado, agrégalo al renderer en lugar de hacer `dangerouslySetInnerHTML` en otra parte.

## Gate

```tsx
interface GateProps {
  resource: Resource;   // 'block:foo', 'page:costos', 'data:costos', 'action:...'
  children: ReactNode;
  fallback?: ReactNode; // qué renderizar si está denegado. Default: null
}
```

Oculta `children` si el usuario no tiene el recurso. Usa `canWith(readInlinePermissions(), resource)` — evaluación síncrona sin hook. **Sólo UX**: el server (middleware/API) es el gate real.

```tsx
import Gate from '../auth/Gate';
<Gate resource="block:alertas-lista">
  <AlertasList items={items} />
</Gate>
```

## PageLink

```tsx
interface PageLinkProps {
  pageKey: string;       // slug del sidebar ('equipo', 'pronosticos', etc.)
  href: string;
  children: ReactNode;
  className?: string;
  deniedClassName?: string;  // clase cuando no hay permiso (texto plano)
  style?: CSSProperties;
  title?: string;
  hideWhenDenied?: boolean;  // si true, no renderiza nada cuando no hay permiso
}
```

Enlace consciente de permisos. Si el usuario puede abrir `page:<pageKey>`, renderiza un `<a>`; si no, renderiza como `<span>` (o nada si `hideWhenDenied`). Evita dead-links que el middleware redirigiría a `/`.

```tsx
import PageLink from '../auth/PageLink';
<PageLink pageKey="equipo" href={`/persona/${nombre}`}>
  {nombre}
</PageLink>
```

## ConfirmModal

```tsx
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;   // default: 'Confirmar'
  cancelLabel?: string;    // default: 'Cancelar'
  tone?: 'danger' | 'primary';  // default: 'danger' (rojo)
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}
```

Modal de confirmación para acciones destructivas. El botón de confirmación espera a que `onConfirm` (posible async) resuelva antes de cerrar — muestra `Loader2` durante la espera. El backdrop es clickeable para cancelar (salvo que esté ocupado).

Usado por `AdminUserSection` para revocar sesiones y por `CuentaSection` para operaciones destructivas.

## Tooltip

```tsx
interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom';  // default: 'top'
}
```

Tooltip ligero CSS-only (hover/focus, sin JS). Pensado para botones de acción con icono. Envuelve el trigger en un `span.group`.

```tsx
import Tooltip from '../ui/Tooltip';
<Tooltip label="Cerrar sesión">
  <button onClick={...}><Trash2 /></button>
</Tooltip>
```

**Diferencia con `InfoTooltip`:** `Tooltip` es para acciones (botones de icono). `InfoTooltip` es para bloques de información con link al glosario.

## DashboardCustomizer

Drawer con:

- Lista de widgets con checkbox (toggle visibility).
- Botones ↑ ↓ por widget (reorder).
- Botón "Restablecer" (reset al default).

Recibe del hook `useDashboardConfig`:

```tsx
<DashboardCustomizer
  config={config}
  onToggle={toggleWidget}
  onMove={moveWidget}
  onReset={resetConfig}
/>
```

## DetailDrawer / ProjectDetailDrawer

`DetailDrawer` es un slide-over genérico (lateral). `ProjectDetailDrawer` lo usa para mostrar un `ProjectRecord` sin navegar (legacy — hoy la mayoría va a `/proyecto/[folio]`).

## Cards del motor de pronóstico

Todas son **presentacionales**. Reciben datos pre-calculados de [forecastEngine.ts](../../../src/utils/forecastEngine.ts) y los renderizan con estilos coherentes (`riskMeta`, `confidenceMeta`, `probabilityMeta`, `capacityStatusMeta`).

| Card | Datos esperados | Render |
|---|---|---|
| `ForecastCard` | `ProjectForecast` | Riesgo + fechas (esperado/optimista/pesimista) + slippage + confianza |
| `HitoForecastCard` | `HitoForecast` | Estatus del hito + agregado de riesgos + fecha final |
| `PersonCapacityCard` | `PersonCapacity` | Velocity + pendientes + ETA + sobrecarga |
| `CapacityHorizonCard` | `CapacityHorizon` | Barra de utilización con status (Holgura/Sano/Saturado/Sobrecarga) |
| `CriticalDatesList` | `CriticalWindow[]` | Lista por ventanas (30/60/90 días) |
| `SlippageCostCard` | `SlippageCostImpact` | Costo extra acumulado + breakdown |
| `CourseForecastCard` | `CourseForecast` | Fecha proyectada de finalización de curso |
| `DependencyCard` | `DependencyAnalysis` items | Cascada de bloqueadores |
| `AnomalyCard` | `Anomaly` items | Stall/slowdown/acceleration |
| `BacktestCard` | `BacktestResult` | MAE, bias, % en ±7d/±14d |
| `SnapshotStatusCard` | `SnapshotStats` | Cuántos snapshots, última fecha |

## Convenciones

1. **Imports relativos** desde `../../utils/...` y `../../data/...`.
2. **Sin `useSheetData`** en ningún componente UI.
3. **Tipos explícitos** para todas las props.
4. **Sin colores hardcoded** — todo de [utils/colors.ts](../../../src/utils/colors.ts) o tailwind classes.
5. **Loading state** lo maneja la section, no el componente UI. Si necesitas un placeholder de un componente específico, ponerlo como variant explícito (`<KPICard loading />`).
