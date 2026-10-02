# `/persona/[id]` — PersonaDetailSection

Perfil de una persona: proyectos asignados (como arquitecto, PM o dev), tareas del cronograma, cursos, costo prorrateado y métricas de rendimiento (radar, completion rate, puntualidad).

- **Componente:** [src/components/sections/PersonaDetailSection.tsx](../../../src/components/sections/PersonaDetailSection.tsx)
- **Página:** [src/pages/persona/[id].astro](../../../src/pages/persona/[id].astro)
- **LOC:** ~498
- **Filtro PM:** ❌ (perfil de un individuo)
- **Snapshot capture:** ❌
- **Persisted filters:** ❌

## Datos de entrada

### Routing param

```ts
// src/pages/persona/[id].astro (HU NAV-78.2)
const { id } = Astro.params;
const decoded = decodeURIComponent(id || '');
```

Pasado como prop `idOrName: string` ya decoded. El componente resuelve en dos vías en este orden:

1. **Match directo por `equipo.id`** — si `idOrName` coincide exactamente con un `id` del registro `equipo` (formato preferente, e.g. `emontano`).
2. **Fallback a `resolveId`** — si el id directo no existe, se intenta `equipoMatch.resolveId(idOrName, buildMembers(registry))`, que acepta apodos cortos (`"Lore"`) o nombres completos. Esto preserva back-compat con bookmarks del formato antiguo `/persona/Lore` o `/persona/Eduardo%20Monta%C3%B1o`.

Los callsites internos (EquipoSection, Organigrama, CostosEquipo, CapacityHeatmap, CronogramaSection, TareaDetailSection, CursosSection) ya usan `equipo.id` directamente como href. Sólo `PersonCapacityCard`/`CourseForecastCard` siguen pasando nombre porque el agregado de pronóstico no expone el id.

### Hooks de datos

| Hook / fetch | Endpoint | Uso |
|---|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Proyectos (ya traen `pmId`, `arquitectoId`, `devIds`) |
| `useSheetData<CursoRecord>` | `/api/cursos` | Cursos (traen `equipoId`) |
| `useSheetData<CostoRecord>` | `/api/costos` | Estimación de costo (suplementario, 403 no fatal) |
| `useSheetData<TareaRecord>` | `/api/tareas` | Tareas granulares (traen `asignadoId`) |
| `fetch('/api/equipo')` + `useState` | `/api/equipo` | Registro canónico para resolver `nombre` → `personId` |

## Resolución de identidad

La sección resuelve el parámetro de ruta (`idOrName`) a un `equipo.id` estable en dos pasos:

```ts
import { buildMembers, resolveId } from '../../lib/equipoMatch';

// 1. Match directo por id
let personId = registry.find((r) => r.id === idOrName)?.id ?? null;
// 2. Fallback a resolveId (back-compat con nombres/apodos)
if (!personId) {
  personId = resolveId(idOrName, buildMembers(registry));
}
const personRecord = useMemo(
  () => registry.find((r) => r.id === personId) ?? null,
  [registry, personId],
);
const displayName = personRecord?.fullName ?? idOrName;
```

`registry` se carga de `/api/equipo` con un `useEffect` al montar. Mientras `registry` está vacío, `personId` es `null` y todos los filtros retornan arreglos vacíos (ficha parcialmente vacía pero no rota).

La interfaz local `EquipoLite` incluye los campos `title`, `roleName`, `department`, `email` (además de `id`, `fullName`, `nickname`). Todos estos campos ya vienen de `/api/equipo`.

