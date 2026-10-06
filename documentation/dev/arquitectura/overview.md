# Arquitectura — Visión general

## Stack

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Runtime | Node.js | ≥ 24.0.0 | Node 24 LTS (Krypton) |
| Framework | Astro | ^6.2.2 | Output `server` (SSR full) |
| Adapter | `astro-aws-amplify` | ^0.4.1 | Deploy serverless en AWS Amplify (Lambda) |
| UI | React | ^19.2.4 | Islands con `client:load` |
| Estilos | Tailwind CSS | ^4.2.2 | Plugin `@tailwindcss/vite` |
| Charts | Recharts | ^3.8.1 | Donuts, barras, gantt-like |
| Iconos | lucide-react | ^1.7.0 | Iconografía consistente |
| Datos operativos | googleapis | ^171.4.0 | Service account → Google Sheets |
| BD auth + prefs | @libsql/client | ^0.17.3 | Cliente Turso (libSQL) |
| Auth | Better-Auth | ^1.6.9 | Email+password + Google OAuth |
| Type-check | TypeScript | ^5.9.3 | `strict: true`, `npx astro check` |

## Topología

> 📊 **Versión visual en Mermaid**: [diagramas.md](./diagramas.md) — incluye sitemap, capas, mapeo páginas↔API y flujo de auth como sequence diagram.

```
┌─────────────────────────────────────────────────────────────────┐
│                  AWS Amplify (SSR + Lambda)                     │
│  ┌────────────────┐    ┌─────────────────────────────────────┐  │
│  │  Páginas .astro│───▶│ React islands (sections + charts)  │  │
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
└─────────┼──────────────────────────────┼────────────────────────┘
          ▼                              ▼
   ┌────────────────┐            ┌────────────────────┐
   │ Turso (libSQL) │            │ Google Sheets API  │
   │ user/session/  │            │ (service account)  │
   │ account/prefs  │            │  Projects / Cursos │
   └────────────────┘            │  proyectos / cursos│
   │ snapshot       │            │  Costos / activid. │
   │ equipo / prefs │            │  sprint / capacid. │
   └────────────────┘            └────────────────────┘
```

## Capas y responsabilidades

