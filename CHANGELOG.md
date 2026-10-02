# Changelog

## [1.22.0] - 2026-10-02

### Added

**Soporte nativo para Cloudflare R2 (S3-Compatible)**
- Integración de almacenamiento de objetos compatible con Cloudflare R2 para avatares de perfil y exports de contratos (`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`).
- Borrado limpio de avatares previos en URLs públicas de R2 (`.r2.dev` y dominios personalizados) en [src/lib/avatarBlob.ts](src/lib/avatarBlob.ts).
- Script [scripts/initTursoDb.ts](scripts/initTursoDb.ts) para aprovisionar esquemas, migraciones y semillas en bases de datos de Turso (`npm run db:init`).
- Script [scripts/validateDocs.ts](scripts/validateDocs.ts) para validar integridad de enlaces de documentación (`npm run docs:validate`).

### Changed

- Actualizada configuración de almacenamiento en [src/lib/cs360Data.ts](src/lib/cs360Data.ts) y [scripts/uploadCs360Export.ts](scripts/uploadCs360Export.ts) para admitir endpoints y credenciales de Cloudflare R2 manteniendo compatibilidad con AWS S3.
- Actualizada documentación técnica en `documentation/dev/` y `.env.example` según las pautas de `COMO-DOCUMENTAR.md`.

## [1.21.0] - 2026-06-26

### Added

**Hover-peek del sidebar colapsado (PNav + CS 360)**
- Con el menú colapsado, al pasar el cursor por encima del riel ahora se **asoma el sidebar expandido por encima del contenido** (overlay), sin alterar el estado colapsado persistido ni reflowear el `<main>`. No reemplaza el toggle manual de colapsar/expandir. En PNav vía la nueva variante Tailwind `sidebar-mini` ("colapsado **Y** el aside no está bajo el cursor") en [src/styles/global.css](src/styles/global.css); el margen del `<main>` queda intacto. En CS 360 vía estado `peek` que renderiza el directorio como overlay fijo ([src/components/sections/cs360/Cs360App.tsx](src/components/sections/cs360/Cs360App.tsx)). Sólo aplica en escritorio (depende de `:hover`); touch conserva su drawer.

**cs360 — buscador accesible desde el riel colapsado**
- Nuevo icono de búsqueda en el riel colapsado de CS 360 que **expande el directorio y enfoca el buscador** (drawer en móvil). Colocado debajo del acceso "Global".

**pNav — costo de proyectos en más superficies**
- **Costo mensual estimado en la card de proyecto** de `/portafolio` ([src/components/ui/ProjectCard.tsx](src/components/ui/ProjectCard.tsx)): prop opcional `monthlyCost` con etiqueta `$X/mes`. **Gated por `data:costos`** — si el rol no tiene acceso, `/api/costos` responde 403 y el costo no se muestra (no se expone a `dev`/`ventas`). El divisor del prorrateo usa el dataset completo para no inflar el share.
- **Costo prorrateado de la persona en cada card de "Proyectos Asignados"** de `/persona/[id]` ([src/components/sections/persona-detalle/ProyectosTab.tsx](src/components/sections/persona-detalle/ProyectosTab.tsx)), con el costo mensual total + costo/hora resumidos bajo el encabezado. Mismo gating por `data:costos`.

### Changed

**pNav — Resumen del integrante respeta "ocultar terminados"**
- El tab **Resumen** de `/persona/[id]` ahora respeta el toggle `includeDone` (ya persistido y compartido con el tab Proyectos): las gráficas (distribución de estatus, progreso por proyecto, radar de capacidad) ocultan proyectos terminados. Se unificó el predicado a `isTerminal()` (Done **+ Cancelado**) en Resumen, Proyectos y el badge del tab para que el toggle sea consistente ([ResumenTab.tsx](src/components/sections/persona-detalle/ResumenTab.tsx), [ProyectosTab.tsx](src/components/sections/persona-detalle/ProyectosTab.tsx), [PersonaDetailSection.tsx](src/components/sections/PersonaDetailSection.tsx)).

**pNav — "Distribución de Costo" reemplazada por costo en cards**
- Se retiró el bloque "Distribución de Costo" de `/persona/[id]`: su dato por proyecto ahora vive en cada card de "Proyectos Asignados" y el agregado (total mensual + $/hr) en una línea bajo el encabezado. Entrada de glosario repuntada a su nuevo hogar.

**Cronograma — identificación más clara**
- **Leyenda de colores** estilo dashboard (punto + label) sobre el tablero, con los tipos de tarea presentes + significado del borde de la card (Atrasada / Terminada).
- **Leyendas en "Throughput Semanal"**: swatches para "Tareas completadas (eje izq.)" y "Puntos entregados (eje der.)".
- **Burndown más legible**: el número grande lleva el subtítulo "puntos completados de N planeados" y el mini-chart incluye leyenda inline **Restantes vs Ideal** (antes "Ideal" sólo aparecía en el tooltip). Glosario actualizado.

## [1.20.0] - 2026-06-23

### Added

**Matriz de Tecnologías (skills) del equipo (Planes 015 + 016)**
- Nueva **matriz persona × tecnología** con niveles `Trainee → Jr → Mid → Sr → Arq`. MVP (Plan 015): tab **Tecnologías** en `/equipo` ([src/components/sections/equipo/](src/components/sections/equipo/)) con vista "por persona" y "por tecnología" (proyectos activos inferidos cruzando pmIds/arquitectoIds/devIds contra la matriz); visible a todos los roles. Helpers puros en [src/utils/teamTechnology.ts](src/utils/teamTechnology.ts) (`peopleForTech`, `techsForPerson`, `projectsForTech`, `compareLevel`, `groupByCategory`), unit-testados.
- Fase 2 (Plan 016): **perfil de skills por persona** — tab **Tecnologías** en `/persona/[id]` ([src/components/sections/persona-detalle/](src/components/sections/persona-detalle/)) con techs agrupadas por categoría y chip de nivel. Edición de la matriz (admin por default vía `action:tecnologia:manage`): botón "Agregar tecnología" + lápiz por chip → `TecnologiaEditModal`. **La edición vive sólo aquí.**
- Nuevos endpoints: `GET /api/technologies` (catálogo), `GET /api/team-technologies` (matriz con filtros `?technology=&level=&equipo=`), `POST/DELETE /api/admin/team-technologies` (upsert/borrado, gateado por `action:tecnologia:manage`). Nuevas tablas `technology` + `equipo_technology` (migración `2026-tecnologias.sql`). Nuevo statement `action:tecnologia:manage` en [src/lib/permissions/statements.ts](src/lib/permissions/statements.ts).

**Baseline de pruebas (Vitest, Plan 001)**
- Suite de pruebas con **Vitest** ([vitest.config.ts](vitest.config.ts), environment `node`): tests en `./tests/` espejando `src/`, glob `tests/**/*.test.ts`, aliases vía `vite-tsconfig-paths`. Cubre funciones puras de alto valor: `equipoMatch`, `projectStatus`, `costEngine`, `permissions/roleDefaults`, `requesterScope`, `teamTechnology`. Comandos `npm test` / `npm run test:watch`.
- **Guarda de drift** del MCP server contra `src/`: test que verifica que los espejos en [mcp-server/src/data/](mcp-server/src/data/) no diverjan de los tipos/lógica de `src/`.
- Script `npm run check` + workflow de **CI** (GitHub Actions); README refrescado.

### Changed

**Content Security Policy (CSP) endurecida (Plan 014)**
- Se **enforza la política CSP** y se elimina `script-src 'unsafe-inline'` ([src/middleware.ts](src/middleware.ts), [astro.config.mjs](astro.config.mjs)): los permisos dinámicos se mueven a un **data island JSON** (scripts inline hasheables) y se fijan los hashes de los `is:inline` que Astro no auto-hashea. Test de guarda que descubre los `.astro` dinámicamente.

**Refactors de API y rendimiento**
- **Parsers y cache de Sheets compartidos** (Plan 004): `sheetParsers` + `sheetCache` unificados across 9 rutas de `/api`, eliminando duplicación de parseo por header y lógica de TTL ([src/pages/api/](src/pages/api/)).
- **Costos** (Plan 009): `estimateProjectCost` precomputa los conteos de proyectos activos en vez de recalcularlos por iteración.
- **CS 360**: cache de la lista derivada de `resumen` + índice por id ([src/lib/cs360Data.ts](src/lib/cs360Data.ts)).
- **Temas**: mejoras de diseño y consistencia visual del tablero (Feature/update themes).

### Fixed

- **Endurecimiento de seguridad de la API**:
  - **Row-scoping** extendido a `/api/cursos` y `/api/capacidades` (Plan 005): `pm`/`dev` ven sólo sus propias filas por identidad (`requesterScope`); roles unscoped ven todo.
  - **Sanitización de HTML** del backend/IA en CS 360 con **DOMPurify** ([src/components/sections/cs360/](src/components/sections/cs360/)) — descripciones/comentarios/contenido Magnum ya no se renderizan crudos.
  - Los endpoints devuelven **500 genéricos** al cliente y registran el error completo server-side (no se filtran stack traces).
- **Fechas fuera de rango** en el parseo de tareas/cursos: `parseDate` rechaza seriales Excel fuera de rango; `computeCourseForecasts` marca tendencia de curso en declive ([src/utils/courseForecast.ts](src/utils/courseForecast.ts)).
- **npm audit**: correcciones de dependencias forward-only (sin downgrades).

## [1.19.0] - 2026-06-19

### Added

**Nuevos estatus de proyecto: `LaunchPhase` y `Cancelado` (HU NAV-90)**
- Nueva **fuente única de la semántica de estatus de proyecto** en [src/utils/projectStatus.ts](src/utils/projectStatus.ts): predicados `isActive()`, `isTerminal()`, `isCancelled()`, `countsForHealth()` y el orden canónico `ESTATUS_ORDER`. Centraliza el patrón antes duplicado por toda la app (`estatus !== 'Done' && !== 'On Hold'`) en un solo punto, con espejo en [mcp-server/src/data/projectStatus.ts](mcp-server/src/data/projectStatus.ts).
- **`LaunchPhase`** — estatus activo previo a Hypercare (violeta + icono Rocket). **`Cancelado`** — estatus terminal que **NO cuenta para la SALUD general** del portafolio aunque siga visible en listas (rojo + icono XCircle). Ambos dados de alta en [colors.ts](src/utils/colors.ts) (`estatusColors`) y [healthStatusVisuals.ts](src/utils/healthStatusVisuals.ts) (`ESTATUS_VISUALS`).
- Entrada de glosario actualizada con la nueva semántica de estatus ([src/data/glossary.ts](src/data/glossary.ts)).

**Arquitectura de control y consumo de IA en los Navs (HU NAV-88)**
- Documento de arquitectura para el control y consumo de IA vía Nexus ([HU/NAVs-88/arquitectura.md](HU/NAVs-88/arquitectura.md)).
- Reporte de investigación sobre la integración del MCP con Gemini/Antigravity CLI ([documentation/investigaciones/](documentation/investigaciones/README.md)); el MCP gana soporte documentado para clientes adicionales.

### Changed

- **Semántica de actividad y salud unificada**: secciones, charts y motores (`healthScore`, `forecastEngine`, `anomalies`, `dependencies`, `stale`, `costEngine`) ahora usan los predicados de `projectStatus.ts` en vez de comparaciones ad-hoc — los proyectos `Cancelado` quedan excluidos de conteos activos, costos, burndown, salud y alertas de forma consistente. Toca `ProyectosSection`, `TimelineSection`, `ResumenSection`, `RoadmapSection`, `CostosSection`, `DistribucionPuntosSection`, `MetricasDevSection`, `DashboardSection`, los charts (`DevWorkloadChart`, `HealthDistributionChart`, `PersonBurndown`) y la vista de persona.
- **Proceso de lanzamiento con PRs**: el flujo de release prepara `release/v*` y abre dos PRs (→ `master` y → `develop`, con head branches separadas para sobrevivir el auto-delete) en vez de hacer merge directo a ramas protegidas; el tag se crea tras mergear el PR de master. Documentación del skill `/release` aclarada.

## [1.18.0] - 2026-06-12

### Added

**CS 360 — Insights de IA vía Nexus (HU NAV-85)**
- El análisis de IA del detalle de cliente migra del proxy síncrono de OpenAI al servicio **Nexus** (`ai.bit.lat`) con patrón asíncrono: `POST /api/cs360/analyze` responde **202** con `requestId` y el front hace polling a `GET /api/cs360/analyze/[requestId]` cada 3s (listo en ~5s en la práctica, timeout 2 min). Cliente HTTP en [src/lib/nexus.ts](src/lib/nexus.ts); el prompt (contexts, regla anti-prompt-injection, JSON Schema) y el modelo se administran en el **template del panel de Nexus** — aquí sólo viajan `parameters` (`focus_instruction` + `cliente_json`). El proxy anterior (`src/pages/api/cs360/analyze.ts`) se eliminó.
- Persistencia en Turso: nueva tabla `nexus_request` (migración [2026-nexus-requests.sql](src/db/migrations/2026-nexus-requests.sql)); las respuestas completadas se sirven desde la BD sin tocar Nexus (cache permanente) y se guarda **costo en tokens + modelo** por análisis. Nueva env `AI_BEARER_TOKEN`; si falta, el endpoint responde 503 `AI_NOT_CONFIGURED` y el tablero degrada limpio sin IA.
- Campo opcional `generatedAt` en `CsAiEntry` ([ResumenTab.tsx](src/components/sections/cs360/ResumenTab.tsx)): el reporte muestra la fecha del análisis. El `focus_instruction` anexa la regla de spans para los resaltados rojo/verde del reporte.

