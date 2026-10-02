# `/proyecto/[id]` — ProyectoDetailSection

Vista detalle de un proyecto: hero con estatus/salud/score, KPI strip, gauge de progreso, timeline visual, comparativas vs épica/cuatrimestre, acciones pendientes, equipo por rol (multi-persona), costo desglosado y proyectos relacionados.

- **Componente:** [src/components/sections/ProyectoDetailSection.tsx](../../../src/components/sections/ProyectoDetailSection.tsx)
- **Página:** [src/pages/proyecto/[id].astro](../../../src/pages/proyecto/[id].astro)
- **LOC:** ~540
- **Filtro PM:** ❌ (detalle de un proyecto puntual)
- **Snapshot capture:** ❌
- **Persisted filters:** ❌

## Datos de entrada

### Routing param

```ts
const { id } = Astro.params; // ProjectRecord.id (numérico, directo)
```

Pasado como prop `id: string`. Ya no se usa `slugs.ts` para esta ruta — el `id` es un número sin caracteres especiales, no requiere encoding.

### Hooks de datos

| Hook / fetch | Endpoint | Uso |
|---|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` | Lookup del proyecto + relacionados + comparativas + prev/next |
| `useSheetData<CostoRecord>` | `/api/costos` | Estimación de costo del proyecto |
| `fetch('/api/equipo')` + `useState` | `/api/equipo` | Registro canónico para enriquecer tarjetas de personas |

El fetch a `/api/equipo` construye `byId: Map<string, EquipoMember>` para resolver los arrays de ids (`pmIds`, `arquitectoIds`, `devIds`, `poIds`, `sqaIds`) a registros completos:

```ts
const byId = useMemo(() => {
  const m = new Map<string, EquipoMember>();
  for (const e of registry) m.set(e.id, e);
  return m;
}, [registry]);
```

Si el fetch falla, `registry` queda vacío y las tarjetas degradan a nombre crudo del proyecto.

```ts
const projectIdx = useMemo(() => data.findIndex((p) => p.id === id), [data, id]);
const project = projectIdx >= 0 ? data[projectIdx] : null;
```

Si el `id` no existe, retorna early con UI de error ("Proyecto no encontrado").

## Cálculos derivados

### Prev / next navigation

```ts
const prevProject = projectIdx > 0 ? data[projectIdx - 1] : null;
const nextProject = projectIdx >= 0 && projectIdx < data.length - 1 ? data[projectIdx + 1] : null;
```

Orden del Sheet (no por folio o fecha). Botones de chevron junto al breadcrumb.

### Related projects

```ts
const related = data
  .filter((p) => p.id !== project.id && (
    (project.epica && p.epica === project.epica) ||
    p.arquitectoIds.some((id) => project.arquitectoIds.includes(id))
  ))
  .slice(0, 6);
