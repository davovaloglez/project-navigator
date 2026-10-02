import type { APIRoute } from 'astro';
import { getDbClient } from '../../db/client';
import { serverErrorResponse } from '../../lib/apiError';

export const prerender = false;

/**
 * Registro canónico del equipo (tabla Turso `equipo`). Lectura role-open a
 * cualquier usuario autenticado (igual que /api/proyectos): el middleware ya
 * exige sesión. La escritura va por /api/admin/equipo (action:equipo:manage).
 *
 * Sin cache: tabla chica (≈33 filas) y mutable desde el módulo de gestión;
 * las ediciones deben reflejarse de inmediato.
 */
export interface EquipoRecord {
  id: string;
  fullName: string;
  nickname: string;
  /** Nombre display "First Last" (columna `tag`); usado para cruzar con
   *  fuentes externas (e.g. `repositorios`). Puede venir '' mientras la
   *  migración 2026-equipo-tag.sql no se haya aplicado o seedeado. */
  tag: string;
  email: string;
  title: string;
  department: string;
  roleId: string;
  roleName: string;
  managerId: string;
  managerName: string;
  active: boolean;
  hasLogin: boolean;
  /** Foto de perfil del user vinculado (si tiene login + subió avatar). null si no. */
  image: string | null;
}

export const GET: APIRoute = async () => {
  try {
    const db = getDbClient();
    const res = await db.execute(`
      select e.id, e.full_name, e.nickname, e.tag, e.email, e.title, e.department,
             e.role_id, r.name as role_name,
             e.manager_id, m.full_name as manager_name,
             e.active,
             (select count(*) from "user" u where u.equipoId = e.id) as login_count,
             (select u.image from "user" u where u.equipoId = e.id limit 1) as user_image
      from equipo e
      left join roles r on r.id = e.role_id
      left join equipo m on m.id = e.manager_id
      order by e.full_name
    `);
    const equipo: EquipoRecord[] = res.rows.map((r) => ({
      id: String(r.id),
      fullName: String(r.full_name ?? ''),
      nickname: String(r.nickname ?? ''),
      tag: String(r.tag ?? ''),
      email: String(r.email ?? ''),
      title: String(r.title ?? ''),
      department: String(r.department ?? ''),
      roleId: r.role_id == null ? '' : String(r.role_id),
      roleName: r.role_name == null ? '' : String(r.role_name),
      managerId: r.manager_id == null ? '' : String(r.manager_id),
      managerName: r.manager_name == null ? '' : String(r.manager_name),
      active: Number(r.active) === 1,
      hasLogin: Number(r.login_count) > 0,
      image: r.user_image == null ? null : String(r.user_image),
    }));

    const rolesRes = await db.execute('select id, name from roles order by name');
    const roles = rolesRes.rows.map((r) => ({ id: String(r.id), name: String(r.name) }));

    return new Response(JSON.stringify({ equipo, roles }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'equipo');
  }
};
