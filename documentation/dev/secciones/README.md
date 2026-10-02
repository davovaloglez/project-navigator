# Secciones — índice

Una doc por section component. Cada doc explica: propósito, datos de entrada, lógica de negocio, persistencia y casos edge.

## Convención

Cada section component:

- Vive en [src/components/sections/](../../../src/components/sections/).
- Se monta en una página `.astro` (e.g. `/portafolio` ← `ProyectosSection`).
- Es **la única capa** que llama hooks de datos (`useSheetData`, `usePersistedFilters`, `useSnapshotCapture`).
- Calcula KPIs y filtros con `useMemo`.
- Renderiza loading / error / empty / normal en este orden estricto.

Ver [arquitectura/data-flow.md](../arquitectura/data-flow.md) y [arquitectura/convenciones.md](../arquitectura/convenciones.md) antes de tocar nada.

## Matriz sección → datos

| Sección | Ruta | Endpoints | Snapshot capture | Filtro PM | Persisted filters key |
|---|---|---|---|---|---|
| [Dashboard](dashboard.md) | `/` | proyectos + cursos + costos + tareas | ✅ | ✅ | `dashboard` |
| [Resumen](resumen.md) | `/resumen` | proyectos + costos + cursos | ✅ | ✅ | `resumen` |
| [Alertas](alertas.md) | `/alertas` | proyectos + tareas | ✅ | ✅ | `alertas` |
| [Portafolio](portafolio.md) | `/portafolio` | proyectos + tareas + cursos | ✅ | ✅ | `proyectos` |
| [Roadmap](roadmap.md) | `/roadmap` | proyectos | ✅ | ✅ | `roadmap` |
| [Timeline](timeline.md) | `/timeline` | proyectos + tareas | ✅ | ✅ | `timeline` |
| [Cronograma](cronograma.md) | `/cronograma` | tareas | — | — | `cronograma` |
| [Pronósticos](pronosticos.md) | `/pronosticos` | proyectos + tareas + costos | ✅ | ✅ | `pronosticos` |
| [Pronóstico (detalle)](pronostico-detalle.md) | `/pronosticos/[id]` | proyectos + tareas + costos + modelo | — | — | — |
| [Distribución](distribucion.md) | `/distribucion` | proyectos | ✅ | ✅ | `distribucion` |
| [Equipo](equipo.md) | `/equipo` | proyectos | — | — | — |
| [Comparativa](comparativa.md) | `/comparativa` | evaluaciones (Turso) | — | — | `comparativa` |
| [Cursos](cursos.md) | `/cursos` | cursos | — | — | `cursos` |
| [Costos](costos.md) | `/costos` | proyectos + costos + costos-modelo | ✅ | ✅ | `costos` |
| [Novedades](novedades.md) | `/novedades` | CHANGELOG.md (parser) | — | — | — |
| [Glosario](glosario.md) | `/glosario` | (static — glossary.ts) | — | — | — |
| [Métricas dev](metricas-dev.md) | `/metricas-dev` | proyectos + tareas | — | ✅ | `metricas-dev` |
| [Proyecto (detalle)](proyecto-detalle.md) | `/proyecto/[id]` | proyectos + tareas + costos | — | — | — |
| [Tarea (detalle)](tarea-detalle.md) | `/tarea/[id]` | tareas + proyectos | — | — | — |
| [Persona (detalle)](persona-detalle.md) | `/persona/[id]` | proyectos + tareas + cursos + costos + equipo | — | — | — |
| [Cuenta](cuenta.md) | `/cuenta` | user-preferences + auth APIs | — | — | — |
| [Admin (listado)](admin.md) | `/admin` | `/api/auth/admin/*` | — | — | — |
| [Admin (detalle)](admin.md) | `/admin/[id]` | `/api/auth/admin/*` + `/api/admin/overrides` | — | — | — |
