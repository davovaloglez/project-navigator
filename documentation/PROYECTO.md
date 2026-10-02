# Project Navigator — BIT Technologies

Documento de referencia del producto. Cubre **qué es**, **qué hace**, **cómo está construido** y **cómo opera**. Pensado tanto para stakeholders (PMs, dirección) como para developers que entran al proyecto.

- **Versión actual:** 1.7.0
- **Repositorio:** project-navigator (rama `develop`, base `master`)
- **Stack resumido:** Astro 6 SSR + React 19 + Tailwind CSS v4 + Recharts + Google Sheets API + Turso (libSQL) + Better-Auth, desplegado en AWS Amplify.

---

## 1. Resumen ejecutivo

**Project Navigator** es el tablero interno de gestión de portafolio de BIT Technologies. Centraliza en una sola interfaz:

1. **Estado de cada proyecto** del portafolio (24 campos: PM, hito, épica, salud, prioridad, progreso, fechas, etc.).
2. **Cronograma granular** de tareas (producto App + producto Core), con story points, throughput y precisión de estimación.
3. **Seguimiento de cursos** del equipo.
4. **Modelo financiero de pricing y costos** del portafolio.
5. **Motor de pronóstico determinista** que proyecta fechas de cierre, identifica riesgos, dependencias y capacidad por persona.
6. **Centro de alertas automáticas** con 12 tipos de señales y 3 niveles de severidad.
7. **Glosario in-product** con 149 entradas que documenta cada KPI y bloque visible del tablero.

Las fuentes de verdad son **Google Sheets** (datos operativos) y **Turso (libSQL)** (auth y preferencias de usuario). El dashboard no escribe en los Sheets salvo para los **snapshots semanales** que alimentan el motor de pronóstico.

---

## 2. Stack tecnológico

