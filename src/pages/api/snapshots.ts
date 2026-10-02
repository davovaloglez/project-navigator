import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import { getEquipoResolver } from '../../lib/equipoResolver';
import { serverErrorResponse } from '../../lib/apiError';

export const prerender = false;

/**
 * Histórico de snapshots semanales. Antes vivía en la tab `Snapshots` del
 * Sheet; desde mayo 2026 vive en Turso (tabla `snapshot`).
 *
 * - Identifier de `project` = ProjectRecord.id (único). El `folio` (display,
 *   no único) se preserva en `payload.folio`.
 * - Identifier de `curso`   = equipo.id si resuelve (opción B), fallback a
 *   fullName cuando no esté en el registro `equipo`. El nombre legible se
 *   preserva en `payload.colaborador` para el render.
 *
 * Middleware:
 *   - GET es role-open a cualquier autenticado.
 *   - POST está gateado por `action:snapshot:create`.
 */

interface ProjectSnapshotEntry {
  id: string;
  folio: string;
  actividad: string;
  progreso: number;
  finEstimado: string;
  finReal: string;
  estatus: string;
}

interface CursoSnapshotEntry {
  colaborador: string;
  progreso: number;
}

interface WeeklySnapshot {
  weekKey: string;
  capturedAt: string;
  projects: ProjectSnapshotEntry[];
  cursos: CursoSnapshotEntry[];
}

export const GET: APIRoute = async () => {
  try {
    const db = getDbClient();
    const res = await db.execute(
      'select "weekKey", "capturedAt", "kind", "identifier", "payload" from "snapshot" order by "weekKey" asc',
    );
    const byWeek = new Map<string, WeeklySnapshot>();
    for (const r of res.rows) {
      const weekKey = String(r.weekKey);
      const capturedAt = String(r.capturedAt ?? '');
      const kind = String(r.kind);
      const identifier = String(r.identifier);
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(String(r.payload ?? '{}'));
      } catch {
        continue;
      }
      const existing =
        byWeek.get(weekKey) ??
        ({ weekKey, capturedAt, projects: [], cursos: [] } as WeeklySnapshot);
      if (kind === 'project') {
        existing.projects.push({
          id: identifier,
          folio: String(payload.folio ?? ''),
          actividad: String(payload.actividad ?? ''),
          progreso: Number(payload.progreso ?? 0),
          finEstimado: String(payload.finEstimado ?? ''),
          finReal: String(payload.finReal ?? ''),
          estatus: String(payload.estatus ?? ''),
        });
      } else if (kind === 'curso') {
        existing.cursos.push({
          // payload.colaborador preserva el display name; identifier puede ser id o fullName.
          colaborador: String(payload.colaborador ?? identifier),
          progreso: Number(payload.progreso ?? 0),
        });
      }
      byWeek.set(weekKey, existing);
    }
    const snapshots = [...byWeek.values()].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
    return new Response(JSON.stringify(snapshots), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Si la migración no se aplicó aún, no rompemos el dashboard.
    const message = error instanceof Error ? error.message : '';
    if (/no such table/i.test(message)) {
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }
    return serverErrorResponse(error, 'snapshots:get');
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as WeeklySnapshot;
    if (!body || !body.weekKey) {
      return new Response(JSON.stringify({ error: 'weekKey requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDbClient();
    const resolver = await getEquipoResolver();

    // Upsert por semana: borrar la semana y reinsertar atómicamente.
    const stmts: { sql: string; args: string[] }[] = [
      { sql: 'delete from "snapshot" where "weekKey" = ?', args: [body.weekKey] },
    ];
    for (const p of body.projects ?? []) {
      if (!p.id) continue; // sin identidad no se puede upsertar
      stmts.push({
        sql:
          'insert into "snapshot" ("weekKey", "capturedAt", "kind", "identifier", "payload") ' +
          "values (?, ?, 'project', ?, ?)",
        args: [
          body.weekKey,
          body.capturedAt,
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
    for (const c of body.cursos ?? []) {
      const identifier = resolver.resolve(c.colaborador) ?? c.colaborador;
      stmts.push({
        sql:
          'insert into "snapshot" ("weekKey", "capturedAt", "kind", "identifier", "payload") ' +
          "values (?, ?, 'curso', ?, ?)",
        args: [
          body.weekKey,
          body.capturedAt,
          identifier,
          JSON.stringify({ colaborador: c.colaborador, progreso: c.progreso }),
        ],
      });
    }

    await db.batch(stmts, 'write');

    return new Response(
      JSON.stringify({
        ok: true,
        rowsWritten: stmts.length - 1, // descontar el DELETE
        weekKey: body.weekKey,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return serverErrorResponse(error, 'snapshots:post');
  }
};
