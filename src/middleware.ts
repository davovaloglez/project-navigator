import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { auth } from './lib/auth';
import { getEffectivePermissions, evaluate, type EffectivePermissions } from './lib/permissions';
import { extractBearer, isMcpBearer, resolveMcpToken } from './lib/mcpToken';

const PUBLIC_PAGE_ROUTES = new Set<string>(['/login']);
const CRON_ROUTE = '/api/snapshots/auto-capture';

// Env var portable: `import.meta.env` con fallback a `process.env`. En AWS
// Amplify las env vars de runtime llegan por `process.env`.
function envVar(name: string): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name] ?? process.env[name];
}

/** Páginas sin gate de permiso (siempre accesibles a un autenticado). */
const UNGATED_PAGES = new Set<string>(['/cuenta', '/404']);

/**
 * Gate por API: cada endpoint requiere AL MENOS UNA page-key del conjunto.
 *
 * Filosofía: un endpoint sirve datos a un set conocido de páginas. Si el rol no
 * puede ver NINGUNA de esas páginas (incluidos sus drill-downs), no tiene
 * razón para fetchear el endpoint. Esto bloquea el `curl` directo aunque la UI
 * ya esté escondida.
 *
 * Límite aceptado: NO hace row-level scoping. Un dev que sí puede ver
 * /portafolio puede hacer curl /api/proyectos y ver TODOS los proyectos, no
 * solo los suyos. Eso es Fase 5 (scoping por identidad fila-a-fila) y está
 * fuera de scope hasta resolver la fragmentación de cache compartida.
 *
 * Endpoints omitidos (gating propio o per-user):
 *   - /api/auth/*, /api/admin/*, /api/me/*, /api/user-preferences
 *   - /api/costos*, /api/glossary, /api/snapshots/auto-capture, POST snapshots
 */
const API_PAGE_GATES: Record<string, string[]> = {
  '/api/proyectos': [
    'dashboard', 'resumen', 'alertas', 'portafolio', 'roadmap', 'timeline',
    'cronograma', 'pronosticos', 'distribucion', 'costos', 'equipo', 'metricas-dev',
  ],
  '/api/tareas': ['cronograma', 'equipo', 'pronosticos', 'portafolio'],
  '/api/cursos': ['cursos', 'equipo'],
  '/api/equipo': [
    // Ampliamente usado para resolución de nombres + avatars.
    'dashboard', 'resumen', 'alertas', 'portafolio', 'roadmap', 'timeline',
    'cronograma', 'pronosticos', 'distribucion', 'costos', 'equipo', 'metricas-dev',
  ],
  '/api/repositorios': ['equipo'], // sólo /persona/[id] Accesos tab
  '/api/hitos': ['roadmap', 'pronosticos', 'portafolio'],
  '/api/capacidades': ['equipo', 'pronosticos'],
  '/api/sprints': ['equipo', 'cronograma'],
  // Tecnologías (skills) matrix — Plan 015. Gateado bajo `page:equipo`
  // (el tab Tecnologías vive en /equipo).
  '/api/technologies': ['equipo'],
  '/api/team-technologies': ['equipo'],
  '/api/snapshots': [
    // GET — múltiples secciones cruzan snapshots para histórico/throughput.
    // POST tiene gate propio (`action:snapshot:create`) más abajo.
    'pronosticos', 'alertas', 'timeline', 'portafolio', 'dashboard', 'resumen',
  ],
};

/** primer segmento de ruta → page-key del statement `page`. */
const PAGE_KEY_BY_SEGMENT: Record<string, string> = {
  '/resumen': 'resumen',
  '/alertas': 'alertas',
  '/portafolio': 'portafolio',
  '/roadmap': 'roadmap',
  '/timeline': 'timeline',
  '/cronograma': 'cronograma',
  '/pronosticos': 'pronosticos',
  '/costos': 'costos',
  '/distribucion': 'distribucion',
  '/equipo': 'equipo',
  '/comparativa': 'comparativa',
  '/cursos': 'cursos',
  '/novedades': 'novedades',
  '/glosario': 'glosario',
  '/metricas-dev': 'metricas-dev',
  '/cs360': 'cs360',
  '/admin': 'admin',
  // Páginas de detalle heredan la page-key de su sección padre.
  '/proyecto': 'portafolio',
  '/persona': 'equipo',
  '/tarea': 'cronograma',
};

/** Devuelve la page-key a evaluar, o null si la ruta no se gatea. */
function pageKeyForPath(pathname: string): string | null {
  if (pathname === '/') return 'dashboard';
  if (UNGATED_PAGES.has(pathname)) return null;
  const segment = '/' + (pathname.split('/')[1] ?? '');
  return PAGE_KEY_BY_SEGMENT[segment] ?? null;
}

