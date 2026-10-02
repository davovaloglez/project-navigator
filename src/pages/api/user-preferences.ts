import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';

export const prerender = false;

const SECTION_KEY_RE = /^[a-z0-9-]{1,64}$/;
const MAX_BODY_BYTES = 10_000;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) return unauthorized();

  const db = getDbClient();
  const result = await db.execute({
    sql: 'select sectionKey, value from user_preferences where userId = ?',
    args: [userId],
  });

  const prefs: Record<string, unknown> = {};
  for (const row of result.rows) {
    const sectionKey = row.sectionKey as string;
    const raw = row.value as string;
    try {
      prefs[sectionKey] = JSON.parse(raw);
    } catch {
      // skip malformed entries
    }
  }

  return new Response(JSON.stringify(prefs), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ locals, request }) => {
  const userId = locals.user?.id;
  if (!userId) return unauthorized();

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return badRequest('Payload too large');

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return badRequest('Invalid JSON');
  }

  if (!isPlainObject(body)) return badRequest('Body must be an object');
  const { sectionKey, value } = body as { sectionKey?: unknown; value?: unknown };

  if (typeof sectionKey !== 'string' || !SECTION_KEY_RE.test(sectionKey)) {
    return badRequest('Invalid sectionKey');
  }
  if (!isPlainObject(value)) return badRequest('value must be a plain object');

  const serialized = JSON.stringify(value);
  const now = new Date().toISOString();

  const db = getDbClient();
  await db.execute({
    sql: `insert into user_preferences (userId, sectionKey, value, updatedAt)
          values (?, ?, ?, ?)
          on conflict(userId, sectionKey) do update set
            value = excluded.value,
            updatedAt = excluded.updatedAt`,
    args: [userId, sectionKey, serialized, now],
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ locals, url }) => {
  const userId = locals.user?.id;
  if (!userId) return unauthorized();

  const sectionKey = url.searchParams.get('section');
  const db = getDbClient();

  if (sectionKey === null) {
    await db.execute({
      sql: 'delete from user_preferences where userId = ?',
      args: [userId],
    });
  } else {
    if (!SECTION_KEY_RE.test(sectionKey)) return badRequest('Invalid section');
    await db.execute({
      sql: 'delete from user_preferences where userId = ? and sectionKey = ?',
      args: [userId, sectionKey],
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
