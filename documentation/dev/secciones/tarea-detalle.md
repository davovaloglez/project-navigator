# `/tarea/[id]` — TareaDetailSection

Vista de detalle de una tarea del cronograma. Muestra todos los campos de un `TareaRecord` junto con el KPI de precisión de estimación (ratio real/estimado) y un link al proyecto padre si existe.

- **Componente:** [src/components/sections/TareaDetailSection.tsx](../../../src/components/sections/TareaDetailSection.tsx)
- **Página:** [src/pages/tarea/[id].astro](../../../src/pages/tarea/[id].astro)
- **LOC:** ~200
- **Filtro PM:** —
- **Snapshot capture:** —
- **Persisted filters:** —

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<TareaRecord>` | `/api/tareas` | Dataset completo; busca por `t.id === id` (prop de ruta) |
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Sólo para resolver el proyecto padre (`t.proyectoId`) |

El parámetro de ruta `[id]` es el id sintético generado en `/api/tareas` por `makeTareaId()`. La sección busca la tarea con `data.find(t => t.id === id)`.

## Cálculos

```ts
// Ratio real/estimado (precisión de estimación individual)
const ratio = t.puntos > 0 && t.tracked > 0 ? t.tracked / t.puntos : null;
const ratioColor =
  ratio === null   ? 'text-slate-400'  // sin datos
  : ratio > 1.2   ? 'text-red-400'    // tardó más de lo estimado
  : ratio < 0.8   ? 'text-blue-400'   // tardó menos
  :                  'text-green-400'; // en rango ±20%
```

## Bloques visuales

| Bloque | Descripción |
|---|---|
| Header | Nombre de la tarea, épica, folio, badges de estatus + salud + fase + sprint + tipo + prioridad, link externo si tiene `url` |
| KPIs (4 cards) | Puntos estimados / Tracked / Avance (con barra) / Ratio real÷estimado |
| Detalles | Proyecto padre (link), asignado (link a perfil), rol, fase, épica, producto/OU, dificultad, prioridad. Tooltip en el título vía `GlossaryTooltip id="tarea-detalle-detalles"` |
| Fechas | Registro, inicio, fin estimado, fin real. Tooltip vía `GlossaryTooltip id="tarea-detalle-fechas"` |

## Routing

La ruta `/tarea` está gateada en middleware con la page-key `cronograma`:

```ts
'/tarea': 'cronograma',  // hereda el gate del padre
```

Un usuario sin acceso a `/cronograma` tampoco puede abrir `/tarea/[id]`.

## Estados

| Estado | Comportamiento |
|---|---|
| `loading` | Tres skeletons: header + dos cards vacías con `animate-pulse` |
| `error` | Card roja con mensaje y botón "Reintentar" |
| `tarea === null` | Mensaje "Tarea no encontrada" con link de vuelta a `/cronograma` |
| Normal | Layout completo |

## Reglas especiales

- **`id` sintético**: el `TareaRecord.id` se genera en el endpoint con `makeTareaId()` (hash de `proyectoId + folio + nombre + asignado + sprint`). No persiste si esos campos cambian en el Sheet; en ese caso el link queda roto y la sección muestra "Tarea no encontrada". Esta es una limitación conocida mientras la hoja `actividades` no tenga un id propio.
- **Proyecto padre**: se resuelve por `t.proyectoId === project.id`. Si `proyectoId` está vacío o el proyecto no existe en el dataset (puede estar fuera del scope del usuario), muestra el texto crudo de `t.proyecto`.
- **Link a asignado**: el link a `/persona/<asignado>` usa `encodeURIComponent(t.asignado)`. Usa `PageLink` con `pageKey="equipo"` para respetar el gate de permisos.

## Convenciones aplicables

- [Routing por `id`](../arquitectura/convenciones.md#12-routing-por-id-de-proyecto-ya-no-por-folio) — el parámetro de ruta es el id sintético, no el folio.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — `GlossaryTooltip` en los títulos de los paneles de detalles y fechas.
