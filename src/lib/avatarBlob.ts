import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getDbClient } from '../db/client';

function envVar(name: string): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name] ?? process.env[name];
}

function getS3Client(): S3Client {
  return new S3Client({ region: envVar('AWS_REGION') || 'us-east-1' });
}

function getBucket(): string {
  const b = envVar('AVATAR_S3_BUCKET');
  if (!b) throw new Error('AVATAR_S3_BUCKET no está configurado.');
  return b;
}

function getPublicUrl(key: string): string {
  const cdnBase = envVar('AVATAR_CDN_URL');
  if (cdnBase) return `${cdnBase.replace(/\/$/, '')}/${key}`;
  return `https://${getBucket()}.s3.amazonaws.com/${key}`;
}

export const MAX_AVATAR_BYTES = 2_000_000;

const SNIFFERS: { ext: string; type: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: 'jpg', type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'png',
    type: 'image/png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    ext: 'webp',
    type: 'image/webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export type ValidatedImage = { bytes: Uint8Array; type: string; ext: string };

/** Valida tamaño y firma binaria (no confía en el Content-Type declarado). */
export function validateImage(bytes: Uint8Array): { ok: true; image: ValidatedImage } | { ok: false; message: string } {
  if (bytes.byteLength === 0) return { ok: false, message: 'El archivo está vacío.' };
  if (bytes.byteLength > MAX_AVATAR_BYTES) return { ok: false, message: 'La imagen es demasiado grande (máx. 2MB).' };
  const match = SNIFFERS.find((s) => s.test(bytes));
  if (!match) return { ok: false, message: 'Formato no permitido. Usa PNG, JPG o WebP.' };
  return { ok: true, image: { bytes, type: match.type, ext: match.ext } };
}

/** URL de la foto actual del usuario (solo lectura). */
export async function currentUserImage(userId: string): Promise<string | null> {
  const db = getDbClient();
  const res = await db.execute({ sql: 'select image from "user" where id = ?', args: [userId] });
  const img = res.rows[0]?.image;
  return typeof img === 'string' && img ? img : null;
}

function isS3Url(url: string): boolean {
  try {
    const host = new URL(url).host;
    return host.includes('.s3.') || host.includes('.s3-') || host.endsWith('.amazonaws.com');
  } catch {
    return false;
  }
}

function extractKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '') || null;
  } catch {
    return null;
  }
}

/** Borra el avatar anterior solo si vive en S3 (nunca toca fotos de Google OAuth). */
export async function deleteAvatarIfBlob(currentImage: string | null): Promise<void> {
  if (!currentImage || !isS3Url(currentImage)) return;
  const key = extractKeyFromUrl(currentImage);
  if (!key) return;
  try {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
  } catch {
    // best-effort
  }
}

/** Sube el avatar a S3 y devuelve su URL pública. */
export async function uploadAvatar(image: ValidatedImage, userId: string): Promise<string> {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  const suffix = Date.now().toString(36);
  const key = `avatars/${safeId}-${suffix}.${image.ext}`;
  await getS3Client().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: image.bytes,
    ContentType: image.type,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  return getPublicUrl(key);
}
