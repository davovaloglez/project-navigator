# Autenticación y autorización

Auth implementado con **Better-Auth** + **Turso (libSQL)**. Multi-usuario, sin self-signup, dos métodos de login, sistema de roles y permisos con overrides por usuario.

## Decisiones clave

1. **Sin self-signup.** El endpoint público `/sign-up` de Better-Auth está deshabilitado (`disableSignUp: true` tanto en email/password como en social Google). Sólo el admin crea usuarios vía script o desde `/admin`.
2. **Dos métodos de login:**
   - Email + password.
   - Google OAuth (con dominio opcional restringido vía `ALLOWED_GOOGLE_DOMAIN`).
3. **Enforcement único:** [src/middleware.ts](../../../src/middleware.ts) protege toda la app. Gatea sesión (401), permisos de página (redirect a `/`) y datos sensibles (403).
4. **RBAC + overrides por usuario.** Seis roles predefinidos; cualquier recurso (página, dato, bloque) puede sobreescribirse por usuario sin tocar código. Ver [Sistema de permisos](#sistema-de-permisos) abajo.
5. **Rate limiting** activado en Better-Auth con `storage: 'database'` (coherente entre lambdas de AWS Amplify):
   - General: 100 req/min.
   - `/sign-in/email`: 5 intentos / 5 min.
   - `/sign-in/social/*`: 10 intentos / 5 min.
   - `/sign-out`: 20 / min.

Para el modelo de amenaza completo (headers, CSP, sourcemaps, 404, archivos sensibles), ver [seguridad.md](seguridad.md).

## Stack auth

| Componente | Archivo |
|---|---|
| Configuración del server | [src/lib/auth.ts](../../../src/lib/auth.ts) |
| Cliente browser | [src/lib/authClient.ts](../../../src/lib/authClient.ts) |
| Middleware | [src/middleware.ts](../../../src/middleware.ts) |
| Esquema SQL | [src/db/auth-schema.sql](../../../src/db/auth-schema.sql) |
| Migración de roles | [src/db/migrations/2026-roles.sql](../../../src/db/migrations/2026-roles.sql) |
| Migración Nexus (NAV-85) | [src/db/migrations/2026-nexus-requests.sql](../../../src/db/migrations/2026-nexus-requests.sql) |
| Cliente Turso compartido | [src/db/client.ts](../../../src/db/client.ts) |
| Tipos en `Astro.locals` | [src/env.d.ts](../../../src/env.d.ts) |
| Endpoints de Better-Auth | [src/pages/api/auth/[...all].ts](../../../src/pages/api/auth/) |
| Script de creación de user | [scripts/createUser.ts](../../../scripts/createUser.ts) |
| Resolver de permisos (server) | [src/lib/permissions.ts](../../../src/lib/permissions.ts) |
| Tipos de permisos | [src/lib/permissions/types.ts](../../../src/lib/permissions/types.ts) |
| Statements (espacio de recursos) | [src/lib/permissions/statements.ts](../../../src/lib/permissions/statements.ts) |
| Definición de roles | [src/lib/permissions/roles.ts](../../../src/lib/permissions/roles.ts) |
| Evaluación pura por rol | [src/lib/permissions/roleDefaults.ts](../../../src/lib/permissions/roleDefaults.ts) |
| Guardas del admin plugin | [src/lib/adminGuard.ts](../../../src/lib/adminGuard.ts) |
| Errores en español | [src/lib/authErrors.ts](../../../src/lib/authErrors.ts) |
| Hook cliente de permisos | [src/hooks/usePermissions.ts](../../../src/hooks/usePermissions.ts) |
| Tokens MCP (resolución + CRUD) | [src/lib/mcpToken.ts](../../../src/lib/mcpToken.ts) |
| Scoping por identidad (Fase 5) | [src/lib/requesterScope.ts](../../../src/lib/requesterScope.ts) |
| Roles scopeados (Fase 5) | [src/lib/scopeRoles.ts](../../../src/lib/scopeRoles.ts) |
| Vínculo cuenta↔equipo (Fase 5) | [src/pages/api/admin/user-equipo.ts](../../../src/pages/api/admin/user-equipo.ts) |
| Componente Gate (UX) | [src/components/auth/Gate.tsx](../../../src/components/auth/Gate.tsx) |
| Componente PageLink (UX) | [src/components/auth/PageLink.tsx](../../../src/components/auth/PageLink.tsx) |
| Módulo Admin (listado) | [src/components/sections/AdminSection.tsx](../../../src/components/sections/AdminSection.tsx) |
| Módulo Admin (detalle usuario) | [src/components/sections/AdminUserSection.tsx](../../../src/components/sections/AdminUserSection.tsx) |

## Flujo del middleware

El middleware tiene **cuatro niveles** de control: tokens MCP, sesión de browser, permisos de página y permisos de API.

```ts
// src/middleware.ts (resumido)
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // 1. Assets y endpoints de auth → pasan sin verificar
  if (isPublicAsset(pathname) || isAuthApi(pathname)) return next();

  // 2. Cron de snapshots → bypass si tiene el bearer correcto
  if (pathname === '/api/snapshots/auto-capture') {
    if (authHeader === `Bearer ${CRON_SECRET}`) return next();
  }

  // 2b. Tokens MCP: `Authorization: Bearer pn_mcp_*` → short-circuit
  if (isMcpBearer(authHeader)) {
    const plain = extractBearer(authHeader);
    const user = plain ? await resolveMcpToken(plain) : null;
    if (!user) return unauthorizedJson();
    context.locals.user = user;
    context.locals.session = null;  // no es sesión de browser
    // El resto del pipeline (permisos, scoping) corre idéntico
    const perms = await getEffectivePermissions(user);
    // … gating API y páginas igual que con sesión …
    return next();
  }

  // 3. Resolver sesión de browser
  const session = await auth.api.getSession({ headers: context.request.headers });

  // 4a. Con sesión: popular locals y continuar
  if (session?.user) {
    context.locals.user = session.user;
    context.locals.session = session.session;
    if (pathname === '/login') return context.redirect('/');

    // Resolver permisos (rol + overrides), cacheados por usuario.
    const perms = await getEffectivePermissions(session.user);

    // Gating de API (fuente de verdad del server):
    if (pathname.startsWith('/api/')) {
      if ((pathname === '/api/costos' || pathname === '/api/costos-modelo') && !evaluate(perms, 'data:costos'))
        return forbiddenJson();  // 403 { error, code: 'FORBIDDEN' }
      if (pathname === '/api/snapshots' && method === 'POST' && !evaluate(perms, 'action:snapshot:create'))
        return forbiddenJson();
      // Gestión del registro equipo: permiso propio, separado de user:manage.
      if (pathname.startsWith('/api/admin/equipo') && !evaluate(perms, 'action:equipo:manage'))
        return forbiddenJson();
      // Resto de /api/admin/* requiere user:manage.
      else if (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/equipo')
               && !evaluate(perms, 'action:user:manage'))
        return forbiddenJson();
      return next();
    }

    // Gating de páginas: redirige a '/' si no tiene permiso.
    const pageKey = pageKeyForPath(pathname);
    if (pageKey && !evaluate(perms, `page:${pageKey}`)) return context.redirect('/');
    return next();
  }

  // 4b. Sin sesión:
  if (PUBLIC_PAGE_ROUTES.has(pathname)) return next();    // /login
  if (pathname.startsWith('/api/')) return unauthorizedJson();  // 401 JSON
  return context.redirect(`/login?redirect=${encodeURIComponent(pathname + search)}`);
});
```

**Reglas:**

- Toda ruta `/...` requiere sesión de browser o token MCP, excepto:
  - `/login` — formulario público.
  - `/api/auth/*` — endpoints de Better-Auth (signin/signout/etc).
  - Assets estáticos: `/_astro/*`, `/_image`, `/favicon.*`, `/robots.txt`.
  - `/api/snapshots/auto-capture` con `Authorization: Bearer $CRON_SECRET`.
- Requests con `Authorization: Bearer pn_mcp_*` se resuelven contra la tabla `mcp_token` vía `resolveMcpToken`. `locals.session = null` para estas requests (no son sesiones de browser). El resto del pipeline de permisos corre idéntico: rol + overrides + scoping.
- Sin sesión: APIs retornan `401 { error: 'No autorizado. Inicia sesión de nuevo.', code: 'UNAUTHORIZED' }`. `useSheetData` detecta esto y redirige a `/login?redirect=…`.
- Con sesión sin permiso: APIs de datos/admin retornan `403 { error: '...', code: 'FORBIDDEN' }`. `useSheetData` setea `forbidden: true` (no es error fatal, no hay retry).
- Las páginas sin permiso redirigen server-side a `/` (no a `/login`).
- `/cuenta` y `/404` están en `UNGATED_PAGES` — siempre accesibles para usuarios autenticados.

### `pageKeyForPath` — mapeo de ruta a page-key

```ts
const PAGE_KEY_BY_SEGMENT: Record<string, string> = {
  '/resumen': 'resumen',       '/alertas': 'alertas',
  '/portafolio': 'portafolio', '/roadmap': 'roadmap',
  '/timeline': 'timeline',     '/cronograma': 'cronograma',
  '/pronosticos': 'pronosticos', '/costos': 'costos',
  '/distribucion': 'distribucion', '/equipo': 'equipo',
  '/comparativa': 'comparativa',   // NAV-78 — admin-only por default
  '/cursos': 'cursos',         '/novedades': 'novedades',
  '/glosario': 'glosario',     '/metricas-dev': 'metricas-dev',
  '/admin': 'admin',
  // Páginas de detalle heredan page-key del padre:
  '/proyecto': 'portafolio',   '/persona': 'equipo',
  '/tarea': 'cronograma',
};
// '/' → 'dashboard' (caso especial)
// '/pronosticos/[id]' → primer segmento → 'pronosticos'
```

## Sistema de permisos

### Modelo

RBAC (rol base) + overrides por usuario almacenados en `user_permission_override`. La fórmula efectiva es:

```
efectivo = rol ∪ overrides(allow) ∖ overrides(deny)
```

### Roles

Definidos en [src/lib/permissions/roles.ts](../../../src/lib/permissions/roles.ts). Seis roles, de mayor a menor privilegio:

| Rol | Páginas | Datos | Acciones |
|---|---|---|---|
| `admin` | Todas (incl. `/admin`, `/comparativa`) | `costos` | `snapshot:create`, `user:manage`, `equipo:manage`, `evaluacion:view-all`, `evaluacion:manage` |
| `directores` | Todas menos `/admin` y `/comparativa` | `costos` | `snapshot:create` |
| `gerentes` | Todas menos `/admin` y `/comparativa` | `costos` | — |
| `pm` | Todas menos `/admin`, `/costos` y `/comparativa` | — | `snapshot:create` |
| `dev` (DEFAULT) | `dashboard`, `portafolio`, `roadmap`, `timeline`, `cronograma`, `metricas-dev`, `glosario` | — | — |
| `ventas` | `dashboard`, `resumen`, `portafolio`, `distribucion`, `glosario` | — | — |

`/comparativa` es admin-only por default (Modo A: las evaluaciones son admin-only — el bloque de auto-captura en `/cuenta` fue eliminado; sólo admin puede ver/editar evaluaciones en `/comparativa`). Otros roles pueden recibir override por usuario para ganar acceso.

El rol por defecto (usuarios sin rol o con rol desconocido) es `dev`.

### Tipos de recursos (`Resource`)

```ts
type Resource =
  | `page:${string}`    // página del sidebar (slug)
  | `data:${string}`    // dataset sensible
  | `action:${string}`  // acción de escritura
  | `block:${string}`   // bloque visual del glosario (default-ALLOW)
```

Los bloques (`block:`) usan un modelo **default-ALLOW**: se ven a menos que estén explícitamente denegados. Sólo `blockDenyByRole` en `roles.ts` define denegaciones de bloque por rol (actualmente el bloque `dashboard-cost-overview` está denegado para `pm`, `dev` y `ventas`).

### Resolver server-side

[src/lib/permissions.ts](../../../src/lib/permissions.ts) es la fuente de verdad. Exports:

```ts
// Permisos efectivos (rol + overrides) — consulta Turso + cache TTL 30 s
async function getEffectivePermissions(user: PermUser | null): Promise<EffectivePermissions>

// Predicado canónico sobre el payload ya resuelto (sync, server y testeable)
function evaluate(perms: EffectivePermissions, resource: Resource): boolean

// ¿El usuario puede? (rol + overrides, async)
async function can(user: PermUser | null, resource: Resource): Promise<boolean>

// Invalidar cache (llamar tras escribir overrides)
function invalidatePermissions(userId: string): void

// Evaluación pura por rol (sin BD) — safe de importar en el cliente
function roleCan(role: string, resource: Resource): boolean  // desde roleDefaults.ts
```

El cache en memoria tiene **TTL de 30 segundos**. Las mutaciones de overrides (vía `/api/admin/overrides`) llaman `invalidatePermissions(userId)` para que el cambio sea efectivo de inmediato.

Si la tabla `user_permission_override` aún no existe (migración no aplicada), el resolver se degrada a sólo-rol sin romper.

### Permisos en el cliente

[src/hooks/usePermissions.ts](../../../src/hooks/usePermissions.ts) expone:

- `readInlinePermissions()` — lee `window.__PN_PERMS__` inyectado por `Layout.astro` (síncrono, sin flash).
- `canWith(perms, resource)` — evaluador cliente-side (misma lógica que `evaluate` del server).
- `usePermissions()` — hidrata desde `window.__PN_PERMS__` y revalida en mount vía `GET /api/me/permissions`.

`Layout.astro` inyecta los permisos en cada navegación (SSR), asegurando que las islas React no tengan un estado stale del request anterior.

### Gate y PageLink (UX)

Dos componentes para ocultar UI según permisos. Ambos son **sólo UX** — el server es el gate real:

- `<Gate resource="block:foo">` — oculta `children` si el bloque está denegado. Fallback opcional.
- `<PageLink pageKey="equipo" href="/equipo">` — renderiza `<a>` si tiene permiso, o texto plano si no (evita dead-links).

`KPICard` y `ChartCard` se auto-ocultan si `info.glossaryAnchor` está denegado para el usuario.

### Guardas del admin plugin

[src/lib/adminGuard.ts](../../../src/lib/adminGuard.ts) protege con `hooks.before/after` los endpoints del admin plugin de Better-Auth:

- **`adminGuard`** (`hooks.before`): bloquea (1) cambios del propio rol y (2) degradar/desactivar/eliminar al último admin activo.
- **`adminGuardAfter`** (`hooks.after`): invalida el cache de permisos del usuario afectado tras cualquier mutación de rol/ban.

### Módulo Admin

Dos páginas SSR + dos Section components:

| Ruta | Section | Función |
|---|---|---|
| `/admin` | `AdminSection` | Grid de usuarios con buscador y formulario de creación |
| `/admin/[id]` | `AdminUserSection` | Perfil + rol + estado (ban) + sesiones + árbol de permisos con overrides |

El árbol de permisos en `AdminUserSection` usa `TriToggle` (inherit / allow / deny) por cada recurso, organizados por página-padre. Las mutaciones van a `PUT /api/admin/overrides` y `DELETE /api/admin/overrides`. Ver [api/admin-overrides.md](../api/admin-overrides.md).

### Errores en español

[src/lib/authErrors.ts](../../../src/lib/authErrors.ts) mapea los `code` de Better-Auth a mensajes en español para la UI:

```ts
export function translateAuthError(error, fallback?): string
export const BANNED_USER_MESSAGE: string  // se pasa a bannedUserMessage del admin plugin
```

### Scoping por identidad (Fase 5)

Los endpoints `/api/proyectos` y `/api/tareas` aplican filtrado fila-a-fila según la identidad del solicitante:

- **Roles no scopeados** (`admin`, `directores`, `gerentes`, `ventas`) — ven todo el portafolio.
- **`pm`** — ve proyectos donde `pmIds` o `arquitectoIds` incluyen su `equipo.id`.
- **`dev` (y cualquier rol scopeado desconocido)** — ve proyectos donde `arquitectoIds` o `devIds` incluyen su `equipo.id`; tareas donde `asignadoId` es su id.
- **Rol scopeado sin `equipoId` ligado** → fail-closed (no ve nada).

El lookup `user.equipoId` se cachea 60 s en `requesterScope.ts`. El vínculo se establece (o rompe) vía `PUT /api/admin/user-equipo` desde `AdminUserSection`.

La lista de roles scopeados es la fuente de verdad en [src/lib/scopeRoles.ts](../../../src/lib/scopeRoles.ts) (`UNSCOPED_ROLES`). Es client-safe: también la consumen `useSnapshotCapture` (para no capturar snapshots parciales) y `useScopeView` (para ajustar la UI).

## Acceso a la sesión

### En páginas `.astro`

```astro
---
const user = Astro.locals.user;
const session = Astro.locals.session;
---
{user && <p>Hola, {user.name}</p>}
```

Tipos definidos en [src/env.d.ts](../../../src/env.d.ts).

### En React islands

```tsx
import { authClient } from '../../lib/authClient';

function MyIsland() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <Spinner />;
  return <p>Hola, {session?.user.name}</p>;
}
```

`authClient` es el cliente de Better-Auth (cliente del navegador) configurado en [src/lib/authClient.ts](../../../src/lib/authClient.ts). Provee: `useSession()`, `signIn`, `signOut`, `updateUser`, `changePassword`, `listSessions`, `revokeSession`, `revokeOtherSessions`, `listAccounts`.

## Configuración (`src/lib/auth.ts`)

```ts
export const auth = betterAuth({
  database: { dialect: new LibsqlDialect({ url, authToken }), type: 'sqlite' },
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  trustedOrigins: [BETTER_AUTH_URL],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,   // ← sin self-signup
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
      disableSignUp: true, // ← sin self-signup vía Google tampoco
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (allowedDomain && !user.email.toLowerCase().endsWith('@' + allowedDomain.toLowerCase())) {
            throw new Error(`Email domain not allowed. Must be @${allowedDomain}`);
          }
          return { data: user };
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',                                        // ← coherente entre lambdas
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email':    { window: 300, max: 5 },
      '/sign-in/social/*': { window: 300, max: 10 },
      '/sign-out':         { window: 60,  max: 20 },
    },
  },
  advanced: { defaultCookieAttributes: { sameSite: 'lax', secure: PROD } },
  hooks: {
    before: adminGuard,      // ← protege auto-rol + último admin
    after: adminGuardAfter,  // ← invalida cache de permisos
  },
  plugins: [
    admin({
      ac,                       // access control del sistema de permisos
      roles,                    // definición de roles
      defaultRole: DEFAULT_ROLE, // 'dev'
      adminRoles: ADMIN_ROLES,  // ['admin']
      bannedUserMessage: BANNED_USER_MESSAGE,
    }),
  ],
});
```

**Notas:**

- `disableSignUp: true` + `databaseHooks.user.create.before` significa que: aunque el script bypass de Better-Auth permite crear users, el hook valida dominio si está set. El script de creación pasa por el adapter de Better-Auth, así que el hook se ejecuta.
- `secret` no tiene fallback. Si no está set, los tokens no se firman. **Es obligatorio** en prod.
- `secure: PROD` significa que las cookies no van por HTTP en dev pero sí en prod.
- `rateLimit.storage: 'database'` requiere la tabla `rateLimit` en Turso (ver "Esquema de BD" abajo). El default `'memory'` no es coherente en el cómputo multi-instancia de Amplify — los contadores no se comparten entre lambdas.
- `rateLimit.enabled: true` también aplica en dev. Si te bloqueas probando UI de login, esperar 5 min o cambiar a `enabled: import.meta.env.PROD ?? false`.
- El **admin plugin** añade a `Astro.locals.user` los campos `role`, `banned`, `banReason`, `banExpires` y a `session` el campo `impersonatedBy`.
- `adminClient` en [src/lib/authClient.ts](../../../src/lib/authClient.ts) extiende el cliente browser con los métodos del admin plugin: `createUser`, `listUsers`, `setRole`, `banUser`, `unbanUser`, `listUserSessions`, `revokeUserSession`, `revokeUserSessions`, `updateUser`.

## Crear un usuario (admin-only)

### Vía script (CLI)

```bash
npm run create-user me@vortex-it.com 'P@ssw0rd' 'Mi Nombre' [rol]
# Roles válidos: admin, directores, gerentes, pm, dev, ventas
# Ejemplo con rol:
npm run create-user me@vortex-it.com 'P@ssw0rd' 'Mi Nombre' pm
```

[scripts/createUser.ts](../../../scripts/createUser.ts) usa la **API server-side** de Better-Auth, que ignora `disableSignUp`. El `[rol]` es el cuarto argumento opcional; si el último token coincide con un nombre de rol válido se toma como rol, si no, como parte del nombre. Sólo personas con acceso al deployment (env vars + comando) pueden crear users por esta vía.

### Vía módulo Admin (`/admin`)

Un usuario con `action:user:manage` (rol `admin`) puede crear, editar y desactivar usuarios desde la interfaz web sin acceso al servidor. Ver [secciones/admin.md](../secciones/admin.md).

Para usuarios que sólo usarán Google OAuth, igualmente hay que crearlos primero (sin password, o con un password placeholder) — Better-Auth liga el `account` de Google al `user` cuando el email coincide.

## Servidor MCP y tokens MCP

El MCP server (`mcp-server/`) se autentica con tokens bearer largos (prefijo `pn_mcp_*`) generados por el usuario en `/cuenta` → bloque "Tokens MCP". El pipeline de permisos corre idéntico al de sesiones de browser — ver sección "Flujo del middleware" arriba.

Módulo de gestión: [src/lib/mcpToken.ts](../../../src/lib/mcpToken.ts). Exports:

| Función | Propósito |
|---|---|
| `isMcpBearer(header)` | Detecta si el Authorization header es un token MCP |
| `extractBearer(header)` | Extrae el valor sin el prefijo `Bearer ` |
| `generateMcpToken()` | Genera `{ plain, hash, tokenPrefix }` — el hash es el `id` de la tabla |
| `resolveMcpToken(plain)` | Busca en `mcp_token`, verifica expiración y ban, toca `lastUsedAt` (fire-and-forget), retorna `Session['user']` o `null` |
| `listMcpTokens(userId)` | Lista metadata de los tokens del usuario (jamás el plaintext) |
| `createMcpToken({ userId, name, expiresInDays })` | Inserta en `mcp_token`, retorna `{ plain, summary }` — el plain sólo se entrega aquí |
| `revokeMcpToken(userId, tokenPrefix)` | Borra por `tokenPrefix` (display id) |

Endpoint del usuario: [api/me-mcp-tokens.md](../api/me-mcp-tokens.md). Interfaz en `/cuenta`: ver [secciones/cuenta.md](../secciones/cuenta.md#mctokensblock).

Migración de BD: [src/db/migrations/2026-mcp-tokens.sql](../../../src/db/migrations/2026-mcp-tokens.sql).

```bash
turso db shell <db-name> < src/db/migrations/2026-mcp-tokens.sql
```

Esquema de la tabla:

```sql
create table "mcp_token" (
  "id"          text not null primary key,   -- sha256 hex del token plain
  "tokenPrefix" text not null,               -- `pn_mcp_xxxxxxx` (14 chars, display)
  "userId"      text not null references "user" ("id") on delete cascade,
  "name"        text not null,               -- label visible al usuario
  "createdAt"   integer not null,            -- unix ms
  "lastUsedAt"  integer,                     -- unix ms (touched en cada uso)
  "expiresAt"   integer not null             -- unix ms (obligatorio, max 1 año)
);
create index "mcp_token_userId_idx" on "mcp_token" ("userId");
```

**Anti-chain:** `POST /api/me/mcp-tokens` detecta si el caller se autentica con un token MCP y devuelve `403 MCP_CANNOT_CHAIN`. Un token MCP no puede emitir otros tokens.

## Esquema de BD

[src/db/auth-schema.sql](../../../src/db/auth-schema.sql) tiene **13 tablas** (4 de Better-Auth + 9 manuales):

1. **`user`** — id, email, name, emailVerified, image, createdAt, updatedAt + columnas del admin plugin: `role`, `banned`, `banReason`, `banExpires` + columna manual: `equipoId` (FK lógica → `equipo.id`).
2. **`session`** — token, userId, expiresAt, ipAddress, userAgent + columna del admin plugin: `impersonatedBy`.
3. **`account`** — providerId, accountId, accessToken, refreshToken… (link a OAuth providers).
4. **`verification`** — para flows de verificación de email (no usado hoy pero presente).
5. **`user_preferences`** — agregada manualmente. PK `(userId, sectionKey)`, FK a `user(id)` con `ON DELETE CASCADE`, columna `value` TEXT (JSON).
6. **`user_permission_override`** — agregada manualmente. PK `(userId, resource)`, FK a `user(id)` con `ON DELETE CASCADE`, columnas `effect` (allow/deny) y `createdAt`. Consumida por el resolver de permisos.
7. **`rateLimit`** — agregada manualmente. Backend del `rateLimit.storage: 'database'` de Better-Auth.
8. **`roles`** — catálogo de puestos/bandas de costo (18 filas: incluye `ceo` añadido en mayo 2026). Distinto de `user.role` (roles de permisos).
9. **`equipo`** — registro canónico del equipo. Campos: `id`, `full_name`, `nickname`, `role_id` (FK → `roles.id`), `title` (título funcional, texto libre), `department`, `manager_id` (self-FK), `email`, `active`.
10. **`equipo_rates`** — tarifas reales por persona con vigencia temporal (`valid_from`/`valid_to`). Confidencial (salarios), vive en Turso. Un `equipo_id` puede tener múltiples filas (una por periodo).
11. **`snapshot`** — histórico semanal de snapshots. PK `(weekKey, kind, identifier)`. Reemplaza la escritura en la tab `Snapshots` del Sheet desde mayo 2026. Creado por [src/db/migrations/2026-snapshots.sql](../../../src/db/migrations/2026-snapshots.sql).
12. **`mcp_token`** — tokens bearer largos para el servidor MCP. PK `id` (sha256 del plaintext), `tokenPrefix` (14 chars para display), `userId` (FK), `name`, `createdAt`, `lastUsedAt`, `expiresAt`. Creado por [src/db/migrations/2026-mcp-tokens.sql](../../../src/db/migrations/2026-mcp-tokens.sql).
13. **`evaluacion`** — autoevaluaciones trimestrales de miembros del equipo (HU NAV-78). PK auto-increment, UNIQUE `(equipo_id, periodo)`, FK `equipo_id` → `equipo(id)` ON DELETE CASCADE, 7 dimensiones integer 1-10, `notas` text nullable, `created_at`/`updated_at`. La calificación total es derivada (promedio de 7 dimensiones) y no se persiste. Creado por [src/db/migrations/2026-evaluaciones.sql](../../../src/db/migrations/2026-evaluaciones.sql).

### Migración para BDs existentes

Para bases ya creadas (con las 4 tablas de Better-Auth), aplicar en orden:

```bash
turso db shell <db-name> < src/db/migrations/2026-roles.sql         # roles de permisos + user_permission_override
turso db shell <db-name> < src/db/migrations/2026-equipo.sql        # tablas roles/equipo/equipo_rates + user.equipoId
turso db shell <db-name> < src/db/migrations/2026-equipo-title.sql  # columna equipo.title
turso db shell <db-name> < src/db/migrations/2026-snapshots.sql     # tabla snapshot (Turso backend)
turso db shell <db-name> < src/db/migrations/2026-mcp-tokens.sql    # tabla mcp_token (tokens MCP)
turso db shell <db-name> < src/db/migrations/2026-evaluaciones.sql  # tabla evaluacion (auto-eval trimestral)
```

El archivo [src/db/migrations/2026-roles.sql](../../../src/db/migrations/2026-roles.sql) agrega: columnas del admin plugin a `user`/`session`, tabla `user_permission_override` y asigna rol `'dev'` a usuarios existentes sin rol. Los otros archivos añaden el núcleo de identidad/costo, el almacén de snapshots y las evaluaciones trimestrales.

### Cuidado al regenerar el schema

```bash
npm run auth:generate  # ← reescribe src/db/auth-schema.sql y BORRA tablas manuales
```

Después de ejecutar, hay que reagregar al final del archivo las tres tablas manuales:

```sql
create table "user_preferences" (
  "userId" text not null references "user" ("id") on delete cascade,
  "sectionKey" text not null,
  "value" text not null default '{}',
  "updatedAt" date not null,
  primary key ("userId", "sectionKey")
);
create index "user_preferences_userId_idx" on "user_preferences" ("userId");

create table "user_permission_override" (
  "userId" text not null references "user" ("id") on delete cascade,
  "resource" text not null,
  "effect" text not null,
  "createdAt" date not null,
  primary key ("userId", "resource")
);
create index "user_permission_override_userId_idx" on "user_permission_override" ("userId");

create table "rateLimit" (
  "id" text not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" integer not null
);
create index "rateLimit_key_idx" on "rateLimit" ("key");
```

Y aplicar las sentencias faltantes a Turso (asumiendo que ya tienes las tablas de Better-Auth):

```bash
tail -n 12 src/db/auth-schema.sql | turso db shell <db-name>
```

## Setup inicial (una sola vez)

1. `turso db create project-navigator-auth`.
2. `turso db tokens create project-navigator-auth` → guardar como `TURSO_AUTH_TOKEN`.
3. Configurar todas las env vars (ver `.env.example`).
4. `npm run auth:generate` → genera SQL.
5. **Reagregar `user_preferences`, `user_permission_override` y `rateLimit` a mano** al final del archivo (ver "Cuidado al regenerar el schema" arriba).
6. `turso db shell project-navigator-auth < src/db/auth-schema.sql`.
7. Configurar OAuth client en Google Cloud Console; redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`.
8. `npm run create-user me@ejemplo.com 'P@ssw0rd' 'Nombre' admin` para el primer usuario administrador.

## Sesiones

- **Duración**: por default de Better-Auth (~30 días con refresh). Configurable en `betterAuth({ session: { … } })`.
- **Almacenamiento**: tabla `session` en Turso.
- **Cookie**: HTTP-only, `sameSite: lax`, `secure` en prod.
- **Revocación**:
  - Individual: desde [/cuenta](../secciones/cuenta.md) → "Sesiones activas" → botón por fila.
  - Bulk (otras sesiones): mismo lugar → "Cerrar todas las demás".
  - Programática: `authClient.revokeSession({ token })` o `authClient.revokeOtherSessions()`.

## Configuración del usuario actual

La página [/cuenta](../secciones/cuenta.md) ([src/components/sections/CuentaSection.tsx](../../../src/components/sections/CuentaSection.tsx)) tiene 5 bloques:

1. **Perfil** — editar `name` con `authClient.updateUser({ name })`. Subir/quitar foto de perfil: resize client-side → `POST/DELETE /api/me/avatar` → Amazon S3 → `authClient.updateUser({ image })`.
2. **Seguridad** — cambiar password con `authClient.changePassword(...)`. Toggle `revokeOtherSessions: true` opcional. **Se oculta** si `authClient.listAccounts()` no encuentra una cuenta con `providerId: 'credential'` (caso de users sólo-Google).
3. **Sesiones activas** — render de `authClient.listSessions()` con `userAgent` parseado. Cada fila tiene botón "Revocar" excepto la sesión actual (identificada por `session.session.token`).
4. **Tokens MCP** — gestión de tokens bearer largos para el servidor MCP. Lista vía `GET /api/me/mcp-tokens`. Formulario con `name` + `expiresInDays`. Plaintext mostrado una vez tras el POST. Revocación por `tokenPrefix` vía `DELETE /api/me/mcp-tokens?prefix=`. Ver sección "Servidor MCP y tokens MCP" arriba y [api/me-mcp-tokens.md](../api/me-mcp-tokens.md).
5. **Preferencias** — botones para:
   - "Limpiar todos los filtros guardados" → `DELETE /api/user-preferences` (sin `?section=`) + barre `localStorage['pn-prefs-*']`.
   - "Resetear layout del dashboard" → borra `pn-dashboard-config`.

El bloque "Mi evaluación" (HU NAV-78) fue eliminado. Las evaluaciones son ahora admin-only: se gestionan desde `/comparativa`. El endpoint `/api/me/evaluaciones` retorna `403 EVALUACION_DISABLED`.

## API endpoints relacionados con auth

| Endpoint | Función |
|---|---|
| `POST /api/auth/sign-in/email` | Login email+password |
| `GET /api/auth/sign-in/social/google` | Inicia OAuth de Google |
| `GET /api/auth/callback/google` | Callback OAuth |
| `POST /api/auth/sign-out` | Cerrar sesión |
| `GET /api/auth/get-session` | Devolver sesión actual |
| `POST /api/auth/update-user` | Actualizar perfil |
| `POST /api/auth/change-password` | Cambiar password |
| `GET /api/auth/list-sessions` | Listar sesiones del user |
| `POST /api/auth/revoke-session` | Revocar una sesión |
| `POST /api/auth/revoke-other-sessions` | Revocar todas menos la actual |
| `GET /api/auth/list-accounts` | Listar accounts vinculadas (credential, google) |
| `GET /api/auth/admin/list-users` | Listar usuarios (sólo rol admin) |
| `POST /api/auth/admin/create-user` | Crear usuario (sólo rol admin) |
| `POST /api/auth/admin/set-role` | Cambiar rol (sólo rol admin) |
| `POST /api/auth/admin/ban-user` | Desactivar cuenta (sólo rol admin) |
| `POST /api/auth/admin/unban-user` | Reactivar cuenta (sólo rol admin) |
| `GET /api/auth/admin/list-user-sessions` | Sesiones de otro usuario (sólo rol admin) |
| `POST /api/auth/admin/revoke-user-session` | Revocar sesión de otro (sólo rol admin) |
| `POST /api/auth/admin/revoke-user-sessions` | Revocar todas las sesiones de otro (sólo rol admin) |

Todos servidos por [src/pages/api/auth/[...all].ts](../../../src/pages/api/auth/) que delega a `auth.handler` de Better-Auth. Los endpoints del admin plugin (`/api/auth/admin/*`) están gateados por el sistema de permisos de Better-Auth (requieren rol `admin` en `adminRoles`).

### Endpoints propios del sistema de permisos

| Método | Endpoint | Función | Auth |
|---|---|---|---|
| `GET` | `/api/me/permissions` | Permisos efectivos del usuario actual | sesión |
| `GET` | `/api/admin/overrides?userId=` | Overrides de un usuario | `action:user:manage` |
| `PUT` | `/api/admin/overrides` | Upsert de un override `{userId, resource, effect}` | `action:user:manage` |
| `DELETE` | `/api/admin/overrides?userId=&resource=` | Borra un override o todos del usuario | `action:user:manage` |

Ver [api/me-permissions.md](../api/me-permissions.md) y [api/admin-overrides.md](../api/admin-overrides.md).

### Endpoints de tokens MCP

| Método | Endpoint | Función | Auth |
|---|---|---|---|
| `GET` | `/api/me/mcp-tokens` | Lista metadata de los tokens MCP del usuario | sesión de browser |
| `POST` | `/api/me/mcp-tokens` | Crea token y devuelve plaintext una vez | sesión de browser (no-MCP) |
| `DELETE` | `/api/me/mcp-tokens?prefix=` | Revoca token por tokenPrefix | sesión de browser |

Ver [api/me-mcp-tokens.md](../api/me-mcp-tokens.md).

## Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| 401 al cargar páginas tras deploy | Cookies con dominio incorrecto | Verificar `BETTER_AUTH_URL` matches el dominio real |
| Google OAuth redirige a 404 | Redirect URI no registrado | Agregar `<BETTER_AUTH_URL>/api/auth/callback/google` en Google Cloud Console |
| "Email domain not allowed" | `ALLOWED_GOOGLE_DOMAIN` está set | Crear el user con un email del dominio o quitar la restricción |
| Cron de snapshots devuelve 401 | `CRON_SECRET` mismatch | Verificar que el scheduler externo (EventBridge) y el endpoint usen el mismo valor |
| `user_preferences` query falla | Schema regenerado sin esa tabla | Reagregar manualmente (ver arriba) |
| `user_permission_override` query falla | Migración no aplicada | Aplicar `2026-roles.sql` (ver "Migración para BDs existentes" arriba) |
| `rateLimit` query falla | Schema regenerado sin esa tabla | Reagregar manualmente (ver arriba) |
| Login bloqueado en dev tras varios intentos | Rate limit activo también en dev | Esperar 5 min o cambiar `rateLimit.enabled` a sólo prod |
| Cambio de password "no funciona" | El user es sólo-Google | El bloque de Seguridad se oculta — no hay password que cambiar |
| Token MCP devuelve 401 | Token expirado o revocado | Generar uno nuevo en `/cuenta` → "Tokens MCP" |
| Token MCP devuelve 403 en `get_costs` | El rol del usuario no tiene `data:costos` | Pedir override al admin desde `/admin/[id]` |
| `mcp_token` query falla | Migración no aplicada | Aplicar `2026-mcp-tokens.sql` (ver "Migración para BDs existentes" arriba) |
| `evaluacion` query falla | Migración no aplicada | Aplicar `2026-evaluaciones.sql` (ver "Migración para BDs existentes" arriba) |
| `/api/evaluaciones` devuelve 403 | Usuario sin `action:evaluacion:view-all` | Verificar que el rol sea `admin` o que tenga el override activo en `/admin/[id]` |
| `/api/me/evaluaciones` devuelve 403 | Endpoint desactivado (NAV-78 rediseño) | Las evaluaciones se gestionan desde `/comparativa`; `EvaluacionBlock` fue eliminado de `/cuenta` |
| El MCP no puede crear más tokens | Anti-chain activo | Un token MCP no puede emitir otros — usar sesión de browser en `/cuenta` |
| Usuario ve páginas que no debería | Caché de permisos stale | Llamar `invalidatePermissions(userId)` o esperar el TTL de 30 s |
| Usuario no ve páginas que sí debería | Override de deny o rol incorrecto | Revisar en `/admin/[id]` → Permisos los overrides activos |
| `/admin` retorna 403 | Usuario no tiene rol `admin` | Verificar rol en Turso o desde `/admin` con otro admin |