| Capa | Ubicación | Responsabilidad | Regla |
|---|---|---|---|
| Página | [src/pages/*.astro](../../../src/pages/) | Layout + montaje de section island | Sin lógica |
| Section | [src/components/sections/](../../../src/components/sections/) | **Única** capa que llama hooks de datos. Calcula KPIs, aplica filtros | Una por ruta |
| Chart/UI | [src/components/charts/](../../../src/components/charts/), [src/components/ui/](../../../src/components/ui/) | Reciben datos por props, sin side-effects | Reutilizables |
| Hook | [src/hooks/](../../../src/hooks/) | Fetch, persistencia, snapshots, permisos | Genéricos tipados |
| Util | [src/utils/](../../../src/utils/) | Pura lógica de cálculo (health, forecast, costos…) | Sin side-effects |
| Lib | [src/lib/](../../../src/lib/) | Auth, permisos, error mapping | Server-side |
| API | [src/pages/api/](../../../src/pages/api/) | SSR endpoints (Sheets + Turso). Cache 5 min en lecturas | Parsean por header |
| Middleware | [src/middleware.ts](../../../src/middleware.ts) | Auth gate + permisos de página/API | Cubre toda `/` excepto `/login`, `/api/auth/*`, assets, cron |
| Layout | [src/layouts/Layout.astro](../../../src/layouts/Layout.astro) | Sidebar + Header + theme + auth context + `window.__PN_PERMS__` | — |

**Regla de oro:** sólo los **Section components** llaman `useSheetData`. Charts y UI reciben datos por props. Esto mantiene el árbol de dependencias plano y los componentes reusables (puedes pasarles datos mock en Storybook, en otras secciones, etc.).

## Fuentes de verdad

Dos sistemas externos:

1. **Google Sheets** — datos operativos del portafolio (tabs en lowercase desde mayo 2026):
   - Tab `proyectos` — portafolio de proyectos (antes `Projects`).
   - Tab `cursos` — progreso del equipo (antes `Cursos`).
   - Tab `Costos` — costos por rol + modelo financiero de pricing (sin cambio).
   - Tab `actividades` — tareas granulares unificadas (antes `app` + `Core`).
   - Tab `sprint` — calendario de sprints (nueva).
   - Tab `capacidades` — disponibilidad por persona por sprint (nueva).
   - Tab `equipo` — directorio del equipo en el Sheet (las lecturas canónicas usan Turso).
   - Tab `Snapshots` — historial de auditoría pasivo (las escrituras nuevas van a Turso).
2. **Turso (libSQL)** — datos del tablero:
   - 4 tablas de Better-Auth (`user`, `session`, `account`, `verification`) — con columnas extra del admin plugin en `user` (`role`, `banned`, `banReason`, `banExpires`) y en `session` (`impersonatedBy`).
   - Tabla `user_preferences` (manual) — filtros/toggles per-user, per-section.
   - Tabla `user_permission_override` (manual) — overrides de permiso por usuario (`userId`, `resource`, `effect`).
   - Tabla `equipo` + `roles` + `equipo_rates` — registro canónico del equipo de BIT.
   - Tabla `snapshot` — histórico semanal de snapshots (PK: `weekKey, kind, identifier`). Desde mayo 2026 reemplaza la escritura en la tab `Snapshots` del Sheet.
   - Tabla `nexus_request` (manual) — registro de peticiones al servicio de IA Nexus (`ai.bit.lat`, NAV-85). PK: `ulid`. Persiste `webhook_url`, `status` (`pending`/`completed`/`failed`), `response_data` (JSON cache permanente), `cost` y `model`. FK opcional a `user.id` (`ON DELETE SET NULL`). Ver migración en [src/db/migrations/2026-nexus-requests.sql](../../../src/db/migrations/2026-nexus-requests.sql).

**El tablero nunca escribe en `proyectos`, `cursos`, `Costos`, `actividades`, `sprint`, `capacidades`.** Escribe en `snapshot` (Turso) vía `POST /api/snapshots` y el cron semanal.

## Decisiones globales

### SSR full (no static)

Astro está configurado con `output: 'server'`. Cada request va al lambda, que valida sesión y renderiza. Esto permite:

- Auth real (no se puede protegér un static site con middleware).
- Lecturas frescas de Sheets cada 5 min sin redeploy.
- Endpoints `/api/*` co-locados.

Trade-off: cold starts en AWS Amplify (Lambda) y más facturación que un site estático. Aceptable para una herramienta interna con tráfico moderado.

### React islands

Cada página `.astro` monta **una** sección React con `client:load`. No hay SPA: cada navegación es un request fresco al SSR. Esto evita problemas de hidratación de estado global y mantiene cada sección autónoma.

### Cache en memoria de los endpoints

`let cache = { data, timestamp }` con TTL de 5 minutos por archivo de endpoint. Por instancia de lambda. Trade-offs:

- ✅ Reduce drásticamente las llamadas a Sheets (cuota gratis: 60 reads/min/usuario, fácil de saturar).
- ✅ Implementación trivial.
- ⚠️ Cada lambda tiene su propia cache; un usuario podría caer en un lambda con cache fría tras una warm.
- ⚠️ No hay invalidación manual; el usuario debe esperar hasta 5 min para ver cambios del Sheet (el botón de refresh refetch del endpoint, no del Sheet).

### TypeScript strict

`tsconfig.json` extiende `astro/tsconfigs/strict`. `npx astro check` debe pasar con 0 errores antes de merge. No hay `any` implícitos.

### Tailwind v4

Tailwind v4 usa el plugin Vite (no `tailwind.config.js`). Las clases dinámicas (e.g. `bg-${color}-500`) no funcionan; siempre se construyen con maps o conditional class strings.

### Build sin source maps

[astro.config.mjs](../../../astro.config.mjs) fuerza `vite.build.sourcemap: false` para evitar publicar el TypeScript original en producción. Si se integra observability (Sentry, etc.), usar `'hidden'` y subir los maps privadamente al proveedor. Ver [seguridad.md](seguridad.md#source-maps-en-producción).

### Security headers en el middleware

[src/middleware.ts](../../../src/middleware.ts) aplica (vía la constante `SECURITY_HEADERS` + `withSecurityHeaders`) a toda respuesta SSR: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS y un `Content-Security-Policy-Report-Only` en transición a enforce. Viven en el código (no en config del host como antes `vercel.json`) para que sobrevivan migraciones de plataforma. Detalle y proceso de promoción en [seguridad.md](seguridad.md#security-headers).

## Paquetes lock & seguridad

`package.json` declara un bloque `overrides` que pin-ea versiones seguras de deps transitivas para neutralizar CVEs (ej. `lodash`, `axios`, etc.). Revisa `package-lock.json` y `npm audit` antes de actualizar deps mayores.

## Cron semanal

El cron lo dispara **Vercel Cron**, configurado en [`vercel.json`](../../../vercel.json):

```json
{
  "crons": [
    {
      "path": "/api/snapshots/auto-capture",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

Vercel envía automáticamente `Authorization: Bearer <CRON_SECRET>` si la env var está configurada.

Cada lunes 9am UTC, el scheduler invoca `GET /api/snapshots/auto-capture`. El endpoint:

1. Verifica el header `Authorization: Bearer <CRON_SECRET>` (el scheduler debe mandarlo).
2. Lee `proyectos` y `cursos` del Sheet.
3. Construye un `WeeklySnapshot` con el `weekKey` ISO de esa semana.
4. Upserta en Turso (tabla `snapshot`): `DELETE` de la semana + `INSERT` de cada entrada.

Ver [api/snapshots-auto-capture.md](../api/snapshots-auto-capture.md).

## Variables de entorno

Listadas en [CLAUDE.md](../../../CLAUDE.md) sección "Environment Variables". Resumen:

| Variable | Para qué |
|---|---|
| `GOOGLE_CREDENTIALS` | JSON completo del service account |
| `SHEET_ID` | ID del Spreadsheet maestro |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Conexión a Turso |
| `BETTER_AUTH_SECRET` | Firma de cookies (32+ bytes random) |
| `BETTER_AUTH_URL` | URL canónica del deployment |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth de Google |
| `ALLOWED_GOOGLE_DOMAIN` | Opcional. Restringe registro de users al dominio |
| `CRON_SECRET` | Bearer token para el cron de snapshots (lo envía el scheduler externo) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT` | Credenciales y endpoint S3-compatible de Cloudflare R2 |
| `R2_BUCKET_NAME` / `AVATAR_S3_BUCKET` | Bucket en Cloudflare R2 o AWS S3 para avatares de perfil |
| `R2_PUBLIC_URL` / `AVATAR_CDN_URL` | URL pública directa (ej. `https://pub-...r2.dev`) o dominio personalizado CDN |
| `AWS_REGION` | Opcional. Región del bucket (`auto` para Cloudflare R2; default `us-east-1` en AWS) |
| `AI_BEARER_TOKEN` | Bearer token server-side para `POST /api/cs360/analyze`. Si falta, ese endpoint responde 503 y el tablero CS 360 funciona sin IA (el botón "Generar" muestra un mensaje amigable). El prompt completo y el modelo se administran en el panel de Nexus (`ai.bit.lat`), no aquí |
| `CS360_DATA_URL` | URL pública del export del tablero CS 360 publicado por Samva (`static.samva.io`; el path trae un GUID que puede cambiar al regenerarse el export — por eso es env var). **Fuente de producción preferida**; si falla o falta, se prueba el S3 propio |
| `CS360_S3_BUCKET` | Bucket S3 privado con el export real del tablero CS 360 (fallback de producción). Se sube con `npm run cs360:upload`. Si falta, se prueba el archivo local y luego el mock curado |
| `CS360_S3_KEY` | Opcional. Key del objeto del export en S3 (default `cs360/contratos_exportados.json.gz`) |
| `CS360_DATA_FILE` | Opcional. Ruta al export real local para dev. Default: `mocks/healt-score/contratos_exportados.json` (gitignored). Si no existe, el tablero cae al mock curado de `src/data/` |

`.env.example` documenta todas. En AWS Amplify o el hosting de producción, configurar en el panel de variables de entorno.

## Comandos

```bash
npm run dev          # localhost:4321 con HMR
npm run build        # genera .amplify-hosting/
npm run preview      # sirve el build
npx astro check      # type-check (debe ser 0 errores)
npm run create-user <email> <password> <nombre> [rol]  # admin-only: crea usuario en Turso
# Roles válidos: admin, directores, gerentes, pm, dev, ventas (default: dev)
npm run auth:generate  # regenera src/db/auth-schema.sql (reagregar tablas manuales después)
```
