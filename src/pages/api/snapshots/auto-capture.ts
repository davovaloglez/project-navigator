import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../../lib/sheets';
import { getDbClient } from '../../../db/client';
import { getEquipoResolver } from '../../../lib/equipoResolver';
import { serverErrorResponse } from '../../../lib/apiError';

export const prerender = false;

/**
 * Cron de captura semanal de snapshots. Configurado como Vercel Cron en
 * `vercel.json` (lunes 09:00 UTC):
 *   - Lee Projects y Cursos del Sheet (fuente de verdad de la operación).
 *   - Upserta el snapshot de la semana actual en Turso (tabla `snapshot`).
 *
 * Seguridad: si `CRON_SECRET` está set, requiere
 *   `Authorization: Bearer <CRON_SECRET>` (el scheduler debe enviar ese header).
 */

// Env var portable: `import.meta.env` con fallback a `process.env`.
function envVar(name: string): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name] ?? process.env[name];
}

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(d: Date): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = t.getDay();
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((day + 6) % 7));
  return monday.toISOString().split('T')[0];
}

function parseDateStr(value: string): string {
  if (!value || !value.trim()) return '';
  const trimmed = value.trim();
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) {
    const [, day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  return trimmed;
}

function parseProgressPct(value: string): number {
  if (!value || !value.trim()) return 0;
  const num = parseFloat(value.replace('%', '').trim());
  if (isNaN(num)) return 0;
  return num > 1 ? num / 100 : num;
}

/** Sanea centinelas de Sheets (`#N/A`, `#REF!`, `-`, vacío) → ''. */
function cleanId(value: string): string {
  const v = (value || '').trim();
  if (!v || v === '-' || v.toUpperCase() === '#N/A' || v.toUpperCase() === '#REF!') return '';
  return v;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const secret = envVar('CRON_SECRET');
    if (secret) {
      const auth = request.headers.get('authorization') || '';
      if (auth !== `Bearer ${secret}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const sheets = getSheets();
    const sheetId = getSheetId();

    // --- Projects ---
    const projectsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'proyectos!A1:AH300',
    });
    const projectRows = projectsRes.data.values || [];
    const projectEntries: Array<{
      id: string;
      folio: string;
      actividad: string;
      progreso: number;
      finEstimado: string;
      finReal: string;
      estatus: string;
    }> = [];
    if (projectRows.length >= 2) {
      const headers = projectRows[0].map((h: string) => h.trim().toLowerCase());
      const col = (row: string[], name: string): string => {
        const idx = headers.indexOf(name.toLowerCase());
        return idx >= 0 ? (row[idx] || '').trim() : '';
      };
      const seen = new Set<string>();
      for (const row of projectRows.slice(1)) {
        const id = cleanId(col(row, 'id'));
        if (!id || seen.has(id)) continue; // identidad única; dedup defensivo
        seen.add(id);
        projectEntries.push({
          id,
          folio: col(row, 'folio'),
          actividad: col(row, 'nombre'),
          progreso: parseProgressPct(col(row, 'progreso')),
          finEstimado: parseDateStr(col(row, 'fin estimado')),
          finReal: parseDateStr(col(row, 'fin real')),
          estatus: col(row, 'estatus'),
        });
      }
    }

    // --- Cursos ---
    const cursosRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'cursos!A1:J50',
    });
    const cursoRows = cursosRes.data.values || [];
    const cursoEntries: Array<{
      colaborador: string;
      identifier: string;
      progreso: number;
    }> = [];
    if (cursoRows.length >= 2) {
      const headers = cursoRows[0].map((h: string) => h.trim().toLowerCase());
      const col = (row: string[], name: string): string => {
        const idx = headers.indexOf(name.toLowerCase());
        return idx >= 0 ? (row[idx] || '').trim() : '';
      };
      const resolver = await getEquipoResolver();
      for (const row of cursoRows.slice(1)) {
        const colaborador = col(row, 'nombre');
        if (!colaborador) continue;
        // Prefiere `id` (local-part) de la hoja (passthrough); resolver como red
        // de seguridad; fullName si nada resuelve.
        const identifier =
          cleanId(col(row, 'id')) ||
          (resolver.resolve(colaborador) ?? colaborador);
        cursoEntries.push({
          colaborador,
          identifier,
          progreso: parseInt(col(row, 'progreso') || '0') || 0,
        });
      }
    }

    if (projectEntries.length === 0 && cursoEntries.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, reason: 'Sin datos para capturar' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const today = today0();
    const currentWeek = weekKey(today);
    const capturedAt = today.toISOString();

    // Upsert atómico: borrar la semana y reinsertar.
    const db = getDbClient();
    const stmts: { sql: string; args: string[] }[] = [
      { sql: 'delete from "snapshot" where "weekKey" = ?', args: [currentWeek] },
    ];
    for (const p of projectEntries) {
      stmts.push({
        sql:
          'insert into "snapshot" ("weekKey", "capturedAt", "kind", "identifier", "payload") ' +
          "values (?, ?, 'project', ?, ?)",
        args: [
          currentWeek,
          capturedAt,
          p.id,
          JSON.stringify({
            folio: p.folio,
            actividad: p.actividad,
            progreso: p.progreso,
            finEstimado: p.finEstimado,
            finReal: p.finReal,
            estatus: p.estatus,
          }),
        ],
      });
    }
    for (const c of cursoEntries) {
      stmts.push({
        sql:
          'insert into "snapshot" ("weekKey", "capturedAt", "kind", "identifier", "payload") ' +
          "values (?, ?, 'curso', ?, ?)",
        args: [
          currentWeek,
          capturedAt,
          c.identifier,
          JSON.stringify({ colaborador: c.colaborador, progreso: c.progreso }),
        ],
      });
    }
    await db.batch(stmts, 'write');

    return new Response(
      JSON.stringify({
        ok: true,
        weekKey: currentWeek,
        projectsWritten: projectEntries.length,
        cursosWritten: cursoEntries.length,
        totalRows: stmts.length - 1,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return serverErrorResponse(error, 'snapshots/auto-capture');
  }
};
