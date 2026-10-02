# Documentación técnica — Project Navigator

Documentación para desarrolladores que mantienen, extienden o depuran Project Navigator. Asume conocimiento básico de TypeScript, React, Astro y Tailwind.

Para una visión narrativa del producto y su arquitectura general, lee primero [PROYECTO.md](../PROYECTO.md).

Para guías de usuario final (no técnicas), ve a [user/](../user/).

## Mapa de la documentación dev

```
dev/
├── README.md                ← estás aquí
├── arquitectura/
│   ├── overview.md          ← stack, capas, decisiones globales
│   ├── diagramas.md         ← sitemap + capas + páginas→API + auth (Mermaid)
│   ├── data-flow.md         ← cómo viajan los datos del Sheet al render
│   ├── auth.md              ← Better-Auth + Turso, middleware, sesiones, rate limit
│   ├── seguridad.md         ← modelo de amenaza, headers/CSP, sourcemaps, validación
│   └── convenciones.md      ← reglas del codebase (filtro PM, persistencia, etc.)
│
├── secciones/               ← una doc por section component
│   ├── README.md            ← índice + matriz sección → hooks/utils/endpoints
│   ├── dashboard.md
│   ├── resumen.md
│   ├── alertas.md
│   ├── portafolio.md
│   ├── roadmap.md
│   ├── timeline.md
│   ├── cronograma.md
│   ├── pronosticos.md
│   ├── pronostico-detalle.md
│   ├── distribucion.md
│   ├── equipo.md
│   ├── cursos.md
│   ├── costos.md
│   ├── novedades.md
│   ├── glosario.md
│   ├── metricas-dev.md
│   ├── proyecto-detalle.md
│   ├── persona-detalle.md
│   ├── cuenta.md
│   └── admin.md             ← módulo de usuarios y permisos (sólo rol admin)
│
├── api/                     ← endpoints SSR (lectura/escritura de Sheets + Turso)
│   ├── README.md
│   ├── proyectos.md
│   ├── costos.md
│   ├── costos-modelo.md
│   ├── cursos.md
│   ├── tareas.md
│   ├── equipo.md            ← registro canónico del equipo (GET, Turso, role-open)
│   ├── snapshots.md
│   ├── snapshots-auto-capture.md
│   ├── user-preferences.md
│   ├── me-permissions.md    ← permisos efectivos del usuario actual
│   ├── me-mcp-tokens.md     ← tokens MCP del usuario (GET/POST/DELETE)
│   ├── glossary.md          ← glosario filtrado por permisos (para el MCP)
│   ├── admin-equipo.md      ← gestión del registro equipo (POST/PUT, requiere action:equipo:manage)
│   └── admin-overrides.md   ← CRUD de overrides de permiso (requiere action:user:manage)
│
├── utils/                   ← pura lógica de cálculo, sin side-effects
│   ├── README.md
│   ├── forecastEngine.md    ← motor de pronóstico determinista
│   ├── healthScore.md       ← cálculo de salud y alertas
│   ├── costEngine.md        ← estimación de costos y modelo financiero
│   ├── snapshots.md         ← persistencia semanal local + remota
│   ├── colors.md            ← paleta centralizada para charts y badges
│   ├── dataTransforms.md    ← tipos + helpers genéricos
│   ├── slugs.md             ← folio ↔ URL-safe
│   ├── stale.md             ← detección de proyectos estancados
│   ├── anomalies.md         ← detección de slowdown/stall/acceleration
│   ├── dependencies.md      ← análisis de bloqueadores
│   ├── courseForecast.md    ← proyección de cursos
│   ├── forecastAlerts.md    ← integración de alertas de pronóstico
│   ├── backtest.md          ← validación del motor de pronóstico
│   ├── changelog.md         ← parser de CHANGELOG.md
│   ├── recharts.md          ← helpers de Recharts
│   └── theme.md             ← toggle dark/light
│
├── hooks/                   ← hooks React reutilizables
│   ├── README.md
│   ├── useSheetData.md
│   ├── usePersistedFilters.md
│   ├── useSnapshotCapture.md
│   ├── useDashboardConfig.md
│   └── usePermissions.md    ← permisos del usuario para la UX (anti-flash)
│
├── componentes/             ← UI compartida y charts
│   ├── README.md
│   ├── ui.md                ← KPICard, FilterDropdowns, DataTable, ProjectCard, etc.
│   └── charts.md            ← Donut, Bar, Gantt, etc.
│
├── mcp-server.md            ← servidor MCP (arquitectura, tools, sincronización de tipos, anti-chain)
│
└── agentes/                 ← infraestructura de Claude Code (agentes, comandos, hooks)
    ├── README.md
    ├── docs-keeper.md       ← agente que mantiene documentation/ en sync con src/
    └── hooks.md             ← Stop reminder + convenciones para hooks nuevos
```

## Cómo leer estos docs

Cada **sección** documenta:

- **Propósito** (qué hace la pantalla).
- **Componentes y archivos involucrados** (con enlaces a [src/](../../src/)).
- **Datos de entrada** (endpoints, hooks, props).
- **Reglas de negocio** (cálculos, transformaciones, comportamientos no obvios).
- **Persistencia** (qué se guarda en `localStorage`, en Turso, en el Sheet).
- **Casos edge** y consideraciones (nombres de personas, snapshot integrity, divisores compartidos, etc.).

Cada **utility** documenta:

- **Función pública** (firma TypeScript).
- **Algoritmo** (qué cálculo hace, qué pondera, qué retorna).
- **Quién la usa** (callers principales).
- **Casos de borde**.

## Reglas globales que aplican a todo el código

Antes de modificar nada, revisa:

1. [arquitectura/convenciones.md](arquitectura/convenciones.md) — convenciones del codebase (filtro PM, persistencia per-user, name matching, etc.).
2. [arquitectura/seguridad.md](arquitectura/seguridad.md) — modelo de amenaza y reglas para agregar endpoints, componentes con HTML inseguro, o dependencias nuevas.
3. [CLAUDE.md](../../CLAUDE.md) en la raíz del repo — instrucciones para asistentes y resumen ejecutivo de toda la arquitectura.

## Comandos esenciales

```bash
npm run dev              # localhost:4321
npm run build            # build de producción
npx astro check          # validación de tipos (debe ser 0 errores)
npm run create-user <email> <pw> <nombre> [rol]  # crea usuario (roles: admin, directores, gerentes, pm, dev, ventas)
npm run auth:generate    # regenera src/db/auth-schema.sql (¡ojo: reagregar user_preferences, user_permission_override, rateLimit!)
```

## Stack en una línea

Astro 6 SSR + React 19 islands + Tailwind 4 + Recharts + `googleapis` (Sheets) + Turso (libSQL) + Better-Auth + AWS Amplify.
