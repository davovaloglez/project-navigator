# Seguridad

Concentra las decisiones, mitigaciones y validaciones que protegen el deployment frente a ataques externos. La auth en sí está en [auth.md](auth.md); este doc cubre todo lo demás (rate limiting, headers, build, archivos sensibles, hardening).

## Modelo de amenaza

El deployment es un dashboard **interno** del equipo BIT. La superficie pública es mínima:

- `/login` — formulario de email+password y Google OAuth.
- `/api/auth/*` — endpoints de Better-Auth (sign-in, sign-out, callback OAuth, etc.).
- `/api/snapshots/auto-capture` — accesible vía un scheduler externo (AWS EventBridge Scheduler) con bearer `CRON_SECRET`.
- Assets estáticos (`/_astro/*`, favicon, `robots.txt`).

Todo el resto exige sesión válida. Además, con el sistema de roles y permisos:

- **Datos sensibles** (`/api/costos`, `/api/costos-modelo`) retornan `403` si el usuario no tiene el statement `data:costos`.
- **Endpoints de administración** (`/api/admin/*`) retornan `403` si el usuario no tiene `action:user:manage`.
- **Escritura de snapshots** (`POST /api/snapshots`) retorna `403` si el usuario no tiene `action:snapshot:create`.
- **Páginas** sin permiso redirigen a `/` (no exponen 403 en el browser).

La auth es el control de acceso primario; el sistema de permisos es autorización granular; las defensas de este doc son **defensa en profundidad** sobre esa base.

### Amenazas que cubrimos

| Amenaza | Mitigación |
|---|---|
| Enumeración de usuarios por timing en login | Better-Auth 1.6.9 ya iguala tiempos upstream. Si delta > 100ms en prod, hook documentado en `auth.ts` (no aplicado por default) |
| Brute force / credential stuffing en `/sign-in/email` | Rate limit por IP+path: 5 intentos / 5 min |
| Brute force vía OAuth | Rate limit en `/sign-in/social/*`: 10 intentos / 5 min |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| MIME sniffing | `X-Content-Type-Options: nosniff` |
| MITM en tránsito | `Strict-Transport-Security` (HSTS, 1 año) + `upgrade-insecure-requests` |
| XSS (defense in depth — React ya escapa) | CSP Report-Only en transición a enforce |
| Acceso a APIs sensibles del navegador | `Permissions-Policy` bloquea cámara, mic, geo, USB, etc. |
| Leak de código fuente en producción | `vite.build.sourcemap: false` (condicional a producción) en [astro.config.mjs](../../../astro.config.mjs) |
| Leak de estructura de menú en 404 pre-auth | [src/pages/404.astro](../../../src/pages/404.astro) standalone (sin Layout, sin Sidebar) |
| Filtrado de credenciales/DBs por commits accidentales | `.gitignore` con patrones `*.db`, `*.sqlite*`, `client_secret_*.json` |

### Amenazas fuera de scope (hoy)

