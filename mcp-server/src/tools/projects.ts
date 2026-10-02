import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadProjects } from '../data/api.js';
import type { ProjectRecord } from '../data/types.js';
import { splitNames } from '../data/parsers.js';
import { textResult, errorResult } from './utils.js';

interface ProjectFilters {
  estatus?: string;
  salud?: string;
  prioridad?: string;
  cliente?: string;
  producto?: string;
  servicio?: string;
  aliado?: string;
  sprint?: string;
  cuatrimestre?: string;
  tipo?: string;
  pm?: string;
  arquitecto?: string;
  dev?: string;
  po?: string;
  sqa?: string;
  personId?: string;
  search?: string;
}

function matches(p: ProjectRecord, f: ProjectFilters): boolean {
  if (f.estatus && p.estatus !== f.estatus) return false;
  if (f.salud && p.salud !== f.salud) return false;
  if (f.prioridad && p.prioridad !== f.prioridad) return false;
  if (f.cliente && !p.cliente.toLowerCase().includes(f.cliente.toLowerCase())) return false;
  if (f.producto && !p.producto.toLowerCase().includes(f.producto.toLowerCase())) return false;
  if (f.servicio && !p.servicio.toLowerCase().includes(f.servicio.toLowerCase())) return false;
  if (f.aliado && !p.aliado.toLowerCase().includes(f.aliado.toLowerCase())) return false;
  if (f.sprint && p.sprint !== f.sprint) return false;
  if (f.cuatrimestre && p.cuatrimestre !== f.cuatrimestre) return false;
  if (f.tipo && p.tipo !== f.tipo) return false;
  if (f.pm && !splitNames(p.pm).some((n) => n.toLowerCase().includes(f.pm!.toLowerCase()))) return false;
  if (f.arquitecto && !splitNames(p.arquitecto).some((n) => n.toLowerCase().includes(f.arquitecto!.toLowerCase()))) return false;
  if (f.dev && !p.devs.some((d) => d.toLowerCase().includes(f.dev!.toLowerCase()))) return false;
  if (f.po && !splitNames(p.po).some((n) => n.toLowerCase().includes(f.po!.toLowerCase()))) return false;
  if (f.sqa && !splitNames(p.sqa).some((n) => n.toLowerCase().includes(f.sqa!.toLowerCase()))) return false;
  if (f.personId) {
    const all = [...p.pmIds, ...p.arquitectoIds, ...p.devIds, ...p.poIds, ...p.sqaIds];
    if (!all.includes(f.personId)) return false;
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${p.id} ${p.folio} ${p.actividad} ${p.cliente} ${p.producto} ${p.epica} ${p.hito} ${p.cuatrimestre}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function registerProjectTools(server: McpServer): void {
  server.tool(
    'list_projects',
    'Lista proyectos del portafolio con filtros. Cada proyecto trae `id` (canónico, único), `folio` (no único), nombre, estatus/salud, equipo (con ids resueltos: pmIds/arquitectoIds/devIds/poIds/sqaIds), fechas, sprint, cuatrimestre y dependencias.',
    {
      estatus: z.enum(['Upcoming', 'On Track', 'At Risk', 'Blocked / Critical', 'Hypercare', 'LaunchPhase', 'Done', 'On Hold', 'Cancelado']).optional()
        .describe('Filtra por estatus exacto'),
      salud: z.enum(['Estable', 'Requiere atencion', 'En riesgo']).optional()
        .describe('Filtra por campo de salud manual'),
      prioridad: z.enum(['Bloqueadora', 'Crítica', 'Alta', 'Media', 'Baja']).optional(),
      cliente: z.string().optional().describe('Substring match (alias compat de `producto`)'),
      producto: z.string().optional().describe('Línea de producto / cliente externo (Academic, Atrevus, …)'),
      servicio: z.string().optional().describe('Core / APP / "Core, App"'),
      aliado: z.string().optional().describe('Aliado/partner (UNIMEL, Riviera, Defontana, …)'),
      sprint: z.string().optional().describe('Sprint (S17, S18, …)'),
      cuatrimestre: z.string().optional().describe('Horizonte de planeación, p.ej. "2026 Q2"'),
      tipo: z.string().optional(),
      pm: z.string().optional().describe('Nombre/apodo parcial del PM (multi-persona)'),
      arquitecto: z.string().optional().describe('Nombre/apodo parcial (multi-persona)'),
      dev: z.string().optional().describe('Nombre/apodo parcial del developer'),
      po: z.string().optional(),
      sqa: z.string().optional(),
      personId: z.string().optional().describe('Filtra proyectos donde la persona (equipo.id) está en cualquier rol'),
      search: z.string().optional().describe('Búsqueda libre sobre id/folio/nombre/cliente/producto/épica/cuatrimestre'),
      limit: z.number().int().positive().max(300).optional().default(50),
    },
    async (args) => {
      try {
        const all = await loadProjects();
        const filtered = all.filter((p) => matches(p, args));
        const limited = filtered.slice(0, args.limit);
        return textResult({
          total: filtered.length,
          returned: limited.length,
          projects: limited,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_project',
    'Detalle de un proyecto por identidad canónica (`id`) o `folio`. `id` es único; `folio` puede colisionar — preferir `id` cuando esté disponible.',
    {
      id: z.string().optional().describe('Id canónico (preferido)'),
      folio: z.string().optional().describe('Folio (no único — devuelve la coincidencia más reciente)'),
    },
    async ({ id, folio }) => {
      try {
        if (!id && !folio) return textResult({ error: 'Provee `id` o `folio`' });
        const all = await loadProjects();
        let project: ProjectRecord | undefined;
        if (id) project = all.find((p) => p.id === id);
        if (!project && folio) project = all.find((p) => p.folio === folio);
        if (!project) return textResult({ error: `No se encontró proyecto (id=${id || '-'}, folio=${folio || '-'})` });
        return textResult(project);
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
