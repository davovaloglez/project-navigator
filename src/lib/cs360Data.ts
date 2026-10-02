/**
 * Fuente de datos server-side del tablero CS 360.
 *
 * Resolución (en orden):
 * 1. **URL remota** — si `CS360_DATA_URL` está configurado, descarga el
 *    export publicado por Samva (hoy en `static.samva.io`, S3+CloudFront,
 *    ~46MB sin comprimir; mismo shape que el export local, verificado byte a
 *    byte). Es env var a propósito: el path trae un GUID que puede cambiar
 *    cuando Samva regenere el export, y así se actualiza sin deploy.
 *    **Fuente de producción preferida.**
 * 2. **S3 propio** — si `CS360_S3_BUCKET` está configurado, descarga el
 *    export desde el bucket (key en `CS360_S3_KEY`, default
 *    `cs360/contratos_exportados.json.gz`). El objeto se sube gzippeado con
 *    `npm run cs360:upload` (~44MB → ~4MB); se gunzipea aquí. Credenciales AWS
 *    vía la cadena por defecto del SDK (rol de ejecución en Amplify), igual
 *    que los avatares.
 * 3. **Archivo local** — ruta en env `CS360_DATA_FILE`, o el default
 *    `mocks/healt-score/contratos_exportados.json` (gitignored: contiene
 *    datos reales de clientes y pesa ~44MB; nunca se commitea ni despliega).
 *    Es la fuente típica en desarrollo.
 * 4. **Fallback** — el mock curado `src/data/cs360-clientes.json` (bundleado).
 *
 * Todo se adapta con `adaptContratos` y se cachea 5 min en memoria. Cuando el
 * back real exista (API sobre `dbo.stp_ObtenerResumenContratosJSON`), se
 * agrega como fuente manteniendo el contrato.
 */
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fallbackJson from '../data/cs360-clientes.json';
import { adaptContratos, type RawContrato } from './cs360Adapter';
import { calculateBaseScore, toClienteResumen, type CsClienteResumen } from '../utils/cs360';
import type { CsCliente } from '../utils/cs360';

const CACHE_TTL = 5 * 60 * 1000;
const DEFAULT_EXPORT_PATH = 'mocks/healt-score/contratos_exportados.json';
export const DEFAULT_S3_KEY = 'cs360/contratos_exportados.json.gz';

export interface Cs360Source {
  data: CsCliente[];
  /**
   * 'url' = export remoto de Samva (CS360_DATA_URL); 's3' = export en S3
   * propio; 'export' = archivo local; 'mock' = JSON curado del repo.
   */
  source: 'url' | 's3' | 'export' | 'mock';
}

let cache: (Cs360Source & { timestamp: number }) | null = null;

function envVar(name: string): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name] ?? process.env[name];
}

function parseExport(raw: string): CsCliente[] | null {
  // El export de PowerShell sale con BOM UTF-8 — se recorta antes de parsear.
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, '')) as RawContrato[];
  if (!Array.isArray(parsed)) return null;
  return adaptContratos(parsed);
}

async function loadFromUrl(): Promise<CsCliente[] | null> {
  const url = "https://static.samva.io/1/ClientesContenidosRTE/ff0f8cf5_aed3_48c9_9742_e04cdbec5571.json";
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[cs360] CS360_DATA_URL respondió ${res.status}, probando siguiente fuente.`);
      return null;
    }
    return parseExport(await res.text());
  } catch (error) {
    console.warn('[cs360] No se pudo leer CS360_DATA_URL, probando siguiente fuente:', error);
    return null;
  }
}

async function loadFromS3(): Promise<CsCliente[] | null> {
  const bucket = envVar('CS360_S3_BUCKET');
  if (!bucket) return null;
  const key = envVar('CS360_S3_KEY') ?? DEFAULT_S3_KEY;
  try {
    const client = new S3Client({ region: envVar('AWS_REGION') || 'us-east-1' });
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    let bytes: Uint8Array = await res.Body.transformToByteArray();
    if (key.endsWith('.gz') || res.ContentEncoding === 'gzip') {
      bytes = gunzipSync(bytes);
    }
    return parseExport(new TextDecoder('utf-8').decode(bytes));
  } catch (error) {
    console.warn(`[cs360] No se pudo leer s3://${bucket}/${key}, probando siguiente fuente:`, error);
    return null;
  }
}

function loadFromFile(): CsCliente[] | null {
  const file = envVar('CS360_DATA_FILE') ?? path.join(process.cwd(), DEFAULT_EXPORT_PATH);
  try {
    if (!fs.existsSync(file)) return null;
    return parseExport(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn('[cs360] No se pudo leer/adaptar el export local, usando mock:', error);
    return null;
  }
}

export async function getCs360Clientes(): Promise<Cs360Source> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cache;

  let result: Cs360Source;
  const fromUrl = await loadFromUrl();
  if (fromUrl) {
    result = { data: fromUrl, source: 'url' };
  } else {
    const fromS3 = await loadFromS3();
    if (fromS3) {
      result = { data: fromS3, source: 's3' };
    } else {
      const fromFile = loadFromFile();
      result = fromFile
        ? { data: fromFile, source: 'export' }
        : { data: fallbackJson as unknown as CsCliente[], source: 'mock' };
    }
  }

  cache = { ...result, timestamp: Date.now() };
  return result;
}

// ---------------------------------------------------------------------------
// Derived caches — invalidate in lockstep with the raw cache.
// Both store the raw-cache timestamp they were computed from; when the raw
// cache refreshes (new timestamp), these are recomputed exactly once.
// ---------------------------------------------------------------------------

interface ResumenCache {
  data: CsClienteResumen[];
  source: Cs360Source['source'];
  rawTimestamp: number;
}

interface IndexCache {
  index: Map<string, CsCliente>;
  source: Cs360Source['source'];
  rawTimestamp: number;
}

let resumenCache: ResumenCache | null = null;
let indexCache: IndexCache | null = null;

/**
 * Returns the full list of clients as `CsClienteResumen[]` with
 * `calculateBaseScore` applied. Recomputes only when the raw cache refreshes
 * (same 5-min TTL, tied to the raw-cache timestamp).
 */
export async function getCs360Resumen(): Promise<{ data: CsClienteResumen[]; source: Cs360Source['source'] }> {
  const raw = await getCs360Clientes();
  const rawTs = cache!.timestamp; // cache is guaranteed non-null after getCs360Clientes()

  if (!resumenCache || resumenCache.rawTimestamp !== rawTs) {
    resumenCache = {
      data: raw.data.map((c) => toClienteResumen(c, calculateBaseScore(c))),
      source: raw.source,
      rawTimestamp: rawTs,
    };
  }

  return { data: resumenCache.data, source: resumenCache.source };
}

/**
 * Returns a single `CsCliente` by id using an indexed `Map` lookup.
 * Recomputes the index only when the raw cache refreshes.
 */
export async function getCs360ClienteById(
  id: string,
): Promise<{ cliente: CsCliente | null; source: Cs360Source['source'] }> {
  const raw = await getCs360Clientes();
  const rawTs = cache!.timestamp;

  if (!indexCache || indexCache.rawTimestamp !== rawTs) {
    const index = new Map<string, CsCliente>();
    for (const c of raw.data) index.set(c.id, c);
    indexCache = { index, source: raw.source, rawTimestamp: rawTs };
  }

  return { cliente: indexCache.index.get(id) ?? null, source: indexCache.source };
}
