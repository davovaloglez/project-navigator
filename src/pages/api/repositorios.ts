import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import type { RepoRecord } from '../../utils/dataTransforms';
import { serverErrorResponse } from '../../lib/apiError';

export const prerender = false;

interface RepoDbRow {
  id: string;
  empresa_id: string;
  nombre: string;
  url: string;
  ambientes: string | null;
  estatus: string;
  dpto: string | null;
  producto: string | null;
  tecnologia_principal: string | null;
  rol_acceso: string | null;
  colaborador_nombre: string | null;
}

/**
 * Repositorios de Turso con roles de acceso por persona.
 * Si activeEmpresa está presente en locals (o via query ?empresa=), filtra por esa empresa.
 * Si activeEmpresa es null (superadmin en vista global), devuelve todos los repositorios.
 */
export const GET: APIRoute = async (context) => {
  try {
    const db = getDbClient();
    const queryEmpresa = context.url.searchParams.get('empresa');
    const activeEmpresa = queryEmpresa !== null ? queryEmpresa : context.locals.activeEmpresa;

    let sql = `
      select
        r.id,
        r.empresa_id,
        r.nombre,
        r.url,
        r.ambientes,
        r.estatus,
        r.dpto,
        r.producto,
        r.tecnologia_principal,
        rc.rol_acceso,
        coalesce(em.full_name, em.nickname, rc.miembro_id) as colaborador_nombre
      from repositorio r
      left join repositorio_colaborador rc on rc.repositorio_id = r.id
      left join empresa_miembro em on em.id = rc.miembro_id
    `;

    const args: string[] = [];
    if (activeEmpresa) {
      sql += ` where r.empresa_id = ? `;
      args.push(activeEmpresa);
    }
    sql += ` order by r.nombre asc `;

    const res = await db.execute({ sql, args });
    const rows = res.rows as unknown as RepoDbRow[];

    // Agrupar filas por repositorio (para consolidar colaboradores por rol)
    const map = new Map<string, RepoRecord & { id: string; empresa_id: string }>();

    for (const row of rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          empresa_id: row.empresa_id,
          nombre: row.nombre,
          ambientes: row.ambientes ?? 'Prod',
          estatus: row.estatus,
          dpto: row.dpto ?? '',
          producto: row.producto ?? '',
          github: row.url,
          administrador: '',
          arquitecto: '',
          colaborador: '',
          visualizador: '',
          deploy: '',
        });
      }

      const repo = map.get(row.id)!;
      if (row.rol_acceso && row.colaborador_nombre) {
        const rol = row.rol_acceso as keyof Pick<
          RepoRecord,
          'administrador' | 'arquitecto' | 'colaborador' | 'visualizador' | 'deploy'
        >;
        if (repo[rol] !== undefined) {
          const current = repo[rol] ? repo[rol].split(',').map((s) => s.trim()) : [];
          if (!current.includes(row.colaborador_nombre)) {
            current.push(row.colaborador_nombre);
            repo[rol] = current.join(', ');
          }
        }
      }
    }

    const data = Array.from(map.values());
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return serverErrorResponse(error, 'repositorios GET');
  }
};
