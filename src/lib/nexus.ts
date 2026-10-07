import { randomBytes } from 'node:crypto';

/**
 * Cliente del servicio de IA Nexus (ai.vortex-it.com), NAV-85.
 *
 * El servicio funciona por templates administrados en su panel: el prompt
 * completo (prefix/suffix contexts + template con placeholders + JSON Schema
 * de respuesta) vive allá; aquí sólo se mandan los `parameters`. El patrón es
 * asíncrono: el POST inicia la generación y devuelve una webhook URL firmada
 * que se consulta por polling hasta que `response_message` está listo.
 *
 * Autenticación con bearer token server-side (`AI_BEARER_TOKEN`); el cliente
 * de browser nunca ve token, template_id ni webhook URL (quedan en Turso).
 */

export const AI_SERVICE_URL = 'https://ai.bit.lat/api/v1/ai-service';
export const NEXUS_CLIENT = 'samva';
/** Metadata de quién llama (lo registra el servicio; sin semántica en PN). */
export const NEXUS_TENANT_ID = 1;

export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** ULID: 48 bits de timestamp + 80 bits random, Crockford base32 (26 chars). */
export function ulid(): string {
  let t = Date.now();
  let ts = '';
  for (let i = 0; i < 10; i++) {
    ts = CROCKFORD[t % 32] + ts;
    t = Math.floor(t / 32);
  }
  const rnd = randomBytes(16);
  let r = '';
  for (let i = 0; i < 16; i++) r += CROCKFORD[rnd[i] % 32];
  return ts + r;
}

// Env var portable: `import.meta.env` con fallback a `process.env`.
export function nexusBearerToken(): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.AI_BEARER_TOKEN ?? process.env.AI_BEARER_TOKEN;
}

export interface NexusStartResult {
  requestId: string;
  webhookUrl: string;
}

/**
 * Inicia una generación en Nexus. Lanza `Error` si el servicio responde mal
 * (el caller decide el status HTTP hacia el browser).
 */
export async function startNexusGeneration(
  token: string,
  templateId: string,
  parameters: Record<string, string>,
): Promise<NexusStartResult> {
  const requestId = ulid();

  const response = await fetch(AI_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ulid: requestId,
      client: NEXUS_CLIENT,
      template_id: templateId,
      tenant_id: NEXUS_TENANT_ID,
      parameters,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Error al llamar ai.vortex-it.com:', response.status, errorText);
    throw new Error(`ai.vortex-it.com respondió ${response.status}`);
  }

  const data = (await response.json()) as { data?: { webhook?: string } };
  const webhookUrl = data?.data?.webhook;
  if (!webhookUrl) {
    console.error('ai.vortex-it.com no devolvió webhook URL:', data);
    throw new Error('ai.vortex-it.com no devolvió webhook URL');
  }

  return { requestId, webhookUrl };
}

export interface NexusPollResult {
  /** `null` mientras la generación sigue en proceso. */
  responseMessage: string | null;
  cost: unknown;
  model: string | null;
}

/** Consulta la webhook URL firmada de una generación en curso. */
export async function pollNexusWebhook(webhookUrl: string): Promise<NexusPollResult> {
  const response = await fetch(webhookUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Error al consultar webhook de ai.vortex-it.com:', response.status, errorText);
    throw new Error(`webhook de ai.vortex-it.com respondió ${response.status}`);
  }

  const result = (await response.json()) as {
    data?: { response_message?: string; cost?: unknown; model?: string };
  };
  return {
    responseMessage: result?.data?.response_message ?? null,
    cost: result?.data?.cost ?? null,
    model: result?.data?.model ?? null,
  };
}
