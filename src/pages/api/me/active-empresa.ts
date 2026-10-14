import type { APIRoute } from 'astro';
import { serverErrorResponse } from '../../../lib/apiError';

export const prerender = false;

/**
 * POST /api/me/active-empresa
 *
 * Cambia la empresa activa del usuario (persiste en cookie `pn_active_empresa`).
 * El superadmin puede pasar `empresaId: null` para ver la vista global (todas
 * las empresas). El resto de usuarios solo puede cambiar a una empresa donde
 * tenga membresía (validación dura en Fase 2 cuando se consulte empresa_miembro
 * en Turso; en Fase 1 se acepta cualquier valor no vacío).
 *
 * Body: { empresaId: string | null }
 * Response: { ok: true, activeEmpresa: string | null }
 */
export const POST: APIRoute = async (context) => {
  try {
    if (!context.locals.user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado.', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const body = await context.request.json().catch(() => ({})) as { empresaId?: string | null };
    const { empresaId } = body;

    // El superadmin puede pasar null para activar la vista global.
    const isSuperadmin = context.locals.isSuperadmin;
    if (empresaId === null || empresaId === undefined) {
      if (!isSuperadmin) {
        return new Response(
          JSON.stringify({ error: 'Solo el superadministrador puede activar la vista global.', code: 'FORBIDDEN' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
      // Limpiar la cookie → superadmin entra en modo global.
      context.cookies.delete('pn_active_empresa', { path: '/' });
      return new Response(
        JSON.stringify({ ok: true, activeEmpresa: null }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (typeof empresaId !== 'string' || !empresaId.trim()) {
      return new Response(
        JSON.stringify({ error: 'empresaId inválido.', code: 'BAD_REQUEST' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Persistir en cookie HttpOnly de sesión.
    context.cookies.set('pn_active_empresa', empresaId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      // Sin maxAge: es cookie de sesión (dura hasta cerrar el navegador).
    });

    return new Response(
      JSON.stringify({ ok: true, activeEmpresa: empresaId }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return serverErrorResponse(error, 'me/active-empresa');
  }
};