| Capa             | Tecnología                          | Versión   | Notas                                        |
| ---------------- | ------------------------------------ | ---------- | -------------------------------------------- |
| Runtime          | Node.js                              | ≥ 24.0.0 | Node 24 LTS (Krypton)                        |
| Framework        | [Astro](https://astro.build)            | ^6.2.2     | output `server`, SSR full                  |
| Adapter          | `astro-aws-amplify`                | ^0.4.1     | deploy serverless en AWS Amplify (Lambda)    |
| UI lib           | [React](https://react.dev)              | ^19.2.4    | islands con `client:load`                  |
| Estilos          | [Tailwind CSS](https://tailwindcss.com) | ^4.2.2     | vía `@tailwindcss/vite`                   |
| Charts           | [Recharts](https://recharts.org)        | ^3.8.1     | donuts, barras, gantt-like                   |
| Iconos           | [lucide-react](https://lucide.dev)      | ^1.7.0     |                                              |
| Datos operativos | `googleapis`                       | ^171.4.0   | service account, lectura/escritura de Sheets |
| BD auth + prefs  | `@libsql/client`                   | ^0.17.3    | cliente Turso                                |
| Auth             | [Better-Auth](https://better-auth.com)  | ^1.6.9     | email+password + Google OAuth                |
| Type-checking    | TypeScript                           | ^5.9.3     | strict,`npx astro check` = 0 errores       |

**Cron:** un scheduler externo (AWS EventBridge Scheduler) invoca semanalmente `/api/snapshots/auto-capture` (`0 9 * * 1`, lunes 9am UTC); pendiente de configurar post-migración.

**Lock files relevantes:** `package-lock.json` con bloque `overrides` para neutralizar 12 CVEs en deps transitivas (ver §15).

---

## 3. Arquitectura general

### 3.1 Topología

```
┌─────────────────────────────────────────────────────────────────┐
│                  AWS Amplify (SSR + Lambda)                     │
│  ┌────────────────┐    ┌─────────────────────────────────────┐  │
│  │  Páginas .astro │───▶│ React islands (sections + charts)  │  │
│  └────────────────┘    └─────────────────────────────────────┘  │
│         │                              │                        │
│         ▼                              ▼                        │
│  ┌────────────────┐    ┌─────────────────────────────────────┐  │
│  │  middleware.ts │    │  useSheetData (retry + abort)       │  │
│  │  (auth gate)   │    └─────────────────────────────────────┘  │
│  └────────────────┘                   │                         │
│         │                              ▼                        │
│         ▼                    ┌─────────────────────┐            │
│  ┌────────────────┐          │  /api/*  (SSR API)  │            │
│  │  Better-Auth   │          └─────────────────────┘            │
│  └────────────────┘                    │                        │
│         │                              │                        │
└─────────┼──────────────────────────────┼────────────────────────┘
          ▼                              ▼
   ┌────────────────┐            ┌────────────────────┐
   │ Turso (libSQL) │            │ Google Sheets API  │
   │ user/session/  │            │ (service account)  │
   │ account/prefs  │            │  Projects / Cursos │
   └────────────────┘            │  Costos / app /    │
                                 │  Core / Snapshots  │
                                 └────────────────────┘
```

### 3.2 Flujo de datos típico (lectura)

1. El usuario navega a una ruta (`/portafolio`, p.ej.).
2. **`middleware.ts`** valida sesión via Better-Auth, popula `Astro.locals.user`. Si no hay sesión → 401 JSON (API) o redirect a `/login` (página).
3. La página `.astro` monta la sección React correspondiente como island (`client:load`).
4. La sección llama **`useSheetData<T>(endpoint)`** → fetch a `/api/<recurso>`.
5. El endpoint SSR autentica con service account, lee del Sheet, parsea por header, cachea 5 min en memoria del lambda (`let cache` con TTL).
6. La sección recibe el array tipado, calcula KPIs (`useMemo`), aplica filtros (`usePersistedFilters`) y pasa props a charts/UI.

### 3.3 Capas y responsabilidades

| Capa       | Ubicación                      | Responsabilidad                                                              | Regla              |
| ---------- | ------------------------------- | ---------------------------------------------------------------------------- | ------------------ |
| Página    | `src/pages/*.astro`           | Layout + montaje de section island                                           | Sin lógica        |
| Section    | `src/components/sections/`    | **Única** capa que llama hooks de datos. Calcula KPIs, aplica filtros | Una por ruta       |
| Chart/UI   | `src/components/{charts,ui}/` | Reciben datos por props, sin side-effects                                    | Reutilizables      |
| Hook       | `src/hooks/`                  | Fetch, persistencia, snapshots                                               | Genéricos tipados |
| Util       | `src/utils/`                  | Pura lógica de cálculo (health, forecast, costos…)                        | Sin side-effects   |
| API        | `src/pages/api/*.ts`          | SSR endpoints (Sheets + Turso). Cache 5 min en lecturas                      | Parsean por header |
| Middleware | `src/middleware.ts`           | Auth gate único                                                             | Cubre toda `/`   |
| Layout     | `src/layouts/Layout.astro`    | Sidebar + Header + theme + auth context                                      |                    |

---

## 4. Vistas (rutas del dashboard)

20 rutas funcionales, todas protegidas por el middleware de auth (excepto `/login`).

### 4.1 Vistas principales (linkeadas en el sidebar)

| #  | Ruta              | Sección React                | LOC   | Propósito                                                                                                    |
| -- | ----------------- | ----------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| 1  | `/`             | `DashboardSection`          | 582   | Dashboard personalizable con widgets (orden y visibilidad por usuario en `localStorage`)                    |
| 2  | `/resumen`      | `ResumenSection`            | 329   | Resumen ejecutivo con health score del portafolio                                                             |
| 3  | `/alertas`      | `AlertasSection`            | 262   | Centro de alertas automáticas (12 tipos × 3 severidades)                                                    |
| 4  | `/portafolio`   | `ProyectosSection`          | 234   | Grid de proyectos con filtros, búsqueda, chip de riesgo y badge stale                                        |
| 5  | `/roadmap`      | `RoadmapSection`            | 228   | Vista por hito y épica                                                                                       |
| 6  | `/timeline`     | `TimelineSection`           | 432   | Gantt con zoom horizontal + overlay de fecha pronóstico                                                      |
| 7  | `/cronograma`   | `CronogramaSection`         | 536   | Cards de tareas granulares (App + Core), KPIs, throughput y precisión de estimación                         |
| 8  | `/pronosticos`  | `PronosticosSection`        | 1,340 | Motor de pronóstico con 6 tabs (Proyectos / Planeación / Dependencias / Personas / Contexto / Metodología) |
| 9  | `/distribucion` | `DistribucionPuntosSection` | 253   | Distribución de story points por dev / hito                                                                  |
| 10 | `/equipo`       | `EquipoSection`             | 205   | Directorio del equipo                                                                                         |
| 11 | `/cursos`       | `CursosSection`             | 264   | Seguimiento de cursos por persona                                                                             |
| 12 | `/costos`       | `CostosSection`             | 465   | Análisis de costos del portafolio + modelo financiero de pricing                                             |
| 13 | `/novedades`    | `NovedadesSection`          | 183   | Historial de releases parseado de `CHANGELOG.md` (accordion Added/Changed/Fixed)                            |
| 14 | `/glosario`     | `GlosarioSection`           | 246   | Documentación in-product (149 entradas × 17 secciones)                                                      |
| 15 | `/cuenta`       | `CuentaSection`             | 617   | Perfil, contraseña, sesiones activas y preferencias del usuario                                              |

### 4.2 Vistas de detalle (dinámicas, vía slug)

| Ruta                     | Sección                    | LOC | Propósito                                                                              |
| ------------------------ | --------------------------- | --- | --------------------------------------------------------------------------------------- |
| `/proyecto/[folio]`    | `ProyectoDetailSection`   | 539 | Detalle completo de un proyecto (folio encoded via `slugs.ts` por el `/` en folios) |
| `/persona/[nombre]`    | `PersonaDetailSection`    | 497 | Perfil de persona: proyectos, tareas y cursos asociados                                 |
| `/pronosticos/[folio]` | `PronosticoDetailSection` | 936 | Pronóstico detallado de un proyecto + panel what-if interactivo                        |

### 4.3 Vistas adicionales

| Ruta              | Sección               | LOC | Propósito                                                                                                                                                        |
| ----------------- | ---------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/metricas-dev` | `MetricasDevSection` | 370 | Tabla comparativa de rendimiento de devs.**No linkeada en sidebar por diseño** (decisión documentada en CHANGELOG v1.1.0); accesible solo por URL directa |
| `/login`        | `LoginForm` (auth)   | —  | Página pública. Email+password + Google OAuth                                                                                                                   |
| `/404`          | —                     | —  | Página 404                                                                                                                                                       |

---

## 5. Detalle funcional por vista

> Esta sección lista los **bloques visibles** y **funcionalidades específicas** de cada vista. Pensada para que un PM identifique qué información encontrará en cada pestaña.

### 5.1 `/` Dashboard (personalizable)

- **Widgets configurables**: cada usuario puede ocultar/mostrar y reordenar bloques. La config persiste en `localStorage` (key `pn-dashboard-config`).
- **Merge inteligente**: widgets nuevos agregados a `DEFAULT_WIDGETS` se mergean con la config guardada, así aparecen automáticamente en sesiones existentes.
- **Customizer** (`DashboardCustomizer.tsx`): modal con toggles y reordenamiento drag-style.
- **Filtro global por PM** (single-select).
- **Snapshot passive**: alimenta el histórico semanal vía `useSnapshotCapture`.

### 5.2 `/resumen`

- **Health score** del portafolio (KPI principal, 0–100).
- Comparativa por hito.
- Top mejor y peor desempeño.
- Filtro por PM.

### 5.3 `/alertas`

- 12 tipos de alertas auto-generadas combinando: health score + pronóstico + anomalías + dependencias + staleness.
- 3 severidades: alta, media, baja.
- KPIs y tab counts por tipo de alerta.
- Filtro por PM.

### 5.4 `/portafolio`

- Grid de **`ProjectCard`** con: nombre, folio, PM, salud, prioridad, progreso, fechas, **chip de riesgo de pronóstico** y **badge stale** (proyectos sin movimiento ≥ 14 días).
- `FilterDropdowns` multi-select por estatus, salud, prioridad, hito, épica, OU, PM.
- Búsqueda libre (no persiste).
- Detail drawer al hacer click.

### 5.5 `/roadmap`

- Tarjetas por **hito** con épicas anidadas.
- Filtros por hito, épica, PM.

### 5.6 `/timeline`

- **Gantt** con barras por proyecto. Eje horizontal con zoom (5 niveles de granularidad).
- **Overlay de pronóstico**: ghost bar y diamond marker que muestran la fecha proyectada por el motor.
- Filtros + toggle `showForecast`.

### 5.7 `/cronograma`

- Cards de tareas granulares unificando dos productos: **App** y **Core** (discriminador `producto` en `TareaRecord`).
- KPIs: total de tareas, completadas, in-progress, story points totales y completados.
- **Throughput semanal** y **precisión de estimación** (real vs estimado).
- Filtros por producto, estado, responsable, sprint.

### 5.8 `/pronosticos` — motor de pronóstico

**Vista más extensa (1,340 LOC).** 6 tabs:

1. **Proyectos** — pronóstico individual por proyecto (riesgo, fecha esperada, confianza).
2. **Planeación** — agregación por hito, baseline del portafolio, fechas críticas.
3. **Dependencias** — análisis del campo `requiereDe`, cascada de bloqueadores.
4. **Personas** — proyección de capacidad por persona, sobrecarga.
5. **Contexto** — backtest del motor (MAE, sesgo, % dentro de ±7d / ±14d), staleness, anomalías.
6. **Metodología** — 13 métodos documentados (cómo se calcula cada métrica).

Tarjetas reutilizables: `ForecastCard`, `HitoForecastCard`, `PersonCapacityCard`, `CapacityHorizonCard`, `CourseForecastCard`, `SlippageCostCard`, `BacktestCard`, `DependencyCard`, `AnomalyCard`, `CriticalDatesList`, `SnapshotStatusCard`.

### 5.9 `/pronosticos/[folio]` — detalle de pronóstico

- Timeline del proyecto (planeado vs real vs pronosticado).
- Factores que afectan el pronóstico (velocity, sesgo, salud, dependencias).
- Escenarios (optimista / esperado / pesimista).
- **Panel what-if interactivo**: ajusta velocity, deadline, scope; recalcula fecha y costo en vivo.

### 5.10 `/distribucion`

- Charts de distribución de story points por dev y por hito.
- Filtros + filtro PM.

### 5.11 `/equipo`

- Directorio. No tiene filtro PM (es directorio, no métricas).

### 5.12 `/cursos`

- Cards de progreso de cursos por persona.
- KPIs: total, completados, en progreso.
- Filtros por status, persona, OU.

### 5.13 `/costos`

Dos bloques:

1. **Análisis de costos del portafolio**: costo prorrateado por proyecto (`projectCosts`), por rol, por hito.
2. **Modelo financiero de pricing** (Excel-driven): cargado desde `Costos!A13:G21` del Sheet. Aplica en orden: experiencia → admin → margen → IVA. Función `applyFinancialModel()`.

Helpers de formato: `formatMoney()` (abreviado `$2.3K`) y `formatMoneyFull()` (completo `$2,337.50`).

### 5.14 `/novedades`

- Parsea `CHANGELOG.md` (`src/utils/changelog.ts`) y lo renderiza como accordion.
- Una entrada por versión con secciones Added / Changed / Fixed / Security / Migration notes.

### 5.15 `/glosario`

- 149 entradas, 17 secciones. Single source of truth: `src/data/glossary.ts`.
- Sidebar interno espejo del global + búsqueda + anchors deep-linkables (`#<entry-id>`, `#intro-<section-slug>`).
- Intro cards con `whatIs` / `whenToUse` / `related[]`.
- Cada entrada referencia archivos fuente con link directo a GitHub (`#L<n>-L<m>`).

### 5.16 `/cuenta`

Cuatro bloques:

1. **Perfil**: edición de nombre (`authClient.updateUser`) + avatar placeholder (sin upload por ahora).
2. **Seguridad**: cambio de contraseña con `revokeOtherSessions` opt-in. Se oculta para usuarios solo-Google (sin cuenta `providerId: 'credential'`).
3. **Sesiones activas**: lista con `userAgent` parseado. Revocar individual (excepto la sesión actual) o todas las demás.
4. **Preferencias**: limpiar todos los filtros guardados (DELETE global) + reset del layout del dashboard.

### 5.17 `/metricas-dev`

- Tabla comparativa de rendimiento de devs (story points completados, throughput, etc.).
- Filtro PM.
- No linkeada en sidebar por diseño (CHANGELOG v1.1.0).

---

## 6. Funcionalidades transversales

### 6.1 Filtros + persistencia per-user

- **Hook**: `usePersistedFilters<T>(sectionKey, defaults)`.
- **Hidrata** sincrónicamente desde `localStorage['pn-prefs-<sectionKey>']` (anti-flash) y luego refetch del server.
- **Writes**: debounce 500 ms + AbortController para cancelar PUTs en vuelo.
- **Persistencia**: dropdowns + toggles booleanos/numéricos (`includeDone`, `showForecast`, `zoomIdx`, `sortBy`, `tab`, …).
- **NO persiste**: búsqueda libre (`search`) y paginación (`page`) — son exploratorios.
- **12 secciones integradas**: `proyectos`, `timeline`, `cronograma`, `cursos`, `dashboard`, `resumen`, `alertas`, `pronosticos`, `costos`, `distribucion`, `metricas-dev`, `roadmap`.
- **Sync**: solo al cargar/recargar página. No hay polling.
- **Limpieza global**: `/cuenta` → Preferencias → "Limpiar todos".

### 6.2 Filtro global por Project Manager

Disponible en 10 secciones:
`/`, `/resumen`, `/alertas`, `/portafolio`, `/roadmap`, `/timeline`, `/distribucion`, `/costos`, `/metricas-dev`, `/pronosticos`.

Reglas (`Code Conventions` en CLAUDE.md):

- Un solo componente (`FilterDropdowns` con `multi: false`).
- Opciones dinámicas (excluye `'-'` y vacíos).
- **Snapshot integrity**: las secciones con `useSnapshotCapture` separan `allData` (sin filtrar, para snapshots) de `data` (filtrada, para UI).
- **Costos prorrateados**: los divisores siguen usando el dataset completo aunque el iterador esté filtrado por PM (evita inflar el cost share del PM seleccionado).
- Secciones excluidas a propósito: `/cronograma` (TareaRecord no tiene `pm`), `/cursos` (no relacionado con proyectos), `/equipo` (directorio).

### 6.3 Snapshots semanales (histórico)

- **Persistencia**: `localStorage['pn-weekly-snapshots']` + sync con tab `Snapshots` del Google Sheet (cross-device).
- **Guard**: solo captura si la semana actual no fue capturada (≥ 7 días desde el último).
- **Hook pasivo**: `useSnapshotCapture` se dropea en cualquier sección con datos de proyectos y contribuye al histórico.
- **Auto-capture server-side**: el scheduler externo (EventBridge) invoca `/api/snapshots/auto-capture` los lunes 9am. Lee Projects + Cursos, construye snapshot, upserta. Auth opcional via `CRON_SECRET`.
- **Consumidores**: motor de pronóstico (velocity, baseline), staleness, anomalías, course forecast.

### 6.4 Theme (dark/light)

- Toggle en el header. Persiste en `localStorage['project-navigator-theme']`.
- Provider en `src/utils/theme.tsx`.

### 6.5 Glosario + tooltips in-product

- **`InfoTooltip`** ([src/components/ui/InfoTooltip.tsx](../src/components/ui/InfoTooltip.tsx)): icono "i" con hover/click + viewport-aware positioning (auto-detecta top/bottom + left/center/right) + click-outside + Escape.
- **`GlossaryTooltip`** ([src/components/ui/GlossaryTooltip.tsx](../src/components/ui/GlossaryTooltip.tsx)): wrapper que toma solo `id` y resuelve description/anchor desde el glosario.
- **`MarkdownText`** ([src/components/ui/MarkdownText.tsx](../src/components/ui/MarkdownText.tsx)): renderer ligero (sin deps). Soporta `**bold**`, `` `code` ``, listas, bloques de código. Exporta también `InlineMarkdown`.
- **`KPICard`** y **`ChartCard`**: aceptan `info?: { description, glossaryAnchor }`; renderizan tooltip automáticamente.
- **Helper**: `infoFor(id)` en `glossary.ts`.
- **Reglas**: un tooltip por bloque visual (KPI, gráfica, tabla con título). No en filtros, search ni toggles puros.

### 6.6 Manejo de errores y sesiones expiradas

- `useSheetData` detecta 401 y redirige a `/login` automáticamente (sesión expirada → no rompe la UI).
- Retry automático (1 reintento) + abort controller para cancelar requests al desmontar.

---

## 7. Motor de pronóstico

Componente central del producto. Vive en [src/utils/forecastEngine.ts](../src/utils/forecastEngine.ts) (772 LOC) más utilidades adyacentes. **Es determinista** (sin ML): combina velocity histórica, sesgo de estimación y señales de salud para producir fechas con confianza.

### 7.1 Funciones principales

| Función                                     | Output                | Uso                                                   |
| -------------------------------------------- | --------------------- | ----------------------------------------------------- |
| `forecastProjects(projects, opts)`         | `ProjectForecast[]` | Lista de pronósticos para el portafolio completo     |
| `forecastProject(project, opts)`           | `ProjectForecast`   | Pronóstico individual (usado en detail page)         |
| `computeTeamVelocity(snapshots)`           | número               | Velocity del equipo derivada del histórico semanal   |
| `computeEstimationBias(projects)`          | número               | Sesgo sistemático en estimaciones (real vs estimado) |
| `computePortfolioBaseline(projects)`       | objeto                | Baseline agregado del portafolio                      |
| `computePersonCapacity(persona, projects)` | objeto                | Capacidad y carga por persona                         |
| `aggregateByHito(forecasts)`               | `HitoForecast[]`    | Agrega por hito para la tab Planeación               |
| `computeCapacityProjection(...)`           | proyección           | Horizon de capacidad                                  |
| `computeCriticalDates(forecasts)`          | fechas críticas      | Hitos cercanos a riesgo                               |
| `computeSlippageCostImpact(...)`           | costo extra           | Impacto monetario de un retraso                       |

### 7.2 Funciones auxiliares

- `riskMeta()`, `confidenceMeta()`, `probabilityMeta()`, `capacityStatusMeta()` — devuelven colores/labels consistentes para styling.

### 7.3 Backtest

- [src/utils/backtest.ts](../src/utils/backtest.ts) `runBacktest()` corre el motor contra proyectos `Done` y compara contra `finReal`.
- Métricas: **MAE** (mean absolute error), **sesgo**, **% dentro de ±7 días** y **±14 días**.

### 7.4 Detección de problemas

- **`stale.ts`** — `computeStaleness()`: marca proyectos cuyo `progreso` no se mueve en ≥ 14 días vs snapshots.
- **`anomalies.ts`** — `detectAnomalies()`: clasifica slowdown / stall / acceleration comparando ritmo reciente vs baseline.
- **`dependencies.ts`** — `analyzeDependencies()`: parsea el campo `requiereDe` con splitter multi-separador y matching best-effort por folio/actividad. Calcula cascada de bloqueadores.
- **`forecastAlerts.ts`** — `generateForecastAlerts()`: agrega alertas de riesgo, stale, anomalías y bloqueadores al sistema de `/alertas`.
- **`courseForecast.ts`** — `computeCourseForecasts()`: proyecta finalización de cursos usando ritmo derivado de snapshots (los cursos no tienen fechas en el Sheet).

---

## 8. Modelo de datos

### 8.1 Google Sheets (datos operativos)

| Tab del Sheet                    | Endpoint                      | Modelo TS          | Campos                                                                                                                                                                                                 |
| -------------------------------- | ----------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Projects`                     | `/api/proyectos`            | `ProjectRecord`  | 24 campos: folio, nombre, pm, hito, épica, estatus, salud, prioridad, progreso, registro, fechaInicio, finPlan, finReal, ou, requiereDe, accionesPendientes, requiereSP, requiereWeb, finAjustado, … |
| `Cursos`                       | `/api/cursos`               | `CursoRecord`    | persona, curso, plataforma, ou, progreso, status, …                                                                                                                                                   |
| `Costos!A1:G50` (filas 1–12)  | `/api/costos`               | `CostoRecord`    | rol, costo, presupuesto, …                                                                                                                                                                            |
| `Costos!A1:G50` (filas 13–21) | `/api/costos-modelo`        | `FinancialModel` | steps de pricing (experiencia, admin, margen, IVA)                                                                                                                                                     |
| `app` + `Core`               | `/api/tareas`               | `TareaRecord`    | discriminador `producto: 'App' \| 'Core'`. App usa `Estimacion`, Core usa `pts` → unificado en campo `puntos`                                                                                  |
| `Snapshots`                    | `/api/snapshots` (GET/POST) | `WeeklySnapshot` | weekKey, capturedAt, kind, identifier, payload JSON                                                                                                                                                    |

**Parsing**: todos los endpoints parsean **por nombre de header** (no por índice), así reordenar columnas en el Sheet no rompe el API.

**Cache**: 5 min en memoria del lambda para endpoints de lectura. Los de `snapshots` no cachean (escriben estado mutable).

**Excel serial dates**: las hojas App/Core usan números seriales de Excel (e.g. `46090` ≈ marzo 2026). `parseDate()` en `/api/tareas.ts` detecta y convierte a ISO.

### 8.2 Turso (libSQL — auth y prefs)

Tablas en [src/db/auth-schema.sql](../src/db/auth-schema.sql):

| Tabla                | Origen           | PK                       | Notas                                                               |
| -------------------- | ---------------- | ------------------------ | ------------------------------------------------------------------- |
| `user`             | Better-Auth      | id                       | Datos básicos del usuario                                          |
| `session`          | Better-Auth      | id                       | Sesiones activas con `userAgent`, `expiresAt`                   |
| `account`          | Better-Auth      | id                       | Providers vinculados (credential / google)                          |
| `verification`     | Better-Auth      | id                       | Tokens de verificación                                             |
| `user_preferences` | **manual** | `(userId, sectionKey)` | FK a `user(id)` con `ON DELETE CASCADE`, columna `value` JSON |

⚠️ **`user_preferences` se mantiene a mano al final del archivo.** `npm run auth:generate` reescribe el schema y borra la tabla custom. Reaplicar las dos últimas sentencias después de regenerar.

### 8.3 Convenciones críticas (name matching)

Los nombres de personas tienen **dos formatos distintos** entre fuentes:

- **Projects sheet**: apodos cortos (`"Lore"`, `"Ale"`, `"Dave"`, `"Rafa"`).
- **Cursos / Cronograma sheets**: nombres completos (`"Lorena Raquel Olvera Rodriguez"`, `"Edgar Torres"`).

Cualquier comparación entre fuentes **debe** usar fuzzy matching bidireccional con `includes()` en ambas direcciones. El patrón `nameMatches()` vive en `PersonaDetailSection.tsx` y `costEngine.ts`. Usar match exacto causa que perfiles muestren 0 proyectos cuando se navega desde Cursos.

---

## 9. API endpoints

Todos los endpoints están en `src/pages/api/`. El middleware los protege por default (401 JSON si no hay sesión).

| Método | Ruta                                      | Rango Sheet / Tabla                 | Descripción                                                                                                                                                            |
| ------- | ----------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/api/proyectos`                        | `Projects!A1:W200`                | Portafolio (24 campos) — cache 5 min                                                                                                                                   |
| GET     | `/api/costos`                           | `Costos!A1:G50` (1–12)           | Costos por rol — cache 5 min                                                                                                                                           |
| GET     | `/api/costos-modelo`                    | `Costos!A1:G50` (13–21)          | Modelo financiero de pricing                                                                                                                                            |
| GET     | `/api/cursos`                           | `Cursos!A1:H50`                   | Cursos del equipo                                                                                                                                                       |
| GET     | `/api/tareas`                           | `app!A1:K1100` + `Core!A1:J200` | Tareas unificadas App + Core                                                                                                                                            |
| GET     | `/api/snapshots`                        | `Snapshots!A2:E10000`             | Histórico de snapshots agrupado por `weekKey`                                                                                                                        |
| POST    | `/api/snapshots`                        | `Snapshots!A1:E1`                 | Upsert por `weekKey` (requiere Editor en service account)                                                                                                             |
| GET     | `/api/snapshots/auto-capture`           | Projects + Cursos + Snapshots       | Endpoint para el scheduler externo (EventBridge, lunes 9am). Bypass auth via `Bearer CRON_SECRET`                                                                     |
| GET     | `/api/user-preferences`                 | Turso                               | Retorna `{ [sectionKey]: value }` con todas las prefs del user                                                                                                        |
| PUT     | `/api/user-preferences`                 | Turso                               | Upsert por `(userId, sectionKey)`. Body `{ sectionKey, value }`. Validación: `sectionKey` matchea `/^[a-z0-9-]{1,64}$/`, `value` objeto plano, body ≤ 10 KB |
| DELETE  | `/api/user-preferences[?section=<key>]` | Turso                               | Sin query borra todas las prefs del user; con `?section=` borra una                                                                                                   |
| ALL     | `/api/auth/[...all]`                    | Turso                               | Handler de Better-Auth (login, oauth, sesiones, etc.)                                                                                                                   |

---

## 10. Autenticación

Implementación: **Better-Auth + Turso (libSQL)**.

### 10.1 Decisiones clave

- **Multi-user, sin self-signup**: el endpoint público de signup está deshabilitado (`disableSignUp: true` en email/password y social Google). Solo el admin crea usuarios.
- **Dos métodos**: email + password y Google OAuth.
- **Enforcement único**: [src/middleware.ts](../src/middleware.ts) cubre todas las rutas. Solo `/login`, `/api/auth/*`, assets estáticos y la cron de snapshots (con bearer `CRON_SECRET`) son públicos.
- **`Astro.locals.user` y `Astro.locals.session`** poblados por el middleware. Tipados en `src/env.d.ts`. Las páginas pueden leer en frontmatter; React islands consultan vía `authClient.useSession()`.
- **Restricción opcional por dominio**: env `ALLOWED_GOOGLE_DOMAIN` (e.g. `bit.lat`) limita OAuth a la organización.
- **Detección de 401**: `useSheetData` detecta respuestas 401 y redirige a `/login` automáticamente.

### 10.2 Comandos

```bash
# Crear un usuario (admin-only) — bypassa disableSignUp via API server-side de Better-Auth
npm run create-user me@bit.lat 'P@ssw0rd' 'Mi Nombre'

# Regenerar el SQL del esquema de auth (después de cambios en plugins/config)
npm run auth:generate
# Luego: turso db shell <db-name> < src/db/auth-schema.sql
# (recordar reaplicar a mano la tabla user_preferences — ver §8.2)
```

### 10.3 Setup inicial (una sola vez)

1. `turso db create project-navigator-auth` y `turso db tokens create project-navigator-auth`.
2. Setear env vars (ver §11).
3. `npm run auth:generate` → genera `src/db/auth-schema.sql`.
4. `turso db shell project-navigator-auth < src/db/auth-schema.sql`.
5. Crear OAuth client en Google Cloud Console; redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`.
6. `npm run create-user ...` para el primer usuario.

---

## 11. Variables de entorno

| Variable                       | Descripción                                                             | Obligatoria |
| ------------------------------ | ------------------------------------------------------------------------ | ----------- |
| `GOOGLE_CREDENTIALS`         | JSON completo de la service account de Google                            | sí         |
| `SHEET_ID`                   | ID del Google Spreadsheet                                                | sí         |
| `TURSO_DATABASE_URL`         | URL libsql de la BD Turso                                                | sí         |
| `TURSO_AUTH_TOKEN`           | Token de la BD Turso                                                     | sí         |
| `BETTER_AUTH_SECRET`         | Secreto de firma de cookies/sesiones (32+ bytes random)                  | sí         |
| `BETTER_AUTH_URL`            | URL canónica del deployment                                             | sí         |
| `GOOGLE_OAUTH_CLIENT_ID`     | OAuth client ID                                                          | sí         |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth client secret                                                      | sí         |
| `ALLOWED_GOOGLE_DOMAIN`      | Restringe OAuth al dominio (e.g.`bit.lat`)                          | no          |
| `CRON_SECRET`                | Bearer que el scheduler externo (EventBridge) envía para pasar auth en `/api/snapshots/auto-capture` | recomendada |

---

## 12. Operación y deploy

### 12.1 Comandos NPM

```bash
npm run dev          # Servidor de desarrollo (localhost:4321)
npm run build        # Build de producción (genera .amplify-hosting/)
npm run preview      # Vista previa del build
npx astro check      # Validación de tipos (TypeScript strict, 0 errors)
npm run create-user  # Crea un usuario (admin-only)
npm run auth:generate # Regenera src/db/auth-schema.sql
```

### 12.2 Deploy

- **Plataforma**: AWS Amplify.
- **Build**: `astro build` con `astro-aws-amplify` adapter, `output: 'server'`.
- **Funciones**: serverless por endpoint + middleware.
- **Cron**: un scheduler externo (AWS EventBridge Scheduler) invoca `0 9 * * 1` → `/api/snapshots/auto-capture` (pendiente de configurar post-migración).
- **Env vars**: configurar en el panel de AWS Amplify (ver §11).

### 12.3 Validación de calidad

- `npx astro check` debe reportar **0 errors, 0 warnings, 0 hints** (97 archivos validados).
- `tsconfig.json` excluye `mcp-server/` (sub-proyecto separado con sus propias deps).
- `npm audit` debe reportar **0 vulnerabilities** (las CVEs transitivas se neutralizan con el bloque `overrides` en `package.json`).

---

## 13. Convenciones de código

### 13.1 Generales

- **Sections** son los **únicos** componentes que llaman hooks de datos. Charts y UI reciben datos por props.
- **`FilterDropdowns`** usa `{ value, label }` para opciones.
- **`DataTable`** es genérico con columnas tipadas.
- **API routes** parsean columnas por **nombre de header**, no por índice. Reordenar columnas en el Sheet no rompe el API.
- **Sheets con espacios** en el nombre requieren quoting en el range (e.g. `"'Nombre con espacios'!A1:B10"`).

### 13.2 Persistencia

- **Dashboard config**: `localStorage['pn-dashboard-config']` (widgets visibles y orden).
- **Theme**: `localStorage['project-navigator-theme']`.
- **Filtros por sección**: `localStorage['pn-prefs-<sectionKey>']` (cache anti-flash) + Turso `user_preferences` (cross-device).
- **Snapshots**: `localStorage['pn-weekly-snapshots']` + Sheet tab `Snapshots`.

### 13.3 IDs de sección persistidos

Slugs en kebab-case que matchean `/^[a-z0-9-]{1,64}$/`. Los 12 actuales: `proyectos`, `timeline`, `cronograma`, `cursos`, `dashboard`, `resumen`, `alertas`, `pronosticos`, `costos`, `distribucion`, `metricas-dev`, `roadmap`.

### 13.4 Slugs de folios

Folios con `/` (e.g. `H/PROJECT-34`) se convierten para URL via `slugs.ts`: `H/PROJECT-34` ↔ `H--PROJECT-34`.

---

## 14. Estructura del repo

```
project-navigator/
├── CHANGELOG.md              # Historial de releases (parseado por /novedades)
├── CLAUDE.md                 # Instrucciones para Claude Code
├── README.md                 # Quickstart
├── astro.config.mjs          # Astro + adapter AWS Amplify + Tailwind
├── package.json              # Deps + scripts + overrides de seguridad
├── tsconfig.json             # TS strict, excluye mcp-server/
├── docs/
│   └── PROYECTO.md           # (este archivo)
├── scripts/
│   └── createUser.ts         # Script admin para crear usuarios
├── src/
│   ├── middleware.ts         # Auth gate único
│   ├── env.d.ts              # Tipos de Astro.locals
│   ├── layouts/
│   │   └── Layout.astro      # Sidebar + Header + theme + auth context
│   ├── pages/
│   │   ├── *.astro           # 20 páginas
│   │   ├── persona/[nombre].astro
│   │   ├── proyecto/[folio].astro
│   │   ├── pronosticos/[folio].astro
│   │   └── api/
│   │       ├── proyectos.ts costos.ts costos-modelo.ts cursos.ts tareas.ts
│   │       ├── snapshots.ts
│   │       ├── snapshots/auto-capture.ts
│   │       ├── user-preferences.ts
│   │       └── auth/[...all].ts
│   ├── components/
│   │   ├── layout/           # Header.tsx, Sidebar.tsx
│   │   ├── auth/             # LoginForm.tsx, UserMenu.tsx
│   │   ├── ui/               # 26 componentes (KPICard, DataTable, FilterDropdowns, …)
│   │   ├── charts/           # 8 charts (EstatusDonut, SaludDonut, HitoProgress, …)
│   │   └── sections/         # 19 sections (una por ruta)
│   ├── hooks/                # useSheetData, useDashboardConfig, useSnapshotCapture, usePersistedFilters
│   ├── utils/                # 16 utilidades puras
│   ├── data/
│   │   └── glossary.ts       # 149 entradas del glosario (single source of truth)
│   └── db/
│       ├── client.ts         # Cliente Turso
│       └── auth-schema.sql   # Schema Better-Auth + tabla manual user_preferences
└── mocks/                    # Datos mock (legacy, no usados en runtime)
```

---

## 15. Características destacadas (highlights)

Lista corta de cosas no obvias que diferencian al producto.

1. **Motor de pronóstico determinista** sin dependencias de ML: usa snapshots semanales + sesgo de estimación + velocity histórica para producir fechas con confianza y backtest medible (MAE, % dentro de ±7d / ±14d).
2. **Persistencia per-user cross-device**: filtros y toggles sobreviven recargas y se sincronizan entre dispositivos vía Turso, sin polling.
3. **Anti-flash hydration**: el hook `usePersistedFilters` hidrata sincrónicamente desde `localStorage` y luego refresca desde el server, evitando el típico parpadeo de filtros vacíos en el primer render.
4. **Cron semanal de snapshots** independiente de la UI: aunque nadie abra el dashboard una semana, el scheduler externo (EventBridge) captura el snapshot.
5. **Glosario in-product con 149 entradas y deep-linkable**: cada KPI tiene un tooltip y un anchor en `/glosario` que enlaza al código fuente en GitHub.
6. **Filtro por PM con integridad de snapshots y costos**: ninguna agregación de costo prorrateado se infla cuando se filtra por PM (los divisores siguen usando el dataset completo).
7. **0 vulnerabilidades en `npm audit`** y 0 errores en `npx astro check` como contratos de calidad.
8. **Fuzzy name matching bidireccional** para reconciliar apodos cortos (Projects sheet) con nombres completos (Cursos / Cronograma sheets).
9. **Sin self-signup**: usuarios solo se crean por admin (`npm run create-user`), reduciendo superficie de ataque.
10. **Auth gate de una sola línea**: cualquier endpoint nuevo en `/api/*` queda protegido por default gracias al middleware único.

---

## 16. Cosas que **NO** hace el producto (por diseño)

- **No escribe al Sheet** salvo para snapshots semanales. El dashboard es read-only sobre los datos operativos.
- **No tiene self-signup**. Los usuarios se crean exclusivamente por admin.
- **No persiste búsquedas libres ni paginación**. Son exploratorios y molestan al quedar "pegados".
- **No filtra por PM en `/cronograma`, `/cursos` ni `/equipo`** (`TareaRecord` no tiene `pm`; los otros dos no derivan de proyectos).
- **No tiene upload de avatar** (placeholder por ahora; ver §5.16).
- **No expone `/metricas-dev` en el sidebar** (decisión documentada en CHANGELOG v1.1.0).
- **No usa ML** en el motor de pronóstico. Es 100% determinista y backtest-able.

---

## 17. Referencias rápidas

- **CHANGELOG**: [`/CHANGELOG.md`](../CHANGELOG.md) — historial completo de releases.
- **CLAUDE.md**: [`/CLAUDE.md`](../CLAUDE.md) — instrucciones detalladas para Claude Code (convenciones, comandos, gotchas).
- **README**: [`/README.md`](../README.md) — quickstart mínimo.
- **Glosario in-product**: `/glosario` (149 entradas con links a código).
- **Novedades in-product**: `/novedades` (parseado de CHANGELOG.md).
