import type { APIRoute } from 'astro';
import {
  ALLOWED_EXPIRES_DAYS,
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
  type ExpiresInDays,
} from '../../../lib/mcpToken';

export const prerender = false;

/**
 * Endpoints de gestión de tokens MCP del usuario actual.
 *
 *   GET    -> lista de tokens (sólo metadata; el plaintext jamás se devuelve aquí).
 *   POST   -> crea un token nuevo; devuelve el plaintext UNA sola vez.
 *   DELETE -> revoca por tokenPrefix (?prefix=pn_mcp_xxxxxxx).
 *
 * Auth: el middleware ya garantiza sesión + popula `locals.user`. Estos
 * endpoints sólo aceptan sesiones de browser (no se autoriza con un token MCP
 * para crear otros tokens — defensa en profundidad).
 */
function isMcpRequest(req: Request): boolean {
  const h = req.headers.get('authorization');
  return !!h && h.toLowerCase().startsWith('bearer pn_mcp_');
}

function jsonError(status: number, message: string, code: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) return jsonError(401, 'No autorizado.', 'UNAUTHORIZED');
  try {
    const tokens = await listMcpTokens(userId);
    return new Response(JSON.stringify({ tokens, allowedExpiresDays: ALLOWED_EXPIRES_DAYS }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[api:me/mcp-tokens:get]', error);
    return jsonError(500, 'Ocurrió un error al procesar la solicitud.', 'INTERNAL_ERROR');
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) return jsonError(401, 'No autorizado.', 'UNAUTHORIZED');
  if (isMcpRequest(request)) {
    // Cosmético pero importante: un MCP no puede emitir otro MCP token.
    return jsonError(403, 'Los tokens MCP no pueden crear otros tokens.', 'MCP_CANNOT_CHAIN');
  }
  let body: { name?: unknown; expiresInDays?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Body inválido (esperado JSON).', 'BAD_BODY');
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 64) {
    return jsonError(400, 'El nombre es obligatorio (1-64 caracteres).', 'BAD_NAME');
  }
  const expiresInDaysNum = Number(body.expiresInDays);
  if (!ALLOWED_EXPIRES_DAYS.includes(expiresInDaysNum as ExpiresInDays)) {
    return jsonError(
      400,
      `Caducidad inválida. Permitidas: ${ALLOWED_EXPIRES_DAYS.join(', ')} días.`,
      'BAD_EXPIRES',
    );
  }
  try {
    const result = await createMcpToken({
      userId,
      name,
      expiresInDays: expiresInDaysNum as ExpiresInDays,
    });
    // Plaintext sólo aquí — la lista posterior nunca lo vuelve a exponer.
    return new Response(
      JSON.stringify({ token: result.plain, summary: result.summary }),
      { status: 201, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[api:me/mcp-tokens:post]', error);
    return jsonError(500, 'Ocurrió un error al procesar la solicitud.', 'INTERNAL_ERROR');
  }
};

export const DELETE: APIRoute = async ({ locals, url }) => {
  const userId = locals.user?.id;
  if (!userId) return jsonError(401, 'No autorizado.', 'UNAUTHORIZED');
  const prefix = url.searchParams.get('prefix');
  if (!prefix) return jsonError(400, 'Falta query param `prefix`.', 'BAD_PREFIX');
  try {
    const ok = await revokeMcpToken(userId, prefix);
    if (!ok) return jsonError(404, 'Token no encontrado.', 'NOT_FOUND');
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[api:me/mcp-tokens:delete]', error);
    return jsonError(500, 'Ocurrió un error al procesar la solicitud.', 'INTERNAL_ERROR');
  }
};