- DoS / agotamiento de recursos — confiamos en el rate limiting de AWS (Amplify / CloudFront / WAF) a nivel infraestructura.
- 2FA TOTP — no requerido; Google OAuth de-facto cumple ese rol para usuarios sin password.
- Auditoría de eventos de auth — Better-Auth no escribe logs estructurados por default. Si se necesita compliance, agregar `databaseHooks.session.create.after` que escriba a una tabla `auth_audit`.
- Autorización horizontal entre usuarios (IDOR) — endpoints actuales no exponen recursos por id ajeno. Cualquier endpoint futuro que lo haga debe validar `Astro.locals.user.id` contra el recurso.
- **Filtrado de contenido a nivel fila** — `/api/proyectos`, `/api/tareas`, `/api/cursos` y `/api/capacidades` aplican row-scoping por identidad (Fase 5, `src/lib/requesterScope.ts`): roles `pm`/`dev` ven sólo sus propias filas; roles `admin/directores/gerentes/ventas` (`UNSCOPED_ROLES`) ven todo. Ver también `auth.md` para el mecanismo de `requesterScope`. Los demás endpoints de datos (`GET /api/equipo`, `GET /api/snapshots`, `/api/repositorios`, `/api/hitos`) usan gate grueso (all-or-nothing por página consumidora) — no requieren row-scoping porque no exponen datos personales cruzados de la misma forma.
- **Block gating como show/hide** — `KPICard`, `ChartCard` y `<Gate>` ocultan bloques en la UX pero los datos que los alimentan pueden llegar igualmente al cliente (si el endpoint no los filtra). Es defensa en profundidad sobre la API, no un control primario.
- **Avatares en S3 con lectura pública** — las fotos de perfil se sirven por URL pública (no son dato sensible; ya se muestran a otros usuarios, así que una URL pública no abre vector). La escritura sí es privada (credenciales AWS server-side + endpoints gateados). Decisión consciente, no se usa bucket privado; ruta de migración a privado documentada en [api/me-avatar.md → Decisión de arquitectura](../api/me-avatar.md#decisión-de-arquitectura-lectura-pública-no-bucket-privado).

## Rate limiting

Activado en Better-Auth con `storage: 'database'` para coherencia entre lambdas de AWS Amplify (el default `'memory'` no funciona en multi-instance).

```ts
// src/lib/auth.ts
rateLimit: {
  enabled: true,
  storage: 'database',
  window: 60,
  max: 100,
  customRules: {
    '/sign-in/email':    { window: 300, max: 5 },
    '/sign-in/social/*': { window: 300, max: 10 },
    '/sign-out':         { window: 60,  max: 20 },
  },
},
```

**Comportamiento:**

- Trackea por `(ip, path)` — ver `node_modules/better-auth/dist/api/rate-limiter/index.mjs:115`. IP leída desde `x-forwarded-for` (Amplify / CloudFront lo provee automáticamente).
- Al exceder el límite, retorna `HTTP 429` con header `retry-after` en segundos.
- Solo aplica a rutas dentro del handler de Better-Auth (`/api/auth/*`). Las rutas custom como `/api/snapshots/*` y `/api/user-preferences` **no** pasan por este rate limiter.

**Tabla `rateLimit` en Turso:**

```sql
create table "rateLimit" (
  "id" text not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" integer not null
);
create index "rateLimit_key_idx" on "rateLimit" ("key");
```

Agregada manualmente al final de [src/db/auth-schema.sql](../../../src/db/auth-schema.sql) (igual que `user_preferences`). Si regeneras el schema con `npm run auth:generate`, reagregar a mano — ver [auth.md](auth.md#cuidado-al-regenerar-el-schema).

**Caveat en desarrollo:** con `enabled: true` el rate limit también aplica en `npm run dev`. Si te bloqueas probando UI de login, esperar 5 min o cambiar a `enabled: import.meta.env.PROD ?? false`.

## Timing equalization en login

Better-Auth 1.6.9 **ya iguala tiempos** en las rutas de error de `/sign-in/email`. Cuando el email no existe, no tiene credenciales, o el password es null, el handler ejecuta `await ctx.context.password.hash(password)` antes de retornar `INVALID_EMAIL_OR_PASSWORD` — ver `node_modules/better-auth/dist/api/routes/sign-in.mjs:213,219,225`.

**Validación periódica:** medir el delta entre login a email inexistente y email existente con password incorrecto:

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "noexiste: %{time_total}s\n" \
    -X POST https://<deploy>/api/auth/sign-in/email \
    -H 'Content-Type: application/json' \
    -d '{"email":"no-existe-'$i'@vortex-it.com","password":"x"}'
done

for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "existe:   %{time_total}s\n" \
    -X POST https://<deploy>/api/auth/sign-in/email \
    -H 'Content-Type: application/json' \
    -d '{"email":"<user-real>@vortex-it.com","password":"x"}'
done
```

Si delta > 100ms (regresión upstream o cambio de versión), aplicar este hook en [src/lib/auth.ts](../../../src/lib/auth.ts):

```ts
import { createAuthMiddleware } from 'better-auth/api';

hooks: {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.path !== '/sign-in/email') return;
    const body = ctx.body as { email?: unknown } | undefined;
    const email = typeof body?.email === 'string' ? body.email : null;
    if (!email) return;
    try {
      const found = await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
      const hasCredential = !!found?.accounts?.some(
        (a: { providerId: string; password?: string | null }) =>
          a.providerId === 'credential' && !!a.password,
      );
      if (!hasCredential) {
        await ctx.context.password.hash('timing-equalizer-' + Math.random());
      }
    } catch {}
  }),
},
```

**Verificar después:** los dos buckets deben caer dentro de ±50ms. Si "no existe" queda más lento, hay doble-hash con el upstream — quitar el hook.

## Security headers

Configurados en [src/middleware.ts](../../../src/middleware.ts) — la constante `SECURITY_HEADERS` se aplica vía `withSecurityHeaders` a **toda** respuesta SSR (páginas y endpoints `/api/*`). Viven en el código de la app, no en config del host (antes `vercel.json`), a propósito: la config atada al host desaparece en silencio al migrar de plataforma (lo que ocurrió al pasar de Vercel a Amplify); en el middleware viajan con la app y corren de forma determinista. `withSecurityHeaders` no sobreescribe un header ya presente.

| Header | Valor | Para qué |
|---|---|---|
| `X-Frame-Options` | `DENY` | Bloquea embed en iframes (anti-clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Bloquea MIME sniffing del navegador |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | No filtra el path completo a sitios externos |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), ...` | Bloquea APIs del navegador no usadas |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS 1 año (sin `preload` por ahora) |
| `Content-Security-Policy-Report-Only` | ver abajo | Restringe orígenes; en modo report-only durante ~1 semana antes de enforce |

### CSP — directivas

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://accounts.google.com;
form-action 'self' https://accounts.google.com;
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
upgrade-insecure-requests
```

| Directiva | Por qué necesita lo que tiene |
|---|---|
| `script-src 'unsafe-inline'` | Astro 6 emite scripts inline para hydration + theme toggle en `Layout.astro`. Migrar a `'strict-dynamic'` + hashes requiere refactor del build. |
| `style-src 'unsafe-inline'` | Tailwind v4 con plugin Vite inyecta CSS en runtime; Recharts genera `<style>` inline en SVG. |
| `connect-src https://accounts.google.com` | OAuth flow (server-side hace el fetch real, pero conviene tenerlo si se agrega Google One-Tap más adelante). |
| `form-action https://accounts.google.com` | Sign-in con Google redirige a `accounts.google.com/o/oauth2/v2/auth`. |
| `img-src https:` | Avatares de Google (`lh3.googleusercontent.com`). |

### Promoción de Report-Only a enforce

1. Después de desplegar el middleware con `Content-Security-Policy-Report-Only`, abrir DevTools en producción → filtrar console por "Content Security Policy".
2. Navegar todas las secciones críticas: dashboard, portafolio, costos, pronósticos (Recharts), login con Google, /cuenta (sesiones, change-password).
3. Anotar todas las violaciones reportadas durante ~7 días.
4. Ajustar el valor del header (agregar dominios faltantes, hashes inline si rompió algo no contemplado).
5. Renombrar la key en `SECURITY_HEADERS` de `Content-Security-Policy-Report-Only` → `Content-Security-Policy` y redesplegar.
6. Verificar de nuevo con un smoke test funcional completo.

**No promover sin haber confirmado 0 violaciones críticas.** Una CSP rota puede dejar páginas sin estilos o sin hidratación de islands.

## Source maps en producción

[astro.config.mjs](../../../astro.config.mjs) fuerza `vite.build.sourcemap: false`:

```js
vite: {
  plugins: [tailwindcss()],
  build: {
    sourcemap: false,
  },
},
```

Sin esto, Vite puede emitir `.map` files que exponen el TypeScript original (queries Turso, lógica de costos, validaciones server-side). El bundle en `.amplify-hosting/` ya no debe contener archivos `.map`.

Si en el futuro se integra una herramienta de observability como Sentry, usar `sourcemap: 'hidden'` (genera los maps pero sin `//# sourceMappingURL=` al final del JS y los sube privadamente al proveedor).

## 404 sin Layout autenticado

[src/pages/404.astro](../../../src/pages/404.astro) intencionalmente **no importa** `Layout.astro`. Es HTML+CSS inline, sin React islands, sin Sidebar.

**Por qué:** un 404 servido pre-auth (asset 404 que salta el middleware, cambios futuros de routing) no debe filtrar la estructura del menú lateral ni el email del usuario actual. El middleware de hoy redirige cualquier 404 anónimo a `/login`, pero hacer el 404 self-contained elimina cualquier dependencia de esa garantía.

**Si necesitas un 404 "interno" con sidebar** (para usuarios autenticados), puedes crear `src/pages/[...page].astro` con Layout para rutas no resueltas autenticadas — pero hoy no hace falta porque el flujo es: anónimo → /login, autenticado → 404 minimalista.

## Archivos sensibles en el repo

`.gitignore` cubre por patrón general:

```gitignore
# Google OAuth client secrets (any filename pattern)
client_secret_*.json

# Local databases — never commit binary DB blobs
*.db
*.sqlite
*.sqlite3
*.db-journal
*.sqlite-journal
```

**Antes del próximo commit**, validar:

```bash
# Que nada sensible esté tracked:
git ls-files | grep -iE '\.(db|sqlite)$|client_secret' && echo "FAIL" || echo "OK"

# Que las reglas matchean un archivo de prueba:
touch test.db && git check-ignore -v test.db && rm test.db
```

Si subes un nuevo tipo de archivo de credenciales (certificados, tokens, admin SDK JSON), **agregar el patrón al `.gitignore` antes de hacer `git add`**.

## Cron de snapshots — bypass del middleware

`/api/snapshots/auto-capture` es la única ruta `/api/*` con bypass del middleware. Acepta requests sin sesión **solo si** vienen con `Authorization: Bearer <CRON_SECRET>`. Ver [middleware.ts:35-41](../../../src/middleware.ts#L35-L41) y [auth.md → Flujo del middleware](auth.md#flujo-del-middleware).

**Validación:**

- `CRON_SECRET` debe estar set en las env vars de AWS Amplify para Production. El scheduler externo (EventBridge) debe enviarlo en el header `Authorization: Bearer`.
- Sin `CRON_SECRET`, el endpoint queda inaccesible y el cron falla.
- Sin bearer (o con bearer incorrecto), el middleware cae al flujo de sesión y retorna 401 JSON.

## Validación periódica

Checklist para correr después de cada deploy mayor o cambio en `auth.ts` / `middleware.ts` (este último ahora también lleva los security headers):

### Build

```bash
npx astro check                                       # 0 errors esperado
npm run build                                         # debe completar sin errores
find dist .amplify-hosting -name "*.map" | head       # debe ser vacío
```

### Repo

```bash
git ls-files | grep -iE '\.(db|sqlite)$|client_secret'   # vacío
```

### Tabla rateLimit existe en Turso

```bash
echo '.schema rateLimit' | turso db shell <db-name>
```

### Headers en producción

```bash
curl -sI https://<deploy>/ | grep -iE 'frame-options|content-type-options|referrer|permissions|strict-transport|content-security'
# Esperado: 6 headers presentes
```

### Rate limit funciona

```bash
for i in 1 2 3 4 5 6; do
  curl -i -X POST https://<deploy>/api/auth/sign-in/email \
    -H 'Content-Type: application/json' \
    -d '{"email":"a@b.com","password":"x"}' 2>&1 | grep -E '^HTTP|retry-after'
done
# Esperado: 400 en los primeros 5, 429 en el 6
```

### Timing equalization

```bash
# Ver "Timing equalization en login" arriba para el experimento.
# Delta esperado: < 100ms entre email-no-existe y email-real-con-password-mal.
```

### 404 no filtra UI autenticada

```bash
curl -s https://<deploy>/no-existe-xyz | grep -iE 'sidebar|userMenu|@bit\.com\.mx'
# Esperado: vacío
```

## Cómo extender

Si agregas un endpoint nuevo en `/api/*`:

- **Auth queda cubierta por default.** El middleware retorna 401 JSON si no hay sesión.
- **Permisos deben gatearse explícitamente si aplican.** Para datos sensibles, agregar la verificación en el middleware (`middleware.ts`) con `evaluate(perms, 'data:<clave>')`. Para endpoints de administración, añadir el segmento `/api/admin/` (ya gateado en el middleware) o verificar con `can(locals.user, 'action:user:manage')` en el endpoint.
- **Rate limit no aplica.** Better-Auth solo rate-limita rutas dentro de su propio handler. Si tu endpoint debe estar rate-limitado, implementa límite custom (cuenta en Turso por `userId+endpoint+ventana`) o delega a un middleware/CDN del host.
- **Headers de seguridad ya aplican** porque el middleware (`src/middleware.ts`) los setea en toda respuesta vía `withSecurityHeaders`.
- **Si tu endpoint recibe input del usuario que termina en SQL, eval, exec o fetch externo**, validar explícitamente. Trust boundary única es el middleware (sesión), no la validación de payload.

Si agregas un componente que renderiza HTML desde input no-confiable (markdown, etc.):

- React auto-escapa expresiones `{value}`. Cubierto.
- Si necesitas `dangerouslySetInnerHTML`, **escapa primero** y reinyecta solo el HTML mínimo necesario (ver el patrón de `renderMarkdownInline` en [src/utils/changelog.ts](../../../src/utils/changelog.ts#L92-L100)).
- Cualquier uso nuevo de `set:html` en Astro o `dangerouslySetInnerHTML` debe revisarse explícitamente.

Si agregas una dependencia nueva:

- `npm audit` antes de mergear. 0 vulnerabilities **de runtime de producción** esperado.
- Si trae CVEs transitivos, agregar `overrides` en `package.json` (ver el bloque actual para `path-to-regexp`, `drizzle-orm`, etc.). El override solo aplica si el paquete intermedio declara la dependencia con un rango compatible; si la fija con versión exacta (`==`), npm lo rechaza (`ELSPROBLEMS`) y no hay forma de forzarlo — en ese caso, documentar aquí como aceptada.

## Vulnerabilidades aceptadas (npm audit)

`npm audit` puede reportar advisories que **no son explotables en producción**. Se aceptan y documentan aquí (no se intenta `npm audit fix --force`, que rompería tooling). Revisar en cada auditoría si ya hay fix upstream.

| Advisory | Paquete | Severidad | Por qué se acepta | Acción si aparece fix |
|---|---|---|---|---|
| [GHSA-wxw3-q3m9-c3jr](https://github.com/advisories/GHSA-wxw3-q3m9-c3jr) | `better-auth@1.4.x` **anidado en `@better-auth/cli`** | moderate (x2) | El runtime usa `better-auth@1.6.11` (top-level, ≥ 1.6.2 → **no vulnerable**), que es el que sirve el OAuth callback real. `@better-auth/cli` es **devDependency**, solo lo usa `npm run auth:generate` para generar SQL en local; nunca se despliega a producción (AWS Amplify) ni atiende HTTP/OAuth. El CLI fija `better-auth` con versión **exacta** (`==1.4.x`), así que el `overrides` no puede forzarlo y **no hay fix upstream** (el último `@better-auth/cli` sigue trayendo la versión vulnerable). | Cuando `@better-auth/cli` publique una versión que dependa de `better-auth ≥ 1.6.2`, bumpear el devDependency y borrar esta fila. |

**Comando de verificación** (el único advisory residual debe ser el de arriba, dev-only):

```bash
npm audit            # esperado: 2 moderate, ambos = @better-auth/cli → better-auth
npm ls better-auth   # top-level debe ser ≥ 1.6.2 (runtime no vulnerable)
```

## Auditorías realizadas

| Fecha | Tipo | Origen | Hallazgos |
|---|---|---|---|
| 2026-05-08 | Caja negra | Eduardo Montaño — Consultor CiberSeguridad VortexIT | Timing attack, rate limit débil, source maps en prod, 404 expone sidebar, headers ausentes |
| 2026-05-12 | Caja blanca | Auditoría interna | `dev.db` rastreado en git, `client_secret_*.json` gitignored por nombre exacto |

Mitigaciones aplicadas en la release [1.7.1](../../../CHANGELOG.md). Próxima auditoría sugerida: **caja gris** (auditor con credenciales válidas para probar IDOR y autorización horizontal en endpoints como `/api/user-preferences` y rutas dinámicas `/proyecto/[folio]`).
