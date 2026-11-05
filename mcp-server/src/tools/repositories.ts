import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadRepositorios } from '../data/api.js';
import type { RepoRecord } from '../data/types.js';
import { textResult, errorResult } from './utils.js';

function matchesRepo(r: RepoRecord, search?: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return Boolean(
    r.nombre.toLowerCase().includes(q) ||
    r.github.toLowerCase().includes(q) ||
    (r.dpto && r.dpto.toLowerCase().includes(q)) ||
    (r.producto && r.producto.toLowerCase().includes(q)) ||
    (r.tecnologia_principal && r.tecnologia_principal.toLowerCase().includes(q)) ||
    (r.colaborador && r.colaborador.toLowerCase().includes(q)) ||
    (r.administrador && r.administrador.toLowerCase().includes(q)) ||
    (r.arquitecto && r.arquitecto.toLowerCase().includes(q))
  );
}

export function registerRepositoryTools(server: McpServer): void {
  server.tool(
    'list_repositories',
    'Lista los repositorios de código de la organización (GitHub URLs, ambientes, estatus, departamento, producto y tecnología principal). Permite filtrar por empresa, departamento, producto o búsqueda de texto.',
    {
      empresaId: z.string().optional().describe('Filtra por ID de empresa (ej. "vortex-it", "bit-technologies")'),
      dpto: z.string().optional().describe('Filtra por departamento o área (ej. "Tech Ambition", "Academic")'),
      producto: z.string().optional().describe('Filtra por producto asignado'),
      estatus: z.string().optional().describe('Filtra por estatus del repositorio (ej. "Activo", "Archivado")'),
      search: z.string().optional().describe('Búsqueda por texto en nombre, github url, tecnologías o colaboradores'),
    },
    async (args) => {
      try {
        const repos = await loadRepositorios(args.empresaId);
        const filtered = repos.filter((r) => {
          if (args.dpto && (!r.dpto || !r.dpto.toLowerCase().includes(args.dpto.toLowerCase()))) return false;
          if (args.producto && (!r.producto || !r.producto.toLowerCase().includes(args.producto.toLowerCase()))) return false;
          if (args.estatus && r.estatus.toLowerCase() !== args.estatus.toLowerCase()) return false;
          if (args.search && !matchesRepo(r, args.search)) return false;
          return true;
        });

        return textResult({
          total: filtered.length,
          repositorios: filtered.map((r) => ({
            id: r.id,
            nombre: r.nombre,
            github: r.github,
            empresa_id: r.empresa_id,
            dpto: r.dpto,
            producto: r.producto,
            estatus: r.estatus,
            ambientes: r.ambientes,
            tecnologia_principal: r.tecnologia_principal,
            administrador: r.administrador,
            arquitecto: r.arquitecto,
            colaborador: r.colaborador,
            visualizador: r.visualizador,
            deploy: r.deploy,
          })),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_repository',
    'Obtiene el detalle completo de un repositorio por su nombre o su identificador (ID). Incluye ambientes, enlace de GitHub y colaboradores asignados por cada rol.',
    {
      identificador: z.string().describe('ID o nombre exacto/parcial del repositorio a buscar'),
    },
    async (args) => {
      try {
        const repos = await loadRepositorios();
        const q = args.identificador.toLowerCase().trim();
        const found = repos.find(
          (r) =>
            (r.id && r.id.toLowerCase() === q) ||
            r.nombre.toLowerCase() === q ||
            r.nombre.toLowerCase().includes(q),
        );

        if (!found) {
          return textResult({
            encontrado: false,
            mensaje: `No se encontró ningún repositorio con el identificador o nombre: "${args.identificador}"`,
          });
        }

        return textResult({
          encontrado: true,
          repositorio: found,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
