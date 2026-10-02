/**
 * Tokens MCP: bearer largos (separados de las sesiones de Better-Auth) para
 * que el servidor MCP autentique como un usuario real y herede todo el pipeline
 * de permisos/scoping. Ver src/db/migrations/2026-mcp-tokens.sql.
 *
 * Forma del token: `pn_mcp_<base64url 32 bytes>` (~50 chars). En la tabla se
 * guarda sólo el sha256 hex del plaintext; el token se entrega al cliente UNA
 * sola vez al crearlo.
 */
import { createHash, randomBytes } from 'node:crypto';
import { getDbClient } from '../db/client';
import type { Session } from './auth';

export const MCP_TOKEN_PREFIX = 'pn_mcp_';
const PREFIX_DISPLAY_LEN = 14; // `pn_mcp_` (7) + 7 chars de la cola
const PLAIN_LEN_MIN = MCP_TOKEN_PREFIX.length + 32;
const PLAIN_LEN_MAX = MCP_TOKEN_PREFIX.length + 64;

export interface McpTokenRow {
  id: string;
  tokenPrefix: string;
  userId: string;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  expiresAt: number;
}

export function isMcpBearer(header: string | null | undefined): boolean {
  if (!header) return false;
  if (!header.toLowerCase().startsWith('bearer ')) return false;
  const value = header.slice(7).trim();
  return value.startsWith(MCP_TOKEN_PREFIX) && value.length >= PLAIN_LEN_MIN && value.length <= PLAIN_LEN_MAX;
}

export function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim();
}

function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

export function generateMcpToken(): { plain: string; hash: string; tokenPrefix: string } {
  const random = randomBytes(32).toString('base64url'); // ~43 chars
  const plain = `${MCP_TOKEN_PREFIX}${random}`;
  return {
    plain,
    hash: hashToken(plain),
    tokenPrefix: plain.slice(0, PREFIX_DISPLAY_LEN),
  };
}

/**
 * Resuelve un token bearer plaintext al usuario dueño. Toca `lastUsedAt`
 * fire-and-forget. Devuelve null si el token no existe, expiró o el usuario
 * está baneado (alineado con Better-Auth: ban inmediato).
 */
export async function resolveMcpToken(plainToken: string): Promise<Session['user'] | null> {
  if (!plainToken.startsWith(MCP_TOKEN_PREFIX)) return null;
  const hash = hashToken(plainToken);
  const now = Date.now();
  const db = getDbClient();

  let row: Record<string, unknown> | undefined;
  try {
    const res = await db.execute({
      sql: `select u.*, t.expiresAt as token_expires
            from mcp_token t
            inner join "user" u on u.id = t.userId
            where t.id = ? and t.expiresAt > ?
            limit 1`,
      args: [hash, now],
    });
    row = res.rows[0];
  } catch {
    return null;
  }
  if (!row) return null;

  // Ban check: si está banned y el ban no expiró, denegar.
  const banned = Number(row.banned) === 1;
  const banExpires = row.banExpires ? new Date(String(row.banExpires)) : null;
  if (banned && (!banExpires || banExpires > new Date())) return null;

  // Touch lastUsedAt (no await — best-effort).
  db.execute({ sql: `update mcp_token set lastUsedAt = ? where id = ?`, args: [now, hash] }).catch(() => {});

  // Reconstruye un User con la misma forma que session.user (Better-Auth).
  const user: Session['user'] = {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    emailVerified: Number(row.emailVerified) === 1,
    image: row.image ? String(row.image) : null,
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
    role: row.role == null ? null : String(row.role),
    banned: banned || null,
    banReason: row.banReason == null ? null : String(row.banReason),
    banExpires: banExpires,
  } as unknown as Session['user'];
  return user;
}

export interface McpTokenSummary {
  tokenPrefix: string;
  name: string;
  createdAt: number;
  lastUsedAt: number | null;
  expiresAt: number;
}

export async function listMcpTokens(userId: string): Promise<McpTokenSummary[]> {
  const db = getDbClient();
  const res = await db.execute({
    sql: `select tokenPrefix, name, createdAt, lastUsedAt, expiresAt
          from mcp_token where userId = ? order by createdAt desc`,
    args: [userId],
  });
  return res.rows.map((r) => ({
    tokenPrefix: String(r.tokenPrefix ?? ''),
    name: String(r.name ?? ''),
    createdAt: Number(r.createdAt),
    lastUsedAt: r.lastUsedAt == null ? null : Number(r.lastUsedAt),
    expiresAt: Number(r.expiresAt),
  }));
}

export const MAX_EXPIRES_DAYS = 365;
export const ALLOWED_EXPIRES_DAYS = [30, 90, 180, 365] as const;
export type ExpiresInDays = (typeof ALLOWED_EXPIRES_DAYS)[number];

export async function createMcpToken(opts: {
  userId: string;
  name: string;
  expiresInDays: ExpiresInDays;
}): Promise<{ plain: string; summary: McpTokenSummary }> {
  const { plain, hash, tokenPrefix } = generateMcpToken();
  const now = Date.now();
  const expiresAt = now + opts.expiresInDays * 86_400_000;
  const db = getDbClient();
  await db.execute({
    sql: `insert into mcp_token (id, tokenPrefix, userId, name, createdAt, lastUsedAt, expiresAt)
          values (?, ?, ?, ?, ?, ?, ?)`,
    args: [hash, tokenPrefix, opts.userId, opts.name, now, null, expiresAt],
  });
  return {
    plain,
    summary: { tokenPrefix, name: opts.name, createdAt: now, lastUsedAt: null, expiresAt },
  };
}

/** Revoca por `tokenPrefix` (la UI nunca tiene el hash; sólo este display id). */
export async function revokeMcpToken(userId: string, tokenPrefix: string): Promise<boolean> {
  const db = getDbClient();
  const res = await db.execute({
    sql: `delete from mcp_token where userId = ? and tokenPrefix = ?`,
    args: [userId, tokenPrefix],
  });
  return (res.rowsAffected ?? 0) > 0;
}
