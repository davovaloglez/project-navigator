import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadTechnologies, loadTeamTechnologies } from '../data/api.js';
import { getEquipoResolver } from '../data/equipoResolver.js';
import { textResult, errorResult } from './utils.js';

export function registerTechnologyTools(server: McpServer): void {
  server.tool(
    'list_technologies',
    'Lista el catálogo de tecnologías y habilidades de la organización (ej. TypeScript, React, Python, AWS, PostgreSQL, Docker). Permite filtrar por categoría (language, framework, database, cloud, devops, mobile, tool, design).',
    {
      category: z.string().optional().describe('Filtra por categoría (language, framework, database, cloud, devops, mobile, tool, design)'),
      search: z.string().optional().describe('Búsqueda por nombre o slug de la tecnología'),
    },
    async (args) => {
      try {
        const techs = await loadTechnologies();
        const filtered = techs.filter((t) => {
          if (args.category && t.category.toLowerCase() !== args.category.toLowerCase()) return false;
          if (args.search) {
            const q = args.search.toLowerCase();
            if (!t.name.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
          }
          return true;
        });

        return textResult({
          total: filtered.length,
          technologies: filtered,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_team_skills',
    'Consulta la matriz de habilidades y tecnologías del equipo. Permite saber qué colaboradores dominan una tecnología (y a qué nivel: trainee, jr, mid, sr, arq), o ver todas las tecnologías registradas para una persona específica.',
    {
      technology: z.string().optional().describe('Slug o nombre de la tecnología (ej. "typescript", "react", "python")'),
      level: z.string().optional().describe('Nivel de dominio a filtrar (trainee, jr, mid, sr, arq)'),
      persona: z.string().optional().describe('Nombre, apodo o equipoId de la persona a consultar'),
    },
    async (args) => {
      try {
        const resolver = await getEquipoResolver();
        let equipoId: string | undefined = undefined;

        if (args.persona) {
          const resolvedId = resolver.resolve(args.persona);
          if (resolvedId) {
            equipoId = resolvedId;
          } else {
            const foundDirect = resolver.equipo.find((e) => e.id.toLowerCase() === args.persona!.toLowerCase());
            equipoId = foundDirect ? foundDirect.id : args.persona;
          }
        }

        const [skills, catalog] = await Promise.all([
          loadTeamTechnologies({
            technology: args.technology,
            level: args.level,
            equipo: equipoId,
          }),
          loadTechnologies(),
        ]);

        const techMap = new Map(catalog.map((t) => [t.id, t]));
        const teamMap = new Map(resolver.equipo.map((e) => [e.id, e]));

        const enriched = skills.map((s) => {
          const person = teamMap.get(s.equipoId);
          const tech = techMap.get(s.technologyId);
          return {
            equipoId: s.equipoId,
            colaborador: person ? person.fullName : s.equipoId,
            apodo: person?.nickname,
            departamento: person?.department,
            puesto: person?.title,
            technologyId: s.technologyId,
            technologyName: tech?.name ?? s.technologyId,
            categoria: tech?.category ?? 'other',
            nivel: s.level,
            actualizado: s.updatedAt,
          };
        });

        return textResult({
          total: enriched.length,
          skills: enriched,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
