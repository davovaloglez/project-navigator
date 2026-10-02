import type { APIRoute } from 'astro';
import { getCs360ClienteById } from '../../../../lib/cs360Data';

/**
 * GET /api/cs360/clientes/[id] — detalle COMPLETO de un cliente (`CsCliente`):
 * tickets/actividades/llamadas con su HTML enriquecido. Complementa la lista
 * ligera de `GET /api/cs360/clientes`. Gateado en middleware por `page:cs360`.
 *
 * El lookup se hace vía un Map indexado por id, recomputado una sola vez por
 * ciclo de cache de 5 min (ver getCs360ClienteById en cs360Data.ts).
 */
export const GET: APIRoute = async ({ params }) => {
  const { cliente, source } = await getCs360ClienteById(params.id!);
  if (!cliente) {
    return new Response(
      JSON.stringify({ error: 'Cliente no encontrado.', code: 'NOT_FOUND' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return new Response(JSON.stringify(cliente), {
    headers: { 'Content-Type': 'application/json', 'X-CS360-Source': source },
  });
};
