import type { APIRoute } from 'astro';
import { getEffectivePermissions } from '../../../lib/permissions';

export const prerender = false;

/**
 * Permisos efectivos del usuario autenticado actual.
 *
 * El middleware ya exige sesión para todo `/api/*` (401 si no hay), así que
 * aquí basta con leer `locals.user`. Sirve para que las islas React revaliden
 * los permisos inyectados inline en el Layout (`window.__PN_PERMS__`).
 */
export const GET: APIRoute = async ({ locals }) => {
  const perms = await getEffectivePermissions(locals.user);
  return new Response(JSON.stringify(perms), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
