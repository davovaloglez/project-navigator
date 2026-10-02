import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadProjects } from '../data/api.js';
import { calcHealthScore, generateAlerts } from '../data/healthScore.js';
import { isActive } from '../data/projectStatus.js';
import { textResult, errorResult } from './utils.js';

export function registerPortfolioTools(server: McpServer): void {
  server.tool(
    'portfolio_summary',
    'KPIs del portafolio: conteos por estatus/salud/prioridad/cuatrimestre/producto/aliado/servicio, progreso promedio, cantidad at-risk/vencidos.',
    {},
    async () => {
      try {
        const projects = await loadProjects();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const countBy = <K extends keyof typeof projects[number]>(field: K): Record<string, number> => {
          const out: Record<string, number> = {};
          for (const p of projects) {
            const v = String(p[field] || 'Sin dato');
            out[v] = (out[v] || 0) + 1;
          }
          return out;
        };

        const active = projects.filter((p) => isActive(p.estatus));
        const overdue = active.filter((p) => {
          if (!p.finEstimado) return false;
          const d = new Date(p.finEstimado);
          return !isNaN(d.getTime()) && today > d;
        });
        const atRisk = projects.filter((p) => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical');
        const avgProgress = active.length
          ? active.reduce((a, p) => a + p.progreso, 0) / active.length
          : 0;

        return textResult({
          total: projects.length,
          active: active.length,
          done: projects.filter((p) => p.estatus === 'Done').length,
          onHold: projects.filter((p) => p.estatus === 'On Hold').length,
          overdue: overdue.length,
          atRisk: atRisk.length,
          avgProgressActive: Math.round(avgProgress * 1000) / 10,
          byEstatus: countBy('estatus'),
          bySalud: countBy('salud'),
          byPrioridad: countBy('prioridad'),
          byTipo: countBy('tipo'),
          byCuatrimestre: countBy('cuatrimestre'),
          byProducto: countBy('producto'),
          byServicio: countBy('servicio'),
          byAliado: countBy('aliado'),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'calculate_health_score',
    'Health score 0-100 para un proyecto (estatus + salud manual + progreso vs esperado + vencimiento + prioridad). Acepta `id` o `folio`.',
    {
      id: z.string().optional().describe('Id canónico (preferido)'),
      folio: z.string().optional().describe('Folio (no único — devuelve el match más reciente)'),
    },
    async ({ id, folio }) => {
      try {
        if (!id && !folio) return textResult({ error: 'Provee `id` o `folio`' });
        const projects = await loadProjects();
        const p = (id && projects.find((x) => x.id === id)) || (folio && projects.find((x) => x.folio === folio)) || null;
        if (!p) return textResult({ error: `No se encontró proyecto (id=${id || '-'}, folio=${folio || '-'})` });
        return textResult({
          id: p.id,
          folio: p.folio,
          actividad: p.actividad,
          ...calcHealthScore(p),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'list_alerts',
    'Alertas automáticas del portafolio: vencidos, próximos a vencer, bloqueados, en riesgo, sin avance y acciones pendientes. 3 severidades, 6 tipos.',
    {
      severity: z.enum(['critical', 'warning', 'info']).optional(),
      type: z.enum(['overdue', 'blocked', 'at-risk', 'low-progress', 'action-needed', 'upcoming-deadline']).optional(),
    },
    async ({ severity, type }) => {
      try {
        const projects = await loadProjects();
        let alerts = generateAlerts(projects);
        if (severity) alerts = alerts.filter((a) => a.severity === severity);
        if (type) alerts = alerts.filter((a) => a.type === type);
        return textResult({
          total: alerts.length,
          alerts,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
