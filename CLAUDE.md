# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Project Navigator — BIT Technologies: Dashboard de gestion de portafolio de proyectos y seguimiento de cursos del equipo. Construido con Astro 6 + React 19 + Tailwind CSS v4, desplegado en Vercel.

## Commands

```bash
npm run dev        # Servidor de desarrollo (localhost:4321)
npm run build      # Build de produccion (genera .vercel/output/)
npm run preview    # Vista previa del build
npx astro check    # Validacion de tipos (TypeScript strict)
npm test           # Corre la suite de pruebas (Vitest, una sola pasada)
npm run test:watch # Vitest en modo watch
```

Requiere Node.js >= 24.0.0.

## Testing

Pruebas con **Vitest** (`vitest.config.ts`, environment `node`).

- **Ubicación:** todos los tests viven en `./tests/` (carpeta dedicada en la raíz), **espejando la estructura de `src/`** — p.ej. `src/utils/costEngine.ts` → `tests/utils/costEngine.test.ts`, `src/lib/permissions/roleDefaults.ts` → `tests/lib/permissions/roleDefaults.test.ts`. El glob de descubrimiento es `tests/**/*.test.ts`. **No** co-locar tests dentro de `src/`.
- **Imports con path aliases:** dentro de los tests (y en código nuevo de app), importar con alias en vez de rutas relativas largas — p.ej. `import { isActive } from '@/utils/projectStatus'`. Aliases declarados en `tsconfig.json` (`compilerOptions.paths`): `@/*` → `src/*`, más `@components/*`, `@layouts/*`, `@pages/*`, `@styles/*`, `@lib/*`.
  - **Cableado (fuente única = `tsconfig.json`):** los aliases se resuelven en **todos lados** vía el plugin **`vite-tsconfig-paths`**, activo en `astro.config.mjs` (`vite.plugins`) **y** en `vitest.config.ts` (`plugins`). Por eso funcionan igual en código de app (`.astro`/`.tsx`), en el build de Astro y en los tests. **Agregar/quitar un alias = editar sólo `tsconfig.json`** (no dupliques mapeos en los configs de Vite/Vitest). Vite por sí solo NO lee los `paths` de tsconfig — el plugin es lo que cierra esa brecha.
  - El código de app **existente** aún usa imports relativos (migrar es opcional, no obligatorio); los aliases ya están disponibles para código nuevo.
- **Qué se prueba (baseline actual):** funciones **puras** de alto valor — resolución de identidad (`equipoMatch`), semántica de estatus (`projectStatus`), costos/pricing (`costEngine`), permisos por rol (`permissions/roleDefaults`), y los predicados de scoping fila-a-fila (`requesterScope`). Las pruebas no tocan Turso/Sheets/red.
- **Convención para nuevos tests:** unitarios de funciones puras → un `.test.ts` espejo en `./tests/`. Tests de integración/E2E (middleware, rutas `/api`, scoping de seguridad) → `tests/integration/` cuando se agreguen (necesitan un harness de DB/runtime; aún no existe).

## Architecture

- **Framework:** Astro 6 con output `server` y adapter `@astrojs/vercel`
- **UI:** React 19 islands (`client:load`) + Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Data source:** Google Sheets API via service account (`googleapis`)

### Data Flow

1. **API Routes** (`src/pages/api/`) — SSR endpoints que autentican con Google Sheets, cachean 5 min en memoria (`let cache` con TTL), parsean filas por header name y retornan JSON
2. **useSheetData hook** (`src/hooks/useSheetData.ts`) — generic fetch hook con retry automatico (1 retry) y abort controller
3. **Sections** (`src/components/sections/`) — unicos componentes que llaman `useSheetData`, calculan KPIs, filtran datos
4. **Charts/UI** — reciben datos por props, sin side-effects

### Key Utilities

- `src/utils/colors.ts` — Colores centralizados (estatus, salud, prioridad, OU, tipo de tarea); usar `.chart` para Recharts. `getTipoTareaColor()` devuelve la paleta semántica por tipo (API/SP/App/Web/Análisis/SQA/Prototipo)
- `src/utils/projectStatus.ts` — **Fuente única de la semántica de estatus de proyecto** (NAV-90). Predicados `isActive()` (reemplaza el patrón duplicado `estatus !== 'Done' && !== 'On Hold'`; ahora excluye también `Cancelado`), `isTerminal()` (Done + Cancelado, usado por el toggle "terminados"), `isCancelled()`, `countsForHealth()` y `ESTATUS_ORDER`. Estatus nuevos: `LaunchPhase` (activo, previo a Hypercare; violeta + icono Rocket) y `Cancelado` (terminal, **no cuenta para la SALUD**; rojo + icono XCircle), también dados de alta en `colors.ts` (`estatusColors`) y `healthStatusVisuals.ts` (`ESTATUS_VISUALS`). Espejo en `mcp-server/src/data/projectStatus.ts`
- `src/utils/dataTransforms.ts` — Interfaces: `ProjectRecord` (incluye `fechaInicio` e `inicioEstimado`), `CursoRecord`, `CostoRecord`, `TareaRecord` (con discriminador `producto: 'App' | 'Core'`, más `inicioEstimado` y `hitoId`), `HitoRecord` (fase con fechas/estatus/avance ligada a un proyecto, hoja `hitos`), `RepoRecord` (repositorio de la hoja `repositorios` con roles de acceso GitHub por persona: administrador/arquitecto/colaborador/visualizador/deploy), `FinancialModel` (modelo de pricing del Excel). Helpers: `countByField`, `groupByField`
- `src/utils/healthScore.ts` — `calcHealthScore()`: score 0-100 cruzando estatus, salud, progreso esperado vs real (usa `fechaInicio || registro`), vencimiento, acciones pendientes, prioridad
- `src/utils/costEngine.ts` — `estimateProjectCost()` y `estimatePersonCost()` (costo prorrateado con fuzzy name matching), `applyFinancialModel()` (aplica pricing del Excel: experiencia → admin → margen → IVA), `formatMoney()` (abreviado `$2.3K`), `formatMoneyFull()` (completo `$2,337.50`)
- `src/utils/slugs.ts` — `folioToSlug`/`slugToFolio`: convierte folios con `/` a URL-safe (`H/PROJECT-34` → `H--PROJECT-34`)
- `src/utils/roleCategory.ts` — `roleCategory()`: mapea el `rol` del registro `equipo` (slug, e.g. `desarrollador-sr`) a una categoría de alto nivel (Tecnología / Management / UX/UI / Servicio / Dirección / Otros), derivada del **rol** no del departamento (unidad de negocio). `roleRango()` devuelve el rango corto (Trainee/Jr/Mid/Sr/Arq) para Tecnología; `CATEGORY_ORDER` fija el orden de presentación. Usado por el directorio del equipo (organigrama, agrupaciones)
- `src/utils/teamTechnology.ts` — Helpers puros (sin BD/red) para la matriz de tecnologías (Plan 015). `LEVEL_ORDER`/`LEVEL_LABEL` (Trainee→Arq), `compareLevel()`, `peopleForTech()` (personas con una tech, orden desc por nivel), `techsForPerson()` (techs de una persona), `projectsForTech()` (proyectos activos inferidos: une pmIds/arquitectoIds/devIds contra la matriz), `groupByCategory()`. Unit-testado en `tests/utils/teamTechnology.test.ts`
- `src/utils/theme.tsx` — Toggle dark/light theme
- `src/utils/recharts.ts` — Helpers para configuracion de Recharts
- `src/utils/forecastEngine.ts` — Motor de pronóstico determinista. `forecastProjects()`, `forecastProject()`, `computeTeamVelocity()`, `computeEstimationBias()`, `computePortfolioBaseline()`, `computePersonCapacity()`, `aggregateByHito()`, `computeCapacityProjection()`, `computeCriticalDates()`, `computeSlippageCostImpact()`. Expone `riskMeta()`, `confidenceMeta()`, `probabilityMeta()`, `capacityStatusMeta()` para styling consistente
- `src/utils/snapshots.ts` — Persistencia semanal en localStorage (`pn-weekly-snapshots`) + sync con Google Sheets. `captureSnapshot()` con guard de 7 días, `syncSnapshots()`, `loadSnapshots()`, `pushRemoteSnapshot()`, `fetchRemoteSnapshots()`, `snapshotStats()`
- `src/utils/backtest.ts` — `runBacktest()`: compara predicciones del motor contra `finReal` en proyectos Done, reporta MAE, sesgo, % dentro de ±7d/±14d
- `src/utils/stale.ts` — `computeStaleness()`: marca proyectos cuyo `progreso` no se mueve en ≥ 14 días vs snapshots
- `src/utils/anomalies.ts` — `detectAnomalies()`: compara ritmo reciente vs baseline para clasificar slowdown/stall/acceleration
- `src/utils/dependencies.ts` — `analyzeDependencies()`: parsea `requiereDe` con splitter multi-separador y matching best-effort por folio/actividad, calcula cascada de bloqueadores
- `src/utils/forecastAlerts.ts` — `generateForecastAlerts()`: agrega alertas de riesgo, stale, anomalías y bloqueadores al sistema de `/alertas`
- `src/utils/courseForecast.ts` — `computeCourseForecasts()`: proyecta finalización de cursos usando ritmo derivado de snapshots (cursos no tienen fechas en el Sheet)

