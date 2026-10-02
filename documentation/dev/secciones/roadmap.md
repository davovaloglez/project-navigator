# `/roadmap` — RoadmapSection

Roadmap jerárquico de proyectos agrupados por hito → épica → proyecto. Permite ver de un vistazo qué tan avanzado está cada hito y desplegar/colapsar épicas individualmente.

- **Componente:** [src/components/sections/RoadmapSection.tsx](../../../src/components/sections/RoadmapSection.tsx)
- **Página:** [src/pages/roadmap.astro](../../../src/pages/roadmap.astro)
- **LOC:** ~229
- **Filtro PM:** sí (`usePersistedFilters` key `roadmap`)
- **Snapshot capture:** sí — `useSnapshotCapture(allData, cursosQ.data)` se llama desde otras secciones; aquí no se invoca explícitamente porque ya hay cobertura

> **Nota:** la matriz de [secciones](README.md) marca Roadmap con snapshot capture porque el flujo de captura corre en cualquier sección que cargue proyectos. En este archivo en particular no se llama el hook directamente — el histórico se mantiene desde Dashboard/Portafolio/Timeline cuando el usuario las visita.

## Datos de entrada

| Hook | Endpoint |
|---|---|
| `useSheetData<ProjectRecord>` | `/api/proyectos` |
| `usePersistedFilters` | key `roadmap` — `{ sortOrder: 'asc', pmFilter: {} }` |

## Filtrado por PM

```ts
const data = useMemo(() => {
  const selected = pmFilter.pm || [];
  return selected.length ? allData.filter((p) => selected.includes(p.pm)) : allData;
}, [allData, pmFilter]);
```

Opciones de PM derivadas con `[...new Set(allData.map((p) => p.pm).filter((pm) => pm && pm !== '-'))].sort()`.

## Agrupación: Hito → Épica → Proyectos

```ts
const roadmap = useMemo(() => {
  const hitoMap = new Map<string, Map<string, ProjectRecord[]>>();
  for (const p of data) {
    const hito = p.hito || 'Sin hito';
    const epica = p.epica || 'Sin épica';
    if (!hitoMap.has(hito)) hitoMap.set(hito, new Map());
    const epicMap = hitoMap.get(hito)!;
    if (!epicMap.has(epica)) epicMap.set(epica, []);
    epicMap.get(epica)!.push(p);
  }
  // ... agregaciones
}, [data, sortOrder]);
```

Para cada épica:

```ts
avgProgress: Math.round(mean(projects.map(p => p.progreso)) * 100)
totalPoints: sum(projects.map(p => p.puntos))
doneCount:   projects.filter(p => p.estatus === 'Done').length
```

Para cada hito se rollupéan los mismos campos sobre el conjunto agregado de épicas:

```ts
totalProjects = sum(epics.length)
totalProgress = sum(epics.reduce(p => p.progreso, 0)) / totalProjects // promedio ponderado por proyecto
totalPoints   = sum(epics.totalPoints)
totalDone     = sum(epics.doneCount)
```

### Ordenamiento

- Épicas dentro de un hito: alfabético (`localeCompare`).
- Hitos: alfabético, dirección controlada por `sortOrder` persistido (`asc | desc`). El label del toggle alterna entre "Más antiguo primero" y "Más reciente primero" (asume convención `2025 Q4 → 2026 Q1 → 2026 Q2`).

## Estado persistido vs no persistido

| Estado | Persistido | Razón |
|---|---|---|
| `sortOrder` (`'asc' \| 'desc'`) | sí | El usuario espera volver con la misma dirección |
| `pmFilter` | sí | Convención global del filtro PM |
| `collapsed` (`Record<string, boolean>`) | no | Estado UI transitorio por sesión |

`collapsed` usa la clave `${hitoGroup.hito}-${epic.epica}` para identificar cada épica colapsable.

## Color de las barras de progreso

Semáforo idéntico en hitos y épicas:

```ts
const progressColor =
  avgProgress >= 80 ? 'bg-green-500' :
  avgProgress >= 40 ? 'bg-yellow-500' :
                      'bg-red-500';
```

Las barras de hito miden 32px de ancho y 2.5px de alto. Las de épica miden 20px de ancho y 1.5px de alto.

## Render

Estructura visual:

```
[Hito header] N proyectos · X completados · Y pts        [%][bar]
  ├─ [Épica header] X/N        Z pts · [%][bar]
  │   └─ Grid de ProjectCard (1/2/3 cols responsive)
  └─ ...
```

Cada épica se renderiza vía un `<button>` togglable que controla la visibilidad del grid `ProjectCard`. Cuando está colapsada se muestra solo el header.

## Estado loading / error

- **Loading:** 3 skeletons de hito (`h-48`).
- **Error:** card roja con botón Reintentar.
- **Empty:** no se renderiza placeholder explícito — si `data` es vacío, simplemente no hay grupos. (Posible mejora futura.)

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global).
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session).
- [Slugs](../arquitectura/convenciones.md#12-slugs-de-folios) — `ProjectCard` maneja el enlace con `folioToSlug`.
- [Tooltips](../arquitectura/convenciones.md#13-tooltips-y-glosario) — un único `GlossaryTooltip id="roadmap-jerarquia"` junto al contador, ya que cada hito/épica es un bloque dinámico.

## Notas

- **Snapshot integrity:** no aplica filtro PM al snapshot porque aquí no se captura. Si se agregara la captura, debe pasar `allData` (raw).
- **Hito "Sin hito" / Épica "Sin épica":** se renderizan como buckets normales con esos labels para que nada se pierda silenciosamente.
- **No hay búsqueda libre.** El roadmap es una vista panorámica; para filtros granulares se usa `/portafolio` o `/timeline`.
