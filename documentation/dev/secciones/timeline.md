# `/timeline` — TimelineSection

Vista tipo Gantt del portafolio con zoom horizontal, overlay opcional de pronóstico (ghost bar + diamond marker) y scroll automático al día de hoy.

- **Componente:** [src/components/sections/TimelineSection.tsx](../../../src/components/sections/TimelineSection.tsx)
- **Página:** [src/pages/timeline.astro](../../../src/pages/timeline.astro)
- **LOC:** ~433
- **Filtro PM:** sí (`usePersistedFilters` key `timeline`)
- **Snapshot capture:** sí — `useSnapshotCapture(data, cursosQ.data)`

## Datos de entrada

| Hook | Endpoint |
|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` |
| `useSheetData<TareaRecord>` | `/api/tareas` (alimenta `forecastProjects`) |
| `useSheetData<CursoRecord>` | `/api/cursos` (sólo para snapshot capture) |
| `usePersistedFilters` | key `timeline` — `{ filters, includeDone, zoomIdx, showForecast }` |
| `useSnapshotCapture(data, cursosQ.data)` | — |

## Constantes

```ts
const STATIC_FILTER_CONFIGS = [
  { key: 'estatus', label: 'Estatus', options: [
    'On Track','At Risk','Blocked / Critical','Done','Hypercare','On Hold','Upcoming'
  ].map(v => ({ value: v, label: v })), multi: true },
];

const ZOOM_LEVELS = [
  { label: 'Ajustar',  dayWidth: 0 },   // ancho 100% del viewport
  { label: '3px/día',  dayWidth: 3 },
  { label: '6px/día',  dayWidth: 6 },
  { label: '12px/día', dayWidth: 12 },
  { label: '20px/día', dayWidth: 20 },
];

const DAY_MS = 86400000;
const ROW_H = 48;
const HEADER_H = 36;
```

> **Dinámico (NAV-72):** arquitecto y cuatrimestre se derivan de `data` en runtime con `new Set`. Los hitos fijos fueron eliminados; `cuatrimestre` (campo del proyecto) reemplaza al filtro de hito.

Filtros disponibles: `estatus` (fijo), `cuatrimestre` (dinámico desde datos), `arquitecto` (dinámico), `pm` (multi:false). Los filtros `arquitecto` y `pm` se suprimen para roles scopeados (`pm`/`dev`) vía `useScopeView().isScoped`:

```ts
const filterConfigs = useMemo(() => {
  const base = [
    ...STATIC_FILTER_CONFIGS,
    { key: 'cuatrimestre', label: 'Q de entrega', options: cuatrimestreOptions, multi: true },
  ];
  if (isScoped) return base;
  return [
    ...base,
    { key: 'arquitecto', label: 'Arquitecto', options: arquitectoOptions, multi: true },
    { key: 'pm', label: 'PM', options: pmOptions, multi: false },
  ];
}, [pmOptions, isScoped, arquitectoOptions, cuatrimestreOptions]);
```

## Filtrado

```ts
const projects = useMemo(() => {
  let result = data.filter((p) => p.fechaInicio || p.inicioEstimado || p.finReal || p.finEstimado);
  const estatusSelected = activeFilters.estatus || [];
  if (!includeDone && !estatusSelected.includes('Done')) {
    result = result.filter((p) => p.estatus !== 'Done');
  }
  for (const [key, values] of Object.entries(activeFilters)) {
    if (!values.length) continue;
    result = result.filter((p) => values.includes(String((p as unknown as Record<string, unknown>)[key] || '')));
  }
  return result;
}, [data, activeFilters, includeDone]);
```

Sólo se renderizan proyectos con al menos una fecha (`fechaInicio || inicioEstimado || finReal || finEstimado`). `registro` ya no se usa como criterio de inclusión ni como fallback de fecha de inicio. Ordenamiento por `fechaInicio || inicioEstimado` ascendente.

## Cálculo del eje temporal

```ts
const { minDate, maxDate, totalDays } = useMemo(() => {
  let min = Infinity, max = -Infinity;
  for (const p of projects) {
    const s = parseDate(p.fechaInicio || p.inicioEstimado);
    const e = parseDate(p.finReal || p.finEstimado);
    if (s) min = Math.min(min, s.getTime());
    if (e) max = Math.max(max, e.getTime());
  }
  if (min === Infinity) min = Date.now();
  if (max === -Infinity) max = Date.now() + 90 * DAY_MS;
  min -= 14 * DAY_MS;   // padding 14 días antes
  max += 21 * DAY_MS;   // padding 21 días después
  return { minDate: min, maxDate: max, totalDays: Math.round((max - min) / DAY_MS) };
}, [projects]);
```

Marcadores de mes (`monthMarkers`) generados iterando `setMonth(s.getMonth() + 1)` desde el primer día del mes siguiente a `minDate`.

### Helpers de posicionamiento

```ts
function x(day: number) {
  return dayWidth === 0
    ? `${(day / totalDays) * 100}%`
    : `${day * dayWidth}px`;
}
function w(days: number) {
  return dayWidth === 0
    ? `${Math.max(1.5, (days / totalDays) * 100)}%`
    : `${Math.max(24, days * dayWidth)}px`;
}
```

Modo "Ajustar" usa porcentajes (responsive). Los demás zooms usan píxeles absolutos con scroll horizontal.

## Scroll automático a HOY

```ts
const scrollToToday = useCallback(() => {
  if (!scrollRef.current) return;
  const el = scrollRef.current;
  if (dayWidth === 0) {
    const pct = todayDay / totalDays;
    el.scrollLeft = Math.max(0, pct * el.scrollWidth - el.clientWidth / 2);
  } else {
    el.scrollLeft = Math.max(0, todayDay * dayWidth - el.clientWidth / 2);
  }
}, [dayWidth, todayDay, totalDays]);

