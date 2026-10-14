import type { APIRoute } from 'astro';
import { getDbClient } from '../../../db/client';
import { serverErrorResponse } from '../../../lib/apiError';

export const prerender = false;

interface EmpresaRow {
  id: string;
  nombre: string;
  moneda: string;
  activa: number;
  logo_url: string | null;
}

interface EmpresaMetrics {
  id: string;
  nombre: string;
  moneda: string;
  activa: boolean;
  logo_url: string | null;
  total_miembros: number;
  proyectos_activos: number;
  total_departamentos: number;
}

/**
 * GET  /api/admin/empresas  — Lista empresas con métricas de conteo.
 * POST /api/admin/empresas  — Registra nueva empresa.
 * PUT  /api/admin/empresas  — Actualiza datos de empresa existente.
 *
 * Gate de acceso: `action:empresa:manage` (superadmin, admin) — definido en middleware.ts.
 */
export const GET: APIRoute = async () => {
  try {
    const db = getDbClient();
    const empresas = await db.execute(`
      select
        e.id,
        e.nombre,
        e.moneda,
        e.activa,
        e.logo_url,
        (select count(*) from empresa_miembro em where em.empresa_id = e.id and em.activo = 1) as total_miembros,
        (select count(*) from proyecto p where p.empresa_id = e.id and p.estatus = 'Activo') as proyectos_activos,
        (select count(*) from departamento d where d.empresa_id = e.id and d.activo = 1) as total_departamentos
      from empresa e
      order by e.nombre
    `);

    const data: EmpresaMetrics[] = (empresas.rows as unknown as Array<EmpresaRow & {
      total_miembros: number;
      proyectos_activos: number;
      total_departamentos: number;
    }>).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      moneda: r.moneda,
      activa: r.activa === 1,
      logo_url: r.logo_url,
      total_miembros: Number(r.total_miembros ?? 0),
      proyectos_activos: Number(r.proyectos_activos ?? 0),
      total_departamentos: Number(r.total_departamentos ?? 0),
    }));

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'admin/empresas GET');
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const db = getDbClient();
    const body = await context.request.json() as {
      id?: string;
      nombre?: string;
      moneda?: string;
      logo_url?: string;
    };

    const { id, nombre, moneda = 'MXN', logo_url } = body;

    if (!id || !nombre || typeof id !== 'string' || typeof nombre !== 'string') {
      return new Response(
        JSON.stringify({ error: 'id y nombre son requeridos.', code: 'BAD_REQUEST' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    await db.execute({
      sql: `
        insert into empresa (id, nombre, moneda, logo_url, activa)
        values (?, ?, ?, ?, 1)
      `,
      args: [id.trim().toLowerCase(), nombre.trim(), moneda, logo_url ?? null],
    });

    // Sembrar modelo financiero vacío para la nueva empresa.
    await db.execute({
      sql: `
        insert or ignore into modelo_financiero (empresa_id, costo_operativo, valor_experiencia_rate, costo_admin_rate, margen_rate, iva_rate)
        values (?, 0, 0, 0, 0, 0.16)
      `,
      args: [id.trim().toLowerCase()],
    });

    return new Response(
      JSON.stringify({ ok: true, id: id.trim().toLowerCase() }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return serverErrorResponse(error, 'admin/empresas POST');
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    const db = getDbClient();
    const body = await context.request.json() as {
      id?: string;
      nombre?: string;
      moneda?: string;
      logo_url?: string;
      activa?: boolean;
    };

    const { id, nombre, moneda, logo_url, activa } = body;

    if (!id || typeof id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'id es requerido.', code: 'BAD_REQUEST' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const updates: string[] = ['updated_at = datetime(\'now\')'];
    const args: (string | number | null)[] = [];

    if (nombre !== undefined) { updates.push('nombre = ?'); args.push(nombre); }
    if (moneda !== undefined) { updates.push('moneda = ?'); args.push(moneda); }
    if (logo_url !== undefined) { updates.push('logo_url = ?'); args.push(logo_url); }
    if (activa !== undefined) { updates.push('activa = ?'); args.push(activa ? 1 : 0); }

    args.push(id);
    await db.execute({ sql: `update empresa set ${updates.join(', ')} where id = ?`, args });

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return serverErrorResponse(error, 'admin/empresas PUT');
  }
};
