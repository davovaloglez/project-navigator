# `/cronograma` — CronogramaSection

Cards de tareas granulares de la hoja unificada `actividades`. KPIs de throughput, gráficas de carga por persona/épica/tipo y un panel de precisión de estimación sobre todas las tareas con `puntos` (estimado) y `tracked` (real).

- **Componente:** [src/components/sections/CronogramaSection.tsx](../../../src/components/sections/CronogramaSection.tsx)
- **Página:** [src/pages/cronograma.astro](../../../src/pages/cronograma.astro)
- **LOC:** ~537
- **Filtro PM:** no — `TareaRecord` no tiene `pm` ni `proyectoId` de fácil uso en filtro
- **Snapshot capture:** no — los snapshots son de proyectos y cursos

## Datos de entrada

| Hook | Endpoint |
|---|---|
| `useSheetData<TareaRecord>` | `/api/tareas` (hoja unificada `actividades`) |
| `usePersistedFilters` | key `cronograma` — `{ filters: {} }` |

`/api/tareas` parsea un único rango `actividades!A1:Z500`, normaliza columnas a `TareaRecord`. Las fechas ya vienen en `dd/mm/yyyy` — no hay conversión de seriales de Excel. Ver [src/pages/api/tareas.ts](../../../src/pages/api/tareas.ts).

## Filtros (derivados del dataset)

Opciones de cada filtro se calculan en runtime con `new Set` sobre las tareas:

```ts
const filterOptions = useMemo(() => {
  const sprints = new Set<string>();
  const fases = new Set<string>();
  const roles = new Set<string>();
  const asignados = new Set<string>();
  const estatuses = new Set<string>();
  const tipos = new Set<string>();
  for (const t of data) {
    if (t.sprint)    sprints.add(t.sprint);
    if (t.fase)      fases.add(t.fase);
    if (t.rol)       roles.add(t.rol);
    if (t.asignado)  asignados.add(t.asignado);
    if (t.estatus)   estatuses.add(t.estatus);
    if (t.tipo)      tipos.add(t.tipo);
  }
}, [data]);
```

Filtros: `sprint`, `fase`, `rol`, `asignado`, `estatus`, `tipo`. Los filtros `producto` (antes discriminaba App/Core) y `funcionalidad` (no existe en la hoja unificada) fueron eliminados.

## Filtrado y búsqueda

```ts
const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  return data.filter((t) => {
    if (f.sprint?.length    && !f.sprint.includes(t.sprint))       return false;
    if (f.fase?.length      && !f.fase.includes(t.fase))           return false;
    if (f.rol?.length       && !f.rol.includes(t.rol))             return false;
    if (f.asignado?.length  && !f.asignado.includes(t.asignado))   return false;
    if (f.estatus?.length   && !f.estatus.includes(t.estatus))     return false;
    if (f.tipo?.length      && !f.tipo.includes(t.tipo))           return false;
    if (q) {
      const hay = `${t.nombre} ${t.folio} ${t.asignado}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}, [data, activeFilters, search]);
