import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadCursos } from '../data/api.js';
import { textResult, errorResult } from './utils.js';

export function registerCourseTools(server: McpServer): void {
  server.tool(
    'list_courses',
    'Progreso de cursos del equipo. Cada registro trae `equipoId` (id canónico del colaborador) y `jefeId` cuando resuelve.',
    {
      equipoId: z.string().optional().describe('Filtra por equipo.id del colaborador'),
      ou: z.string().optional().describe('Departamento / OU'),
      rol: z.string().optional(),
      jefe: z.string().optional().describe('Substring del jefe directo'),
      jefeId: z.string().optional().describe('Filtra por equipo.id del jefe'),
      minProgreso: z.number().min(0).max(100).optional(),
      maxProgreso: z.number().min(0).max(100).optional(),
    },
    async (args) => {
      try {
        const all = await loadCursos();
        const filtered = all.filter((c) => {
          if (args.equipoId && c.equipoId !== args.equipoId) return false;
          if (args.jefeId && c.jefeId !== args.jefeId) return false;
          if (args.ou && c.ou !== args.ou) return false;
          if (args.rol && !c.rol.toLowerCase().includes(args.rol.toLowerCase())) return false;
          if (args.jefe && !c.jefeDirecto.toLowerCase().includes(args.jefe.toLowerCase())) return false;
          if (args.minProgreso !== undefined && c.progreso < args.minProgreso) return false;
          if (args.maxProgreso !== undefined && c.progreso > args.maxProgreso) return false;
          return true;
        });
        filtered.sort((a, b) => b.progreso - a.progreso);
        return textResult({
          total: filtered.length,
          avgProgreso: filtered.length
            ? Math.round(filtered.reduce((a, c) => a + c.progreso, 0) / filtered.length)
            : 0,
          courses: filtered,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
