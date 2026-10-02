/**
 * Sube el export real de contratos de Samva a S3 para que producción lo
 * consuma (ver src/lib/cs360Data.ts — la fuente S3 es la primera de la cadena).
 *
 * Uso:
 *   npm run cs360:upload                      # usa la ruta default del export
 *   npm run cs360:upload -- /ruta/al/export.json
 *
 * Env requeridas (.env): CS360_S3_BUCKET (+ AWS_REGION opcional, credenciales
 * AWS por la cadena del SDK). Key destino: CS360_S3_KEY o el default
 * `cs360/contratos_exportados.json.gz`.
 *
 * Valida que el JSON parsee y adapte ANTES de subir (no se publica un export
 * roto), lo comprime con gzip (~44MB → ~4MB) y lo sube como objeto privado.
 * El tablero lo recoge en su siguiente ciclo de cache (máx. 5 min).
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { adaptContratos, type RawContrato } from '../src/lib/cs360Adapter';

const DEFAULT_EXPORT_PATH = 'mocks/healt-score/contratos_exportados.json';
const DEFAULT_S3_KEY = 'cs360/contratos_exportados.json.gz';

async function main(): Promise<void> {
  const bucket = process.env.CS360_S3_BUCKET;
  if (!bucket) {
    console.error('✗ Falta CS360_S3_BUCKET en el .env');
    process.exit(1);
  }
  const key = process.env.CS360_S3_KEY ?? DEFAULT_S3_KEY;
  const file =
    process.argv[2] ?? process.env.CS360_DATA_FILE ?? path.join(process.cwd(), DEFAULT_EXPORT_PATH);

  if (!fs.existsSync(file)) {
    console.error(`✗ No existe el archivo del export: ${file}`);
    process.exit(1);
  }

  console.log(`Leyendo ${file}...`);
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

  // Validación previa: si el JSON no parsea o no adapta, NO se sube.
  let clientes: ReturnType<typeof adaptContratos>;
  try {
    const parsed = JSON.parse(raw) as RawContrato[];
    if (!Array.isArray(parsed)) throw new Error('el JSON raíz no es un array');
    clientes = adaptContratos(parsed);
  } catch (error) {
    console.error('✗ El export no es válido, no se sube:', error);
    process.exit(1);
  }
  console.log(`✓ Export válido: ${clientes.length} clientes adaptables`);

  const body = gzipSync(Buffer.from(raw, 'utf8'), { level: 9 });
  const mb = (n: number): string => (n / 1024 / 1024).toFixed(1);
  console.log(`Comprimido: ${mb(raw.length)} MB → ${mb(body.length)} MB (gzip)`);

  const endpoint = process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'auto';

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
  console.log(`Subiendo a s3://${bucket}/${key}...`);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      // Objeto privado: lo lee el server con credenciales del SDK, nunca el browser.
      CacheControl: 'no-cache',
      Metadata: {
        clientes: String(clientes.length),
        subido: new Date().toISOString(),
      },
    }),
  );
  console.log('✓ Subida completada. El tablero lo tomará en su siguiente ciclo de cache (máx. 5 min).');
}

main().catch((error) => {
  console.error('✗ Error al subir:', error);
  process.exit(1);
});
