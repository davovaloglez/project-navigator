import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadEmpresas, loadDepartamentos } from '../data/api.js';
import { textResult, errorResult } from './utils.js';

export function registerOrganizationTools(server: McpServer): void {
  server.tool(
    'list_companies',
    'Lista las empresas de la organización registradas en Project Navigator (ej. Vortex IT, Bit Technologies), indicando su ID, nombre, moneda configurada y si están activas.',
    {
      soloActivas: z.boolean().optional().describe('Si true, solo lista empresas activas (por defecto true)'),
    },
    async (args) => {
      try {
        const empresas = await loadEmpresas();
        const soloActivas = args.soloActivas ?? true;
        const filtered = soloActivas ? empresas.filter((e) => e.activa) : empresas;

        return textResult({
          total: filtered.length,
          empresas: filtered,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'list_departments',
    'Lista los departamentos o áreas organizacionales (ej. "Tech Ambition", "Growth Experiences", "Analytics Solutions", etc.). Permite filtrar por empresa.',
    {
      empresaId: z.string().optional().describe('Filtra por ID de empresa (ej. "vortex-it", "bit-technologies")'),
      search: z.string().optional().describe('Búsqueda por texto en el nombre o descripción del departamento'),
    },
    async (args) => {
      try {
        const departamentos = await loadDepartamentos(args.empresaId);
        const filtered = departamentos.filter((d) => {
          if (args.search) {
            const q = args.search.toLowerCase();
            const matchName = d.nombre.toLowerCase().includes(q);
            const matchDesc = d.descripcion ? d.descripcion.toLowerCase().includes(q) : false;
            if (!matchName && !matchDesc) return false;
          }
          return true;
        });

        return textResult({
          total: filtered.length,
          departamentos: filtered,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}

