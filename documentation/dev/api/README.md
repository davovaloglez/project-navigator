# API endpoints

Documentación de los endpoints SSR expuestos por Project Navigator. Todos viven en [src/pages/api/](../../../src/pages/api/) y se ejecutan como funciones lambda en AWS Amplify.

## Convenciones globales

### Autenticación y autorización

El [middleware](../../../src/middleware.ts) protege **todas** las rutas de la aplicación. Sólo son públicos:

- `/login` y los assets estáticos (`/_astro/*`, `/favicon.svg`, etc.).
- `/api/auth/*` — manejado por Better-Auth.
- `/api/snapshots/auto-capture` — sólo si trae header `Authorization: Bearer <CRON_SECRET>` válido.

Sin sesión: `401 { error: 'No autorizado. Inicia sesión de nuevo.', code: 'UNAUTHORIZED' }`. El cliente ([useSheetData](../../../src/hooks/useSheetData.ts)) detecta el 401 y redirige a `/login?redirect=<path>`.

Sin permiso: `403 { error: '...', code: 'FORBIDDEN' }`. El cliente setea `forbidden: true` — no es error fatal, no hay retry.

Los endpoints autenticados pueden leer la sesión vía `Astro.locals.user` y `Astro.locals.session` (poblados por el middleware, tipados en [src/env.d.ts](../../../src/env.d.ts)).

**Endpoints gateados por permiso (además de sesión):**

| Endpoint | Permiso requerido |
|---|---|
| `GET /api/costos`, `GET /api/costos-modelo` | `data:costos` |
| `POST /api/snapshots` | `action:snapshot:create` |
| `POST/PUT /api/admin/equipo` | `action:equipo:manage` |
| `POST/DELETE /api/admin/avatar` | `action:user:manage` |
| `GET/PUT/DELETE /api/admin/overrides` | `action:user:manage` |
| `GET /api/evaluaciones` | `action:evaluacion:view-all` |
| `POST/DELETE /api/admin/evaluaciones` | `action:evaluacion:manage` |
| `GET /api/glossary` | `page:glosario` |
| `POST /api/cs360/analyze`, `GET /api/cs360/analyze/[requestId]` | `page:cs360` (admin-only por default) |
| `/api/auth/admin/*` | Rol `admin` (vía admin plugin de Better-Auth) |

**Autenticación con tokens MCP:**