### Hooks

- `src/hooks/useSheetData.ts` — Generic fetch hook con retry y abort controller
- `src/hooks/useDashboardConfig.ts` — Persistencia de layout de dashboard en localStorage (`pn-dashboard-config`)
- `src/hooks/useSnapshotCapture.ts` — Hook de captura pasiva: sync con remote + capture con guard de 7 días. Dropear en cualquier sección con `data` de proyectos para que contribuya al histórico
- `src/hooks/usePersistedFilters.ts` — Persistencia per-user de estado de sección (filtros + toggles) server-side via `/api/user-preferences`. Firma: `usePersistedFilters<T>(sectionKey, defaults)` → `{ state, setState, clear, hydrated }`. Hidrata síncronamente desde `localStorage['pn-prefs-<sectionKey>']` (anti-flash) y luego refetch del server en mount. Writes con debounce 500ms + AbortController para cancelar PUTs en vuelo. `clear()` resetea a defaults + DELETE remoto + borra cache local

### Resolución de identidad (IMPORTANTE) — reemplazó a `nameMatches()`

Los nombres de personas tienen dos formatos entre fuentes:
- **Projects sheet**: apodos cortos ("Lore", "Ale", "Dave", "Rafa")
- **Cursos y Cronograma (app/Core) sheets**: nombres completos ("Lorena Raquel Olvera Rodriguez", "Edgar Torres")

El frágil `nameMatches()` fuzzy bidireccional **ya NO existe**. La identidad se resuelve UNA vez contra el registro canónico `equipo` (tabla Turso) → `equipo.id` estable:

- **`src/lib/equipoMatch.ts`** — matcher PURO client-safe (sin Turso). `resolveId(name, members)` con prioridad: (1) `ALIAS` curado (`yorch→jenriquez`, `eduardo→emontano`, `alejandro→avazquez`) → (2) nickname exacto único → (3) full_name exacto único → (4) fuzzy por token, sólo si el match es **único** (ambiguo → `null`, mejor no resolver que resolver mal). Única fuente de la lógica de match.
- **`src/lib/equipoResolver.ts`** — resolver server: carga `equipo` de Turso (cache TTL 5 min + `invalidateEquipoCache()`) y delega en `equipoMatch`.
- Los endpoints `/api/proyectos|tareas|cursos` **enriquecen** sus respuestas con ids resueltos (`pmId`, `arquitectoId`, `devIds[]`, `asignadoId`, `equipoId`) — los strings originales se conservan (aditivo). Los consumidores (EquipoSection, PersonaDetailSection, `estimatePersonCost`) filtran/cruzan por **id**, no por nombre.

Para resolver un nombre/apodo en cliente: `fetch('/api/equipo')` → `resolveId(nombre, buildMembers(equipo))`. Apodos nuevos no resueltos o ambiguos se agregan al `ALIAS` curado en `equipoMatch.ts`.

## Pages

| Ruta | Section component | Descripcion |
|---|---|---|
| `/` | DashboardSection | Dashboard personalizable con widgets (config en localStorage `pn-dashboard-config`) |
| `/resumen` | ResumenSection | Resumen ejecutivo con health score |
| `/alertas` | AlertasSection | Centro de alertas automaticas (12 tipos, 3 severidades) — combina health score + pronóstico + anomalías + dependencias |
| `/portafolio` | ProyectosSection | Grid de proyectos con filtros + chip de riesgo de pronóstico + badge stale |
| `/roadmap` | RoadmapSection | Roadmap por hito y epica |
| `/timeline` | TimelineSection | Vista Gantt con zoom + overlay de fecha pronóstico (ghost bar y diamond marker) |
| `/cronograma` | CronogramaSection | Cards de tareas granulares (App + Core) con KPIs, filtros, throughput semanal y precisión de estimación |
| `/pronosticos` | PronosticosSection | Motor de pronóstico con 6 tabs (Proyectos / Planeación / Dependencias / Personas / Contexto / Metodología), 13 métodos documentados |
| `/pronosticos/[id]` | PronosticoDetailSection | Detalle de pronóstico por proyecto con timeline, factores, escenarios, panel what-if interactivo (incluye costo) |
| `/distribucion` | DistribucionPuntosSection | Distribucion de story points |
| `/equipo` | EquipoSection | Directorio del equipo desde el registro canónico `equipo` (Turso, vía `GET /api/equipo`); enriquece proyectos/progreso/puntos por `equipo.id`. KPIs: Total / Activos / Con acceso. **Vista por tabs** (`src/components/sections/equipo/`): **Organigrama** (jerarquía por `manager_id`, búsqueda, foco en subárbol, huérfanos), **Heatmap de capacidad** (velocity 8 semanas vs carga, estatus under/fit/tight/over/critical), **Comparativa** (radar de hasta 3 miembros, métricas duras), **Costos del equipo** (total/absorbido/idle por persona y rol), **Tecnologías** (matriz persona × tecnología con niveles Trainee→Arq + vista "por tecnología" con proyectos activos inferidos; visible a todos los roles; vacía hasta que el mantenedor pueble `equipo_technology` en la BD — Plan 015). Con `action:equipo:manage`: botón "Agregar miembro" + lápiz por card → modal `EquipoEditModal` (`POST/PUT /api/admin/equipo`). Tabs sensibles (`equipo-capacity-heatmap`, `equipo-comparativa`) negadas por defecto a `dev`/`ventas`; la pestaña Tecnologías es default-ALLOW para todos los roles. Nota: la pestaña "Comparativa" aquí usa **métricas duras del Sheet**; la comparativa de autoevaluación subjetiva vive en `/comparativa` |
| `/comparativa` | ComparativaSection | Vista cross-persona de autoevaluaciones trimestrales (HU NAV-78, **admin-only por default**). Gateada por `page:comparativa` + `action:evaluacion:view-all`. Tres bloques: **Ranking** (chips con avatar + calificación promedio, sorted desc, click para añadir al radar), **Radar comparativo** (overlay de hasta 3 personas, 7 ejes), **Tabla por persona** (sortable, 7 dimensiones + calificación + histórico). Filtro por categoría de rol (`roleCategory`) resuelve "PM vs PM, DEV vs DEV". Selector de período `YYYY-Qn`. **Modo A** de privacidad: las evaluaciones las gestiona **sólo** un admin aquí — el colaborador ya **no** ve ni captura su propia evaluación en `/cuenta` (el bloque "Mi evaluación" y el endpoint propio fueron desactivados). Lee de Turso `evaluacion` vía `GET /api/evaluaciones`. Con `action:evaluacion:manage` (admin por default): columna "Acción" por fila con **Editar** (si hay captura en ese período) o **Capturar** (si falta) — abre `EvaluacionEditModal` (`src/components/sections/comparativa/`) que persiste vía `POST/DELETE /api/admin/evaluaciones`. Helpers compartidos en [src/utils/evaluacion.ts](src/utils/evaluacion.ts) |
| `/cursos` | CursosSection | Seguimiento de cursos |
| `/costos` | CostosSection | Analisis de costos del portafolio + modelo financiero de pricing |
| `/novedades` | NovedadesSection | Historial de releases parseado de `CHANGELOG.md` (accordion con secciones Added/Changed/Fixed) |
| `/glosario` | GlosarioSection | Documentación in-product de cada bloque visible del tablero (149 entradas, 17 secciones). Ver sección "Glosario y Tooltips" abajo |
| `/metricas-dev` | MetricasDevSection | Tabla comparativa de rendimiento de devs (no linkado en sidebar por diseño, ver CHANGELOG v1.1.0) |
| `/cs360` | Cs360App (`src/components/sections/cs360/`) | **App standalone** "Neural Intelligence 360" (réplica de `mocks/healt-score/Neural360.html`): tablero de Customer Success con health score por cliente. NO usa `Layout.astro` (página propia con tema claro, `client:only="react"`); desde el sidebar se abre en **pestaña nueva** (`newTab: true`). Al no tener `UserMenu`, una `SessionUserCard` al pie del directorio muestra al usuario en sesión (link a `/cuenta` + cerrar sesión). Directorio con sidebar colapsable (localStorage `pn-cs360-sidebar-collapsed`) y 9 ordenamientos (score asc/desc, nombre A-Z/Z-A, ranking, renovación, alumnos, tickets, actividad; nulls-last). Gateada por `page:cs360` (**admin-only por default**, como `comparativa`). Vistas: dashboard global de cartera (KPIs + distribución de score + estatus) y detalle de cliente con 5 tabs (Resumen 360 con IA/heatmap/líderes/uso/charts/desglose de tickets, Actividades, Tickets con "Resultados por página" (default 50, opción Todos; persiste en localStorage `pn-cs360-tickets-page-size`), Llamadas, Guías/Auditoría con HTML Magnum). Score: `calculateBaseScore()` en [src/utils/cs360.ts](src/utils/cs360.ts) (réplica fiel de la fórmula del mock: base 100, tickets abiertos/críticos tope -30, actividad 3 meses, renovación, alumnos=0, sentimiento; genera log para el modal de desglose); la IA puede sobrescribir el score (persistido en localStorage `pn-cs360-ai-store`). El HTML del back (descripciones/comentarios/contenido/Magnum) se renderiza confiable vía `dangerouslySetInnerHTML` — sanitización diferida a futuro (decisión explícita) |
| `/proyecto/[id]` | ProyectoDetailSection | Detalle de proyecto (id estable de `ProjectRecord`). Vista por tabs (Resumen / Detalle / Pronóstico / Cronograma / Relacionados) en `src/components/sections/proyecto-detalle/`; incluye Gantt + Burndown y esfuerzo asignado vs invertido |
| `/tarea/[id]` | TareaDetailSection | Detalle de tarea granular (App + Core). Usa el ID sintético generado en `/api/tareas` (hash de folio+actividad+asignado). Hereda permiso `page:cronograma` |
| `/persona/[id]` | PersonaDetailSection | Perfil de persona (HU NAV-78.2: ruta basada en `equipo.id`, e.g. `/persona/emontano`). El param se resuelve con dos vías en este orden: (1) match exacto por `equipo.id`, (2) fallback a `equipoMatch.resolveId(idOrName, members)` — esto preserva links viejos del formato `/persona/Lore` o `/persona/Eduardo%20Monta%C3%B1o`. **Vista por tabs** (`src/components/sections/persona-detalle/`): **Resumen** (KPIs + distribución por estatus), **Proyectos** (participación + costo prorrateado), **Cronograma** (Gantt + Burndown personales, charts `PersonGantt`/`PersonBurndown`), **Accesos** (repos GitHub con rol de acceso vía `/api/repositorios` + curso asignado), **Tecnologías** (Plan 016: perfil de skills de la persona desde `equipo_technology` vía `/api/team-technologies?equipo=<id>` + catálogo `/api/technologies`; techs agrupadas por categoría con chip de nivel Trainee→Arq, lectura para cualquiera con `page:equipo`. Con `action:tecnologia:manage` —admin por default— botón "Agregar tecnología" + lápiz por chip → `TecnologiaEditModal` que persiste vía `POST/DELETE /api/admin/team-technologies`; **la edición de la matriz vive SÓLO aquí**, no en el tab agregado de `/equipo`). Los callsites internos usan `equipo.id` cuando lo tienen disponible; sólo `PersonCapacityCard`/`CourseForecastCard` siguen pasando nombre porque el agregado de pronóstico no lo expone, y se apoyan en el fallback del resolver |
| `/cuenta` | CuentaSection | Configuración de cuenta: perfil + cambio de contraseña (oculto para users sólo-Google) + sesiones activas (revocar individual o todas las demás) + tokens MCP + preferencias (limpiar todos los filtros guardados, reset del layout del dashboard). Accesible desde el `UserMenu` del sidebar. Foto de perfil con subir/quitar (Amazon S3, ver `CuentaSection.tsx:ProfileBlock`). **Nota (HU NAV-78):** el colaborador ya **no** ve ni captura su propia evaluación trimestral desde aquí (el bloque "Mi evaluación" fue retirado); las evaluaciones las gestiona sólo un admin en `/comparativa` |
| `/admin` | AdminSection | Módulo de administración (sólo rol `admin`, gateado por `page:admin`). Grid de **cards** de usuario (avatar, rol, estado + motivo de baneo) + alta de usuario. Cada card enlaza a `/admin/[id]`. Item de sidebar visible sólo para admins |
| `/admin/[id]` | AdminUserSection | Ficha de usuario estilo `/cuenta`. Layout: **Perfil (incluye Rol) ‖ Estado de la cuenta** lado a lado; luego Sesiones; luego Permisos (ancho completo). El Perfil incluye subir/quitar la foto del usuario objetivo (Amazon S3 vía `/api/admin/avatar`). Estado: ban/unban con **motivo** `banReason` + expiración opcional. Sesiones: cerrar individual/todas con **modal de confirmación** (`ConfirmModal`). Permisos: **acordeón por página** (cabecera = toggle de la página; al expandir, sus bloques/datos; + "Acciones generales" para `snapshot:create`). Cada control tri-estado muestra un pill **"rol: Permitido/Denegado"** (vía `roleCan` client-safe) y el botón "Hereda" se anota ✓/✗ para que el admin sepa a qué resuelve la herencia. Candados anti-bloqueo: no editas tu propio rol/permisos/baneo; no se degrada al último admin |