/** Orden del sidebar: usado para elegir un destino seguro de redirect. */
const SIDEBAR_PAGE_ORDER: ReadonlyArray<readonly [string, string]> = [
  ['/', 'dashboard'],
  ['/resumen', 'resumen'],
  ['/alertas', 'alertas'],
  ['/portafolio', 'portafolio'],
  ['/roadmap', 'roadmap'],
  ['/timeline', 'timeline'],
  ['/cronograma', 'cronograma'],
  ['/pronosticos', 'pronosticos'],
  ['/costos', 'costos'],
  ['/distribucion', 'distribucion'],
  ['/equipo', 'equipo'],
  ['/comparativa', 'comparativa'],
  ['/cursos', 'cursos'],
  ['/novedades', 'novedades'],
  ['/glosario', 'glosario'],
  ['/admin', 'admin'],
];

/**
 * Primera página accesible para el usuario (en orden de sidebar), o `/cuenta`
 * (siempre accesible) si no tiene ninguna. Es el destino seguro al denegar una
 * página: nunca apunta a una página denegada, por lo que gatear `/` (el
 * dashboard) ya no genera un loop de redirect.
 */
function firstAllowedPath(perms: EffectivePermissions): string {
  for (const [path, key] of SIDEBAR_PAGE_ORDER) {
    if (evaluate(perms, `page:${key}`)) return path;
  }
  return '/cuenta';
}

function forbiddenJson(): Response {
  return new Response(
    JSON.stringify({ error: 'No tienes permiso para acceder a este recurso.', code: 'FORBIDDEN' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  );
}

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/_image') ||
    pathname === '/favicon.svg' ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon-96x96.png' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/site.webmanifest' ||
    pathname === '/web-app-manifest-192x192.png' ||
    pathname === '/web-app-manifest-512x512.png' ||
    pathname === '/robots.txt'
  );
}

function isAuthApi(pathname: string): boolean {
  return pathname.startsWith('/api/auth/');
}