Los requests que lleven `Authorization: Bearer pn_mcp_*` se resuelven contra la tabla `mcp_token` en Turso (vía [src/lib/mcpToken.ts](../../../src/lib/mcpToken.ts)). El pipeline de permisos corre idéntico al de sesiones de browser; `locals.session = null`. Ver [arquitectura/auth.md](../arquitectura/auth.md#servidor-mcp-y-tokens-mcp).

### Parseo por nombre de header

Los endpoints que leen Google Sheets **nunca** indexan por posición; siempre leen la primera fila como header y matchean por nombre (case-insensitive, con `trim()`):

```ts
const headers = rows[0].map((h: string) => h.trim().toLowerCase());
const col = (row: string[], name: string): string => {
  const idx = headers.indexOf(name.toLowerCase());
  return idx >= 0 ? (row[idx] || '').trim() : '';
};
```

Implicaciones:

- Reordenar columnas en el Sheet no rompe nada.
- Renombrar un header sí rompe (cae a string vacío). Hay que actualizar el código.
- Caracteres especiales se respetan exactos (e.g. la columna `Épica` se busca como `'épica'`).
- Tabs con nombre con espacios requieren quoting en el range: `"'Mi Tab'!A1:B10"`.

### Cache

Lecturas usan cache en memoria de **5 minutos** (`CACHE_TTL = 5 * 60 * 1000`):

```ts
let cache: { data: unknown; timestamp: number } | null = null;
if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cachedResponse;
```

- El cache vive **por archivo / por lambda warm**. No es global y no hay invalidación manual.
- Amplify mantiene lambdas warm por unos minutos. Una lambda fría arranca con cache vacío.
- Los endpoints mutantes (`POST/PUT/DELETE` de snapshots y `user-preferences`) **no cachean**.

### Errores

Formato uniforme:

```ts
return new Response(JSON.stringify({ error: message }), {
  status: 500,
  headers: { 'Content-Type': 'application/json' },
});
```

`message` viene de `error instanceof Error ? error.message : 'Error desconocido'`. El cliente reintenta 1 vez en errores no-401.

## Inventario

| Método | Path | Fuente | Cache | Propósito |
|---|---|---|---|---|
| GET | [`/api/proyectos`](proyectos.md) | `proyectos!A1:AH300` | 5 min | Portafolio de proyectos (`ProjectRecord[]`); identidad por `id`; roles multi-persona (`pmIds`/`arquitectoIds`/`devIds`/`poIds`/`sqaIds`) |
| GET | [`/api/costos`](costos.md) | `Costos!A1:G50` (filas 1-12) | 5 min | Costos por rol (`CostoRecord[]`) — requiere `data:costos` |
| GET | [`/api/costos-modelo`](costos-modelo.md) | `Costos!A1:G50` (filas 13-21) | 5 min | Modelo financiero de pricing — requiere `data:costos` |
| GET | [`/api/cursos`](cursos.md) | `cursos!A1:J50` | 5 min | Progreso de cursos (`CursoRecord[]`); `equipoId` y `jefeId` resueltos |
| GET | [`/api/tareas`](tareas.md) | `actividades!A1:Z500` | 5 min | Tareas granulares hoja unificada (`TareaRecord[]`); ya no discrimina App/Core |
| GET | [`/api/sprints`](sprints.md) | `sprint!A1:J20` | 5 min | Calendario de sprints (`SprintRecord[]`) |
| GET | [`/api/capacidades`](capacidades.md) | `capacidades!A1:F60` | 5 min | Capacidad por persona por sprint (`CapacidadRecord[]`) |
| GET | [`/api/equipo`](equipo.md) | Turso (`equipo` + `roles`) | no-store | Registro canónico del equipo (`EquipoRecord[]` + catálogo de roles) |
| GET | [`/api/snapshots`](snapshots.md) | Turso (`snapshot`) | — | Histórico de snapshots semanales — identidad de proyecto por `id` |
| POST | [`/api/snapshots`](snapshots.md) | Turso (`snapshot`, write) | — | Upsert de snapshot semanal — requiere `action:snapshot:create` |
| GET | [`/api/snapshots/auto-capture`](snapshots-auto-capture.md) | `proyectos` + `cursos` → Turso | — | Cron semanal (scheduler externo, EventBridge) con bearer `CRON_SECRET` |
| GET | [`/api/user-preferences`](user-preferences.md) | Turso (`user_preferences`) | — | Lee todas las prefs del usuario actual |
| PUT | [`/api/user-preferences`](user-preferences.md) | Turso (`user_preferences`) | — | Upsert de pref por `(userId, sectionKey)` |
| DELETE | [`/api/user-preferences`](user-preferences.md) | Turso (`user_preferences`) | — | Borra una sección o todas |
| GET | [`/api/me/permissions`](me-permissions.md) | Turso (`user_permission_override`) | no-store | Permisos efectivos del usuario actual |
| POST | [`/api/me/avatar`](me-avatar.md) | Amazon S3 + Turso (read) | no-store | Sube/reemplaza la foto del usuario autenticado |
| DELETE | [`/api/me/avatar`](me-avatar.md) | Amazon S3 + Turso (read) | no-store | Elimina la foto del usuario autenticado |
| GET | [`/api/me/mcp-tokens`](me-mcp-tokens.md) | Turso (`mcp_token`) | no-store | Lista metadata de los tokens MCP del usuario |
| POST | [`/api/me/mcp-tokens`](me-mcp-tokens.md) | Turso (`mcp_token`) | no-store | Crea token MCP y devuelve plaintext una vez — sólo sesiones de browser |
| DELETE | [`/api/me/mcp-tokens`](me-mcp-tokens.md) | Turso (`mcp_token`) | no-store | Revoca token MCP por `?prefix=` |
| GET | [`/api/me/evaluaciones`](me-evaluaciones.md) | — | no-store | **DESACTIVADO** — siempre retorna `403 EVALUACION_DISABLED` |
| POST | [`/api/me/evaluaciones`](me-evaluaciones.md) | — | no-store | **DESACTIVADO** — siempre retorna `403 EVALUACION_DISABLED` |
| GET | [`/api/evaluaciones`](evaluaciones.md) | Turso (`evaluacion`) | no-store | Todas las evaluaciones cross-persona — requiere `action:evaluacion:view-all` |
| GET | [`/api/glossary`](glossary.md) | `src/data/glossary.ts` (estático) | private 60 s | Glosario filtrado por permisos — requiere `page:glosario` |
| POST | [`/api/admin/equipo`](admin-equipo.md) | Turso (`equipo`) | no-store | Crea un miembro del registro — requiere `action:equipo:manage` |
| PUT | [`/api/admin/equipo`](admin-equipo.md) | Turso (`equipo`) | no-store | Edita un miembro existente — requiere `action:equipo:manage` |
| POST | [`/api/admin/avatar`](admin-avatar.md) | Amazon S3 + Turso (read) | no-store | Sube/reemplaza foto de otro usuario — requiere `action:user:manage` |
| DELETE | [`/api/admin/avatar`](admin-avatar.md) | Amazon S3 + Turso (read) | no-store | Elimina foto de otro usuario — requiere `action:user:manage` |
| POST | [`/api/admin/evaluaciones`](admin-evaluaciones.md) | Turso (`evaluacion`) | no-store | Upsert de evaluación de cualquier persona — requiere `action:evaluacion:manage` |
| DELETE | [`/api/admin/evaluaciones`](admin-evaluaciones.md) | Turso (`evaluacion`) | no-store | Borra evaluación por (equipoId, periodo) — requiere `action:evaluacion:manage` |
| GET | [`/api/admin/overrides`](admin-overrides.md) | Turso (`user_permission_override`) | — | Overrides de un usuario — requiere `action:user:manage` |
| PUT | [`/api/admin/overrides`](admin-overrides.md) | Turso (`user_permission_override`) | — | Upsert de override — requiere `action:user:manage` |
| DELETE | [`/api/admin/overrides`](admin-overrides.md) | Turso (`user_permission_override`) | — | Borra override(s) — requiere `action:user:manage` |
| GET | `/api/admin/user-equipo?userId=` | Turso (`user` + `equipo`) | no-store | Lee el vínculo `user.equipoId` de una cuenta — requiere `action:user:manage` |
| PUT | `/api/admin/user-equipo` | Turso (`user`) | no-store | Vincula (o desvincula) una cuenta con una persona del registro `equipo` — requiere `action:user:manage`. Invalida el cache de scoping del usuario. |
| POST | [`/api/cs360/analyze`](cs360-analyze.md) | Nexus (`ai.bit.lat`) + Turso (`nexus_request`) | no-store | Inicia generación de insights CS 360 en Nexus. Responde 202 `{ requestId, status: 'pending' }`. 503 si falta `AI_BEARER_TOKEN`. Gateado por `page:cs360` |
| GET | [`/api/cs360/analyze/[requestId]`](cs360-analyze.md) | Turso (`nexus_request`) + Nexus (webhook) | no-store | Polling del análisis iniciado. Sirve desde Turso si ya está `completed`; consulta la webhook URL firmada si sigue `pending`. Gateado por `page:cs360` |

## Endpoints externos

- `/api/auth/*` — manejado por Better-Auth (signin/signout/session/etc.). Ver [auth.md](../arquitectura/auth.md). No se documenta endpoint-por-endpoint aquí porque el contrato lo define la librería.

## Variables de entorno

| Variable | Endpoints que la usan |
|---|---|
| `GOOGLE_CREDENTIALS` | `proyectos`, `costos`, `costos-modelo`, `cursos`, `tareas`, `sprints`, `capacidades`, `snapshots/auto-capture` |
| `SHEET_ID` | mismos que arriba |
| `CRON_SECRET` | `snapshots/auto-capture` (opcional pero recomendado en producción) |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | `user-preferences`, `me/avatar`, `admin/avatar`, `me/mcp-tokens`, `glossary` (vía [src/db/client.ts](../../../src/db/client.ts)) |
| `AVATAR_S3_BUCKET` | `me/avatar`, `admin/avatar` — nombre del bucket S3 donde se suben los avatares (requerida). Opcionales: `AWS_REGION` (default `us-east-1`) y `AVATAR_CDN_URL` (dominio CloudFront). Las credenciales AWS vienen de la cadena por defecto del SDK (rol de ejecución en Amplify; `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` en local) |
| `AI_BEARER_TOKEN` | `cs360/analyze` (POST) — token servidor para Nexus (`ai.bit.lat`). Si falta, el endpoint responde 503. El prompt/modelo viven en el panel de Nexus; no se configuran aquí |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `ALLOWED_GOOGLE_DOMAIN` | `/api/auth/*` |

## Patrón de error de cliente

```
useSheetData<T>('/api/<endpoint>')
  ├── 200 + JSON  → { data, loading: false, error: null, forbidden: false }
  ├── 403         → { data: [], forbidden: true } — sin retry, la sección oculta el bloque
  ├── 500 + { error } → retry 1 vez → si falla muestra UI de error
  └── 401 → redirect /login?redirect=<path>
```

Ver [hooks/useSheetData.md](../hooks/useSheetData.md) para el detalle.