```

Los filtros `producto` (antes discriminaba App/Core) y `funcionalidad` (campo inexistente en la hoja unificada) fueron eliminados.

## KPIs

Siete cards calculados sobre `filtered`:

```ts
let completadas = 0, enProceso = 0, pendientes = 0, atrasadas = 0;
let puntosTotales = 0, puntosCompletados = 0;
for (const t of filtered) {
  const pts = t.puntos ?? 0;
  puntosTotales += pts;
  if (isTareaDone(t.estatus))                { completadas++; puntosCompletados += pts; }
  else if (t.estatus.toLowerCase().includes('en proceso')) enProceso++;
  else if (t.estatus.toLowerCase().includes('pendiente'))  pendientes++;
  else if (t.salud?.toLowerCase().includes('atrazada'))    atrasadas++;
}
```

KPIs: Total / Completadas / En proceso / Pendientes / **Atrasadas** (salud "Atrazada") / Puntos totales / Puntos entregados.

El KPI "Bloqueadas" fue reemplazado por "Atrasadas" — la hoja unificada tiene campo `salud` que identifica tareas en retraso. `isTareaDone` (importado de `dataTransforms.ts`) reemplaza el anterior `includes('completado')` para coincidir con el valor "Done" de la hoja unificada.

## Throughput semanal

```ts
const weekLabel = (d: Date) => {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = t.getDay();
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((day + 6) % 7));   // ajusta al lunes ISO
  return monday.toISOString().split('T')[0];
};
// Acumula tareas completadas + sum(puntos) por semana ISO
// Toma las últimas 12 semanas
```

Renderizado como `<ComposedChart>` — barras (tareas, eje izquierdo) + línea (puntos, eje derecho).

## Precisión de estimación (todas las tareas con datos)

```ts
const measurableTasks = filtered.filter(
  (t) => (t.puntos ?? 0) > 0 && (t.tracked ?? 0) > 0
);
let acertadas = 0, subEstimadas = 0, sobreEstimadas = 0;
let totalEst = 0, totalTracked = 0;
for (const t of measurableTasks) {
  const ratio = t.tracked / t.puntos;
  totalEst     += t.puntos;
  totalTracked += t.tracked;
  if (ratio >= 0.8 && ratio <= 1.2)  acertadas++;
  else if (ratio > 1.2)              subEstimadas++;
  else                               sobreEstimadas++;
}
const globalRatio = totalEst > 0 ? totalTracked / totalEst : 0;
```

Buckets:

- **Acertadas:** `0.8 ≤ ratio ≤ 1.2` (±20%).
- **Sub-estimadas:** `ratio > 1.2` (tomó más puntos de los estimados).
- **Sobre-estimadas:** `ratio < 0.8` (tomó menos).

Color del ratio global: rojo si `> 1.2`, azul si `< 0.8`, verde si está en rango.

Ya no se filtra por App (`t.producto === 'App'`): la hoja unificada `actividades` registra `puntos` (estimado) y `tracked` (real columna `Traking`) para todas las tareas. Se incluyen sólo tareas con ambos valores > 0.

## Otras gráficas

| Gráfica | Layout |
|---|---|
| Distribución por Tipo de Trabajo | Pie chart con colores semánticos de `getTipoTareaColor` ([src/utils/colors.ts](../../../src/utils/colors.ts)) |
| Carga por Persona | Bar chart horizontal, count de tareas por `asignado` |
| Progreso por Épica | Bar chart horizontal stacked (completadas + pendientes) agrupado por `t.epica` |
| Throughput Semanal | `ComposedChart` — barras (tareas) + línea (puntos), eje doble |
| Precisión de Estimación | Custom layout: 3 buckets + totales + ratio global |

> "Progreso por Funcionalidad" fue reemplazado por "Progreso por Épica": la hoja unificada `actividades` tiene campo `epica` pero no `funcionalidad`.

## Ordenamiento de cards

```ts
const weight = (e: string) => {
  const s = e.toLowerCase();
  if (s.includes('bloqueado'))  return 0;
  if (s.includes('en proceso')) return 1;
  if (s.includes('pendiente'))  return 2;
  if (s.includes('validación')) return 3;
  if (s.includes('completado')) return 4;
  if (s.includes('cancelado'))  return 5;
  return 6;
};
const sortedCards = [...filtered].sort((a, b) => weight(a.estatus) - weight(b.estatus));
```

Activos primero (bloqueadas arriba para urgencia), terminadas y canceladas al final.

## Paginación

```ts
const PAGE_SIZE = 24;
const totalPages = Math.max(1, Math.ceil(sortedCards.length / PAGE_SIZE));
const safePage = Math.min(page, totalPages - 1);
const pagedCards = sortedCards.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
useEffect(() => { setPage(0); }, [tableKey]);   // reset cuando cambian filtros/search
```

`tableKey` es un string serializado de `activeFilters + search` para detectar cualquier cambio en una sola dependency.

## Estado persistido vs no persistido

| Estado | Persistido | Razón |
|---|---|---|
| `filters` (`Record<string, string[]>`) | sí | Convención |
| `search` (`string`) | no | Exploratorio |
| `page` (`number`) | no | Paginación transitoria |

`onClear` resetea filtros persistidos **y** la búsqueda local (`onClear={() => { clearPersisted(); setSearch(''); }}`).

## Convenciones aplicables

- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session).
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — cada KPI y cada `ChartCard` lleva `info={infoFor('cronograma-...')}` + la cabecera de la lista lleva `GlossaryTooltip id="cronograma-lista-tareas"`.

## Notas

- **Sin filtro PM ni snapshot:** `TareaRecord` no tiene un `pm` directo. Las tareas se pueden cruzar con proyectos por `proyectoId`, pero eso no está implementado como filtro en esta sección. Ver convención → "Secciones excluidas a propósito".
- **Card de persona:** el footer linkea a `/persona/<primer_token>` con `encodeURIComponent(t.asignado.split(' ')[0])`.
- **Card de tarea:** el título de cada card es un link a `/tarea/${t.id}` que abre `TareaDetailSection`. El `id` sintético viene del endpoint; no necesita encoding.
- **Fechas ya normalizadas:** `inicio`, `finEstimado` y `finReal` vienen en ISO desde el endpoint. La hoja `actividades` usa `dd/mm/yyyy`, no seriales de Excel.
- **`proyectoId`**: el vínculo tarea→proyecto es `t.proyectoId === project.id`. Tareas con `proyectoId === ''` son actividades sin proyecto en el portafolio.