**CS 360 — Exportar PDF del reporte de IA**
- El reporte de IA se puede imprimir/exportar a PDF: [ResumenTab.tsx](src/components/sections/cs360/ResumenTab.tsx) monta la vista de impresión como **portal** (`.cs360-print-report`) hijo directo de `<body>`, y [cs360.astro](src/pages/cs360.astro) la activa vía `@media print` — se oculta la app entera y fluye sólo el reporte (sin los recortes de los contenedores con overflow del layout). Conserva los resaltados rojo/verde en papel (`print-color-adjust: exact`) y evita saltos de página feos (`break-after`/`break-inside`). El `:has()` evita una impresión en blanco si se usa Cmd+P sin reporte generado.

### Changed

- **CS 360 — fuente de datos: export remoto de Samva como fuente preferida** ([src/lib/cs360Data.ts](src/lib/cs360Data.ts)): la cadena de resolución ahora es **URL remota → S3 propio → archivo local → mock curado**. El export publicado por Samva (`static.samva.io`, S3+CloudFront público, ~46MB; mismo shape que el export local, verificado byte a byte) pasa a ser la fuente de producción; el S3 propio (`npm run cs360:upload`) queda como fallback. `Cs360Source.source` y el header `X-CS360-Source` ganan el valor `url`. Nota: la URL del export quedó **fija en código** en `loadFromUrl()` (commit posterior reemplazó la lectura de la env `CS360_DATA_URL`, que por ahora no se consulta; el path trae un GUID que puede cambiar al regenerarse el export y requeriría deploy para actualizarse).

## [1.17.0] - 2026-06-12

### Added

**Sidebar colapsable del shell principal**
- Botón `PanelLeftClose/PanelLeftOpen` en la cabecera del sidebar ([src/components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx)): colapsa el menú a una columna de sólo iconos (con `title` por item). El estado vive como clase `sidebar-collapsed` en `<html>`, aplicada **pre-paint** por un script inline en [Layout.astro](src/layouts/Layout.astro) y persistida en localStorage `pn-sidebar-collapsed` — el markup SSR es idéntico colapsado o no, así no hay flash ni mismatch de hidratación. El `<main>` y el `UserMenu` reaccionan vía variantes CSS (`[html.sidebar-collapsed_&]`).

**Timeline — tooltip de fechas y señales estandarizadas (HU NAV-84)**
- **Tooltip al pasar el cursor sobre la barra** de cada proyecto ([TimelineSection.tsx](src/components/sections/TimelineSection.tsx)): estatus, % de avance, nivel de salud calculado (coloreado) y fechas de inicio/fin con etiquetas que distinguen real vs estimada ("Inicio est.", "Fin est.").
- **Rail izquierdo estandarizado** (orden NAV-84: Estatus > % > Salud): chip de color con el estatus declarado por el PM + icono de salud calculada por el sistema (estrella verde = excelente, alerta roja = crítico) — dos dimensiones distintas visibles a la vez; la mini-leyenda se actualizó igual. En [healthStatusVisuals.ts](src/utils/healthStatusVisuals.ts), `healthDotColor()` se reemplaza por `healthTextColor()`.

### Changed

- **Timeline — fechas de inicio**: las barras, el orden y el rango del eje usan `fechaInicio || inicioEstimado` (antes caían a `registro`, la fecha de alta del proyecto, que distorsionaba el arranque visual). El filtro de proyectos visibles ahora admite cualquiera con al menos una fecha (`fechaInicio`, `inicioEstimado`, `finReal` o `finEstimado`).
- **CS 360 — responsividad**: mejoras de diseño responsivo en el directorio y el detalle de cliente ([Cs360App.tsx](src/components/sections/cs360/Cs360App.tsx), [GlobalDashboard.tsx](src/components/sections/cs360/GlobalDashboard.tsx), [ClientDetail.tsx](src/components/sections/cs360/ClientDetail.tsx) y los tabs Resumen/Actividades/Tickets/Llamadas) para pantallas chicas.

### Fixed

- **Off-by-one en fechas del Timeline**: las fechas ISO date-only (medianoche UTC) se formateaban en hora local, así que en zonas detrás de UTC "1 jul" se mostraba como "30 jun". `fmtDate` ahora formatea con `timeZone: 'UTC'`.
- **`/api/proyectos` — centinelas de fecha**: valores no parseables del Sheet ("-", "N/A") ahora se normalizan a vacío en vez de pasar crudos al cliente.
- **Datos sensibles fuera del repo**: un commit local había desactivado la regla de [.gitignore](.gitignore) y agregado el export real de CS 360 (`mocks/healt-score/contratos_exportados.json`, 44MB con datos reales de clientes). Se descartó antes del release reescribiendo la historia local — ningún commit con el blob llega al remoto; la fuente de producción es S3 (`npm run cs360:upload`) y el archivo queda sólo en disco, ignorado.

## [1.16.0] - 2026-06-11

### Added

