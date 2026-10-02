import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getEquipoResolver } from '../data/equipoResolver.js';
import { textResult, errorResult } from './utils.js';

export function registerTeamTools(server: McpServer): void {
  server.tool(
    'list_team',
    'Registro canónico del equipo vía `GET /api/equipo`. Devuelve `id`, `fullName`, `nickname`, `tag` (display "First Last" para cruzar con fuentes externas), `email`, `title`, `department`, `roleId`, `roleName`, `managerId`, `managerName`, `active`, `hasLogin` (vinculado a un user que puede entrar a la app), `image` (foto del avatar). Role-open a cualquier autenticado.',
    {
      active: z.boolean().optional().describe('Si true, sólo miembros activos'),
      department: z.string().optional(),
      roleId: z.string().optional(),
      roleName: z.string().optional().describe('Filtra por nombre legible del rol (e.g. "Desarrollador Sr").'),
      managerId: z.string().optional(),
      hasLogin: z.boolean().optional().describe('Si true, sólo miembros con cuenta vinculada que pueden entrar a la app.'),
    },
    async (args) => {
      try {
        const resolver = await getEquipoResolver();
        const filtered = resolver.equipo.filter((m) => {
          if (args.active !== undefined && m.active !== args.active) return false;
          if (args.department && m.department !== args.department) return false;
          if (args.roleId && m.roleId !== args.roleId) return false;
          if (args.roleName && m.roleName !== args.roleName) return false;
          if (args.managerId && m.managerId !== args.managerId) return false;
          if (args.hasLogin !== undefined && m.hasLogin !== args.hasLogin) return false;
          return true;
        });
        return textResult({
          total: filtered.length,
          equipo: filtered,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'resolve_person',
    'Resuelve un nombre/apodo a su `equipo.id` canónico usando alias curado, match exacto por nickname/full_name, o fuzzy por token (sólo si hay match único). Devuelve `null` si no resuelve o es ambiguo. La identidad se cruza vía `GET /api/equipo`.',
    {
      nombre: z.string().describe('Nombre/apodo a resolver'),
    },
    async ({ nombre }) => {
      try {
        const resolver = await getEquipoResolver();
        const id = resolver.resolve(nombre);
        const member = id ? resolver.equipo.find((e) => e.id === id) : null;
        return textResult({
          input: nombre,
          resolvedId: id,
          member,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