## API Endpoints

| Endpoint | Rango Sheet | Descripcion |
|---|---|---|
| `GET /api/proyectos` | `Projects!A1:W200` | Portafolio de proyectos (24 campos, incluye `fechaInicio`) |
| `GET /api/costos` | `Costos!A1:G50` | Costos y presupuestos por rol (filas 1-12, filtra por `rol` no vacío) |
| `GET /api/costos-modelo` | `Costos!A1:G50` | Modelo financiero de pricing (filas 13-21): retorna `[FinancialModel]` con steps, rates y total. Normaliza factores automáticamente si vienen formateados como porcentaje |
| `GET /api/cursos` | `Cursos!A1:H50` | Progreso de cursos del equipo |
| `GET /api/tareas` | `app!A1:K1100` + `Core!A1:J200` | Unifica tareas granulares de App + Core en `TareaRecord[]`. Filtra filas vacías, convierte Excel serial dates (e.g. 46090 → ISO), mapea `Estimacion` (App) y `pts` (Core) a campo unificado `puntos`. Incluye `inicioEstimado` y `hitoId` |
| `GET /api/hitos` | `hitos!...` | Hitos (fases con fechas/estatus/avance propios) por proyecto en `HitoRecord[]`. Role-open a cualquier autenticado, cache 5 min. Liga con proyectos vía `id_proyecto → ProjectRecord.id` y con actividades vía `HitoRecord.id ← TareaRecord.hitoId` |
| `GET /api/repositorios` | `repositorios!A1:K60` | Repositorios con roles de acceso GitHub por persona en `RepoRecord[]` (administrador/arquitecto/colaborador/visualizador/deploy, cada uno con nombres display concatenados). Role-open a cualquier autenticado, cache 5 min. Gateado en middleware por `page:equipo` (sólo lo consume el tab Accesos de `/persona/[id]`). El match por persona se hace en cliente |
| `GET /api/snapshots` | `Snapshots!A2:E10000` | Lee histórico de snapshots semanales desde el Sheet (requiere tab `Snapshots` con columnas: weekKey, capturedAt, kind, identifier, payload JSON). Retorna `WeeklySnapshot[]` agrupados por weekKey |
| `POST /api/snapshots` | `Snapshots!A1:E1` | Escribe un `WeeklySnapshot` al Sheet. Upsert por `weekKey` (limpia filas existentes de esa semana antes de insertar). Crea la tab automáticamente si no existe. Requiere permiso Editor del service account |
| `GET /api/snapshots/auto-capture` | Projects + Cursos + Snapshots | Endpoint server-side para cron semanal (lunes 09:00 UTC). Configurado como Vercel Cron en `vercel.json`. Lee Projects y Cursos del Sheet, construye snapshot de la semana actual y lo upserta. Autenticación opcional vía env `CRON_SECRET` (Vercel Cron envía `Authorization: Bearer <CRON_SECRET>` automáticamente) |
| `GET/PUT/DELETE /api/user-preferences` | Turso (`user_preferences`) | Persistencia per-user de filtros/toggles por sección (server-side, cross-device). GET retorna `{ [sectionKey]: value }` con todas las prefs del usuario. PUT body `{ sectionKey, value }` upsert por `(userId, sectionKey)`. DELETE con `?section=<key>` borra una; sin query borra todas (usado por "Limpiar todos" en `/cuenta`). Scope per-user via `Astro.locals.user.id`. Validación: `sectionKey` matchea `/^[a-z0-9-]{1,64}$/`, `value` debe ser objeto plano, body cap 10KB |
| `POST/DELETE /api/me/avatar` | Amazon S3 + Turso (read) | Foto del usuario autenticado. POST: multipart `file` → valida firma binaria (PNG/JPG/WebP) + tamaño (máx 2MB), borra el objeto anterior si vivía en S3, sube el nuevo y retorna `{ url }`. DELETE: borra el objeto actual. El cliente persiste `user.image` vía `authClient.updateUser({ image })`. No escribe la tabla `user`. Helper compartido en [src/lib/avatarBlob.ts](src/lib/avatarBlob.ts) |
| `POST/DELETE /api/admin/avatar` | Amazon S3 + Turso (read) | Igual que `/api/me/avatar` pero para otro usuario (`userId` en el FormData / query). Gateado por `action:user:manage` (middleware + `can()` defensivo). El cliente persiste vía `authClient.admin.updateUser({ userId, data: { image } })` |
| `GET /api/equipo` | Turso (`equipo` + `roles`) | Registro canónico del equipo. **Role-open a cualquier autenticado** (como `/api/proyectos`), sin cache. Retorna `{ equipo: EquipoRecord[], roles: [{id,name}] }` con `roleName`, `managerName`, `active`, `hasLogin` (join con `user.equipoId`) y `tag` (nombre display "First Last" para cruzar con fuentes externas como `repositorios`; cae a match por tokens del `full_name` si está vacío) |
| `POST/PUT /api/admin/equipo` | Turso (`equipo`) | Gestión del registro. Gateado por **`action:equipo:manage`** (middleware exime `/api/admin/equipo` del gate genérico `user:manage`; + `can()` defensivo). POST crea (`id` derivado del local-part del email, único con sufijo); PUT edita. Valida `role_id`∈`roles`, `manager_id` existe y **anti-ciclo** en la jerarquía. Llama `invalidateEquipoCache()`. Errores en español |
| `GET /api/technologies` | Turso (`technology`) | Catálogo de tecnologías activas (Plan 015). Role-open a cualquier autenticado; gateado bajo `page:equipo` en el middleware. Retorna `{ technologies: Technology[] }` ordenadas por `category, name`. Sin cache (catálogo pequeño ~49 filas). La tabla se puebla con la migración `2026-tecnologias.sql` |
| `GET /api/team-technologies` | Turso (`equipo_technology`) | Matriz persona × tecnología (Plan 015). Role-open; gateado bajo `page:equipo`. Filtros opcionales: `?technology=<id>`, `?level=<level>`, `?equipo=<id>`. Sin row-scoping (la matriz no es dato sensible cruzado). Retorna `{ rows: TeamTechnology[] }`. Vacía hasta que el mantenedor la pueble en BD |
| `POST/DELETE /api/admin/team-technologies` | Turso (`equipo_technology`) | Edición de la matriz de tecnologías por persona (Plan 016, Fase 2). **Gateado por `action:tecnologia:manage`** en middleware (admin-only por default, statement propio separado de `user:manage`). **POST** body `{ equipoId, technologyId, level }` upsert por `(equipo_id, technology_id)` (set `updated_at` ISO); valida `level∈trainee\|jr\|mid\|sr\|arq` y verifica que `equipoId`+`technologyId` existan. **DELETE** `?equipoId=&technologyId=` borra la fila. SQL parametrizado; NO crea tablas (sólo escribe `equipo_technology`). Consumido por `TecnologiaEditModal` en el tab Tecnologías de `/persona/[id]` |
| `GET/POST/DELETE /api/me/mcp-tokens` | Turso (`mcp_token`) | Tokens bearer largos para el servidor MCP del usuario. **GET** lista metadata (jamás el plaintext). **POST** body `{ name, expiresInDays: 30\|90\|180\|365 }` crea uno y devuelve el plaintext UNA sola vez (`pn_mcp_*`); el token nunca vuelve a ser legible. **DELETE** `?prefix=pn_mcp_xxxxxxx` revoca. Anti-chain: si el caller se autentica con un token MCP, el POST devuelve 403 (un MCP no puede emitir otros tokens). Plaintext se hashea sha256 antes de guardar |
| `GET/POST /api/me/evaluaciones` | — | **DESACTIVADO (HU NAV-78).** La autoevaluación propia fue retirada: el colaborador ya no ve ni captura su evaluación. Ambos métodos responden **403 `EVALUACION_DISABLED`** (cierra la vía propia tanto en browser como por MCP). Las evaluaciones se gestionan sólo por un admin vía `GET /api/evaluaciones` (lectura) y `POST/DELETE /api/admin/evaluaciones` (escritura), consumidos por `/comparativa` |
| `GET /api/evaluaciones` | Turso (`evaluacion`) | Lectura cross-persona de todas las evaluaciones (HU NAV-78). **Gateado por `action:evaluacion:view-all`** en middleware (sólo `admin` por default; override-able). Retorna `{ evaluaciones: EvaluacionRow[] }` ordenadas por `periodo desc, equipo_id asc`. Consumido únicamente por `/comparativa` |
| `POST/DELETE /api/admin/evaluaciones` | Turso (`evaluacion`) | Edición/borrado cross-persona de evaluaciones (HU NAV-78). **Gateado por `action:evaluacion:manage`** en middleware (sólo `admin` por default; statement propio, separado de `user:manage`). **POST** body `{ equipoId, periodo, 7 dimensiones, notas? }` upsert por `(equipo_id, periodo)`; verifica que el `equipoId` exista. **DELETE** `?equipoId=&periodo=` borra la fila. Consumido por `EvaluacionEditModal` en `/comparativa` |
| `GET /api/cs360/clientes` | Export real de Samva (URL pública/disco) o `src/data/cs360-clientes.json` (fallback) | **Lista ligera** de la cartera CS (`CsClienteResumen[]`, ~311KB para 461 clientes) con el Health Score **precalculado server-side** (`calculateBaseScore` sobre datos completos; el desglose del modal viaja en `score.log`). Fuente vía [src/lib/cs360Data.ts](src/lib/cs360Data.ts), cadena **URL remota → S3 propio → archivo local → mock curado**: (1) si `CS360_DATA_URL` está set descarga el export publicado por Samva (static.samva.io, S3+CloudFront público, ~46MB sin comprimir, mismo shape que el export local — verificado byte a byte; el path trae un GUID que puede cambiar al regenerarse el export, por eso es env var) — **fuente de producción preferida**; (2) si `CS360_S3_BUCKET` está set descarga el export gzippeado del S3 propio (key `CS360_S3_KEY`, default `cs360/contratos_exportados.json.gz`; se sube con `npm run cs360:upload`, que valida+comprime ~44MB→~4MB; credenciales por el rol de Amplify, igual que avatares); (3) archivo local `CS360_DATA_FILE` o `mocks/healt-score/contratos_exportados.json` (**gitignored** — 44MB con datos reales y el script de extracción trae credenciales) — fuente de dev; (4) mock curado. Todo se adapta con [src/lib/cs360Adapter.ts](src/lib/cs360Adapter.ts) y cachea 5 min. Header `X-CS360-Source: url\|s3\|export\|mock`. El adaptador normaliza: fechas `DD/MM/YYYY`→ISO, centinelas `"- - - - - -"`→null, `estado_nombre`→`estatus`, conserva `fecha_termino` (null = ticket abierto, señal canónica), repara URLs de `grabacion` con doble prefijo, dedupe de ids (el export trae 2 duplicados), descarta campos de UI (`*_color`, `dMinutos*`). Gateado por prefijo `/api/cs360/` → `page:cs360` (admin-only por default) |
| `GET /api/cs360/clientes/[id]` | misma fuente | **Detalle completo** de un cliente (`CsCliente`: tickets/actividades/llamadas con HTML, hasta ~1.8MB el más pesado). La UI lo pide on-demand al seleccionar en el directorio. 404 si el id no existe. Mismo gate `page:cs360` |
| `POST /api/cs360/analyze` | Nexus `ai.bit.lat` (proxy asíncrono) + Turso (`nexus_request`) | Insights de IA del tablero CS 360 (NAV-85, reemplazó al proxy síncrono de OpenAI). Body `{ focus, customQuestion?, cliente }` → **202** `{ requestId, status: 'pending' }`. El prompt (prefix/suffix contexts, regla anti-prompt-injection y JSON Schema de respuesta) vive en el **template de Nexus** (`01KTYKWS28RDRZEVQ1JPM6TWBE`, administrado en su panel); aquí sólo se mandan `parameters` (`focus_instruction` construido server-side desde el mapa de 4 enfoques o la pregunta libre + `cliente_json`). Cliente HTTP en [src/lib/nexus.ts](src/lib/nexus.ts) (`client: 'samva'`, `tenant_id: 1` = metadata de quién llama). Bearer en env `AI_BEARER_TOKEN`; sin token → 503 `AI_NOT_CONFIGURED` (el tablero degrada limpio). Mismo gate `page:cs360` |
| `GET /api/cs360/analyze/[requestId]` | Turso (`nexus_request`) + webhook firmado de Nexus | Polling del análisis (el front consulta cada 3s con timeout de 2 min; en la práctica está listo en ~5s). Si la fila ya está `completed` responde desde la BD sin tocar Nexus (cache permanente); si está `pending` consulta la webhook URL firmada y al completar valida el shape, clampea el score 0-100 y persiste `response_data` + **`cost` (tokens) + `model`**. Retorna `{ requestId, status, data?: { recalculated_score, markdown_report }, cost?, model? }`. Migración: [2026-nexus-requests.sql](src/db/migrations/2026-nexus-requests.sql). Mismo gate `page:cs360` |
| `GET /api/glossary` | `src/data/glossary.ts` (estático, en repo) | Glosario filtrado por permisos del usuario (mismas reglas que `/glosario`: sección visible si su page-key está allowed, entrada visible si su sección lo es y `block:<id>` no está denegado). Gateado por **`page:glosario`** en el middleware. Retorna `{ sections, entries }` ya recortados. La lógica de filtrado vive en [src/lib/glossaryFilter.ts](src/lib/glossaryFilter.ts) — fuente única usada por la página y por el endpoint |