**Paginación unificada con "Resultados por página" (HU NAV-82)**
- Nuevo componente [src/components/ui/PaginationControls.tsx](src/components/ui/PaginationControls.tsx): selector de **"Resultados por página"** (12/24/50/100/**Todos**, default 50) + navegación prev/next con contador "Pág. X de Y". Se auto-oculta cuando el total no supera la opción mínima. Exporta los helpers `paginate()` (slice seguro con clamp de página) y `sanitizePageSize()` (valida valores que vienen de storage), y dos variantes visuales: `dark` (tema del shell) y `light` (cs360).
- El `pageSize` elegido **se persiste por sección**; la página actual NO se persiste (es estado exploratorio, convención existente). Cambiar el tamaño de página resetea a la página 1.

### Changed

- **`/portafolio`** ([ProyectosSection.tsx](src/components/sections/ProyectosSection.tsx)): la paginación fija de 12 proyectos con sólo prev/next se reemplaza por `PaginationControls`; el `pageSize` se persiste en la pref `proyectos` vía `usePersistedFilters`.
- **`/pronosticos`** ([PronosticosSection.tsx](src/components/sections/PronosticosSection.tsx)): mismos controles en el tab Proyectos y en la tabla de capacidad del tab Personas; ambos **comparten un solo `pageSize`** persistido en la pref `pronosticos`. Cambiarlo resetea ambas páginas.
- **CS 360 — tab Tickets** ([TicketsTab.tsx](src/components/sections/cs360/TicketsTab.tsx)): antes 10 tickets fijos por página; ahora variante `light` con opciones 10/25/50/100/Todos (default 50) persistida en localStorage `pn-cs360-tickets-page-size` (cs360 es app standalone y no usa `usePersistedFilters`).
- Documentación actualizada: convención de paginación en [CLAUDE.md](CLAUDE.md) y [documentation/dev/arquitectura/convenciones.md](documentation/dev/arquitectura/convenciones.md), nueva sección del componente en [documentation/dev/componentes/ui.md](documentation/dev/componentes/ui.md), y secciones de [portafolio](documentation/dev/secciones/portafolio.md) y [pronósticos](documentation/dev/secciones/pronosticos.md) (dev + user).

## [1.15.0] - 2026-06-11

### Added

**CS 360 — Sesión y usabilidad del directorio**
- **Card del usuario en sesión** al pie del directorio de clientes ([src/components/sections/cs360/Cs360App.tsx](src/components/sections/cs360/Cs360App.tsx), `SessionUserCard`): avatar + nombre + email (linkean a `/cuenta`) y botón de **cerrar sesión** (`authClient.signOut()` → redirect a `/login`). CS360 vive fuera del shell de Project Navigator (sin Layout/Sidebar), así que no tenía `UserMenu`; esta card lo sustituye con el tema claro propio del tablero.
- **Sidebar colapsable** en el directorio de clientes: botón `PanelLeftClose/Open`, preferencia persistida en localStorage `pn-cs360-sidebar-collapsed`.
- **6 opciones nuevas de ordenamiento** del directorio (antes sólo score asc/desc y nombre A-Z): nombre Z-A, ranking financiero, fecha de renovación, alumnos vigentes, total de tickets y actividad (actividades + llamadas). Comparador **nulls-last**: clientes sin dato van al final en cualquier dirección.

### Fixed

- **`ssr.noExternal` condicional al entorno** en [astro.config.mjs](astro.config.mjs): `true` sólo en producción (necesario para bundlear dependencias en la Lambda de AWS Amplify, #6), `undefined` en dev — con Vite 7, `noExternal: true` rompe el servidor de desarrollo.

## [1.14.0] - 2026-06-10

### Added

**CS 360 — Neural Intelligence 360 (Health Score de Customer Success)**
- Nueva **app standalone** `/cs360` ([src/components/sections/cs360/](src/components/sections/cs360/), réplica de [mocks/healt-score/Neural360.html](mocks/healt-score/Neural360.html)): tablero de Customer Success con health score por cliente. NO usa `Layout.astro` (página propia con tema claro, `client:only="react"`); desde el sidebar se abre en **pestaña nueva** (`newTab: true`, icono `HeartPulse`). Dos vistas: **dashboard global de cartera** (KPIs + distribución de score + estatus) y **detalle de cliente** con 5 tabs (Resumen 360 con IA/heatmap/líderes/uso/charts/desglose de tickets, Actividades, Tickets paginados, Llamadas, Guías/Auditoría con HTML Magnum).
- **Score:** `calculateBaseScore()` en [src/utils/cs360.ts](src/utils/cs360.ts) — réplica fiel de la fórmula del mock (base 100, tickets abiertos/críticos tope -30, actividad 3 meses, renovación, alumnos=0, sentimiento; genera log para el modal de desglose). Precalculado **server-side** y embebido en la respuesta. La IA puede sobrescribir el score (persistido en localStorage `pn-cs360-ai-store`).
- **Endpoints nuevos** (todos gateados por `page:cs360`): `GET /api/cs360/clientes` (lista ligera con score precalculado), `GET /api/cs360/clientes/[id]` (detalle completo on-demand, hasta ~1.8MB), `POST /api/cs360/analyze` (insights de IA vía proxy server-side a OpenAI; key en env `OPENAI_API_KEY`, modelo `OPENAI_MODEL` default `gpt-4o-mini`; sin key degrada limpio con 503).
- **Fuente de datos** en cadena **S3 → archivo local → mock curado** ([src/lib/cs360Data.ts](src/lib/cs360Data.ts)): si `CS360_S3_BUCKET` está set descarga el export gzippeado de S3 (producción); si no, archivo local (`CS360_DATA_FILE`, gitignored) o mock curado de [src/data/cs360-clientes.json](src/data/cs360-clientes.json). El adaptador [src/lib/cs360Adapter.ts](src/lib/cs360Adapter.ts) normaliza fechas, centinelas, estatus, dedupe de ids y repara URLs. Header `X-CS360-Source: s3|export|mock`. Cache 5 min.
- **Script** `npm run cs360:upload` ([scripts/uploadCs360Export.ts](scripts/uploadCs360Export.ts)): valida + comprime el export (~44MB → ~4MB) y lo sube a S3.
- Nuevo statement `page:cs360` (**admin-only por default**, como `comparativa`); gate en middleware para `/cs360` y todo `/api/cs360/*`. Item de sidebar visible sólo para roles permitidos.

### Changed

**Migración de deploy Vercel → AWS Amplify (finalización de referencias)**
- El código ya corría con el adapter `astro-aws-amplify` y los avatares en Amazon S3; esta entrada cierra la limpieza de **referencias** a Vercel en todo el repo: [CLAUDE.md](CLAUDE.md), [README.md](README.md), ~21 docs bajo [documentation/](documentation/), [.env.example](.env.example), [.gitignore](.gitignore), [mcp-server/README.md](mcp-server/README.md) y comentarios de código.
- **`vercel.json` eliminado.** Sus dos piezas funcionales se reubicaron: los **headers de seguridad** pasaron al middleware (ver abajo) y el **cron semanal** ahora requiere un scheduler externo (AWS EventBridge Scheduler → `GET /api/snapshots/auto-capture` con `Authorization: Bearer <CRON_SECRET>`), **pendiente de configurar en infra**.
- Env var de avatares actualizada en docs/`.env.example`: `BLOB_READ_WRITE_TOKEN` (Vercel Blob) → `AVATAR_S3_BUCKET` (+ opcionales `AWS_REGION`, `AVATAR_CDN_URL`). Las credenciales AWS se toman de la cadena por defecto del SDK.

**Headers de seguridad en el código de la app**
- Movidos de `vercel.json` a [src/middleware.ts](src/middleware.ts) como la constante `SECURITY_HEADERS` aplicada vía `withSecurityHeaders` a **toda** respuesta SSR (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, CSP-Report-Only). Viven en la app —no en config del host— para sobrevivir futuras migraciones de plataforma. **En Amplify, vía `vercel.json`, ya no se estaban aplicando.** No sobreescriben un header ya presente.

**Node.js mínimo `>=24.0.0`**
- Subido de `>=22.12.0` a `>=24.0.0` (Node 24 LTS "Krypton") en [package.json](package.json) y [mcp-server/package.json](mcp-server/package.json), con docs y `engines` actualizados.

### Fixed

- **Lectura de env vars en runtime sobre AWS Amplify.** [src/lib/sheets.ts](src/lib/sheets.ts) (`GOOGLE_CREDENTIALS`, `SHEET_ID`), [src/middleware.ts](src/middleware.ts) y [src/pages/api/snapshots/auto-capture.ts](src/pages/api/snapshots/auto-capture.ts) (`CRON_SECRET`) leían sólo `import.meta.env.X`, que puede ser `undefined` en el runtime de Amplify (donde las env vars de runtime llegan por `process.env`). Ahora usan el fallback `import.meta.env ?? process.env` (mismo patrón que [auth.ts](src/lib/auth.ts), [db/client.ts](src/db/client.ts) y [avatarBlob.ts](src/lib/avatarBlob.ts)). Sin esto, la capa de datos de Google Sheets (todos los `/api/proyectos|tareas|cursos|costos…`) y la autenticación del cron podían caerse en producción.

## [1.13.0] - 2026-06-01

### Added

**Autoevaluación trimestral + comparativa cross-persona (HU NAV-78)**
- Sistema completo de evaluación trimestral en 7 dimensiones (Actitud, Aptitudes, Comunicación, Velocidad, Análisis, Calidad, Autogestión, escala 1-10). Modelo de privacidad **Modo A**: cada persona ve sólo su propia evaluación; admin ve todas las demás.
- Nueva tabla Turso `evaluacion` con FK a `equipo`, `UNIQUE(equipo_id, periodo)` y checks SQL 1-10 por dimensión. Migración aditiva [src/db/migrations/2026-evaluaciones.sql](src/db/migrations/2026-evaluaciones.sql).
- Bloque **"Mi evaluación"** en `/cuenta` ([src/components/sections/cuenta/EvaluacionBlock.tsx](src/components/sections/cuenta/EvaluacionBlock.tsx)): selector de período `YYYY-Qn`, 7 sliders 1-10, mini-radar preview, historial. Persiste por `(equipo_id, periodo)`.
- Nueva página **`/comparativa`** ([src/components/sections/ComparativaSection.tsx](src/components/sections/ComparativaSection.tsx), admin-only por default): combina P1+P2 de la HU — chips ordenadas por calificación con avatar, radar overlay de hasta 3 personas, tabla sortable con 7 dimensiones. Filtro por categoría de rol (`roleCategory`) para resolver "PM vs PM, DEV vs DEV". Modal `EvaluacionEditModal` ([src/components/sections/comparativa/](src/components/sections/comparativa/)) para que admin capture/edite/borre evaluaciones de cualquier persona.
- Tres endpoints nuevos: `GET/POST /api/me/evaluaciones` (autoeval del usuario, role-open), `GET /api/evaluaciones` (gateado por `action:evaluacion:view-all`, admin), `POST/DELETE /api/admin/evaluaciones` (gateado por `action:evaluacion:manage`, admin). Helpers compartidos en [src/utils/evaluacion.ts](src/utils/evaluacion.ts) (dimensiones canónicas, `calcCalificacion`, `quarterOf`, `comparePeriodos`).
- Nuevos statements: `page:comparativa`, `action:evaluacion:view-all`, `action:evaluacion:manage` (todos admin-only por default).
- Glosario ampliado: 2 secciones nuevas (`comparativa`, `cuenta`) + 4 entradas (`cuenta-mi-evaluacion`, `comparativa-ranking`, `comparativa-radar`, `comparativa-tabla`).

**Persona responsable en bloqueadores de dependencias (HU NAV-76)**
- `analyzeDependencies` ([src/utils/dependencies.ts](src/utils/dependencies.ts)) ahora prueba un **4to modo de matching**: cuando un chunk de `requiereDe` no resuelve a proyecto, intenta resolverlo contra el registro `equipo` vía `resolveId`. Nuevo estado `BlockerStatus: 'person'` y campo `Blocker.person: { id, name, image }`.
- `DependencyCard` ([src/components/ui/DependencyCard.tsx](src/components/ui/DependencyCard.tsx)) renderiza Avatar + nombre canónico + link a `/persona/[id]` cuando el chunk es una persona, en vez del `"texto crudo"` con badge "No identificado" anterior.

**Timeline — fixes visuales y UX (HU NAV-72)**
- Rail rediseñado ([src/components/sections/TimelineSection.tsx](src/components/sections/TimelineSection.tsx)): círculo numérico reemplazado por **dot de salud** (color por bucket) + **chip de estatus** con icono. La barra del Gantt incluye ahora el icono de estatus antes del %. Nuevo [src/utils/healthStatusVisuals.ts](src/utils/healthStatusVisuals.ts) centraliza mapeos icon/color de salud y estatus.
- Leyenda colapsable persistible (default expandida) con ★ Excelente (evita colisión con ✓ Done).
- **Wheel/drag pan** + **Ctrl+wheel zoom centrado al cursor**: scroll horizontal con la rueda, arrastre con clic mantenido (con threshold de 3px para distinguir de click), zoom centrado en el día bajo el cursor con `Ctrl`/`Cmd` + rueda. Supresión de click después de drag para que no abra cards accidentalmente.

**Servidor MCP — v0.4.0**
- [mcp-server/](mcp-server/) sincronizado con NAV-74 + NAV-78. `EquipoRecord` ahora incluye `tag`, `roleName`, `managerName`, `hasLogin`, `image`. `EvaluacionRecord` añadido. Tipos faltantes añadidos como espejo del proyecto principal: `SprintRecord`, `CapacidadRecord`, `HitoRecord`, `RepoRecord`.
- Nuevo helper [mcp-server/src/data/evaluacion.ts](mcp-server/src/data/evaluacion.ts) (espejo de `src/utils/evaluacion.ts`).
- Tres tools nuevas (read-only) en [mcp-server/src/tools/evaluations.ts](mcp-server/src/tools/evaluations.ts):
  - `get_my_evaluations` — autoeval del usuario actual (cualquier autenticado).
  - `list_evaluations` — todas las evaluaciones cross-persona (admin), con filtros por persona/período/rango/calificación.
  - `evaluation_summary` — agregación por persona para un período (capturadas, faltantes, promedios por dimensión).
- Los endpoints de escritura (`POST/DELETE /api/admin/evaluaciones`) **no se exponen** por MCP por diseño: editar la evaluación de alguien más debe pasar por la UI con confirmación visible.

**Runner de migraciones Turso reusable**
- Nuevo `npm run apply-migration -- <archivo.sql>` ([scripts/applyMigration.ts](scripts/applyMigration.ts)) que aplica una migración contra la BD Turso configurada en `.env` sin requerir `turso auth login`. Útil para `2026-evaluaciones.sql` y futuras migraciones.

### Changed

**Ruta de detalle de persona — `/persona/[id]` (HU NAV-78.2)**
- La URL del perfil de persona ahora usa `equipo.id` (e.g. `/persona/emontano`) en vez del nombre encodeado (`/persona/Eduardo%20Monta%C3%B1o`), siguiendo el patrón de `/proyecto/[id]` y `/tarea/[id]`.
- Resolución del param en dos vías: (1) match exacto por `equipo.id`, (2) fallback a `equipoMatch.resolveId` por nombre/apodo — los bookmarks y links externos viejos siguen funcionando.
- 8 callsites internos migrados a `equipo.id` directo: `EquipoSection`, `Organigrama`, `CostosEquipo`, `CapacityHeatmap`, `CronogramaSection`, `TareaDetailSection`, `CursosSection`, `proyecto-detalle/shared`. `PersonCapacityCard` y `CourseForecastCard` siguen pasando nombre porque sus agregados de pronóstico no exponen `equipoId`; el fallback del resolver los cubre.

**Documentación bajo `documentation/`**
- 12 docs actualizados y 7 docs nuevos cubriendo la HU NAV-78 (sección y endpoints de evaluaciones, helpers nuevos) y NAV-72 (rail visuals + UX) y NAV-76 (modo `person` en dependencias). Validador de cross-refs OK (0 enlaces rotos).

### Fixed

- IDE TS Server reportaba "no se encuentra 'process'" en `mcp-server/src/index.ts` tras el bump de `@types/node`. Añadido `"types": ["node"]` explícito en [mcp-server/tsconfig.json](mcp-server/tsconfig.json) para forzar la carga sin depender del autodiscovery del IDE.
- Bump de `@types/node` 22.10.2 → 22.19.19.

## [1.12.0] - 2026-06-01

### Added

**Directorio del equipo — vistas avanzadas (HU NAV-74 / NAV-78)**
- `EquipoSection` ([src/components/sections/EquipoSection.tsx](src/components/sections/EquipoSection.tsx)) ampliada de un directorio simple a una vista por **tabs**, cada una en su propio archivo bajo [src/components/sections/equipo/](src/components/sections/equipo/):
  - **Organigrama** ([Organigrama.tsx](src/components/sections/equipo/Organigrama.tsx)): jerarquía del equipo derivada de `manager_id`, con búsqueda, **foco en subárbol** (zoom a una rama) y manejo de **huérfanos** (miembros sin manager). Filtros persistentes.
  - **Heatmap de capacidad y carga** ([CapacityHeatmap.tsx](src/components/sections/equipo/CapacityHeatmap.tsx)): velocity de 8 semanas por persona vs carga pendiente, con estatus `under`/`fit`/`tight`/`over`/`critical`, ventana configurable (4/8/12 semanas) y orden por sobrecarga/velocity/nombre/pendiente.
  - **Comparativa** ([Comparativa.tsx](src/components/sections/equipo/Comparativa.tsx)): compara KPIs de hasta **3 miembros** lado a lado (radar chart) — health score, velocity, costo, throughput.
  - **Costos del equipo** ([CostosEquipo.tsx](src/components/sections/equipo/CostosEquipo.tsx)): costo total, **absorbido** (prorrateado a proyectos) e **idle** (capacidad no asignada), con tabla detallada por persona y desglose por rol.

**Perfil de persona — vista por tabs**
- `PersonaDetailSection` ([src/components/sections/PersonaDetailSection.tsx](src/components/sections/PersonaDetailSection.tsx)) rediseñada a una vista por **tabs**, cada uno en su propio archivo bajo [src/components/sections/persona-detalle/](src/components/sections/persona-detalle/):
  - **Resumen** ([ResumenTab.tsx](src/components/sections/persona-detalle/ResumenTab.tsx)): KPIs de la persona y distribución de proyectos por estatus.
  - **Proyectos** ([ProyectosTab.tsx](src/components/sections/persona-detalle/ProyectosTab.tsx)): proyectos en los que participa, con costo prorrateado por actividad.
  - **Cronograma** ([CronogramaTab.tsx](src/components/sections/persona-detalle/CronogramaTab.tsx)): Gantt y Burndown personales de las actividades asignadas.
  - **Accesos** ([AccesosTab.tsx](src/components/sections/persona-detalle/AccesosTab.tsx)): repositorios GitHub con el rol de acceso de la persona + curso asignado.
  - Lógica compartida en [shared.tsx](src/components/sections/persona-detalle/shared.tsx).
- **Gráficos personales**: **Gantt** ([src/components/charts/PersonGantt.tsx](src/components/charts/PersonGantt.tsx)) de actividades por proyecto y **Burndown** ([src/components/charts/PersonBurndown.tsx](src/components/charts/PersonBurndown.tsx)) con trayectoria ideal y filtros persistentes.

**Repositorios — accesos GitHub por persona**
- Nuevo endpoint **`GET /api/repositorios`** ([src/pages/api/repositorios.ts](src/pages/api/repositorios.ts)): lee la hoja `repositorios` (rango `A1:K60`), role-open a cualquier autenticado, cache 5 min. Cada repo trae los nombres display concatenados por rol de acceso (administrador / arquitecto / colaborador / visualizador / deploy); el match por persona se hace en cliente.
- Nueva interfaz `RepoRecord` en [src/utils/dataTransforms.ts](src/utils/dataTransforms.ts).

**Categorías de equipo (taxonomía NAV-74)**
- Nuevo [src/utils/roleCategory.ts](src/utils/roleCategory.ts): `roleCategory()` mapea el `rol` del registro `equipo` a una categoría de alto nivel (Tecnología / Management / UX/UI / Servicio / Dirección / Otros) — derivada del **rol**, no del departamento (unidad de negocio). `roleRango()` devuelve el rango corto (Trainee/Jr/Mid/Sr/Arq) para roles de Tecnología. `CATEGORY_ORDER` fija el orden de presentación.

**`equipo.tag` — nombre display para cruces externos**
- Nueva columna `tag` en la tabla `equipo` (nombre display "First Last", e.g. "Lorena Olvera") para cruzar de forma fiable con fuentes externas como la hoja `repositorios`, donde `full_name` (nombre legal completo) no matchea. `GET /api/equipo` ahora retorna `tag`. La app cae a un match por tokens del `full_name` mientras `tag` esté vacío.
- Migración aditiva y reversible [src/db/migrations/2026-equipo-tag.sql](src/db/migrations/2026-equipo-tag.sql) (`alter table equipo add column tag`) + seed idempotente [src/db/seeds/equipo-tag-2026-05-29.sql](src/db/seeds/equipo-tag-2026-05-29.sql).

### Changed

**Control de acceso — gating por API y dashboard**
- **Gate genérico por endpoint** ([src/middleware.ts](src/middleware.ts)): nuevo mapa `API_PAGE_GATES` que exige que el rol pueda ver **al menos una** de las páginas consumidoras del endpoint; si no, responde 403 aunque se haga `curl` directo (bloquea el bypass de la UI escondida). Cubre `/api/proyectos|tareas|cursos|equipo|repositorios|hitos|capacidades|sprints` y `GET /api/snapshots`. Sigue siendo gating grueso (no row-level; eso es Fase 5).
- **Dashboard `/` ahora gateado**: el middleware ya no exime `/` del gate de página. Una página denegada redirige a `firstAllowedPath` (la primera página permitida en orden de sidebar, o `/cuenta`), nunca a otra denegada — así gatear el dashboard no genera loop de redirect. `DashboardSection` acepta `canDashboard` y muestra un estado "Sin acceso" como defensa en profundidad.
- **Resumen** ([src/components/sections/ResumenSection.tsx](src/components/sections/ResumenSection.tsx)): bloques "Requieren Atención" / "Mejor Desempeño" envueltos en `<Gate>` para respetar overrides de bloque.
- **`blockDenyByRole`** ([src/lib/permissions/roles.ts](src/lib/permissions/roles.ts)): los roles `dev` y `ventas` niegan por defecto las tabs sensibles del directorio (`equipo-capacity-heatmap`, `equipo-comparativa`) como red de seguridad ante un override al alza.

**Vinculación de cuentas Google ↔ usuario creado por admin**
- [src/lib/auth.ts](src/lib/auth.ts): configurado `account.accountLinking` (`enabled`, `trustedProviders: ['google']`, `requireLocalEmailVerified: false`). Los usuarios creados por el admin nacen con `emailVerified:false` y sólo cuenta `credential`; sin esta config, Better-Auth rechazaba vincular implícitamente su Google con `"account not linked"` y el login con Google fallaba. Seguro aquí porque `disableSignUp` + `ALLOWED_GOOGLE_DOMAIN` impiden pre-registrar el email de otra persona. Ver detalle en [CLAUDE.md](CLAUDE.md) → Authentication.

**Glosario y otros**
- **Glosario** ([src/data/glossary.ts](src/data/glossary.ts)): nuevas entradas para los bloques del directorio de equipo (organigrama, heatmap, comparativa, costos) y del perfil de persona (tabs, Gantt/Burndown personal, accesos).
- Ajustes en `DashboardSection` y `ResumenSection` asociados al gating; `/api/equipo` selecciona la columna `tag` en el query a Turso.

## [1.11] - 2026-05-29

### Added

**Detalle de proyecto — vista por tabs**
- `ProyectoDetailSection` ([src/components/sections/ProyectoDetailSection.tsx](src/components/sections/ProyectoDetailSection.tsx)) rediseñada de un layout monolítico (~550 líneas) a una vista por **tabs**, cada uno en su propio archivo bajo [src/components/sections/proyecto-detalle/](src/components/sections/proyecto-detalle/):
  - **Resumen** ([ResumenTab.tsx](src/components/sections/proyecto-detalle/ResumenTab.tsx)): health score radial, fechas (Q de entrega, inicio estimado), hitos del proyecto y stats clave.
  - **Detalle** ([DetalleTab.tsx](src/components/sections/proyecto-detalle/DetalleTab.tsx)): equipo asignado (con `Avatar`), costo estimado y sección de **esfuerzo** (asignado vs invertido en Pts / Horas / Días).
  - **Pronóstico** ([PronosticoTab.tsx](src/components/sections/proyecto-detalle/PronosticoTab.tsx)): riesgo, confianza y fecha proyectada del motor de pronóstico, con link al detalle completo.
  - **Cronograma** ([CronogramaTab.tsx](src/components/sections/proyecto-detalle/CronogramaTab.tsx)): gráficos de Gantt y Burndown del proyecto.
  - **Relacionados** ([RelacionadosTab.tsx](src/components/sections/proyecto-detalle/RelacionadosTab.tsx)): proyectos relacionados con **criterios de relación configurables** (cuenta, PM, cliente, etc.).
  - Lógica compartida (stats, tarjetas de miembro, opciones de relación) en [shared.tsx](src/components/sections/proyecto-detalle/shared.tsx).

**Gráficos de proyecto — Gantt y Burndown**
- **Gantt** ([src/components/charts/ProjectGantt.tsx](src/components/charts/ProjectGantt.tsx)): timeline de actividades agrupadas por hito, con barras por estatus y posicionamiento por fecha.
- **Burndown** ([src/components/charts/ProjectBurndown.tsx](src/components/charts/ProjectBurndown.tsx)): tres curvas de puntos restantes por semana (Ideal / Esperado / Real) derivadas de las actividades del proyecto (HU NAV-70).

**Hitos como entidad propia**
- Nuevo endpoint **`GET /api/hitos`** ([src/pages/api/hitos.ts](src/pages/api/hitos.ts)): lee la hoja `hitos` (fases con fechas/estatus/avance propios), role-open a cualquier autenticado, cache 5 min. Liga con proyectos vía `id_proyecto → ProjectRecord.id` y con actividades vía `HitoRecord.id ← TareaRecord.hitoId`.
- Nueva interfaz `HitoRecord` en [src/utils/dataTransforms.ts](src/utils/dataTransforms.ts).

**Inicio estimado (Q de entrega)**
- Nuevo campo `inicioEstimado` en `ProjectRecord` y `TareaRecord` (columna `Inicio estimado`), parseado en `/api/proyectos` y `/api/tareas`. Distingue el inicio planeado del real (`fechaInicio`/`inicio`) cuando hubo re-planeación. Títulos y etiquetas actualizados a "Q de entrega".
- `TareaRecord` también incorpora `hitoId` (columna `HitoId`) para ligar actividades a su hito.

**Historias de usuario (HU)**
- Documentación de NAV-76 (fixes de Pronósticos / dependencias con foto del responsable) y NAV-78 (sección de comparativa de métricas PM vs PM, DEV vs DEV) en [HU/](HU/), con capturas y propuestas de diseño. Brief de referencia, no código.

### Changed

- **Glosario** ([src/data/glossary.ts](src/data/glossary.ts)): nuevas entradas para los bloques del detalle de proyecto (`proyecto-esfuerzo`, `proyecto-gantt`, `proyecto-burndown`, `proyecto-pronostico`) y ajustes asociados a la vista por tabs.
- **Rangos de Sheets ampliados**: `/api/proyectos` lee hasta `proyectos!A1:AJ300` (antes `AH300`) y `/api/tareas` hasta `actividades!A1:AD500` (antes `Z500`) para cubrir las nuevas columnas (`inicio estimado`, `hitoid`).
- **Mocks**: agregados `mocks/p-Nav_Data_28-05.xlsx` y `p-Nav_Data_29-05.xlsx` como fuentes de prueba actualizadas.

## [1.10.1] - 2026-05-28

### Added

**Cronograma — ocultar tareas Done**
- Nuevo botón **Ocultar Done / Mostrar Done** en la barra de controles de la sección "Tareas / Historias" ([src/components/sections/CronogramaSection.tsx](src/components/sections/CronogramaSection.tsx)). Filtra las tareas con estatus Done **sólo** en el listado/matriz de esa sección (kanban, matriz, contador del título y estado vacío); los indicadores y gráficos superiores no se ven afectados. El botón sólo aparece cuando el estatus Done está habilitado por los filtros actuales (hay tareas Done visibles). El estado `hideDone` se persiste vía `usePersistedFilters` (key `cronograma`) y se resetea con el botón "Limpiar".

## [1.10.0] - 2026-05-27

### Added

**PWA / Web App Manifest**
- Soporte PWA: nuevo [public/site.webmanifest](public/site.webmanifest) con nombre, theme color e íconos para instalación como app. Linkeado desde [src/layouts/Layout.astro](src/layouts/Layout.astro), [src/pages/404.astro](src/pages/404.astro) y [src/pages/login.astro](src/pages/login.astro).
- Set completo de íconos: `favicon.svg`/`favicon.ico` actualizados, `favicon-96x96.png`, `apple-touch-icon.png`, `web-app-manifest-192x192.png` y `web-app-manifest-512x512.png` (+ `original-icon.png` como fuente). El middleware ([src/middleware.ts](src/middleware.ts)) expone los archivos del manifest como rutas públicas (no requieren auth) para que el browser pueda fetch'earlos pre-login.

**Avatar reutilizable**
- Nuevo componente [src/components/ui/Avatar.tsx](src/components/ui/Avatar.tsx): muestra foto desde el registro `equipo` (resuelta vía `resolveId`) o iniciales con fondo derivado del nombre. Tamaño configurable. Reemplaza la lógica duplicada de avatares en `AdminSection`, `AdminUserSection`, secciones de equipo y personas. Decisión: usar `Avatar` en TODA la UI que muestre persona ([ver memory: use-avatar-for-persons]).

**Dashboard — nuevos gráficos**
- **Carga de Trabajo por DEV** ([src/components/charts/DevWorkloadChart.tsx](src/components/charts/DevWorkloadChart.tsx)): migrado y mejorado, ahora cruza por `devIds` resueltos en vez de strings legibles.
- **Distribución de Salud** ([src/components/charts/HealthDistributionChart.tsx](src/components/charts/HealthDistributionChart.tsx)): nuevo donut con la distribución del portafolio por bucket de health score.
- **Proyectos por Arquitecto** ([src/components/charts/ProyectosPorArquitectoChart.tsx](src/components/charts/ProyectosPorArquitectoChart.tsx)): nueva gráfica que cruza `arquitectoId` (multi-valor con `splitMulti`) contra estatus.
- Widgets del dashboard registrados en `DashboardSection` + `useDashboardConfig` (merge automático con config guardada para que aparezcan en sesiones existentes).

**Cronograma — agrupación por matriz**
- `CronogramaSection` rediseñada (724 líneas modificadas): nueva vista de agrupación por **matriz** (tipo de tarea × estatus / responsable) además del listado de cards. Filtros y KPIs reorganizados; gráficos de carga actualizados.

**Distribución de Puntos — tipo de tarea**
- `DistribucionPuntosSection` añade chart de distribución por **tipo de tarea** (API / SP / App / Web / Análisis / SQA / Prototipo) usando la paleta semántica de `getTipoTareaColor()`.

**Roadmap — filtros**
- `RoadmapSection` (284 líneas modificadas): nuevos filtros por hito/épica y por estatus; layout más limpio.

**Resumen — refactor**
- `ResumenSection` simplificada (101 líneas modificadas): KPIs reorganizados, integra los nuevos charts del dashboard.

**Historias de usuario (HU)**
- Documentación de historias NAV-69 a NAV-74 en [HU/](HU/) (markdown + capturas + propuesta visual NAV-72 Timeline). Sirven como brief/diseño de referencia, no como código.

### Changed

- **Mocks consolidados**: docena de CSVs sueltos (`Project-Navigator-2/3/4/5/6.xlsx`, `Panorama Marzo - ...`, `Team-18-mayo.csv`, `reconciliacion.csv`, `reseed-equipo-2026-05-18.sql`, etc.) borrados y reemplazados por un único [mocks/p-Nav_Data.xlsx](mocks/p-Nav_Data.xlsx) como fuente de prueba. Limpieza neta de ~2k líneas.
- **Glosario** ([src/data/glossary.ts](src/data/glossary.ts)): 278 líneas actualizadas para reflejar los nuevos charts del dashboard (Carga DEV, Salud, Proyectos × Arquitecto), agrupación por matriz en Cronograma y distribución por tipo de tarea.
- **`AdminSection` / `AdminUserSection`**: usan el nuevo componente `Avatar` (antes inline).

## [1.9.0] - 2026-05-26

### Added

**Servidor MCP (`mcp-server/`)**
- Servidor [Model Context Protocol](https://modelcontextprotocol.io) que expone los datos del portafolio a Claude Desktop, Claude Code y cualquier cliente MCP compatible. Vive en su propia carpeta con `package.json` propio; **no** lee Sheets/Turso directamente — hace fetch HTTP a la API Astro autenticada con un bearer token MCP del usuario dueño.
- **Tools expuestas**: portafolio (`list_projects`, `get_project`, KPIs), cronograma (`list_tasks`, `get_task`), cursos (filtros por miembro), equipo (`list_team`, `resolve_person` con matcher canónico), costos (`estimate_project_cost`, `estimate_person_cost`), personas (identidades resueltas + matching), y glosario (`list_glossary_sections`, `get_glossary_entry`, `search_glossary`) para que Claude pre-cargue el vocabulario del producto.
- **Permisos heredados**: el MCP corre por la misma cadena de auth/RBAC que el browser. Un `dev` que llame `get_costs` recibe 403 traducido a "tu rol no tiene permiso"; cuando aterrice el scoping fila-a-fila (Fase 5) lo heredará automáticamente.
- Setup y comandos en [mcp-server/README.md](mcp-server/README.md). Los tipos de [mcp-server/src/data/types.ts](mcp-server/src/data/types.ts) son **espejo intencional** de `src/utils/dataTransforms.ts` (y del shape de `glossary.ts`); mantener ambos sincronizados al cambiar el shape de un record.

**Tokens MCP**
- Nuevo bloque "Tokens MCP" en `/cuenta` ([src/components/sections/CuentaSection.tsx](src/components/sections/CuentaSection.tsx) → `McpTokensBlock`): el usuario genera tokens bearer largos (`pn_mcp_*`) con nombre + caducidad obligatoria (30/90/180/365 días), ve la lista (metadata only, nunca el plaintext) y revoca por prefijo.
- API en [src/pages/api/me/mcp-tokens.ts](src/pages/api/me/mcp-tokens.ts): GET lista, POST crea (devuelve el plaintext **una sola vez**, después sólo el hash sha256 se queda en Turso), DELETE revoca por prefijo. Anti-chain: si el caller se autentica con un token MCP el POST devuelve 403 (un MCP no puede emitir otros tokens).
- **Middleware extendido**: [src/middleware.ts](src/middleware.ts) detecta `Authorization: Bearer pn_mcp_*` y short-circuita a [src/lib/mcpToken.ts](src/lib/mcpToken.ts) → `resolveMcpToken(plain)` que carga el `user` desde Turso. El resto del pipeline (rol, overrides, scoping) corre idéntico; `locals.session = null` para requests MCP (no son sesiones de browser).
- Nueva tabla `mcp_token` en Turso (migración [src/db/migrations/2026-mcp-tokens.sql](src/db/migrations/2026-mcp-tokens.sql)).

**Registro canónico de `equipo` (Turso) + resolución de identidad**
- Nueva tabla `equipo` en Turso ([src/db/migrations/](src/db/migrations/)) como **fuente de verdad** del staff. Reemplaza el matching fuzzy por nombre entre sheets (Projects usa apodos cortos como "Lore", Cursos/Cronograma usa nombres completos como "Lorena Raquel Olvera Rodriguez"). El frágil `nameMatches()` ya no existe.
- **Matcher puro client-safe** [src/lib/equipoMatch.ts](src/lib/equipoMatch.ts): `resolveId(name, members)` con prioridad ALIAS curado → nickname exacto único → full_name exacto único → fuzzy único (ambiguo → `null`, mejor no resolver que mal resolver). Reusado por el resolver server y por la UI del Admin.
- **Resolver server** [src/lib/equipoResolver.ts](src/lib/equipoResolver.ts): carga `equipo` de Turso con cache TTL 5 min + `invalidateEquipoCache()`; delega en `equipoMatch`.
- **Enriquecimiento aditivo** en `/api/proyectos|tareas|cursos`: las respuestas incluyen ids resueltos (`pmId`, `arquitectoId`, `devIds[]`, `asignadoId`, `equipoId`, `colaboradorId`, `jefeId`). Los strings originales se conservan. Los consumidores (EquipoSection, PersonaDetailSection, `estimatePersonCost`) filtran por **id**, no por nombre.
- **Endpoints de gestión** [src/pages/api/admin/equipo.ts](src/pages/api/admin/equipo.ts) (POST crea, PUT edita) gateados por la nueva acción `action:equipo:manage` (separada a propósito de `user:manage` — un PM/gerente puede gestionar el registro sin tener poderes de auth). Valida `role_id` ∈ `roles`, `manager_id` existe, anti-ciclo en jerarquía. Modal `EquipoEditModal` en `/equipo`.
- **`GET /api/equipo`** ([src/pages/api/equipo.ts](src/pages/api/equipo.ts)) role-open a cualquier autenticado, retorna `{ equipo: EquipoRecord[], roles: [{id,name}] }` con `roleName`, `managerName`, `active`, `hasLogin` (join con `user.equipoId`).
- Nueva columna `equipoId` en `user` (FK a `equipo.id`). Bloque `EquipoLinkBlock` en `/admin/[id]` permite al admin asociar un usuario a una persona del registro.
- Script de seed/reconciliación: `npm run reconcile:equipo` ([scripts/reconcileEquipo.ts](scripts/reconcileEquipo.ts)) para mapear automáticamente roles e identidades desde CSVs.

**Multi-rol por proyecto**
- `ProjectRecord` ahora soporta **múltiples personas por rol** (PM, Architect, Developer, PO, SQA): los campos pueden traer "Luis, George" y se splittean con el helper `splitMulti()` ([src/utils/multiName.ts](src/utils/multiName.ts)) en filtros, agrupaciones y cruces. Ya no es seguro asumir 1 PM o 1 arquitecto por proyecto.
- Sprints y Capacidades: nuevos records `SprintRecord` y `CapacityRecord` ([src/utils/dataTransforms.ts](src/utils/dataTransforms.ts)) para tracking de capacidad por sprint en la sección de equipo.

**IDs sintéticos para tareas + página de detalle**
- `/api/tareas` genera **IDs estables** por tarea (`hash(folio + actividad + asignado)`) — antes no había PK. Permite linkear a una tarea individual.
- Nueva ruta `/tarea/[id]` ([src/pages/tarea/[id].astro](src/pages/tarea/[id].astro)) con `TareaDetailSection` ([src/components/sections/TareaDetailSection.tsx](src/components/sections/TareaDetailSection.tsx)) — cards en `/cronograma` ahora enlazan al detalle.
- Middleware mapea `/tarea/*` → page-key `cronograma` para herencia de permisos.

**Migración de IDs `folio` → `id` en Turso**
- Toda la cadena (`ProjectRecord`, snapshots, anomalías, forecasting, staleness, cost engine, dependency analysis) ahora usa `id` consistente en lugar de `folio`. El `folio` legible se conserva como dato; la PK es el `id`.
- `Snapshots` migrado de Google Sheets a **Turso** ([src/pages/api/snapshots.ts](src/pages/api/snapshots.ts)) — upsert atómico, mejor performance, sin race conditions. El endpoint `auto-capture` opera contra Turso.

**Scoping de visibilidad por rol (hook + filtros)**
- Nuevo hook `useScopeView` ([src/hooks/useScopeView.ts](src/hooks/useScopeView.ts)) para que secciones filtren su dataset según el rol/identidad del usuario actual. Por ejemplo: un `dev` ve sólo los proyectos donde aparece como `devId`; un `pm` ve sólo los proyectos que dirige.
- Filtros de la sección Timeline y Glosario respetan permisos: si un usuario no tiene `page:portafolio`, el filtro de PM se oculta; si tiene un bloque del glosario denegado, la entrada no aparece en la búsqueda.
- Widgets del dashboard se ocultan según rol del usuario (ya existía gating por `block:dashboard-<widget.id>`; ahora también se considera el rol efectivo).

### Changed

- **`equipo` cache invalidation por epoch**: los endpoints `/api/proyectos|tareas|cursos` ahora cachean su payload con la epoch del `equipo` ([src/lib/equipoResolver.ts](src/lib/equipoResolver.ts)); cuando un admin edita un miembro del equipo, la siguiente request reconstruye el cache con los ids actualizados.
- **`estimatePersonCost` ahora recibe `personId`** en vez de nombre. La detección de rol usa `equipo.id` estable en vez de fuzzy matching por nombre.
- **`cleanId()`** ([src/pages/api/proyectos.ts](src/pages/api/proyectos.ts), `tareas.ts`, `cursos.ts`): sanitiza los valores "sentinel" del Sheet (espacios, guiones, vacíos) para evitar IDs basura.
- **`getTipoTareaColor()`** ahora tiene fallback determinista cuando llega un tipo no mapeado — ya no devuelve `undefined` que rompía Recharts.
- Documentación actualizada: nueva sección de "Scoping por identidad" en la doc de auth, doc del modelo de datos con alcance del diagrama y tablas omitidas, doc de `tareas` con nuevos campos resueltos.

### Fixed

- Cards de miembros en `/equipo` ahora muestran información enriquecida (proyectos activos, puntos completados, último login) usando ids resueltos en vez de matching frágil por nombre.
- Filtros de PM/arquitecto/dev funcionan correctamente cuando un proyecto tiene múltiples personas en el rol (e.g. "Luis, George") — antes el filtro sólo matcheaba con el primer nombre.

### Security

- **`brace-expansion`**, **`qs`**, **`ws`** bumps de seguridad (transitivas, vía `npm audit fix`). Sin cambios de comportamiento.

### Migration notes

- **Tabla `mcp_token` en Turso**: aplicar [src/db/migrations/2026-mcp-tokens.sql](src/db/migrations/2026-mcp-tokens.sql) (`turso db shell <db-name> < src/db/migrations/2026-mcp-tokens.sql`). El schema también está reflejado al final de [src/db/auth-schema.sql](src/db/auth-schema.sql) — al regenerar con `npm run auth:generate` hay que reanexarla a mano junto con `user_preferences`, `user_permission_override` y `rateLimit` (5 tablas custom en total, antes 4).
- **Tablas `equipo`, `equipo_rates`, `roles`**: aplicar las migraciones del directorio [src/db/migrations/](src/db/migrations/) en orden. Setup nuevo desde cero: el `auth-schema.sql` ya las incluye.
- **Columna `equipoId` en `user`**: agregada por la migración de equipo; FK a `equipo.id`. El admin debe asociar manualmente cada usuario existente con su persona del registro vía `/admin/[id]` → bloque "Vincular con equipo".
- **Migración de `folio` → `id` en código**: si tienes integraciones externas que usan `folio` como llave, actualizarlas para usar el campo `id`. El `folio` se conserva como dato legible pero ya no es la PK.
- **Snapshots en Turso**: si tenías el tab `Snapshots` en el Sheet con datos históricos, hay que portarlos a Turso (script ad-hoc o aceptar empezar el histórico desde la primera captura post-deploy). La API sólo lee/escribe en Turso ahora.
- **Reconciliación inicial del equipo**: tras aplicar las migraciones, correr `npm run reconcile:equipo` con los CSVs de partida para poblar `equipo` con ids estables y mapear nombres de Projects/Cursos/Cronograma a las identidades canónicas.

## [1.8.0] - 2026-05-15

### Security

**Dependencias (npm audit)**
- **`devalue` 5.6.4 → 5.8.1** (transitiva de `astro` / `@astrojs/react`): parchea [GHSA-77vg-94rm-hx3p](https://github.com/advisories/GHSA-77vg-94rm-hx3p) (HIGH, DoS por deserialización de arrays dispersos). Vía `npm audit fix`. Verificado con `astro check` + `npm run build`.
- **`better-auth` 1.6.9 → 1.6.11** (runtime): bump de higiene dentro de `^1.6.9`.
- **Advisory aceptada (dev-only, sin fix upstream)**: [GHSA-wxw3-q3m9-c3jr](https://github.com/advisories/GHSA-wxw3-q3m9-c3jr) (2 moderate) en `better-auth@1.4.x` **anidado bajo `@better-auth/cli`** (devDependency, solo `npm run auth:generate`). El runtime usa `better-auth@1.6.11` (no vulnerable). El CLI fija la versión exacta, así que `overrides` no puede forzarlo. Documentado en [seguridad.md → Vulnerabilidades aceptadas](documentation/dev/arquitectura/seguridad.md#vulnerabilidades-aceptadas-npm-audit).

**Endurecimiento de seguridad (caja blanca + caja negra)**
- **Rate limit en login**: activado el built-in de Better-Auth con `storage: 'database'` para coherencia entre lambdas de Vercel ([src/lib/auth.ts](src/lib/auth.ts)). Reglas custom: `/sign-in/email` 5/5min, `/sign-in/social/*` 10/5min, `/sign-out` 20/min, general 100/min. Bloquea credential stuffing y mitiga (junto con timing equalization) la enumeración de usuarios reportada en la auditoría de caja negra.
- **Nueva tabla `rateLimit`** en Turso ([src/db/auth-schema.sql](src/db/auth-schema.sql)) con schema `(id, key, count, lastRequest)`. Backend del `storage: 'database'`. Agregada manualmente al final del archivo, igual que `user_preferences` — cuidado al regenerar el schema con `npm run auth:generate`.
- **Headers de seguridad** en [vercel.json](vercel.json) aplicados a toda la app: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` bloqueando cámara/mic/geo/USB/pago, `Strict-Transport-Security` (HSTS, 1 año) y `Content-Security-Policy-Report-Only` con directivas adaptadas a Astro + Tailwind v4 + Recharts + OAuth Google. CSP está en modo Report-Only durante ~1 semana antes de promover a enforce.
- **Source maps off en producción** ([astro.config.mjs](astro.config.mjs)): `vite.build.sourcemap: false` evita publicar el TypeScript original (queries Turso, lógica de costos, validaciones server-side) en `.vercel/output/`.
- **404 sin Layout autenticado** ([src/pages/404.astro](src/pages/404.astro)): reescrito como HTML+CSS inline, sin importar `Layout.astro` ni hidratar islands. Evita filtrar la estructura del sidebar y el email del usuario en 404s servidos pre-auth (assets, cambios futuros de routing).
- **`.gitignore` con patrones generales**: `*.db`, `*.sqlite*`, `*.db-journal`, `*.sqlite-journal` y `client_secret_*.json` (en vez del nombre exacto). `dev.db` removido del index con `git rm --cached` (el archivo siempre fue 0 bytes en la historia — verificado con `git ls-tree` contra el empty-blob `e69de29bb2d1...`, sin necesidad de reescribir historia).

### Added

**Sistema de roles y permisos (RBAC + overrides) — NAV-66**
- RBAC sobre el **admin plugin de Better-Auth** + access-control. Seis roles en una sola fuente de verdad [src/lib/permissions/roles.ts](src/lib/permissions/roles.ts) (`admin`, `directores`, `gerentes`, `pm`, `dev` DEFAULT, `ventas`); añadir un rol = una entrada en el archivo (sin migración ni `auth:generate`).
- **Statements** gruesos [src/lib/permissions/statements.ts](src/lib/permissions/statements.ts): `page:*` (1 por página del sidebar + `admin`), `data:costos`, `action:snapshot:create|user:manage`. Resolver server async [src/lib/permissions.ts](src/lib/permissions.ts) (`can`, `getEffectivePermissions`): efectivo = `rol ∪ overrides(allow) ∖ overrides(deny)`, cache por usuario TTL 30s con `invalidatePermissions`. Evaluación pura por rol client-safe en [src/lib/permissions/roleDefaults.ts](src/lib/permissions/roleDefaults.ts).
- **Enforcement único** en [src/middleware.ts](src/middleware.ts): gatea páginas (mapa `pageKeyForPath`), `/api/costos*` (403), `POST /api/snapshots` (403) y `/api/admin/*` (`action:user:manage`). El cliente (Sidebar filtrado, `usePermissions`/`<Gate>`/`<PageLink>`) es sólo UX; el server es el gate real. Degradación 403 no-fatal en `useSheetData` (costo suplementario, sin romper PersonaDetail/CostosSection).
- **Gating de bloques** [src/components/auth/Gate.tsx](src/components/auth/Gate.tsx): `KPICard`/`ChartCard` se auto-ocultan si su `glossaryAnchor` está denegado (default-ALLOW, sin envolver a mano); endpoint [src/pages/api/me/permissions.ts](src/pages/api/me/permissions.ts) + `window.__PN_PERMS__` inyectado anti-XSS.
- **Módulo Admin** (`/admin`, sólo rol `admin`): [AdminSection](src/components/sections/AdminSection.tsx) (grid de cards de usuario + alta) y [AdminUserSection](src/components/sections/AdminUserSection.tsx) (ficha `/admin/[id]`: Perfil+Rol ‖ Estado de cuenta, Sesiones, editor de overrides en acordeón por página tri-estado Hereda/Permitir/Denegar). Reemplaza el uso diario de `npm run create-user`.
- **Candados anti-bloqueo** server-side [src/lib/adminGuard.ts](src/lib/adminGuard.ts) (`hooks.before` en `auth.ts`, fail-closed): no cambias tu propio rol, no se degrada al último admin. Persistencia de overrides en [src/pages/api/admin/overrides.ts](src/pages/api/admin/overrides.ts) (tabla `user_permission_override`). Mensajes de error traducidos al español ([src/lib/authErrors.ts](src/lib/authErrors.ts)); confirmaciones destructivas vía `ConfirmModal`.

**Diagramas de arquitectura y sitemap — NAV-15**
- Diagramas de arquitectura y mapa de sitio agregados a la documentación (`erDiagram` del modelo de datos en `.gitignore` para no versionar artefactos generados).

- Nueva doc [documentation/dev/arquitectura/seguridad.md](documentation/dev/arquitectura/seguridad.md) — modelo de amenaza, mitigaciones por categoría, comandos de validación periódica, y reglas para agregar endpoints/componentes/deps nuevas. Cubre auditorías de caja blanca (interna) y caja negra (Eduardo Montaño - Líder CiberSeguridad BIT, 2026-05-08).

**Foto de perfil (subir/quitar)**
- En `/cuenta` → Perfil el usuario puede subir, reemplazar o quitar su foto; en `/admin/[id]` → Perfil un admin puede hacerlo para cualquier usuario. La imagen se redimensiona en el cliente (canvas, `src/utils/imageResize.ts`, máx 512px → JPEG) y se sube server-side a **Vercel Blob** vía `POST/DELETE /api/me/avatar` y `/api/admin/avatar` (helper compartido [src/lib/avatarBlob.ts](src/lib/avatarBlob.ts)).
- Validación server-side por **firma binaria** (no se confía en el `Content-Type`): PNG/JPG/WebP, máx 2MB. Al reemplazar/quitar se borra el blob anterior si vivía en Vercel Blob (las fotos de Google OAuth nunca se tocan). `user.image` se persiste vía `authClient.updateUser` / `authClient.admin.updateUser`; el endpoint sólo opera el Blob.
- "Quitar foto" deja `user.image = null` → cae a iniciales. Para usuarios de Google **no** re-restaura su foto de Google hasta un nuevo login OAuth.
- El path admin queda gateado por `action:user:manage` (middleware + `can()` defensivo). El blob es público vía URL aleatoria no adivinable (estándar para avatares).
- Requiere la env var `BLOB_READ_WRITE_TOKEN` (store de Vercel Blob). Sin emulador local: el dev server también necesita un token real para probar uploads.

### Migration notes

- **RBAC en Turso (DBs existentes)**: aplicar [src/db/migrations/2026-roles.sql](src/db/migrations/2026-roles.sql) (`turso db shell <db-name> < src/db/migrations/2026-roles.sql`) — añade columnas del admin plugin (`role`/`banned`/`banReason`/`banExpires` en `user`, `impersonatedBy` en `session`) y la tabla `user_permission_override`. Si la tabla no existe, el resolver degrada a sólo-rol sin romper. Setup nuevo: `auth-schema.sql` ya las incluye. Cuidado al regenerar con `npm run auth:generate` (reescribe el archivo y borra las tablas custom — reanexar a mano).
- **Tabla `rateLimit` en Turso**: aplicar antes del deploy. DBs existentes: `tail -n 3 src/db/auth-schema.sql | turso db shell <db-name>` aplica solo las 2 sentencias nuevas (`create table rateLimit` + `create index rateLimit_key_idx`). Setup nuevo desde cero: el `auth-schema.sql` ya las incluye.
- **CSP en modo Report-Only**: tras desplegar `vercel.json`, monitorear violaciones en DevTools console por ~1 semana (dashboard, portafolio, costos, pronósticos, login con Google, /cuenta). Cuando esté limpio, renombrar el header `Content-Security-Policy-Report-Only` → `Content-Security-Policy` para enforce.
- **Timing equalization (condicional)**: ejecutar el experimento curl documentado en [seguridad.md](documentation/dev/arquitectura/seguridad.md#timing-equalization-en-login) post-deploy. Si delta < 100ms → no hace falta acción (Better-Auth 1.6.9 ya iguala en upstream). Si delta > 100ms → aplicar el hook documentado en el mismo doc.
- **OAuth client secret rotado**: el `GOOGLE_OAUTH_CLIENT_SECRET` fue rotado en Google Cloud Console como precaución por haber estado en disco (`client_secret_*.json` gitignored solo por nombre exacto). Confirmar que la env var actualizada esté aplicada en Vercel Production antes del próximo redeploy.

## [1.7.0] - 2026-05-12

### Added

**Sección de Cuenta (`/cuenta`)**
- Nueva página accesible desde el `UserMenu` del sidebar que centraliza la gestión del usuario activo en cuatro bloques: Perfil, Seguridad, Sesiones activas y Preferencias.
- **Perfil**: edición de nombre vía `authClient.updateUser` + avatar placeholder (sin upload por ahora).
- **Seguridad**: cambio de contraseña con `authClient.changePassword` y opción opt-in para `revokeOtherSessions`. El bloque se oculta automáticamente para usuarios sólo-Google (sin cuenta `providerId: 'credential'` en `authClient.listAccounts()`).
- **Sesiones activas**: lista de sesiones con `userAgent` parseado, revocación individual por fila (excepto la sesión actual, identificada por `session.session.token`) y bulk revoke de todas las demás vía `authClient.revokeOtherSessions()`.
- **Preferencias**: botón "Limpiar todos los filtros guardados" (DELETE remoto sin `?section=` + barrido de `localStorage['pn-prefs-*']`) y reset del layout del dashboard (borra `pn-dashboard-config`).

**Persistencia de filtros per-user (server-side, cross-device)**
- Nuevo hook `usePersistedFilters<T>(sectionKey, defaults)` ([src/hooks/usePersistedFilters.ts](src/hooks/usePersistedFilters.ts)) que sincroniza estado de filtros + toggles con Turso vía `/api/user-preferences`. Hidrata sincrónicamente desde `localStorage['pn-prefs-<sectionKey>']` (anti-flash) y refetch del server al mount. Writes con debounce 500ms + AbortController para cancelar PUTs en vuelo.
- 12 secciones integradas: `proyectos`, `timeline`, `cronograma`, `cursos`, `dashboard`, `resumen`, `alertas`, `pronosticos`, `costos`, `distribucion`, `metricas-dev`, `roadmap`. Persiste dropdowns y toggles booleanos/numéricos (e.g. `includeDone`, `showForecast`, `zoomIdx`, `sortBy`, `tab`). Búsqueda libre (`search`) y paginación (`page`) **NO** persisten por diseño (son exploratorios).
- Nuevo endpoint `GET/PUT/DELETE /api/user-preferences` con scope per-user vía `Astro.locals.user.id`. Validación server-side: `sectionKey` matchea `/^[a-z0-9-]{1,64}$/`, `value` debe ser objeto plano, body cap 10KB. Upsert por `(userId, sectionKey)`.
- Nueva tabla `user_preferences` en Turso con PK compuesta `(userId, sectionKey)`, FK a `user(id)` con `ON DELETE CASCADE` y columna `value` JSON.

**Glosario y tooltips in-product (`/glosario`)**
- Nueva página `/glosario` con 149 entradas en 17 secciones, documentando cada bloque visible del tablero. Sidebar interno espejo del sidebar global + búsqueda + anchors `#<entry-id>` y `#intro-<section-slug>` para deep-linking. Intro cards arriba de cada sección con `whatIs`/`whenToUse`/`related[]` y cross-refs entre páginas.
- Tooltips inline junto a KPIs, gráficas y secciones agrupadas en todo el dashboard. Single source of truth en [src/data/glossary.ts](src/data/glossary.ts) — 1 entrada por bloque visible.
- Nuevos componentes:
  - `InfoTooltip` ([src/components/ui/InfoTooltip.tsx](src/components/ui/InfoTooltip.tsx)) — icono "i" inline con hover/click + viewport-aware positioning (auto-detecta top/bottom + left/center/right) + click-outside + Escape.
  - `GlossaryTooltip` ([src/components/ui/GlossaryTooltip.tsx](src/components/ui/GlossaryTooltip.tsx)) — wrapper sobre `InfoTooltip` que toma sólo `id` y resuelve description/anchor desde el glosario.
  - `MarkdownText` ([src/components/ui/MarkdownText.tsx](src/components/ui/MarkdownText.tsx)) — renderer ligero sin dependencias. Soporta `**bold**`, `` `code` ``, listas `- ` y bloques ` ``` `. Exporta también `InlineMarkdown` para single-line.
- `KPICard` y `ChartCard` aceptan prop opcional `info?: { description, glossaryAnchor }` que renderiza el tooltip junto al título automáticamente. Helper `infoFor(id)` en `glossary.ts` retorna el objeto listo para pasar a la prop.
- Cada entrada del glosario referencia al menos un archivo fuente con `${GITHUB_BASE}/<path>` (con `#L<n>-L<m>` cuando aplica) para que el usuario pueda saltar al código.

### Changed

- `auth-schema.sql` ([src/db/auth-schema.sql](src/db/auth-schema.sql)) ahora incluye al final la tabla `user_preferences` mantenida a mano. **Cuidado al regenerar el schema con `npm run auth:generate`**: el comando reescribe el archivo y borra la tabla custom. Después de regenerar, reaplicar las dos últimas sentencias (`create table "user_preferences" ...` + `create index "user_preferences_userId_idx" ...`).
- `FilterDropdowns` cablea `onClear` para que el botón "Limpiar" resetee también el estado persistido del lado servidor (`clearPersisted()`), no sólo el estado local en memoria.

### Migration notes

- Esta release requiere aplicar la tabla `user_preferences` a Turso. Setup nuevo desde cero: el `auth-schema.sql` regenerado ya la incluye al final, basta con `turso db shell <db-name> < src/db/auth-schema.sql`. DBs existentes (con las 4 tablas de Better-Auth ya creadas): `tail -n 3 src/db/auth-schema.sql | turso db shell <db-name>` para aplicar sólo las dos sentencias nuevas.

## [1.6.0] - 2026-05-06

### Added

**Autenticación de usuarios (Better-Auth + Turso)**
- Sistema de auth multi-usuario que protege todo el dashboard. Antes el deploy era público; ahora requiere sesión iniciada para acceder a cualquier ruta excepto `/login`, `/api/auth/*`, assets estáticos y la cron de snapshots (que usa bearer `CRON_SECRET`).
- Dos métodos de login en `/login`: email + password y Google OAuth, ambos vía componente `LoginForm`.
- **Sin self-signup**: el endpoint público de signup de Better-Auth está deshabilitado (`disableSignUp: true` en email/password y en social Google). Solo el admin puede crear usuarios mediante `npm run create-user <email> <password> <nombre>`, que invoca la API server-side de Better-Auth y bypassea el bloqueo público.
- Restricción opcional por dominio vía env `ALLOWED_GOOGLE_DOMAIN` (e.g. `bit.lat`) para limitar OAuth a la organización.
- Persistencia en Turso (libSQL) con esquema generado por Better-Auth (`user`, `session`, `account`, `verification`).
- `UserMenu` en el sidebar muestra usuario activo y permite logout; `Sidebar` recibe el `user` desde `Layout.astro` (poblado por middleware).

### Changed

- `useSheetData` ([src/hooks/useSheetData.ts](src/hooks/useSheetData.ts)) detecta respuestas 401 de los endpoints `/api/*` y redirige a `/login` automáticamente, garantizando que sesiones expiradas no rompan la UI.
- Middleware único de enforcement ([src/middleware.ts](src/middleware.ts)): popula `Astro.locals.user` y `Astro.locals.session` para todas las páginas, retorna 401 JSON en rutas API sin sesión, y redirige a `/login` en rutas no-API. Cualquier endpoint nuevo en `/api/*` queda protegido por default sin trabajo extra.
- `src/env.d.ts` extiende `App.Locals` con tipos de `user` y `session` para soporte tipado en el frontmatter de páginas Astro.
- `.env.example` añade las nuevas vars requeridas: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `ALLOWED_GOOGLE_DOMAIN` (opcional).

### Security

- Resueltas 7 vulnerabilidades transitivas (3 high + 4 moderate) introducidas por `@better-auth/cli`. `npm audit` ahora reporta `0 vulnerabilities`.
- Fix de SQL injection en `drizzle-orm` ([GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9)) vía `overrides` forzando ^0.45.2.
- Fix de prototype pollution y code injection en `lodash`/`lodash-es` ([GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg), [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc), [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh)) cortando la cadena vía `overrides` forzando `chevrotain` ^12.0.0 (que ya no depende de lodash) y `@mrleebo/prisma-ast` ^0.15.0.

### Migration notes

- Esta release introduce dependencias de runtime nuevas (Turso + OAuth client). Deploys existentes deben configurar las env vars listadas arriba antes de subir, o el dashboard quedará inaccesible.
- Setup inicial documentado en CLAUDE.md sección "Authentication" → "Setup inicial (una sola vez)".

## [1.5.0] - 2026-05-05

### Added

**Filtro global por Project Manager**
- Nuevo filtro single-select de PM disponible en 9 secciones del dashboard que muestran datos derivados de proyectos:
  - `/` (Dashboard) — KPIs y todos los widgets de proyectos
  - `/resumen` — Health score, comparativa por hito, top mejor/peor desempeño
  - `/alertas` — Filtra alertas + recalcula KPIs y tab counts por tipo
  - `/portafolio` — Integrado en `FilterDropdowns` junto a los filtros existentes
  - `/roadmap` — Filtra hitos y épicas mostradas
  - `/timeline` — Filtra barras del Gantt
  - `/distribucion` — Filtra todos los charts de distribución de puntos
  - `/costos` — Solo `projectCosts` y `costByHito`. KPIs y tablas de roles permanecen org-wide (con aviso visual)
  - `/metricas-dev` — Solo personas que participaron en proyectos del PM seleccionado
- Implementación unificada con `FilterDropdowns` existente (single-select vía `multi: false`), reutilizando un único componente para todo el dashboard
- Edge case: PM con valor `'-'` o vacío excluido automáticamente de las opciones
- `/pronosticos` ya tenía filtro PM nativo desde 1.4.0; el nuevo trabajo extiende el patrón al resto del dashboard

### Changed

- Las secciones que invocan `useSnapshotCapture` (Dashboard, Resumen, Portafolio, Timeline) ahora separan `allData` (sin filtrar, usado para snapshots) de `data` (filtrado, usado para UI). El filtro PM no contamina los snapshots semanales históricos.
- En `/costos`, los divisores de costo prorrateado de `projectCosts` siguen usando `projects.data` completo aunque el iterador esté filtrado por PM, para no inflar el cost share del PM seleccionado.
- `tsconfig.json` excluye `mcp-server/` del type check del proyecto principal. Es un sub-proyecto con su propio `package.json` y deprecaciones del MCP SDK que no deben afectar el flag de calidad del dashboard. `npx astro check` ahora reporta `0 errors, 0 warnings, 0 hints` (97 archivos vs 123 antes).

## [1.4.1] - 2026-04-24

### Security

- Resueltas las 12 vulnerabilidades reportadas por `npm audit` (6 high + 6 moderate). `npm audit` ahora reporta `0 vulnerabilities`.
- Fix de XSS en `define:vars` de Astro ([GHSA-j687-52p2-xcff](https://github.com/advisories/GHSA-j687-52p2-xcff)) vía upgrade a Astro 6.1.9.
- Fix de path traversal, bypass de `server.fs.deny` y arbitrary file read vía WebSocket en Vite dev server ([GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9), [GHSA-v2wj-q39q-566r](https://github.com/advisories/GHSA-v2wj-q39q-566r), [GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583)) vía Vite 7.3.2 (transitivo de Astro 6.1.9).
- Fix de ReDoS en `path-to-regexp` ([GHSA-9wv6-86v2-598j](https://github.com/advisories/GHSA-9wv6-86v2-598j)) vía `overrides` forzando ^6.3.0 (transitivo de `@vercel/routing-utils`).
- Fix de prototype pollution en `defu` ([GHSA-737v-mqg7-c878](https://github.com/advisories/GHSA-737v-mqg7-c878)) vía `overrides` forzando ^6.1.7 (transitivo de `unstorage` → `h3`).
- Fix de stack overflow en `yaml` ([GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp)) vía `overrides` forzando ^2.8.3 (transitivo de `yaml-language-server`).

### Changed

- `astro` ^6.0.8 → ^6.1.9 (minor, sin breaking changes)
- `@astrojs/vercel` ^10.0.2 → ^10.0.5 (patch)
- `@astrojs/react` ^5.0.1 → ^5.0.4 (patch)
- Nuevo bloque `overrides` en `package.json` para forzar versiones seguras en deps transitivas que se quedaron pinneadas en versiones vulnerables: `path-to-regexp`, `defu`, `yaml`.

### Removed

- `xlsx` — dependencia huérfana con prototype pollution + ReDoS sin fix publicado en npm ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)). Se verificó que no había imports ni uso de su API en todo el código (`src/`). Si en el futuro se requiere exportación a Excel, reinstalar desde el CDN oficial de SheetJS o migrar a `exceljs`.
- Línea "Export: `xlsx` para exportacion de datos" en la sección Architecture de `CLAUDE.md` (estaba desactualizada).

## [1.4.0] - 2026-04-18

### Added

**Nueva página `/pronosticos`**
- Motor de pronóstico determinista (sin ML) en `src/utils/forecastEngine.ts` con 13 métodos documentados:
  1. Fecha de cierre por proyecto (extrapolación lineal de tasa de avance)
  2. Banda optimista–pesimista modulada por CV del throughput semanal
  3. Etiqueta de riesgo (En tiempo / Deslizando / En riesgo / Estancado)
  4. Capacidad por persona (velocity + carga pendiente)
  5. Precisión de estimación (ratio ET / Estimación en tareas App)
  6. Baseline histórico del portafolio (`finEstimado` vs `finReal` en proyectos Done)
  7. Probabilidad de cumplir a tiempo (CDF normal con Z = −slippage/σ)
  8. Cierre por hito (agregación del pronóstico más tardío)
  9. Capacidad del equipo a 4/8/12 semanas (oferta vs demanda prorrateada)
  10. Próximas fechas críticas en ventanas 30/60/90 días
  11. Costo proyectado de desvíos (costoMensual/30 × slippageDays)
  12. Finalización de cursos derivada de snapshots semanales
  13. Backtesting del motor contra proyectos Done
- 6 tabs organizando la vista: Proyectos, Planeación, Dependencias, Personas, Contexto, ¿Cómo funciona?
- Cards tipo ProjectCard (no tablas): `ForecastCard`, `HitoForecastCard`, `PersonCapacityCard`, `CourseForecastCard`, `AnomalyCard`, `DependencyCard`, `SlippageCostCard`, `CapacityHorizonCard`, `BacktestCard`, `SnapshotStatusCard`
- Vista de detalle `/pronosticos/[folio]` con timeline visual, factores del riesgo, escenarios y panel what-if
- Widget `CriticalForecastWidget` en Dashboard (próximas 6 entregas proyectadas, default visible)
- Chip de riesgo + desvío + probabilidad a tiempo en `ProjectCard` (Portafolio)
- Overlay de pronóstico en Timeline/Gantt: ghost bar translúcida entre `finEstimado` y fecha pronóstico + diamond marker clickeable → detalle

**Sistema de snapshots semanales**
- `src/utils/snapshots.ts` — persistencia en localStorage con weekKey ISO, guard de 7 días, retención de 52 semanas
- `useSnapshotCapture()` hook para captura pasiva automática al entrar a cualquier sección principal (Dashboard, Portafolio, Timeline, Resumen, Pronósticos)
- `GET/POST /api/snapshots` — sync con Google Sheets tab `Snapshots` (upsert por weekKey). Crea la tab automáticamente si no existe.
- `GET /api/snapshots/auto-capture` — endpoint server-side para cron job, lee Projects + Cursos del Sheet y escribe snapshot directamente sin depender de visitas
- `vercel.json` con cron semanal `0 9 * * 1` → `/api/snapshots/auto-capture`
- Autenticación opcional vía `CRON_SECRET` env var (Vercel Cron manda `Authorization: Bearer` automáticamente)
- Sync bidireccional: pull remote al montar, push fire-and-forget al capturar, remote gana en conflictos de misma semana

**What-if analysis interactivo en detalle de pronóstico**
- Slider ±30 a ±60 días con atajos (−7, 0, +7, +14, +30)
- Comparación side-by-side: pronóstico actual vs escenario simulado con riesgo, desvío, probabilidad recalculados usando las mismas reglas del motor
- Impacto económico del escenario: delta de costo adicional (positivo rojo, ahorrado verde) cuando el proyecto tiene datos de costo completos

**Detección de datos stale**
- `src/utils/stale.ts` — marca proyectos activos cuyo `progreso` no se ha movido ≥ 1pp en ≥ 14 días contra los snapshots
- Badge "Stale" ámbar en `ProjectCard` y `ForecastCard`
- Factor adicional en la lista de factores del detalle de pronóstico
- Nuevo KPI "Datos stale" en el strip superior de `/pronosticos`

**Detección de anomalías de ritmo**
- `src/utils/anomalies.ts` — compara ritmo reciente vs línea base usando snapshots
- 3 clasificaciones: Detenido (baseline ≥ 0.5 pp/sem y ritmo actual ≈ 0), Desaceleración (≤ 30% del baseline), Aceleración (≥ 200% del baseline)
- Sección nueva en tab Planeación con cards de cada anomalía

**Análisis de dependencias**
- `src/utils/dependencies.ts` — parsea campo `requiereDe` (texto libre) y hace matching best-effort contra otros proyectos por folio o actividad
- Calcula fecha del bloqueador más tardío, inicio efectivo, cascada esperada y estatus de cada bloqueador (resuelto/activo/en riesgo/no identificado)
- Nueva tab "Dependencias" en `/pronosticos` con `DependencyCard` por proyecto dependiente

**Alertas proactivas basadas en pronóstico**
- `src/utils/forecastAlerts.ts` — 6 nuevos tipos: `forecast-at-risk`, `stale-data`, `anomaly-stall`, `anomaly-slowdown`, `blocker-unresolved`, `blocker-at-risk`
- `AlertasSection` combina alertas de `healthScore` con las nuevas, ordenadas por severidad
- Filtros de categoría extendidos en `/alertas`

**Componentes UI reutilizables**
- `Tabs.tsx` — componente de tabs con contadores e iconos
- `ForecastCard.tsx`, `HitoForecastCard.tsx`, `PersonCapacityCard.tsx`, `CourseForecastCard.tsx`, `AnomalyCard.tsx`, `DependencyCard.tsx`, `SlippageCostCard.tsx`, `CapacityHorizonCard.tsx`, `BacktestCard.tsx`, `SnapshotStatusCard.tsx`, `CriticalDatesList.tsx`

### Changed

**Timeline con overlay de pronóstico**
- Toggle "Pronóstico visible" en `/timeline` junto al de "Incluir terminados"
- Cada proyecto muestra ghost bar entre `finEstimado` y fecha pronóstico cuando hay slippage positivo
- Diamond marker clickeable lleva al detalle de pronóstico

**ProjectCard enriquecido**
- Chip de riesgo del pronóstico, desvío en días y probabilidad a tiempo al pie de la card
- Badge "Stale" cuando aplica
- Soporta props opcionales `forecast` y `stale` para integración progresiva

**PronosticoDetailSection**
- Vista de detalle responde al folio de URL y muestra hero con riesgo, confianza, hito y PM
- Factores del pronóstico con iconos por tono (positive/neutral/warn/bad) y explicación de por qué se asignó esa etiqueta
- Timeline visual con lanes anti-colisión para evitar etiquetas encimadas (inicio / hoy / fin estimado / pronóstico + banda)
- Panel de escenarios optimista / más probable / pesimista
- Contexto: velocity del equipo, baseline del portafolio, reglas del riesgo

**Dashboard y DEFAULT_WIDGETS**
- Widget `critical-forecast` agregado como visible por defecto
- Nuevos usuarios (y existentes via merge con config guardada) ven automáticamente "Próximas Fechas Críticas (Pronóstico)"

**ProyectosSection carga tareas y snapshots**
- Consume `/api/tareas` + localStorage snapshots para computar forecast + staleness por proyecto
- Pasa `forecast` y `stale` a cada `ProjectCard` via mapa por folio

### Fixed

- Labels del timeline en detalle de pronóstico ya no se encimaban cuando dos fechas estaban próximas (lane-based positioning + alineación edge-aware)

## [1.3.0] - 2026-04-17

### Added

**Nueva página `/cronograma`**
- Vista unificada de tareas granulares de los productos App y Core (hojas `Copia de app` y `Copia de Core`)
- `GET /api/tareas` — endpoint SSR que unifica ambas hojas en `TareaRecord[]`, filtra filas vacías, convierte Excel serial dates (e.g. 46090 → ISO), cache 5 min
- Tipo discriminador `producto: 'App' | 'Core'` con campos opcionales específicos por hoja (`tiempoET`, `estimacion`, `puntos`)
- 7 KPIs: Total, Completadas, En proceso, Pendientes, Bloqueadas, Puntos totales, Puntos entregados (con %)
- Filtros multi-select: Producto, Funcionalidad, Asignado, Estatus, Tipo + búsqueda por texto
- 5 charts: Distribución por Tipo (donut con colores semánticos), Carga por Persona, Progreso por Funcionalidad (stacked bar), Throughput Semanal (composed — barras + línea de puntos), Precisión de Estimación (solo App)
- Grid de cards paginado (24 por página) con badge de producto, tipo colorizado, puntos, asignado clickable

**Modelo Financiero en Costos**
- `GET /api/costos-modelo` — parsea filas 13-21 de la hoja Costos (costo operativo, valor experiencia, costo admin, margen de beneficio, IVA, TOTAL)
- Normalización automática de factores: si viene formateado como porcentaje (`"40%"` → 40) se divide entre 100
- 2 KPIs nuevos en `/costos`: Precio al cliente/mes y Margen bruto
- Chart waterfall "Composición del Precio al Cliente" mostrando la progresión base → +admin → +margen → +IVA
- Tabla del modelo financiero con valores exactos (nuevo helper `formatMoneyFull()`)
- Cards de proyectos en `/costos` enriquecidas con Precio cliente y Utilidad (verde si positiva, rojo si negativa)
- `applyFinancialModel()` en `costEngine.ts` — aplica la fórmula de pricing a cualquier costo interno

**Campo `fechaInicio` en proyectos**
- `ProjectRecord.fechaInicio` parseado desde la columna "Fecha inicio" del sheet
- Usado en Timeline/Gantt, ProyectoDetailSection, health score y ProjectDetailDrawer (con fallback a `registro` si está vacío)

**Integración de tareas en PersonaDetailSection**
- Nueva sección "Tareas del Cronograma" con mini KPIs (total, completadas, activas, bloqueadas, pts totales, pts entregados)
- Lista ordenada por estatus con badges coloreados
- Link a `/cronograma` completo

**Widget de Cronograma en Dashboard**
- `TareasOverviewWidget` — nuevo widget con resumen de tareas, puntos entregados y split por producto
- Default visible: `true`, merge con config guardada en localStorage

**Utilidades nuevas**
- `nameMatches()` y `devsInclude()` — fuzzy matching bidireccional entre nombres cortos de Projects ("Lore") y nombres completos de Cursos/Cronograma ("Lorena Olvera")
- `getTipoTareaColor()` y `tipoTareaColors` — paleta semántica para los 8 tipos de trabajo (API/SP/App/Web/Web-API/Análisis/SQA/Prototipo)
- `formatMoneyFull()` — formato monetario con 2 decimales y separadores (`$2,337.50`)

### Changed

- `PersonaDetailSection` usa `nameMatches()` en vez de match exacto para filtrar proyectos — resuelve el caso de navegar desde Cursos con nombre completo ("Lorena") y encontrar proyectos asignados a apodo ("Lore")
- `estimatePersonCost()` también usa fuzzy matching
- Alertas ahora muestran nombre del proyecto en vez del folio (más fácil de identificar)
- Gráfica "Progreso por Proyecto" en PersonaDetailSection usa `actividad` en vez de `folio` en el eje Y
- Cards de proyectos en `/costos` ahora redirigen a `/proyecto/{folio}` al hacer click
- Distribución de Costo en PersonaDetailSection: items ahora son links a su proyecto
- `formatMoney` deduplicado — CostosSection ahora importa de `costEngine.ts` en vez de tener su copia local

### Fixed

- Bug de factores en modelo financiero: valores formateados como porcentaje en el sheet (`"40%"`) se mostraban como 4000% y rompían el cálculo del precio al cliente
- Filtros en Cronograma: al cambiar filtros o búsqueda, `DataTable` conservaba estado interno de paginación; ahora se resetea con `key` dinámico

## [1.2.0] - 2026-03-27

### Added

- `/costos` — Nueva pagina de costos con KPIs financieros, graficas de presupuesto vs gasto por proyecto y distribucion por categoria
- `GET /api/costos` — Endpoint SSR que obtiene datos de costos desde `Costos!A1:G50`
- Cost engine (`src/utils/costEngine.ts`) — Logica de calculo de metricas financieras: presupuesto total, gasto acumulado, variacion, burn rate
- Widget de costos en dashboard con resumen financiero del portafolio
- Seccion de costos en detalle de proyecto (`/proyecto/[folio]`) con desglose de presupuesto y gasto
- Seccion de costos en perfil de persona (`/persona/[nombre]`) con resumen de costos de sus proyectos
- Resumen ejecutivo (`/resumen`) integra metricas de costos del portafolio

### Changed

- Sidebar actualizado con enlace a la nueva seccion de costos
- Interface `Proyecto` extendida con campos de costos en `dataTransforms.ts`
- Dashboard config incluye nuevo widget de costos

## [1.1.1] - 2026-03-26

### Added

- Skill de release automatizado para el proceso de lanzamiento (`.claude/skills/release/SKILL.md`)
- Mock de hoja de calculo de proyectos actualizada (`mocks/Project-Navigator-2.xlsx`)

### Changed

- API de proyectos: rango de Sheet actualizado de `Hoja 1` a `Projects` para reflejar el nombre correcto de la hoja
- API de proyectos: columna de numero usa header `#` en vez de `numero` para mapeo mas flexible

## [1.1.0] - 2026-03-26

### Added

**New Pages**
- `/roadmap` — Vista de roadmap organizada por hito y epica, con project cards expandibles y ordenamiento asc/desc por quarter
- `/distribucion` — Distribucion de story points por cliente (donut), arquitecto (stacked bar), epica y cuenta
- `/metricas-dev` — Tabla comparativa de rendimiento de todos los devs con ranking por health score

**Project Detail Enhancements**
- KPI strip rapido: progreso, dias restantes/vencidos, story points, health score
- Timeline visual con barra de progreso, marcador de HOY y estado de vencimiento
- Comparativa vs epica y vs hito (progreso y salud con barras superpuestas)
- Navegacion anterior/siguiente entre proyectos sin volver al portafolio

**Person Profile Enhancements**
- Metricas de rendimiento integradas: radar chart (completacion, progreso, salud, puntualidad, capacidad)
- Health score prominente en header
- KPIs adicionales: puntos entregados y tasa de puntualidad
- Layout reorganizado: estatus donut + radar en columna izquierda, progreso por proyecto en derecha

**New Dashboard Widgets**
- Progreso del Roadmap (barras por hito con done/total y pts)
- Distribucion de Story Points (total/entregados/activos + barras por arquitecto)

### Changed
- Roadmap usa project cards (mismo estilo que portafolio) en vez de filas compactas
- Sidebar reorganizado: eliminada seccion "Metricas DEV" (integrada en perfil de persona)

## [1.0.0] - 2026-03-26

### Added

**Core**
- Astro 6 + React 19 + Tailwind CSS v4 + Vercel adapter (SSR)
- Google Sheets API integration with 5-min in-memory cache
- `useSheetData` hook with automatic retry and abort controller
- Dark/light theme toggle with localStorage persistence

**Pages**
- `/` — Dashboard personalizable con widgets configurables (orden y visibilidad guardados en localStorage)
- `/resumen` — Resumen ejecutivo con score de salud del portafolio, comparativa por hito, top 5 mejor/peor desempenho
- `/alertas` — Centro de alertas automaticas: vencidos, bloqueados, en riesgo, sin avance, acciones pendientes, proximos a vencer
- `/portafolio` — Grid de project cards con filtros dropdown multi-select, busqueda y paginacion
- `/timeline` — Vista Gantt con zoom (5 niveles), scroll horizontal, linea de HOY, health score por fila
- `/equipo` — Directorio del equipo con cards, roles detectados automaticamente, metricas por persona
- `/cursos` — Seguimiento de cursos con KPIs, graficas por O.U., vista por equipos/jefe directo
- `/proyecto/[folio]` — Detalle de proyecto: gauge de progreso, health score calculado, timeline, equipo clickable, acciones pendientes, proyectos relacionados
- `/persona/[nombre]` — Perfil de persona: KPIs, distribucion de estatus, progreso por proyecto, info de curso
- `/404` — Pagina de error con navegacion

**Dashboard Widgets**
- KPIs (total, progreso, riesgo, bloqueados, completados, story points)
- Salud del Portafolio (score 0-100 con distribucion)
- Alertas Recientes (top 5 con link a proyecto)
- Proyectos en Riesgo (top 5 por health score)
- Proximos Vencimientos (proyectos que vencen en los proximos 30 dias)
- Graficas: Estatus donut, Salud donut, Prioridad barras, Progreso por arquitecto, Progreso por hito, Carga por DEV

**Health Score Engine**
- Calculo automatico 0-100 cruzando: estatus, salud, progreso esperado vs real, vencimiento, acciones pendientes, prioridad
- Factores explicativos legibles por humano
- Clasificacion: Excelente, Bueno, Medio, Bajo, Critico

**Alert System**
- Deteccion automatica de 6 tipos de alerta: overdue, blocked, at-risk, low-progress, action-needed, upcoming-deadline
- 3 niveles de severidad: critical, warning, info

**UI Components**
- KPICard, StatusBadge, ProgressBar, FilterDropdowns, ProjectCard
- DataTable generico con sort y paginacion
- DetailDrawer, ProjectDetailDrawer
- DashboardCustomizer (show/hide/reorder widgets)
- Breadcrumbs
- ChartCard wrapper para Recharts
- Sidebar responsive con mobile bottom nav + menu "Mas"

**API Endpoints**
- `GET /api/proyectos` — 23 campos parseados desde Google Sheets
- `GET /api/cursos` — 8 campos parseados desde Google Sheets
