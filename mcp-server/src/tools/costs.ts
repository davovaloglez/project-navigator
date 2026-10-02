import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadCostos, loadFinancialModel, loadProjects } from '../data/api.js';
import { applyFinancialModel, estimateProjectCost, estimatePersonCost } from '../data/costEngine.js';
import { textResult, errorResult } from './utils.js';

export function registerCostTools(server: McpServer): void {
  server.tool(
    'get_costs',
    'Tabla de costos por rol (recursos, horas/recurso, costo mensual, costo/hora, horas, total).',
    {},
    async () => {
      try {
        const costos = await loadCostos();
        const totalMonthly = costos.reduce((a, c) => a + c.costoMensual, 0);
        return textResult({ totalMonthly, costos });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_financial_model',
    'Modelo financiero de pricing: costo operativo → valor experiencia → admin → margen → IVA → total.',
    {},
    async () => {
      try {
        const model = await loadFinancialModel();
        return textResult(model);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'estimate_project_cost',
    'Estima el costo mensual interno de un proyecto prorrateando el costo de su equipo entre los proyectos activos (soporta roles multi-persona). Opcionalmente aplica el modelo de pricing.',
    {
      id: z.string().optional().describe('Id canónico (preferido)'),
      folio: z.string().optional().describe('Folio (no único)'),
      applyPricing: z.boolean().optional().default(false)
        .describe('Si true, aplica valorExperiencia → admin → margen → IVA para obtener precio al cliente'),
    },
    async ({ id, folio, applyPricing }) => {
      try {
        if (!id && !folio) return textResult({ error: 'Provee `id` o `folio`' });
        const [projects, costos] = await Promise.all([loadProjects(), loadCostos()]);
        const project = (id && projects.find((p) => p.id === id)) || (folio && projects.find((p) => p.folio === folio)) || null;
        if (!project) return textResult({ error: `No se encontró proyecto (id=${id || '-'}, folio=${folio || '-'})` });

        const estimate = estimateProjectCost(project, projects, costos);
        const result: Record<string, unknown> = {
          id: project.id,
          folio: project.folio,
          actividad: project.actividad,
          estimate,
        };

        if (applyPricing) {
          const model = await loadFinancialModel();
          result.clientPricing = applyFinancialModel(estimate.estimatedMonthlyCost, model);
        }

        return textResult(result);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'apply_financial_model',
    'Aplica el modelo financiero a un costo interno arbitrario para obtener precio al cliente.',
    {
      costoInterno: z.number().positive().describe('Costo interno mensual a procesar'),
    },
    async ({ costoInterno }) => {
      try {
        const model = await loadFinancialModel();
        return textResult(applyFinancialModel(costoInterno, model));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'estimate_person_cost',
    'Estima el costo mensual asociado a una persona (rol primario + costo/hora + desglose por proyectos activos). Resuelve identidad por `personId` (preferido) o `nombre`.',
    {
      personId: z.string().optional().describe('equipo.id'),
      nombre: z.string().optional().describe('Nombre/apodo'),
    },
    async ({ personId, nombre }) => {
      try {
        if (!personId && !nombre) return textResult({ error: 'Provee `personId` o `nombre`' });
        const [projects, costos] = await Promise.all([loadProjects(), loadCostos()]);
        const result = estimatePersonCost({ personId, nombre }, projects, costos);
        return textResult({ personId: personId || null, nombre: nombre || null, ...result });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