Los endpoints de Sheets en modo lectura cachean 5 min. Los endpoints de `snapshots` no cachean (escriben y leen estado mutable). Todos los Sheets usan service account + parseo por header (case-insensitive). `/api/user-preferences` usa Turso directamente (sin cache, sin service account) — ver [src/db/client.ts](src/db/client.ts).

## Environment Variables

| Variable | Descripcion |
|---|---|
| `GOOGLE_CREDENTIALS` | JSON completo de la service account de Google |
| `SHEET_ID` | ID del Google Spreadsheet |
| `TURSO_DATABASE_URL` | URL libsql de la BD Turso (auth) |
| `TURSO_AUTH_TOKEN` | Token de la BD Turso |
| `BETTER_AUTH_SECRET` | Secreto de firma de cookies/sesiones (32+ bytes random) |
| `BETTER_AUTH_URL` | URL canónica del deployment (e.g. `http://localhost:4321` o el dominio prod) |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth client ID de Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `ALLOWED_GOOGLE_DOMAIN` | Opcional. Si está set, restringe creación de usuarios al dominio (e.g. `bit.lat`) |
| `CRON_SECRET` | Bearer token que Vercel Cron envía automáticamente para bypass del auth en `/api/snapshots/auto-capture` |
| `AVATAR_S3_BUCKET` | Bucket S3 para fotos de perfil. Requerido para subir/borrar avatares. Credenciales AWS vía la cadena por defecto del SDK (env vars en Vercel; `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` en local) |
| `AWS_REGION` | Opcional. Región del bucket de avatares (default `us-east-1`) |
| `AVATAR_CDN_URL` | Opcional. Dominio CDN (CloudFront) frente al bucket. Si se omite, se usa la URL pública directa del bucket |
| `AI_BEARER_TOKEN` | Bearer token del servicio de IA Nexus (`ai.bit.lat`) para los insights del tablero CS 360 (NAV-85). Si falta, `POST /api/cs360/analyze` responde 503 y el tablero funciona sin IA. El prompt y el modelo se administran en el panel de Nexus (no hay env de modelo) |
| `CS360_DATA_URL` | URL pública del export del tablero CS 360 publicado por Samva (static.samva.io; el path trae un GUID que puede cambiar al regenerarse el export). **Fuente de producción preferida**; si falla o falta, se prueba el S3 propio |
| `CS360_S3_BUCKET` | Bucket S3 privado con el export real del tablero CS 360 (fallback de producción). Se sube con `npm run cs360:upload`. Si falta, se prueba el archivo local y luego el mock |
| `CS360_S3_KEY` | Opcional. Key del objeto del export en S3 (default `cs360/contratos_exportados.json.gz`) |
| `CS360_DATA_FILE` | Opcional. Ruta al export real local para dev. Default: `mocks/healt-score/contratos_exportados.json` (gitignored). Si no existe, el tablero cae al mock curado de `src/data/` |