Ver [convenciones §11](../arquitectura/convenciones.md#11-resolución-de-identidad-de-personas-equipoid) para el algoritmo de resolución.

## Cálculos

### personProjects

```ts
const personProjects = useMemo(() => {
  if (!personId) return [];
  return projects.data.filter((p) =>
    p.pmIds.includes(personId) ||
    p.arquitectoIds.includes(personId) ||
    p.devIds.includes(personId) ||
    p.poIds.includes(personId) ||
    p.sqaIds.includes(personId)
  );
}, [projects.data, personId]);
```

Cualquier rol cuenta (PO, PM, Arquitecto, Dev, SQA). Comparación por `id` estable (no por nombre).

### personTareas

```ts
const personTareas = useMemo(() => {
  if (!personId) return [];
  return tareas.data.filter((t) => t.asignadoId === personId);
}, [tareas.data, personId]);
```

Tareas vienen de `/api/tareas` que unifica `app` + `Core` con discriminador `producto`. Match por `asignadoId` (resuelto en el endpoint server).

### roles (string[])

Detecta los 5 posibles roles que esta persona ejerce:

```ts
const roles: string[] = [];
if (!personId) return roles;
if (projects.data.some((p) => p.poIds.includes(personId)))         roles.push('PO');
if (projects.data.some((p) => p.pmIds.includes(personId)))         roles.push('PM');
if (projects.data.some((p) => p.arquitectoIds.includes(personId))) roles.push('Arquitecto');
if (projects.data.some((p) => p.devIds.includes(personId)))        roles.push('Developer');
if (projects.data.some((p) => p.sqaIds.includes(personId)))        roles.push('SQA');
```

Renderizado como pills bajo el nombre. Se añadieron PO y SQA a los anteriores PM/Arquitecto/Dev.

### KPIs

```ts
{
  total: personProjects.length,
  avgProgress: round(sum(progreso) / total * 100),
  completed: count(estatus === 'Done'),
  atRisk: count(estatus === 'At Risk' || 'Blocked / Critical'),
  totalPoints: sum(puntos),
}
```

### Performance

- **completionRate** = `done / total * 100`.
- **avgHealth** = promedio de `calcHealthScore(p).score`.
- **donePoints** = suma de `puntos` de proyectos Done.
- **onTimeRate** = `% de proyectos Done con finReal <= finEstimado`. `-1` si no hay ningún proyecto con ambas fechas (se rinde como "N/A").
- **activeCount** = proyectos no-Done no-OnHold.

### Person cost

```ts
const personCost = useMemo(
  () => estimatePersonCost(personId ?? '', projects.data, costosData.data),
  [personId, projects.data, costosData.data]
);
```

Recibe `personId` (no `nombre`). Retorna `{ monthlyCost, role, costoHora, projectsCost[] }`. Ver [estimatePersonCost en costEngine.ts](../../../src/utils/costEngine.ts):

- Detecta el rol primario vía `arquitectoId`/`pmId`/`devIds` (Arquitecto > PM > Developer).
- `monthlyCost` viene de la tabla de Costos para ese rol.
- `costoHora` viene del mismo registro.
- `projectsCost[]` distribuye `monthlyCost / N` entre los proyectos activos donde aparece.

### Task stats

```ts
const taskStats = {
  total: personTareas.length,
  completadas: count(estatus.includes('completado')),
  activas: count(estatus.includes('en proceso' | 'pendiente' | 'validación' | 'validacion')),
  bloqueadas: count(estatus.includes('bloqueado')),
  puntosTotales: sum(puntos),
  puntosCompletados: sum(puntos where estatus.includes('completado')),
}
```

`sortedTareas` ordena por estatus (bloqueado primero, completado al final) para que las urgentes queden arriba.

### Curso lookup

```ts
const curso = useMemo(() => {
  if (!personId) return null;
  return cursos.data.find((c) => c.equipoId === personId) || null;
}, [cursos.data, personId]);
```

Match por `equipoId` (resuelto en el endpoint `/api/cursos`). Ya no hay riesgo de tocayos ni ambigüedad: la resolución es por `equipo.id` estable.

### Radar data

5 ejes: completación, progreso, salud, puntualidad, capacidad.

```ts
{ metric: 'Capacidad', value: Math.min(100, personProjects.length * 15) }
```

Capacidad satura en 100 con 7+ proyectos.

### Status data + projectsChartData

Pie chart de estatus + bar chart horizontal con progreso por proyecto. Altura dinámica del bar chart: `Math.max(200, projectsChartData.length * 36 + 60)`.

## Bloques de UI

### Profile header

- Avatar (inicial del nombre).
- Roles como pills.
- Health score promedio + costo/mes + $/hr a la derecha.

### Ficha de identidad

Bloque opcional entre el header de perfil y el grid de KPIs. Se renderiza sólo si `personRecord` resolvió y tiene al menos un campo de identidad definido:

```tsx
{personRecord && (personRecord.title || personRecord.roleName || personRecord.department || personRecord.email) && (
  <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mb-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {personRecord.title    && <FieldCell label="Puesto"       value={personRecord.title} />}
      {personRecord.roleName && <FieldCell label="Banda de rol" value={personRecord.roleName} />}
      {personRecord.department && <FieldCell label="Departamento" value={personRecord.department} />}
      {personRecord.email    && <MailCell email={personRecord.email} />}
    </div>
  </div>
)}
```

Campos omitidos individualmente si están vacíos. El bloque completo no se renderiza si el registro no resolvió (sin "Reporta a", sin reportes directos, sin indicador de acceso).

### KPI grid

7 KPIs (6 fijos + costo si > 0): proyectos, progreso prom, completados, en riesgo, pts entregados, puntualidad, costo/mes.

### Charts (2 columnas)

- **Status pie** (izq arriba) — con leyenda de conteos.
- **Performance radar** (izq abajo) — con dos mini-stats (tasa completación + pts totales).
- **Progreso por proyecto** (der) — bar chart horizontal.

### Distribución de costo

Lista de proyectos con su share. Linkeable a `/proyecto/[id]` usando `project.id` directamente (ya no se usa `folioToSlug` para el routing de proyectos).

### Cursos

Si hay match, mini gauge radial con progreso + datos (O.U., rol, jefe directo, PIDs creados).

### Proyectos asignados

Grid de cards. Cada card tiene un badge con el **rol que ejerce en ese proyecto**:

```ts
const roleInProject =
  p.arquitectoId === personId ? 'Arquitecto'
  : p.pmId === personId ? 'PM'
  : 'Developer';
```

### Tareas del Cronograma

Solo si `personTareas.length > 0`. Mini-KPIs (total, completadas, activas, bloqueadas, pts estimados, pts tracked) + agrupación por `fase`/`epica` + lista scrolleable. Cada task row muestra sprint, nombre, fase, tipo, puntos (estimado) vs tracked y estatus.

El split App/Core fue eliminado — la hoja unificada ya no discrimina por esos valores. Se muestra estimado-vs-real (puntos vs tracked) cuando ambos > 0.

## Reglas especiales

### Resolución de identidad

`personId` se deriva de `resolveId(nombre, buildMembers(registry))`. Mientras el fetch a `/api/equipo` está en vuelo, `registry` está vacío y `personId` es `null` → todos los filtros devuelven `[]`. La ficha se ve parcialmente vacía durante el mount inicial pero no rompe ni lanza errores.

### Sin filtro PM

No se filtra el perfil de una persona por PM. El perfil es atómico.

### Cost engine — firma actualizada

`estimatePersonCost(personId, ...)` recibe el id estable. La detección del rol se hace por `proyecto.arquitectoIds.includes(personId)`, `proyecto.pmIds.includes(personId)`, etc. (arrays multi-persona). NO usar `nombre` directamente en `estimatePersonCost`.

### Loading combinado

```ts
const loading = projects.loading || cursos.loading;
const error = projects.error || cursos.error;
```

`tareas` y `costosData` no bloquean el render principal: sus secciones se muestran condicionalmente al final (pueden aparecer vacías sin romper el resto). `costosData` es suplementario; 403 en `/api/costos` no es error fatal.

## Tooltips de glosario

IDs registrados:

- `persona-detalle-header`
- `persona-detalle-health-score`
- `persona-detalle-kpi-proyectos`
- `persona-detalle-kpi-progreso`
- `persona-detalle-kpi-completados`
- `persona-detalle-kpi-en-riesgo`
- `persona-detalle-kpi-pts-entregados`
- `persona-detalle-kpi-puntualidad`
- `persona-detalle-kpi-costo-mes`
- `persona-detalle-status-pie`
- `persona-detalle-radar`
- `persona-detalle-progreso-chart`
- `persona-detalle-distribucion-costo`
- `persona-detalle-cursos`
- `persona-detalle-proyectos-asignados`
- `persona-detalle-tareas-cronograma`

## Convenciones aplicables

- [Resolución de identidad §11](../arquitectura/convenciones.md#11-resolución-de-identidad-de-personas-equipoid) — toda comparación por `id`, no por nombre.
- [Routing por id §12](../arquitectura/convenciones.md#12-routing-por-id-de-proyecto-ya-no-por-folio) — links a `/proyecto/<id>` usando `project.id` directamente.
- Health score centralizado.
- Cost engine centralizado.
