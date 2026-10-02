import { createClient, type Client } from '@libsql/client/web';

let _client: Client | null = null;

export function getDbClient(): Client {
  if (_client) return _client;

  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const url = viteEnv?.TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  const authToken = viteEnv?.TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }

  _client = createClient({ url, authToken });
  return _client;
}
