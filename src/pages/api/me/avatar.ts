import type { APIRoute } from 'astro';
import { currentUserImage, deleteAvatarIfBlob, uploadAvatar, validateImage } from '../../../lib/avatarBlob';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// POST: sube/reemplaza la foto del usuario autenticado. Devuelve { url }.
// El cliente persiste user.image vía authClient.updateUser({ image: url }).
export const POST: APIRoute = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) return json({ error: 'No autenticado.', code: 'UNAUTHORIZED' }, 401);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return json({ error: 'Petición inválida.', code: 'BAD_REQUEST' }, 400);
  }
  if (!file) return json({ error: 'No se recibió ningún archivo.', code: 'BAD_REQUEST' }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = validateImage(bytes);
  if (!result.ok) return json({ error: result.message, code: 'BAD_REQUEST' }, 400);

  try {
    await deleteAvatarIfBlob(await currentUserImage(userId));
    const url = await uploadAvatar(result.image, userId);
    return json({ url });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'No se pudo subir la imagen.', code: 'UPLOAD_FAILED' },
      500,
    );
  }
};

// DELETE: borra el blob actual. El cliente luego setea user.image = null.
export const DELETE: APIRoute = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) return json({ error: 'No autenticado.', code: 'UNAUTHORIZED' }, 401);

  try {
    await deleteAvatarIfBlob(await currentUserImage(userId));
    return json({ ok: true });
  } catch {
    return json({ error: 'No se pudo eliminar la imagen.', code: 'DELETE_FAILED' }, 500);
  }
};