function unauthorizedJson(): Response {
  return new Response(
    JSON.stringify({ error: 'No autorizado. Inicia sesión de nuevo.', code: 'UNAUTHORIZED' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  );
}

/**
 * Headers de seguridad aplicados a TODA respuesta. Viven aquí (en la app) y no
 * en config del host (antes `vercel.json`) a propósito: la config atada al host
 * desaparece en silencio al migrar de plataforma. En el código viajan con la
 * app y corren de forma determinista en cada respuesta SSR.
 *
 * CSP ownership split:
 *   HTML pages  → Astro's security.csp (astro.config.mjs) is the CSP authority.
 *                 For SSR (output:'server', non-prerendered routes) Astro emits a
 *                 Content-Security-Policy RESPONSE HEADER (its default cspDestination
 *                 for non-prerendered routes is "header"; the <meta> tag is used only
 *                 for prerendered routes). That policy carries SHA-256 hashes for the
 *                 scripts Astro processes (bundled JS, React island hydration) PLUS the
 *                 hand-pinned hashes for our `is:inline` scripts that Astro does not
 *                 auto-hash. script-src has NO 'unsafe-inline'. style-src keeps
 *                 'unsafe-inline' (React/Recharts/Tailwind use inline style attributes,
 *                 which are not hashable). withSecurityHeaders() therefore SKIPS the
 *                 'Content-Security-Policy' header below for HTML responses, so Astro's
 *                 header is the only CSP on the page — avoiding a double-block (two CSPs
 *                 are enforced independently; both must be satisfied).
 *   Non-HTML    → The enforced 'Content-Security-Policy' header below applies.
 *                 /api/* JSON responses never run scripts; 'none' baseline is cheap
 *                 defense-in-depth. Uses Content-Security-Policy (enforced), not -Report-Only.
 *
 * Accepted residual: style-src 'unsafe-inline' (documented above and in astro.config.mjs).
 * Future follow-up: add report-uri/report-to for violation observability.
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // Enforced CSP for non-HTML responses (see ownership split in comment above).
  // withSecurityHeaders() skips this for HTML pages — Astro's own CSP header owns those.
  'Content-Security-Policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'self'",
};

function withSecurityHeaders(response: Response): Response {
  const contentType = response.headers.get('content-type') ?? '';
  const isHtmlPage = contentType.includes('text/html');

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    // HTML pages: skip Content-Security-Policy — Astro's own CSP (a response header
    // for SSR pages, injected by security.csp in astro.config.mjs) is the sole CSP
    // authority for HTML. Setting a second CSP header here would create two independent
    // script-src policies; the browser enforces BOTH, which would silently block the
    // hashed scripts that Astro's policy allows.
    if (isHtmlPage && key === 'Content-Security-Policy') continue;

    if (!response.headers.has(key)) response.headers.set(key, value);
  }
  return response;
}

const handleRequest = async (context: APIContext, next: MiddlewareNext): Promise<Response> => {
  const { pathname } = context.url;

  if (isPublicAsset(pathname) || isAuthApi(pathname)) {
    return next();
  }

  if (pathname === CRON_ROUTE) {
    const cronSecret = envVar('CRON_SECRET');
    const authHeader = context.request.headers.get('authorization');
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return next();
    }
  }

  // Short-circuit para tokens MCP (Bearer pn_mcp_*). Resolvemos al usuario
  // contra la tabla custom `mcp_token`; el resto del pipeline (permisos,
  // scoping) corre idéntico. MCP nunca toca páginas — sólo `/api/*` — así que
  // dejamos `locals.session = null` (no es una sesión de browser).
  const authHeader = context.request.headers.get('authorization');
  let mcpUser: Awaited<ReturnType<typeof resolveMcpToken>> = null;
  if (isMcpBearer(authHeader)) {
    const plain = extractBearer(authHeader);
    if (plain) mcpUser = await resolveMcpToken(plain);
    if (!mcpUser) {
      // Token inválido/expirado o usuario baneado → 401 directo, no caer al cookie.
      if (pathname.startsWith('/api/')) return unauthorizedJson();
      // Para no-API ni intentamos; un MCP no debería pedir HTML.
      return unauthorizedJson();
    }
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  if (!mcpUser) {
    try {
      session = await auth.api.getSession({ headers: context.request.headers });
    } catch {
      session = null;
    }
  }

  if (mcpUser || session?.user) {
    const user = mcpUser ?? session!.user;
    context.locals.user = user;
    context.locals.session = mcpUser ? null : session!.session;
    if (PUBLIC_PAGE_ROUTES.has(pathname)) {
      return context.redirect('/');
    }

    // Una sola resolución (rol + overrides) por request, cacheada por usuario.
    const perms = await getEffectivePermissions(user);

    // Gating de API: el server es la fuente de verdad.
    if (pathname.startsWith('/api/')) {
      if (
        (pathname === '/api/costos' || pathname === '/api/costos-modelo') &&
        !evaluate(perms, 'data:costos')
      ) {
        return forbiddenJson();
      }
      if (pathname === '/api/glossary' && !evaluate(perms, 'page:glosario')) {
        return forbiddenJson();
      }
      if (
        pathname === '/api/snapshots' &&
        context.request.method === 'POST' &&
        !evaluate(perms, 'action:snapshot:create')
      ) {
        return forbiddenJson();
      }
      if (pathname.startsWith('/api/admin/equipo')) {
        // Gestión del registro `equipo`: permiso propio (no auth/user mgmt).
        if (!evaluate(perms, 'action:equipo:manage')) return forbiddenJson();
      } else if (pathname.startsWith('/api/admin/evaluaciones')) {
        // Edición/borrado cross-persona de evaluaciones (HU NAV-78). Statement
        // propio para que se pueda otorgar sin abrir todo `user:manage`.
        if (!evaluate(perms, 'action:evaluacion:manage')) return forbiddenJson();
      } else if (pathname.startsWith('/api/admin/team-technologies')) {
        // Gestión de la matriz de tecnologías (Plan 015). Statement propio para
        // que se pueda otorgar sin abrir todo `user:manage`. El endpoint write
        // es Fase 2; este gate reserva la ruta para que Phase 2 se agregue
        // sin tocar el middleware.
        if (!evaluate(perms, 'action:tecnologia:manage')) return forbiddenJson();
      } else if (pathname.startsWith('/api/admin/') && !evaluate(perms, 'action:user:manage')) {
        return forbiddenJson();
      }
      // CS 360 (Health Score de clientes): TODO el namespace (lista, detalle
      // dinámico [id] y proxy de IA) requiere `page:cs360` — admin-only por
      // default. Gate por prefijo porque API_PAGE_GATES sólo matchea exacto.
      if (pathname.startsWith('/api/cs360/') && !evaluate(perms, 'page:cs360')) {
        return forbiddenJson();
      }
      // NAV-78: lectura cross-persona de evaluaciones; sólo `action:evaluacion:view-all`.
      // `/api/me/evaluaciones` queda fuera (cada uno ve lo suyo, gateado por
      // sesión + filtro por equipoId dentro del endpoint).
      if (pathname === '/api/evaluaciones' && !evaluate(perms, 'action:evaluacion:view-all')) {
        return forbiddenJson();
      }
      // Gate genérico: endpoint requiere AL MENOS una page-key de sus
      // consumidores. Si el rol no puede ver ninguna de esas páginas, 403
      // aunque haga curl directo.
      const requiredPages = API_PAGE_GATES[pathname];
      if (requiredPages && !requiredPages.some((p) => evaluate(perms, `page:${p}`))) {
        return forbiddenJson();
      }
      return next();
    }

    // Gating de páginas (incluido '/'). El server es la fuente de verdad.
    // Una página denegada redirige a `firstAllowedPath` (una página permitida o
    // `/cuenta`), nunca a otra denegada → gatear el dashboard no genera loop.
    const pageKey = pageKeyForPath(pathname);
    if (pageKey && !evaluate(perms, `page:${pageKey}`)) {
      const target = firstAllowedPath(perms);
      if (target !== pathname) return context.redirect(target);
    }
    return next();
  }

  context.locals.user = null;
  context.locals.session = null;

  if (PUBLIC_PAGE_ROUTES.has(pathname)) {
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return unauthorizedJson();
  }

  const redirectTarget = pathname + context.url.search;
  return context.redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
};

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await handleRequest(context, next);
  return withSecurityHeaders(response);
});
