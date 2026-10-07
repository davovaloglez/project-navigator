# Project Navigator — Vortex IT

Dashboard de gestion de portafolio de proyectos y seguimiento de cursos del equipo.

Construido con **Astro 6** + **React 19** + **Tailwind CSS v4** + **Recharts** + **Google Sheets API**, desplegado en **Vercel**.

## Requisitos

- Node.js >= 24.0.0
- Cuenta de servicio de Google con acceso al Spreadsheet
- Vercel (para deploy)

## Instalacion

```bash
git clone <repo-url>
cd project-navigator
npm install
```

## Variables de entorno

Crea un archivo `.env` basado en `.env.example`. El listado completo de variables requeridas y opcionales (Turso, Better-Auth, Google OAuth, S3, CS360, IA) esta documentado en:

- **`.env.example`** — fuente de verdad con comentarios por variable
- **`CLAUDE.md` → sección "Environment Variables"** — descripcion detallada de cada variable

Todas las variables son requeridas en produccion excepto las que `.env.example` marca explicitamente como opcionales.

## Comandos

```bash
npm run dev        # Servidor de desarrollo (localhost:4321)
npm run build      # Build de produccion (genera dist/)
npm run preview    # Vista previa del build
npm run check      # Validacion de tipos (TypeScript strict, via astro check)
npm test           # Suite de pruebas unitarias (Vitest)
```

## Paginas

Ver **`CLAUDE.md` → sección "Pages"** para la tabla completa y actualizada de rutas, componentes y descripciones.

Rutas de ejemplo: `/proyecto/[id]` (detalle de proyecto) y `/persona/[id]` (perfil de persona).

## Arquitectura

```
src/
├── hooks/           # useSheetData, useDashboardConfig, usePersistedFilters
├── utils/           # colors, dataTransforms, healthScore, slugs, costEngine, forecastEngine, ...
├── lib/             # auth, permissions, equipoMatch, equipoResolver, ...
├── layouts/         # Layout.astro
├── components/
│   ├── layout/      # Sidebar, Header
│   ├── ui/          # KPICard, StatusBadge, FilterDropdowns, DataTable, PaginationControls, ...
│   ├── charts/      # ChartCard, EstatusDonut, SaludDonut, PrioridadBar, ...
│   └── sections/    # DashboardSection, ProyectosSection, CursosSection, ...
├── pages/
│   ├── api/         # Endpoints SSR (proyectos, tareas, cursos, equipo, costos, snapshots, ...)
│   └── *.astro      # Paginas
└── styles/          # global.css
```

### Data Flow

1. **API Routes** (`/api/*`) — autentican con Google Sheets o Turso, cachean 5 min, retornan JSON
2. **useSheetData** — hook cliente con fetch, retry automatico, abort controller
3. **Sections** — unicos que llaman hooks, calculan KPIs, filtran datos
4. **Charts/UI** — reciben datos por props

## API Endpoints

Ver **`CLAUDE.md` → sección "API Endpoints"** para la tabla completa y actualizada.

## Deploy

El proyecto esta configurado para Vercel con el adapter `@astrojs/vercel` y output `server`.

```bash
npm run build    # Genera dist/ (.vercel/output/ via adapter)
```

Las variables de entorno deben configurarse en el panel de Vercel (Settings → Environment Variables).

## Licencia

Proyecto interno de Vortex IT.