```

Match por épica O arquitecto compartido (intersección de `arquitectoIds`), máximo 6 cards. El filtro usa `id` (no `folio`) para excluir el proyecto actual.

### Epic / hito comparison

Para cada agrupación calcula promedio de progreso + promedio de health score:

```ts
const epicProjects = data.filter((p) => p.epica === project.epica);
const avgProgress = Math.round((epicProjects.reduce((s, p) => s + p.progreso, 0) / epicProjects.length) * 100);
const avgHealth = Math.round(epicProjects.reduce((s, p) => s + calcHealthScore(p).score, 0) / epicProjects.length);
```

La barra dual visualiza promedio (semi-transparente) vs este proyecto (sólido), coloreado verde/rojo según si está arriba o abajo del promedio.

### Health score

`calcHealthScore(project)` de [utils/healthScore.ts](../../../src/utils/healthScore.ts) — devuelve `{ score, label, color, bgColor, factors }`. Los factors se renderizan como pills debajo del gauge.

### Cost estimate

`estimateProjectCost(project, data, costos.data)` de [utils/costEngine.ts](../../../src/utils/costEngine.ts):

- Suma costo prorrateado de arquitecto + PM + cada dev.
- Cada persona se divide entre el número de proyectos **activos** (no Done, no On Hold) en los que aparece.
- `findCostRecord()` hace matching por alias (`arquitecto`, `desarrollador`, `project manager`).

Solo se muestra en UI si `estimatedMonthlyCost > 0`.

### Timeline elapsed %

```ts
const startDate = (project.fechaInicio || project.registro) ? new Date(...) : null;
const endDate = project.finEstimado ? new Date(...) : null;
// elapsed% = (now - start) / (end - start), clamped 0-100
```

Marker azul "HOY" se posiciona sobre la barra de progreso solo si el proyecto no está Done.

### isOverdue / isDone

- `isOverdue = daysLeft < 0 && estatus !== 'Done'`.
- `isDone = estatus === 'Done'`.

Estos flags controlan colores de KPI strip y badges en el bloque de fechas.

## Bloques de UI

### Hero header

- Folio (mono, gris).
- Actividad (título h1).
- Badges: estatus, salud, prioridad, tipo (si existe), health score con label.
- Botón "Ver en plataforma" si `project.url`.

### KPI strip

5 KPIs (4 fijos + costo si > 0): progreso, días restantes, story points, health score, costo/mes. Tooltip via `<GlossaryTooltip id="proyecto-kpi-strip" />`.

### Progress gauge

`<RadialBarChart>` semicircular con `progressPct`. Color del fill segun threshold (verde >=80, ámbar 40-79, rojo <40). Factores del health score se listan abajo como pills.

### Timeline visual

Barra de progreso + marker vertical "HOY" + lista de fechas (inicio, registro, fin estimado, fin real, hito, épica) con iconos.

### Comparativa

Solo si hay >1 proyecto en la misma épica O en el mismo hito. Dos barras superpuestas (promedio + actual) en progreso y en salud.

### Acciones pendientes

Bloque ámbar si `requiereDe` o `accionRequerida` están definidos. Muestra los 3 campos: requiereDe, accionRequerida, fechaAccion.

### Equipo (sidebar derecha)

`<TeamMemberCard>` por cada miembro — itera los arrays de ids para renderizar MÚLTIPLES personas por rol:

```tsx
// PO(s)
{project.poIds.map((id) => (
  <TeamMemberCard key={id} record={byId.get(id) ?? null} fallbackName={project.po} role="PO" />
))}
// PM(s)
{project.pmIds.map((id) => (
  <TeamMemberCard key={id} record={byId.get(id) ?? null} fallbackName={project.pm} role="PM" />
))}
// Arquitecto(s)
{project.arquitectoIds.map((id) => (
  <TeamMemberCard key={id} record={byId.get(id) ?? null} fallbackName={project.arquitecto} role="Arquitecto" />
))}
// DEV(s)
{project.devIds.map((id) => (
  <TeamMemberCard key={id} record={byId.get(id) ?? null} fallbackName="" role="Dev" />
))}
// SQA(s)
{project.sqaIds.map((id) => (
  <TeamMemberCard key={id} record={byId.get(id) ?? null} fallbackName={project.sqa} role="SQA" />
))}
```

Cada tarjeta muestra:
- **Nombre completo canónico** (`record.fullName`) con link a `/persona/<fullName>`.
- **Título del puesto** (`record.title`) inline junto al rol del proyecto.
- **Email** (`record.email`) como mailto.
- **Badge "Inactivo"** si `!record.active`.

Si `record` es `null` (id no resuelto o fetch fallido), degrada a nombre crudo + rol.

### Bloque "Detalles"

Nuevo bloque que reemplaza al anterior "Cliente". Muestra:
- Producto (`project.producto`)
- Servicio (`project.servicio`)
- Aliado (`project.aliado`)
- Cuatrimestre (`project.cuatrimestre`)
- Sprint (`project.sprint`; se omite si vacío)

### Cost breakdown

Si hay costo: el total mensual + cada item del breakdown (role, persona, share). Link a `/costos`.

### Related projects grid

Hasta 6 cards (folio, actividad truncada, estatus badge, barra de progreso, arquitecto).

## Reglas especiales

### Routing por `id`

La ruta es `/proyecto/[id]` donde `id` es el valor numérico de `ProjectRecord.id`. Ya no se usa `slugs.ts` para esta ruta (`folioToSlug`/`slugToFolio` ya no aplican). El lookup es `data.findIndex((p) => p.id === id)`.

Los links a proyectos en otras secciones (p.ej. `PersonaDetailSection`, `EquipoSection`) usan `/proyecto/${project.id}` directamente.

### Hook order (early return)

`costEstimate` se calcula con `useMemo` **antes** del early return de loading/error. React requiere que el orden y la cantidad de hooks sea estable entre renders, así que los memos no pueden ir después de un `return null`.

```ts
const costEstimate = useMemo(() => {
  if (!project) return { estimatedMonthlyCost: 0, breakdown: [], teamSize: 0 };
  return estimateProjectCost(project, data, costos.data);
}, [project, data, costos.data]);

if (loading) return <Skeleton />;
if (error || !project) return <Error />;
```

### fechaInicio || registro

Para timeline calc se prefiere `fechaInicio` si existe, si no `registro`. Misma regla que `calcHealthScore` y `estimateProjectCost` para coherencia.

## Tooltips de glosario

IDs registrados:

- `proyecto-kpi-strip`
- `proyecto-progress-gauge`
- `proyecto-timeline`
- `proyecto-comparativa`
- `proyecto-acciones-pendientes`
- `proyecto-costo-estimado`
- `proyecto-relacionados`

Cada uno renderizado con `<GlossaryTooltip id="..." />` junto al título correspondiente.

## Convenciones aplicables

- [Slugs de folios](../arquitectura/convenciones.md) — usar `folioToSlug` / `slugToFolio`.
- [Hook order](../arquitectura/convenciones.md) — memos antes de early returns.
- Health score centralizado: NO calcular salud localmente, siempre `calcHealthScore()`.
- Cost engine centralizado: NO sumar costos a mano, usar `estimateProjectCost()`.
