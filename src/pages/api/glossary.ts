import type { APIRoute } from 'astro';
import { getEffectivePermissions } from '../../lib/permissions';
import { filterGlossary } from '../../lib/glossaryFilter';
import { serverErrorResponse } from '../../lib/apiError';

export const prerender = false;

/**
 * Glosario filtrado por permisos del usuario. Mismas reglas que
 * GlosarioSection en cliente — el helper `filterGlossary` es la fuente única.
 *
 * Gateado por `page:glosario` en el middleware (mismo gate que `/glosario`).
 * Si el usuario no tiene `page:glosario`, el middleware corta con 403 antes
 * de tocar este handler.
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    const perms = await getEffectivePermissions(locals.user);
    const { sections, entries } = filterGlossary(perms);
    return new Response(JSON.stringify({ sections, entries }), {
      headers: {
        'Content-Type': 'application/json',
        // Permisos pueden cambiar (overrides/role/ban), no cachear cross-user.
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'glossary');
  }
};
