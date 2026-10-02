import type { APIRoute } from 'astro';
import { can } from '../../../lib/permissions';
import { currentUserImage, deleteAvatarIfBlob, uploadAvatar, validateImage } from '../../../lib/avatarBlob';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** El middleware ya gatea /api/admin/*; esto es defensa en profundidad. */
async function ensureManager(locals: App.Locals): Promise<boolean> {
  return can(locals.user, 'action:user:manage');
}

const USER_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// POST (multipart: userId + file): sube/reemplaza la foto de otro usuario.
// El cliente persiste vía authClient.admin.updateUser({ userId, data: { image: url } }).
export const POST: APIRoute = async ({ locals, request }) => {
  if (!(await ensureManager(locals))) return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);

  let file: File | null = null;
  let targetId: string | null = null;
  try {
    const form = await request.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
    const u = form.get('userId');
    if (typeof u === 'string') targetId = u;
  } catch {
    return json({ error: 'Petición inválida.', code: 'BAD_REQUEST' }, 400);
  }
  if (!targetId || !USER_ID_RE.test(targetId)) return json({ error: 'userId inválido.', code: 'BAD_REQUEST' }, 400);
  if (!file) return json({ error: 'No se recibió ningún archivo.', code: 'BAD_REQUEST' }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = validateImage(bytes);
  if (!result.ok) return json({ error: result.message, code: 'BAD_REQUEST' }, 400);

  try {
    await deleteAvatarIfBlob(await currentUserImage(targetId));
    const url = await uploadAvatar(result.image, targetId);
    return json({ url });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'No se pudo subir la imagen.', code: 'UPLOAD_FAILED' },
      500,
    );
  }
};

// DELETE ?userId=...: borra el blob actual del usuario objetivo.
export const DELETE: APIRoute = async ({ locals, url }) => {
  if (!(await ensureManager(locals))) return json({ error: 'No tienes permiso para esta acción.', code: 'FORBIDDEN' }, 403);

  const targetId = url.searchParams.get('userId');
  if (!targetId || !USER_ID_RE.test(targetId)) return json({ error: 'userId inválido.', code: 'BAD_REQUEST' }, 400);

  try {
    await deleteAvatarIfBlob(await currentUserImage(targetId));
    return json({ ok: true });
  } catch {
    return json({ error: 'No se pudo eliminar la imagen.', code: 'DELETE_FAILED' }, 500);
  }
};