useEffect(() => {
  const t = setTimeout(scrollToToday, 80);
  return () => clearTimeout(t);
}, [scrollToToday, sorted.length]);
```

`setTimeout 80ms` espera a que el contenedor termine de medir su `scrollWidth` después del render. Botón "ir a hoy" (`LocateFixed`) repite el cálculo on-demand.

## Overlay de pronóstico

Cuando `showForecast === true` y existe un `ProjectForecast` para el folio, se renderizan dos overlays:

### Ghost bar (desvío proyectado)

```ts
if (forecastDate.getTime() > plannedEnd.getTime()) {
  ghostDay = (plannedEnd.getTime() - minDate) / DAY_MS;
  ghostDays = (forecastDate.getTime() - plannedEnd.getTime()) / DAY_MS;
}
```

Renderizada como un rectángulo semi-transparente (`opacity: 0.18`) con bordes `dashed`. Sólo aparece si el pronóstico es **posterior** al `finEstimado` del proyecto.

### Diamond marker

Romboide (`rotate-45`) posicionado exactamente sobre `forecastDate`. Linkea al detalle `/pronosticos/<folio>`. Su color depende del nivel de riesgo:

```ts
const meta = riskMeta(fc.risk);
fcColor = meta.color.includes('red')   ? '#f87171'
        : meta.color.includes('amber') ? '#fbbf24'
        :                                '#4ade80';
```

### Cuándo se muestra

```ts
const showFcOverlay =
  showForecast &&
  fc &&
  fc.risk !== 'done' &&
  fc.risk !== 'insufficient-data' &&
  forecastDate &&
  plannedEnd &&
  !p.finReal;   // proyectos terminados no llevan overlay
```

## Bar rendering

Por cada proyecto en `sorted`:

```ts
const start = parseDate(p.fechaInicio || p.inicioEstimado);
const end   = parseDate(p.finReal    || p.finEstimado);

let barDay = 0, barDays = 30;
if (start && end) {
  barDay = (start.getTime() - minDate) / DAY_MS;
  barDays = Math.max(3, (end.getTime() - start.getTime()) / DAY_MS);
} else if (end) {
  barDay = Math.max(0, (end.getTime() - 30 * DAY_MS - minDate) / DAY_MS);
}
```

`registro` ya no participa en el cálculo de inicio. Si `fechaInicio` e `inicioEstimado` están ambos vacíos pero existe `end`, la barra se posiciona 30 días antes de `end` como estimación visual.

Cada barra es un `<a>` con dos capas: fondo semitransparente (color de estatus) + fill de progreso (`width: ${pct}%`). El borde se pinta rojo si `isOverdue` (sin `finReal` y `finEstimado < hoy` y `estatus !== 'Done'`).

### Tooltip de fechas (CSS-only, peer/bar)

Al hacer hover (o `focus-visible`) sobre la barra aparece un tooltip sin JS. El `<a>` de la barra lleva la clase `peer/bar`; el tooltip es un `<div>` **hermano** (no hijo) posicionado absolutamente, porque la barra tiene `overflow-hidden` y clipearía un hijo:

```tsx
<a className="peer/bar absolute … overflow-hidden …">
  {/* contenido de la barra */}
</a>
<div
  className="absolute z-30 pointer-events-none opacity-0 … peer-hover/bar:opacity-100 peer-focus-visible/bar:opacity-100"
  role="tooltip"
>
  <div className="… text-[10px] …">
    <p className="font-medium text-slate-200">
      {p.estatus} · {pct}% · <span className={healthTextColor(health.label)}>Salud {health.label}</span>
    </p>
    <p>
      <span className="text-slate-400">{p.fechaInicio ? 'Inicio' : 'Inicio est.'}</span>{' '}
      <span className="text-slate-100">{fmtDateFull(p.fechaInicio || p.inicioEstimado)}</span>
      <span className="text-slate-500 mx-1">→</span>
      <span className="text-slate-400">{p.finReal ? 'Fin real' : 'Fin est.'}</span>{' '}
      <span className="text-slate-100">{fmtDateFull(p.finReal || p.finEstimado)}</span>
    </p>
  </div>