## Authentication

Auth implementado con **Better-Auth + Turso (libSQL)**. Decisiones clave:

- **Multi-user, sin self-signup**: el endpoint público de signup de Better-Auth está deshabilitado (`disableSignUp: true` en email/password y en social Google). Solo el admin crea usuarios.
- **Métodos**: email + password y Google OAuth (ambos en `/login`).
- **Account linking (Google ↔ usuario creado por admin)**: configurado en [src/lib/auth.ts](src/lib/auth.ts) (`account.accountLinking`: `enabled`, `trustedProviders: ['google']`, **`requireLocalEmailVerified: false`**). **Por qué es necesario**: el admin crea usuarios con sólo cuenta `credential` y `emailVerified: false` (ese campo es `input: false` en Better-Auth → siempre nace `false`, no se puede setear en el body de `createUser`). Por default Better-Auth se niega a vincular implícitamente una cuenta de Google a un usuario cuyo email local no está verificado (`requireLocalEmailVerified` default `true`), devolviendo `"account not linked"` en [link-account.mjs](node_modules/better-auth/dist/oauth2/link-account.mjs) → **el login con Google fallaba aunque el email coincidiera** (el de password sí funcionaba porque va directo contra la cuenta `credential`). Con la config, en el primer login con Google se vincula la cuenta y se marca `emailVerified: true` automáticamente. **Seguro en este setup**: `disableSignUp` + `ALLOWED_GOOGLE_DOMAIN` impiden que alguien pre-registre el email de otra persona, así que bajar `requireLocalEmailVerified` no abre vector de account-takeover. Nota: `disableSignUp` en Google **no** era la causa (sólo aplica cuando NO existe un usuario con ese email; entrar con Google usando un email distinto al registrado sí da "signup disabled", lo cual es intencional).
- **Enforcement único**: [src/middleware.ts](src/middleware.ts) protege todas las rutas. Solo `/login`, `/api/auth/*`, los assets estáticos y la cron de snapshots (con bearer `CRON_SECRET`) son públicos.
- **Sesión en `Astro.locals`**: middleware popula `Astro.locals.user` y `Astro.locals.session` (tipados en [src/env.d.ts](src/env.d.ts)). Las páginas pueden leer en frontmatter; React islands consultan vía `authClient.useSession()`.
- **API routes**: el middleware retorna 401 JSON automáticamente si no hay sesión, así que cualquier endpoint nuevo en `/api/*` queda protegido por default. `useSheetData` ([src/hooks/useSheetData.ts](src/hooks/useSheetData.ts)) detecta 401 y redirige a `/login`.
- **Account settings (`/cuenta`)**: implementado en [src/components/sections/CuentaSection.tsx](src/components/sections/CuentaSection.tsx). Cinco bloques: Perfil (edita `name` via `authClient.updateUser`; foto de perfil con subir/quitar: resize client-side en canvas → `POST/DELETE /api/me/avatar` → Amazon S3 → `authClient.updateUser({ image })`), Seguridad (`authClient.changePassword` con `revokeOtherSessions` opt-in; el bloque se oculta si `authClient.listAccounts()` no encuentra una cuenta `providerId: 'credential'`, e.g. users sólo-Google), Sesiones activas (`authClient.listSessions` → render con `userAgent` parseado, `authClient.revokeSession({ token })` por fila excepto la actual, `authClient.revokeOtherSessions()` para bulk), **Tokens MCP** (bloque `McpTokensBlock`: lista tokens vía `GET /api/me/mcp-tokens`, crea con nombre + caducidad 30/90/180/365d, muestra plaintext una vez tras el POST, revoca por `tokenPrefix`), Preferencias (`DELETE /api/user-preferences` sin `?section=` + barre `localStorage['pn-prefs-*']`; reset de dashboard borra `pn-dashboard-config`). Sesión actual identificada por `session.session.token` desde `authClient.useSession()`.

### Roles y Permisos

Sistema de RBAC + overrides por usuario sobre el **admin plugin de Better-Auth** + access-control. Plan completo en `/Users/josion99/.claude/plans/se-quiere-implementar-un-vectorized-torvalds.md`. Estado: Fases 1-5 implementadas; Fase 5 (scoping por identidad fila-a-fila) activa para `/api/proyectos`, `/api/tareas`, `/api/cursos` y `/api/capacidades` vía `src/lib/requesterScope.ts`; pendiente de extender a los demás endpoints de datos (`/api/hitos`, `GET /api/equipo`, `GET /api/snapshots`, `/api/repositorios`).

