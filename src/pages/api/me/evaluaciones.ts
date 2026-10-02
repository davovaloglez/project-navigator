import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Evaluaciones trimestrales propias del usuario (auto-evaluación, NAV-78).
 *
 * DESACTIVADO: los usuarios ya no pueden ver ni capturar su propia evaluación.
 * Las evaluaciones se gestionan exclusivamente por un admin desde `/comparativa`
 * (lectura cross-persona vía `/api/evaluaciones`, edición vía
 * `/api/admin/evaluaciones`). Este endpoint queda como 403 explícito para que
 * ningún cliente (browser o MCP) pueda leerlas/escribirlas por la vía propia.
 */

function disabled(): Response {
  return new Response(
    JSON.stringify({
      error: 'La autoevaluación está desactivada. Las evaluaciones las gestiona un administrador.',
      code: 'EVALUACION_DISABLED',
    }),
    { status: 403, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
  );
}

export const GET: APIRoute = () => disabled();
export const POST: APIRoute = () => disabled();