</div>
```

El tooltip muestra dos líneas:
1. `estatus · pct% · Salud <label>` (el label va coloreado con `healthTextColor` del bucket).
2. Fecha de inicio (etiquetada "Inicio" si viene de `fechaInicio`, "Inicio est." si cae a `inicioEstimado`) `→` Fecha de fin (etiquetada "Fin real" si existe `finReal`, "Fin est." si cae a `finEstimado`).

Las fechas se formatean con `fmtDateFull` (día + mes abreviado + año, `timeZone: UTC`). Reemplaza al atributo `title` nativo (`estatus · pct%`) que se usaba antes.

### Formato de etiquetas de fecha (`fmtDate` y `fmtDateFull`)

```ts
function fmtDate(s: string): string {
  // Usado en las etiquetas pequeñas debajo de cada barra (día + mes abreviado).
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function fmtDateFull(s: string): string {
  // Usado en el tooltip de la barra (día + mes abreviado + año).
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
```

Las fechas provienen de la API como ISO date-only (e.g. `"2026-06-15"`), que el browser interpreta como medianoche UTC. Formatear en `timeZone: 'UTC'` evita el off-by-one de un día en zonas detrás de UTC (sin esto, el 1 jul se mostraría como "30 jun"). Ambas funciones aplican la misma convención; `fmtDateFull` agrega el año para dar contexto completo en el tooltip.

## Estado persistido vs no persistido

| Estado | Persistido | Razón |
|---|---|---|
| `filters` (`Record<string, string[]>`) | sí | Convención |
| `includeDone` | sí | Toggle |
| `zoomIdx` | sí | El usuario se acostumbra a un nivel |
| `showForecast` | sí | Toggle |
| `showLegend` | sí | Toggle — leyenda colapsable (NAV-72) |
| `scrollLeft` (interno del div) | no | Estado UI nativo del browser |

## Columna fija + área scrollable

Layout flex con dos columnas:

- **Izquierda fija** (`w-52 sm:w-60`) — health score circular + nombre del proyecto + folio/arquitecto.
- **Derecha scrollable** (`overflow-x-auto`) — header de meses + cuerpo con bars + línea HOY.

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global).
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session).
- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — la columna izquierda y la barra linkean a `/proyecto/<slug>`; el diamond a `/pronosticos/<slug>`.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — `timeline-gantt` (contador) y `timeline-forecast-overlay` (header de columna).

## Rail y leyenda colapsable (NAV-72 / NAV-84)

La columna izquierda fija incluye por cada fila, en este orden de lectura: **chip de estatus** (22px, fondo de color de estatus + `estatusIconFor`) seguido del **icono de salud** (3.5 rem, `healthIconFor` con color `healthTextColor`). El dot de salud (bg-*) fue reemplazado por el icono del bucket en su `textColor` en NAV-84. Ambos mapeos vienen de [src/utils/healthStatusVisuals.ts](../../../src/utils/healthStatusVisuals.ts).

Dentro de la barra del Gantt la jerarquía es `[icono estatus] [pct%] [icono de salud con color]` — también estandarizado en NAV-84.

La **leyenda** colapsable (persistida vía `showLegend`) presenta dos filas: la primera "Estatus (chip)" con los chips de color, la segunda "Salud (icono)" con el icono del bucket en su `textColor`. La nota al pie reza: "Chip e icono codifican **dimensiones distintas**: el chip es el estatus que reporta el PM, el icono es la salud calculada (0-100). Si disienten — chip 'On Track' con salud crítica — hay un riesgo no declarado."

## Navegación (NAV-72)

El área scrollable soporta dos gestos adicionales:

- **Drag-to-pan**: mousedown + mousemove mueve el scroll sin activar el click en la barra. Si `moved === true` al mouseup, se cancela el evento de click. Implementado con `dragRef` (no React state para no re-renderizar en cada mousemove).
- **Ctrl+wheel zoom**: si el evento tiene `ctrlKey`, cambia `zoomIdx` sin hacer scroll. Si no tiene `ctrlKey`, el comportamiento es scroll nativo del browser.

Después de un zoom con wheel, `pendingScrollTarget` guarda la posición de scroll para que el día bajo el cursor no se desplace (compensación de anclaje).

## Notas

- **Snapshot integrity:** `useSnapshotCapture(data, cursosQ.data)` recibe `data` pre-filtros porque aquí no hay separación entre `allData` y `data` — `data` ya es lo que vino de la API. El filtro PM aplica en `projects` (downstream), no en `data`.
- **Padding del eje** (14d antes, 21d después) evita que las primeras/últimas barras choquen contra el borde del contenedor.
- **`healthStatusVisuals`** importa de [src/utils/healthStatusVisuals.ts](../../../src/utils/healthStatusVisuals.ts): `HEALTH_BUCKETS`, `ESTATUS_VISUALS`, `estatusIconFor`, `healthIconFor`, `healthTextColor`. Ver [utils/healthStatusVisuals.md](../utils/healthStatusVisuals.md).