- **Fuente de verdad de roles**: [src/lib/permissions/roles.ts](src/lib/permissions/roles.ts) — roles `admin`, `directores`, `gerentes`, `pm`, `dev` (DEFAULT, menor privilegio), `ventas`. **Añadir un rol = una entrada en este archivo** (sin migración ni `auth:generate`). `ROLE_NAMES` alimenta el dropdown del módulo Admin y `createUser`. `blockDenyByRole` (disperso) niega bloques sensibles por rol (IDs = kebab del glosario; default-ALLOW).
- **Statements**: [src/lib/permissions/statements.ts](src/lib/permissions/statements.ts) — recursos gruesos `page:*` (1 por página del sidebar + `admin` + `comparativa`), `data:costos`, `action:snapshot:create|user:manage|equipo:manage|evaluacion:view-all|evaluacion:manage|tecnologia:manage`. `equipo:manage` (gestión del registro `equipo`) es **separado de `user:manage`** a propósito: un PM/gerente puede gestionar el equipo sin poderes de auth (ban/roles/sesiones). HU NAV-78: `evaluacion:view-all` permite ver autoevaluaciones cross-persona en `/comparativa`; `evaluacion:manage` permite **editar/borrar evaluaciones de cualquier persona** vía `/api/admin/evaluaciones` (lo usa el modal de edición). Ambos son **admin-only por default** (Modo A). `tecnologia:manage` (Plan 015/016): admin-only por default; gatea la edición de la matriz de tecnologías vía `POST/DELETE /api/admin/team-technologies` (Fase 2 implementada en Plan 016; consumido por el modal del tab Tecnologías de `/persona/[id]`). Otros roles se les da vía el editor de overrides en `/admin/[id]`. Mezcla `defaultStatements` del admin plugin (`user`/`session`) para que `/api/auth/admin/*` autorice.
- **Resolver** (server, fuente de verdad, **async**): [src/lib/permissions.ts](src/lib/permissions.ts) — `can(user, resource)` y `getEffectivePermissions(user)` son `async` (leen overrides de Turso). `evaluate(perms, resource)` es el predicado sync sobre un payload ya resuelto. La evaluación PURA por rol (`roleCan`, `splitResource`) vive en [src/lib/permissions/roleDefaults.ts](src/lib/permissions/roleDefaults.ts) — **client-safe** (no importa Turso), reusada por el resolver y por la UI del Admin. Efectivo = `rol ∪ overrides(allow) ∖ overrides(deny)`. Cache por usuario TTL 30s; `invalidatePermissions(userId)` la limpia tras escribir overrides. Si la tabla `user_permission_override` no existe (migración no aplicada) degrada a sólo-rol sin romper. Llamadas `await`: middleware (1 resolución/request, luego `evaluate` local), [Layout.astro](src/layouts/Layout.astro), [admin.astro](src/pages/admin.astro), `/api/me/permissions`.
- **Enforcement**: [src/middleware.ts](src/middleware.ts) gatea **todas** las páginas (mapa `pageKeyForPath`, incluido `/`; detalle hereda page-key del padre). Una página denegada redirige a `firstAllowedPath` (la primera página permitida en orden de sidebar, o `/cuenta`), **nunca a otra denegada** → gatear `/` ya no genera loop de redirect. Además: **gate genérico por endpoint** (`API_PAGE_GATES`) que exige ≥1 page-key consumidora para `/api/proyectos|tareas|cursos|equipo|repositorios|hitos|capacidades|sprints|technologies|team-technologies` + `GET /api/snapshots` (403 al `curl` directo si el rol no puede ver ninguna página consumidora); `/api/costos`+`/api/costos-modelo` (403), `POST /api/snapshots` (403), `/api/admin/*` (default: requiere `action:user:manage`; `/api/admin/equipo` requiere `action:equipo:manage`; `/api/admin/evaluaciones` requiere `action:evaluacion:manage`; `/api/admin/team-technologies` requiere `action:tecnologia:manage` — endpoint write POST/DELETE implementado en Plan 016), `/api/evaluaciones` (requiere `action:evaluacion:view-all`, 403). `/api/me/evaluaciones` queda fuera del gate por endpoint pero está **desactivado** (responde 403 `EVALUACION_DISABLED` en GET/POST — la autoevaluación propia fue retirada, HU NAV-78). El cliente (Sidebar filtrado, `window.__PN_PERMS__` inyectado en Layout —escapado anti-XSS—, `usePermissions`/`canWith`/`<Gate>`/`<PageLink>`) es **sólo UX**; el server es el gate real.
- **Scoping fila-a-fila (Fase 5)**: `/api/proyectos`, `/api/tareas`, `/api/cursos` y `/api/capacidades` filtran filas por identidad del solicitante (`src/lib/requesterScope.ts`): cachean el dataset raw y aplican `projectVisible`/`taskVisible`/`cursoVisible`/`capacidadVisible` por request según `user.equipoId`; roles `admin/directores/gerentes/ventas` (`UNSCOPED_ROLES`) ven todo, `pm`/`dev` ven sólo sus propias filas (fail-closed sin `equipoId`). Los **demás endpoints de datos** (`GET /api/equipo`, `GET /api/snapshots`, `/api/repositorios`, `/api/hitos`) siguen con gate grueso (accesibles a cualquier rol con página consumidora permitida) — no requieren row-scoping porque no exponen datos personales cruzados de la misma forma (repositorios: match en cliente; hitos: entidades de proyecto, no de persona; equipo: directorio; snapshots: histórico agregado). Sólo `/api/costos*` está gateado adicionalmente por dato sensible (`data:costos`). No es regresión.
- **Degradación 403 (cliente)**: `useSheetData` ([src/hooks/useSheetData.ts](src/hooks/useSheetData.ts)) trata 403 como **no-fatal**: sin retry, expone `forbidden` y data vacía (no lo confunde con 401→login). Las secciones tratan el costo como **suplementario** (PersonaDetail no se rompe; CostosSection muestra "Sin acceso a costos" limpio en vez del 403 crudo). `<PageLink pageKey>` ([src/components/auth/PageLink.tsx](src/components/auth/PageLink.tsx)) evita dead-links: renderiza `<a>` sólo si el rol puede abrir el destino, si no texto plano o nada (`hideWhenDenied`).
- **Invalidación de cache**: `adminGuardAfter` (`hooks.after` en `auth.ts`) llama `invalidatePermissions(targetUserId)` tras `/admin/set-role|ban-user|unban-user|remove-user|update-user`, así un cambio de rol/ban surte efecto inmediato (no espera el TTL de 30s). El ban además es inmediato porque `getEffectivePermissions` checa `user.banned` antes del cache.
- **Bloques (Fase 3)**: [src/components/auth/Gate.tsx](src/components/auth/Gate.tsx) (`<Gate resource="block:..." />`, default-ALLOW, lee perms inline sin fetch), [src/hooks/usePermissions.ts](src/hooks/usePermissions.ts) (`usePermissions()`, `canWith()`, `readInlinePermissions()`), endpoint [src/pages/api/me/permissions.ts](src/pages/api/me/permissions.ts). **Gating sistémico**: `KPICard` y `ChartCard` se auto-ocultan (`return null`) si su `info.glossaryAnchor` (= id del glosario, vía `infoFor(id)`) está en `blockDenies` — esto hace que **TODOS** los KPIs/charts de la app respeten overrides de bloque sin envolverlos a mano (default-ALLOW). Bloques custom que NO usan KPICard/ChartCard (p.ej. listas con `GlossaryTooltip`) sí requieren `<Gate resource="block:<id>">` explícito (ej. `alertas-lista`, `costos-modelo-financiero`). DashboardSection además filtra widgets por `block:dashboard-<widget.id>` (el denegado ni se monta).
- **Módulo Admin** (`/admin`, sólo `admin`): [src/components/sections/AdminSection.tsx](src/components/sections/AdminSection.tsx) (grid de cards + alta) y [src/components/sections/AdminUserSection.tsx](src/components/sections/AdminUserSection.tsx) (ficha `/admin/[id]`). Usan `authClient.admin.{listUsers,createUser,setRole,updateUser,banUser,unbanUser,listUserSessions,revokeUserSession,revokeUserSessions}`. NO hay modales: sesiones y overrides viven en la ficha como bloques. `Avatar` (foto o iniciales, exportado desde AdminSection); en la ficha el admin puede subir/quitar la foto del usuario (resize client-side → `POST/DELETE /api/admin/avatar` → Amazon S3 → `authClient.admin.updateUser({ image })`). El hook de dominio (`databaseHooks.user.create.before`) sigue validando `ALLOWED_GOOGLE_DOMAIN`. Reemplaza el uso diario de `npm run create-user` (sólo bootstrap del primer admin).
- **Anti-bloqueo (UI + server)**: en `/admin/[id]` la UI deshabilita editar el rol/permisos/baneo propios y degradar al último admin. **Endurecimiento server-side** en [src/lib/adminGuard.ts](src/lib/adminGuard.ts): un `hooks.before` (`createAuthMiddleware`) en `auth.ts` intercepta `/admin/set-role|ban-user|remove-user|update-user` y rechaza con `APIError('FORBIDDEN')` si (1) cambias tu propio rol o (2) la acción dejaría 0 admins activos (cuenta admins no baneados vía `getDbClient`). **Fail-closed**: si no se puede verificar la sesión del actor en una ruta vigilada, deniega. Better-Auth además rechaza `YOU_CANNOT_BAN_YOURSELF`/`YOU_CANNOT_REMOVE_YOURSELF`.
- **Editor de overrides (Fase 4)**: bloque "Permisos" en `/admin/[id]` (acordeón por página; tri-estado Hereda/Permitir/Denegar). Cada recurso muestra una **descripción** debajo del nombre (páginas vía `PAGE_HINTS`, datos/acciones vía `RESOURCE_HINTS`, bloques vía `getEntry(id).summary` del glosario) explicando qué ve/usa el usuario al permitirlo. Persiste en [src/pages/api/admin/overrides.ts](src/pages/api/admin/overrides.ts) (GET/PUT/DELETE, gateado por `action:user:manage`, valida `resource` con regex, invalida cache). Tabla `user_permission_override` (PK `(userId, resource)`, `effect` allow|deny).
- **Mensajes en español**: respuestas JSON de middleware/`overrides.ts` traducidas (`{error, code}`); errores del admin plugin se traducen por `code` en [src/lib/authErrors.ts](src/lib/authErrors.ts) (`translateAuthError`, usado también en `LoginForm`); `bannedUserMessage` configurado en `auth.ts`. **El login de un usuario baneado muestra sólo el mensaje genérico** (decisión de seguridad: no exponer `banReason` ni permitir enumeración en una pantalla no autenticada). Tooltips de iconos vía [src/components/ui/Tooltip.tsx](src/components/ui/Tooltip.tsx) (CSS hover, sin JS); confirmaciones destructivas vía [src/components/ui/ConfirmModal.tsx](src/components/ui/ConfirmModal.tsx).

### Servidor MCP (`mcp-server/`)

