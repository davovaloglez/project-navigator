import type { APIRoute } from 'astro';
import { getCs360Resumen } from '../../../lib/cs360Data';

/**
 * GET /api/cs360/clientes — LISTA ligera de la cartera CS (CsClienteResumen[]).
 *
 * El export real pesa ~44MB; al navegador sólo viaja la proyección de lista
 * con el Health Score precalculado server-side (misma `calculateBaseScore`
 * que usa la UI, sobre los datos completos — el desglose del modal viene en
 * `score.log`). El detalle completo de un cliente (tickets/actividades/
 * llamadas con HTML) se pide por `GET /api/cs360/clientes/[id]`.
 *
 * Fuente: export real adaptado si existe en disco, mock curado si no (ver
 * src/lib/cs360Data.ts). Gateado en middleware por `page:cs360`.
 *
 * Los scores y el mapping a CsClienteResumen se computan una sola vez por
 * ciclo de cache de 5 min (ver getCs360Resumen en cs360Data.ts).
 */
export const GET: APIRoute = async () => {
  const { data, source } = await getCs360Resumen();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'X-CS360-Source': source },
  });
};
