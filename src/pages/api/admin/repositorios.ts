import type { APIRoute } from 'astro';
import { getDbClient } from '../../../db/client';
import { serverErrorResponse } from '../../../lib/apiError';

export const prerender = false;

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * POST /api/admin/repositorios — Crea un repositorio en Turso.
 * PUT  /api/admin/repositorios — Actualiza datos y colaboradores de un repositorio.
 * DELETE /api/admin/repositorios — Elimina un repositorio.
 *
 * Gate de acceso: `action:repositorio:manage` (superadmin, admin) en middleware.
 */

export const POST: APIRoute = async (context) => {
  try {
    const db = getDbClient();
    const body = (await context.request.json().catch(() => ({}))) as {
      id?: string;
      empresaId?: string;
      nombre?: string;
      url?: string;
      ambientes?: string;
      estatus?: string;
      dpto?: string;
      producto?: string;
      colaboradores?: Array<{ miembroIdOrName: string; rol: string }>;
    };

    const {
      nombre,
      url,
      ambientes = 'Prod',
      estatus = 'Activo',
      dpto = '',
      producto = '',
      colaboradores = [],
    } = body;

    const empresaId = body.empresaId || context.locals.activeEmpresa || 'vortex-it';

    if (!nombre || !nombre.trim()) {
      return new Response(JSON.stringify({ error: 'El nombre es requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = body.id?.trim() || slugify(nombre);
    const repoUrl = url?.trim() || id;

    // Insertar repositorio
    await db.execute({
      sql: `
        insert into repositorio (id, empresa_id, nombre, url, ambientes, estatus, dpto, producto, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [id, empresaId, nombre.trim(), repoUrl, ambientes, estatus, dpto, producto],
    });

    // Insertar colaboradores si se enviaron
    if (Array.isArray(colaboradores) && colaboradores.length > 0) {
      for (const c of colaboradores) {
        if (!c.miembroIdOrName || !c.rol) continue;
        const miembroId = slugify(c.miembroIdOrName);
        const colabId = `${id}-${miembroId}-${c.rol}`;

        // Asegurar que exista en empresa_miembro si no está
        await db.execute({
          sql: `
            insert or ignore into empresa_miembro (id, empresa_id, full_name, nickname, activo)
            values (?, ?, ?, ?, 1)
          `,
          args: [miembroId, empresaId, c.miembroIdOrName, c.miembroIdOrName],
        });

        await db.execute({
          sql: `
            insert or replace into repositorio_colaborador (id, repositorio_id, miembro_id, rol_acceso)
            values (?, ?, ?, ?)
          `,
          args: [colabId, id, miembroId, c.rol],
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/repositorios POST');
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    const db = getDbClient();
    const body = (await context.request.json().catch(() => ({}))) as {
      id: string;
      nombre?: string;
      url?: string;
      ambientes?: string;
      estatus?: string;
      dpto?: string;
      producto?: string;
      colaboradores?: Array<{ miembroIdOrName: string; rol: string }>;
    };

    const { id, nombre, url, ambientes, estatus, dpto, producto, colaboradores } = body;

    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'id es requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: string[] = ["updated_at = datetime('now')"];
    const args: (string | null)[] = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      args.push(nombre.trim());
    }
    if (url !== undefined) {
      updates.push('url = ?');
      args.push(url.trim());
    }
    if (ambientes !== undefined) {
      updates.push('ambientes = ?');
      args.push(ambientes);
    }
    if (estatus !== undefined) {
      updates.push('estatus = ?');
      args.push(estatus);
    }
    if (dpto !== undefined) {
      updates.push('dpto = ?');
      args.push(dpto);
    }
    if (producto !== undefined) {
      updates.push('producto = ?');
      args.push(producto);
    }

    args.push(id);
    await db.execute({
      sql: `update repositorio set ${updates.join(', ')} where id = ?`,
      args,
    });

    // Si se enviaron colaboradores, actualizar la lista
    if (Array.isArray(colaboradores)) {
      // Eliminar colaboradores previos del repo
      await db.execute({
        sql: `delete from repositorio_colaborador where repositorio_id = ?`,
        args: [id],
      });

      // Obtener empresa_id del repo para asociar miembros
      const repoCheck = await db.execute({
        sql: `select empresa_id from repositorio where id = ?`,
        args: [id],
      });
      const empresaId = String(repoCheck.rows[0]?.empresa_id || 'vortex-it');

      for (const c of colaboradores) {
        if (!c.miembroIdOrName || !c.rol) continue;
        const miembroId = slugify(c.miembroIdOrName);
        const colabId = `${id}-${miembroId}-${c.rol}`;

        await db.execute({
          sql: `
            insert or ignore into empresa_miembro (id, empresa_id, full_name, nickname, activo)
            values (?, ?, ?, ?, 1)
          `,
          args: [miembroId, empresaId, c.miembroIdOrName, c.miembroIdOrName],
        });

        await db.execute({
          sql: `
            insert or replace into repositorio_colaborador (id, repositorio_id, miembro_id, rol_acceso)
            values (?, ?, ?, ?)
          `,
          args: [colabId, id, miembroId, c.rol],
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/repositorios PUT');
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    const db = getDbClient();
    const id = context.url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'id query param es requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.execute({
      sql: `delete from repositorio where id = ?`,
      args: [id],
    });

    return new Response(JSON.stringify({ ok: true, deleted: id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/repositorios DELETE');
  }
};