Servidor [MCP](https://modelcontextprotocol.io) que expone los datos del portafolio a Claude Desktop/Claude Code. Vive en su propia carpeta con su propio `package.json`. **No** lee Sheets/Turso directamente; hace fetch HTTP a la API Astro autenticada con un **bearer token MCP** del usuario dueño.

- **Token**: el usuario lo genera en `/cuenta` → bloque "Tokens MCP" (formato `pn_mcp_*`, hash sha256 en Turso vía tabla `mcp_token`, caducidad obligatoria 30/90/180/365 días).
- **Middleware**: [src/middleware.ts](src/middleware.ts) detecta `Authorization: Bearer pn_mcp_*` y short-circuita a [src/lib/mcpToken.ts](src/lib/mcpToken.ts) → `resolveMcpToken(plain)` que carga el `user` desde Turso. El resto del pipeline (rol, overrides, scoping de páginas/datos) corre **idéntico**. `locals.session = null` para requests MCP (no son sesiones de browser).
- **Permisos heredados**: un `dev` no puede llamar `get_costs` por el MCP — `/api/costos` devuelve 403 y `errorResult` lo traduce a "tu rol no tiene permiso". El scoping fila-a-fila de Fase 5 aplica igualmente: un `dev` que llama `get_projects` vía MCP recibe sólo los proyectos que le corresponden por identidad (misma lógica de `requesterScope` que en el browser).
- **Anti-chain**: `POST /api/me/mcp-tokens` rechaza con 403 si el caller se autentica con un token MCP. Sólo sesiones de browser pueden emitir tokens (defensa en profundidad).
- **Migración**: aplicar [src/db/migrations/2026-mcp-tokens.sql](src/db/migrations/2026-mcp-tokens.sql) con `turso db shell <db-name> < src/db/migrations/2026-mcp-tokens.sql`. El esquema también está en [src/db/auth-schema.sql](src/db/auth-schema.sql) (re-anexar a mano si se regenera con `npm run auth:generate`).
- **Sincronización de tipos**: los archivos en [mcp-server/src/data/types.ts](mcp-server/src/data/types.ts) son **espejo intencional** de `src/utils/dataTransforms.ts` (y de los tipos del glosario en `src/data/glossary.ts`). Si cambias el shape de un record, actualiza ambos. Same para `equipoMatch.ts` (matcher puro client-safe).
- **Tools del glosario**: el MCP expone `list_glossary_sections`, `get_glossary_entry`, `search_glossary`. Permiten a Claude pre-cargar el vocabulario del producto (fórmulas, qué cruzan, por qué importan) sin que el usuario tenga que ir a `/glosario`. Heredan el gate `page:glosario` y el filtrado por bloques denegados (el endpoint server-side hace todo el recorte).

Setup completo y comandos en [mcp-server/README.md](mcp-server/README.md).

### Comandos útiles

```bash
# Crear un usuario (bootstrap del primer admin). Usa la API server-side de Better-Auth, que bypassea disableSignUp.
# 4º arg opcional = rol (admin|directores|gerentes|pm|dev|ventas); default 'dev'. Para el resto usar el módulo /admin.
npm run create-user me@bit.lat 'P@ssw0rd' 'Mi Nombre' admin

# Regenerar el SQL del esquema de auth (después de cambios en plugins/config)
npm run auth:generate
# Luego: turso db shell <db-name> < src/db/auth-schema.sql
```

### Setup inicial (una sola vez)

1. `turso db create project-navigator-auth` y `turso db tokens create project-navigator-auth`.
2. Setear todas las env vars (ver `.env.example`).
3. `npm run auth:generate` → genera `src/db/auth-schema.sql` (sólo las 4 tablas de Better-Auth — la tabla `user_preferences` se mantiene a mano al final del archivo, ver nota abajo).
4. `turso db shell project-navigator-auth < src/db/auth-schema.sql`.
5. Crear OAuth client en Google Cloud Console; redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`.
6. `npm run create-user ...` para el primer usuario.

### Tabla `user_preferences` (manual)

[src/db/auth-schema.sql](src/db/auth-schema.sql) tiene **varias** tablas custom agregadas a mano (no las regenera `npm run auth:generate`): `user_preferences` (PK `(userId, sectionKey)`, FK a `user(id)` `ON DELETE CASCADE`, `value` JSON), `user_permission_override` (PK `(userId, resource)`, FK `ON DELETE CASCADE`, `effect` allow|deny), `mcp_token` (tokens bearer del servidor MCP), `evaluacion` (HU NAV-78, autoevaluaciones trimestrales: PK auto-incremento, UNIQUE `(equipo_id, periodo)`, FK a `equipo(id)` `ON DELETE CASCADE`, 7 dimensiones int 1-10 + notas). El admin plugin además añade columnas `role`/`banned`/`banReason`/`banExpires` a `user` e `impersonatedBy` a `session` (éstas SÍ las regenera `auth:generate` porque el plugin está en `auth.ts`). **Cuidado al regenerar con `npm run auth:generate`**: reescribe el archivo y borra TODAS las tablas custom; hay que reanexar a mano sus `create table`/`create index` (≈ 10 sentencias). Para migrar una DB existente, aplicar la migración correspondiente: [2026-roles.sql](src/db/migrations/2026-roles.sql) (admin plugin + override), [2026-mcp-tokens.sql](src/db/migrations/2026-mcp-tokens.sql), [2026-evaluaciones.sql](src/db/migrations/2026-evaluaciones.sql) — con `turso db shell <db-name> < src/db/migrations/<archivo>`.

## Glosario y Tooltips

Sistema de documentación in-product. Un solo source of truth (`src/data/glossary.ts`) alimenta dos superficies: (1) tooltips inline junto a cada bloque visible y (2) la página `/glosario` con entradas detalladas + navegación cruzada.

### Archivos clave

- **`src/data/glossary.ts`** — Single source of truth. Exporta:
  - `GLOSSARY_SECTIONS: GlossarySection[]` — 1 por página del sidebar. Cada una tiene `intro: { whatIs, whenToUse, related[] }` con cross-refs a otras secciones.
  - `GLOSSARY: GlossaryEntry[]` — 1 entrada por bloque visible. Campos: `summary` (1-2 oraciones para tooltip), `whatIs`/`howCalculated`/`whyMatters` (prosa con Markdown), `sources[]` (links a GitHub).
  - `GITHUB_BASE` — base URL del repo en GitHub (`https://github.com/ameza-bit/project-navigator/blob/develop`).
  - `infoFor(id)` — retorna `{ description, glossaryAnchor }` para pasar a la prop `info` de `KPICard`/`ChartCard`.
  - `getEntry(id)`, `getEntriesBySection(slug)` — lookups.
- **`src/components/ui/InfoTooltip.tsx`** — Icono "i" inline. Hover/click + viewport-aware positioning (auto-detecta top/bottom + left/center/right) + click-outside + Escape. Acepta `description`, `glossaryAnchor` opcional, `label` opcional.
- **`src/components/ui/GlossaryTooltip.tsx`** — Wrapper sobre `InfoTooltip` que toma solo `id` y resuelve description/anchor desde el glosario. Úsalo en bloques custom (h3, etc.).
- **`src/components/ui/MarkdownText.tsx`** — Renderer ligero sin dependencias. Soporta `**bold**`, `` `code` ``, listas `- `, bloques ` ``` `. Exporta también `InlineMarkdown` para uso single-line (tooltips, summaries).
- **`src/components/ui/KPICard.tsx`** y **`src/components/charts/ChartCard.tsx`** — Aceptan prop opcional `info?: { description, glossaryAnchor }`. Renderiza tooltip junto al título automáticamente.
- **`src/components/sections/GlosarioSection.tsx`** + **`src/pages/glosario.astro`** — Página `/glosario`. Sidebar interno con secciones (espejo del sidebar global) + búsqueda + anchors `#<entry-id>` y `#intro-<section-slug>` para deep-linking. Intro cards arriba de cada sección con `whatIs`/`whenToUse`/`related[]`.

### Cómo agregar tooltips a una sección nueva

1. **En `glossary.ts`**:
   - Agregar entrada a `GLOSSARY_SECTIONS` con su `intro`. Orden en el array debe reflejar el sidebar; sub-páginas (`proyecto-detalle`, `persona-detalle`, `pronosticos-detalle`) van inmediatamente después de su parent; `metricas-dev` (no en sidebar) al final.
   - Agregar entradas a `GLOSSARY`, una por bloque visible. Convención de IDs: `<section-slug>-<block>` (kebab-case).
2. **En el `*Section.tsx`**:
   - `<KPICard>` o `<ChartCard>`: añadir `info={infoFor('<id>')}`. Import: `import { infoFor } from '../../data/glossary';`.
   - Títulos custom (h3, etc.): envolver en flex container y agregar `<GlossaryTooltip id="<id>" />` inline. Import: `import GlossaryTooltip from '../ui/GlossaryTooltip';`.
3. **Validar cross-refs** antes de hacer commit con el script en `## Code Conventions` abajo.

### Reglas

- **Single tooltip por bloque visual**: KPIs, gráficas (ChartCard), tablas con título, secciones agrupadas, hero. **NO** cuentan filtros, search inputs ni toggles puros.
- **Tono**: tooltip ejecutivo (`summary`) en 1-2 oraciones; glosario híbrido (fórmulas + por qué importa en negocio).
- **Markdown** soportado en todos los campos de prosa: `**bold**`, `` `code` ``, listas `- `, bloques ` ``` `. NO usar HTML literal en el contenido.
- **Cross-refs `related[].slug`** deben apuntar a slugs declarados en `GLOSSARY_SECTIONS`. Omitir `related` es válido si la página no cross-linkea.
- **Sources**: cada entrada referencia al menos un archivo fuente con `${GITHUB_BASE}/<path>`, con `#L<n>-L<m>` cuando aplique.
- **Estados loading**: si un `ChartCard` se renderiza en loading state con el mismo título, pasarle también el mismo `info={infoFor('...')}` para evitar flash visual.

### Validador de cross-refs

Antes de commitear cambios al glosario, validar que todos los `related[].slug` apunten a secciones reales:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('src/data/glossary.ts', 'utf8');
const sectionsBlock = src.match(/export const GLOSSARY_SECTIONS[\s\S]+?^\];/m)[0];
const sectionSlugs = new Set();
const objRe = /^\s\s\{[\s\S]*?slug:\s'([a-z][a-z0-9-]*)'/gm;
let m; while ((m = objRe.exec(sectionsBlock)) !== null) sectionSlugs.add(m[1]);
const relatedRefs = [];
const introRelRe = /related:\s*\[([\s\S]*?)\]/g;
while ((m = introRelRe.exec(sectionsBlock)) !== null) {
  const slugRe = /slug:\s*'([a-z][a-z0-9-]*)'/g;
  let s; while ((s = slugRe.exec(m[1])) !== null) relatedRefs.push(s[1]);
}
const broken = relatedRefs.filter(r => !sectionSlugs.has(r));
const entriesBlock = src.match(/export const GLOSSARY[^_][\s\S]+?^\];/m)[0];
const entrySectionSlugs = new Set();
const entryRe = /sectionSlug:\s*'([a-z][a-z0-9-]*)'/g;
while ((m = entryRe.exec(entriesBlock)) !== null) entrySectionSlugs.add(m[1]);
const orphans = [...entrySectionSlugs].filter(s => !sectionSlugs.has(s));
console.log('Sections:', sectionSlugs.size, '| Broken related refs:', broken.length || 'NONE', '| Orphan entries:', orphans.length || 'NONE');
if (broken.length) console.log('Broken:', broken);
if (orphans.length) console.log('Orphans:', orphans);
"
```

## Code Conventions

- Sections son los unicos componentes que llaman hooks de datos; charts y UI reciben datos por props
- FilterDropdowns usa `{ value, label }` para opciones
- DataTable es generico con columnas tipadas
- Dashboard config persiste en localStorage con key `pn-dashboard-config`; widgets nuevos agregados a `DEFAULT_WIDGETS` se mergean con config guardada para que aparezcan automáticamente en sesiones existentes
- Theme toggle persiste en localStorage con key `project-navigator-theme`
- Sidebar colapsable del shell: el estado vive como clase `sidebar-collapsed` en `<html>` (aplicada pre-paint por script inline en `Layout.astro`, persistida en localStorage `pn-sidebar-collapsed`); el `<main>` reacciona vía `[html.sidebar-collapsed_&]` y el aside/UserMenu vía la variante `sidebar-mini` — el markup SSR es idéntico colapsado o no (sin flash ni mismatch de hidratación). **Hover-peek:** la variante `sidebar-mini` (definida con `@custom-variant` en [src/styles/global.css](src/styles/global.css)) significa "colapsado **Y** el aside no está bajo el cursor", así que al pasar el mouse por el riel colapsado el sidebar se asoma a ancho completo **por encima del contenido** (overlay) sin tocar el estado persistido ni reflowear el `<main>` (su margen sigue keyed en `[html.sidebar-collapsed_&]`). CS 360 replica el hover-peek con estado React `peek` (rieles/directorio son nodos distintos). Sólo aplica en escritorio (depende de `:hover`)
- API routes parsean columnas por nombre de header (no por indice), lo que permite reordenar columnas en el Sheet sin romper el endpoint
- Sheets con espacios en el nombre requieren quoting en el range (e.g. `"'Nombre con espacios'!A1:B10"`)
- Para fechas, las hojas de App/Core usan Excel serial numbers (46090 = ~Mar 2026); el helper `parseDate()` en `/api/tareas.ts` detecta y convierte
- **Paginación (HU NAV-82)**: usar `PaginationControls` + `paginate()` de `src/components/ui/PaginationControls.tsx` — selector "Resultados por página" (12/24/50/100/Todos, **default 50**, sanitizar storage con `sanitizePageSize()`) + prev/next; se auto-oculta si `total <=` la opción mínima. El `pageSize` se persiste por sección (vía `usePersistedFilters`; en cs360 vía localStorage `pn-cs360-tickets-page-size`), la página actual NO. Cambiar `pageSize` debe resetear `page` a 0. Integrado en `/portafolio`, `/pronosticos` (proyectos + capacidad, comparten `pageSize`) y el tab Tickets de cs360 (variante `light`, opciones 10/25/50/100/Todos)

### Filtro por PM (convención global)

Disponible en 10 secciones que muestran datos derivados de proyectos: `/`, `/resumen`, `/alertas`, `/portafolio`, `/roadmap`, `/timeline`, `/distribucion`, `/costos`, `/metricas-dev`, `/pronosticos`. Reglas para mantener consistencia al modificar o agregar secciones:

- **Componente único**: usar `FilterDropdowns` existente con `multi: false`. No crear dropdowns custom de PM.
- **Opciones dinámicas**: derivar con `[...new Set(data.map(p => p.pm).filter(pm => pm && pm !== '-'))].sort()`. El valor `'-'` y los vacíos se excluyen.
- **Snapshot integrity**: si la sección invoca `useSnapshotCapture`, separar `allData` (raw, pasado al hook) de `data` (filtrado, usado por la UI). El filtro PM nunca debe contaminar los snapshots semanales.
- **Costos prorrateados**: si la sección calcula shares de costo entre proyectos (e.g. `/costos` con `projectCosts`), los divisores deben seguir usando el dataset completo aunque el iterador esté filtrado por PM. De lo contrario el share se infla artificialmente para el PM seleccionado.
- **Secciones excluidas a propósito**: `/cronograma` (`TareaRecord` no tiene `pm` ni `folio`), `/cursos` (no relacionado con proyectos), `/equipo` (directorio, no métricas).

### Persistencia de filtros (cross-session)

Cada sección con filtros usa `usePersistedFilters<T>(sectionKey, defaults)` ([src/hooks/usePersistedFilters.ts](src/hooks/usePersistedFilters.ts)) para que selecciones del usuario sobrevivan recargas y se sincronicen entre dispositivos via Turso. Reglas:

- **Qué persistir**: dropdowns (filtros) + toggles booleanos/numéricos por sección (e.g. `includeDone`, `showForecast`, `zoomIdx`, `sortBy`, `tab`) + `pageSize` ("Resultados por página", HU NAV-82). **NO** persistir `search` libre ni la página actual (`page`) — son exploratorios y molestan al quedar "pegados".
- **Shape del estado**: agrupar todo en un solo objeto pasado al hook, e.g. `{ filters: Record<string, string[]>, includeDone: boolean }`. Las secciones que antes tenían múltiples `useState` separados ahora derivan `setActiveFilters` / `setIncludeDone` / etc. con `useCallback` que llaman a `setPersisted((prev) => ({ ...prev, key: next }))`.
- **`sectionKey` único**: 12 secciones ya integradas con keys `proyectos`, `timeline`, `cronograma`, `cursos`, `dashboard`, `resumen`, `alertas`, `pronosticos`, `costos`, `distribucion`, `metricas-dev`, `roadmap`. Para una sección nueva, elige un slug en kebab-case que matchee `/^[a-z0-9-]{1,64}$/` (validado server-side).
- **Botón "Limpiar"**: `FilterDropdowns` ya provee el botón (aparece sólo si `hasActiveFilters`); cablear `onClear={clearPersisted}` para que resetee estado a defaults + borre la fila en Turso + limpie `localStorage['pn-prefs-<sectionKey>']`. Si la sección también tiene `search` (no persistido), envolver: `onClear={() => { clearPersisted(); setSearch(''); }}`.
- **Sync entre tabs/dispositivos**: sólo al cargar/recargar página. NO hay polling ni `visibilitychange` — el hook hace un único GET al mount.
- **Valores stale**: si un valor persistido (e.g. PM "Lore") deja de existir en el dataset, el `FilterDropdowns` simplemente no lo muestra como opción pero el estado interno lo conserva. El filtro no matchea nada → no oculta proyectos. Aceptable; si molesta, agregar `pruneStaleFilters(state, validOptions)` en un `useEffect` post-data-load.
- **Limpieza global**: `/cuenta` → Preferencias → "Limpiar todos" hace `DELETE /api/user-preferences` (sin `?section=`) + barre todas las keys `pn-prefs-*` del localStorage.
