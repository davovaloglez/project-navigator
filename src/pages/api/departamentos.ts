import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import { serverErrorResponse } from '../../lib/apiError';

export const prerender = false;

export interface DepartamentoItem {
  id: string;
  nombre: string;
  empresaId: string | null;
  descripcion: string | null;
  activo: boolean;
}

/**
 * GET /api/departamentos
 *
 * Lista de departamentos de la organización.
 * Combina los departamentos registrados en la tabla `departamento` y, si hay
 * departamentos definidos en el personal (`equipo`) o repositorios que no figuren en la tabla,
 * los incluye para mayor cobertura.
 *
 * Filtro opcional: ?empresa=<empresaId>
 */
export const GET: APIRoute = async (context) => {
  try {
    const db = getDbClient();
    const queryEmpresa = context.url.searchParams.get('empresa');
    const activeEmpresa = queryEmpresa !== null ? queryEmpresa : context.locals.activeEmpresa;

    // 1. Departamentos de la tabla departamento
    let deptSql = `select id, empresa_id, nombre, descripcion, activo from departamento`;
    const deptArgs: string[] = [];
    if (activeEmpresa) {
      deptSql += ` where empresa_id = ?`;
      deptArgs.push(activeEmpresa);
    }
    deptSql += ` order by nombre asc`;

    const deptRes = await db.execute({ sql: deptSql, args: deptArgs });

    const seenNames = new Set<string>();
    const departamentos: DepartamentoItem[] = [];

    for (const r of deptRes.rows) {
      const nombre = String(r.nombre);
      seenNames.add(nombre.toLowerCase());
      departamentos.push({
        id: String(r.id),
        nombre,
        empresaId: r.empresa_id ? String(r.empresa_id) : null,
        descripcion: r.descripcion ? String(r.descripcion) : null,
        activo: Number(r.activo ?? 1) === 1,
      });
    }

    // 2. Departamentos adicionales encontrados en `equipo`
    try {
      const teamRes = await db.execute(`
        select distinct department
        from equipo
        where department is not null and trim(department) != ''
      `);
      for (const r of teamRes.rows) {
        const dName = String(r.department).trim();
        if (dName && !seenNames.has(dName.toLowerCase())) {
          seenNames.add(dName.toLowerCase());
          departamentos.push({
            id: dName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            nombre: dName,
            empresaId: activeEmpresa ?? null,
            descripcion: 'Departamento obtenido del registro de equipo',
            activo: true,
          });
        }
      }
    } catch {
      // Degradar silenciosamente si equipo no contiene columna
    }

    return new Response(JSON.stringify({ departamentos }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'api/departamentos GET');
  }
};

