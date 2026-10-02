import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadGlossary } from '../data/api.js';
import type { GlossaryEntry } from '../data/types.js';
import { textResult, errorResult } from './utils.js';

/**
 * Tools del glosario. La API ya filtra por permisos (page:glosario gate +
 * filtro por secciones visibles y bloques no denegados), así que el MCP
 * recibe sólo lo que el usuario puede ver en /glosario.
 */

function summarizeEntry(e: GlossaryEntry) {
  return {
    id: e.id,
    section: e.section,
    sectionSlug: e.sectionSlug,
    title: e.title,
    summary: e.summary,
  };
}

export function registerGlossaryTools(server: McpServer): void {
  server.tool(
    'list_glossary_sections',
    'Lista las secciones del glosario (espejo del sidebar de /glosario). Cada sección trae `slug`, `title`, `description`, e `intro` (whatIs/whenToUse/related) si está documentada. Filtrado por permisos: sólo aparecen secciones cuya página equivalente el usuario puede abrir.',
    {
      includeIntros: z.boolean().optional().default(true).describe('Si false, omite el intro de cada sección (payload más liviano)'),
    },
    async ({ includeIntros }) => {
      try {
        const { sections } = await loadGlossary();
        const out = includeIntros ? sections : sections.map(({ intro: _intro, ...rest }) => rest);
        return textResult({ total: out.length, sections: out });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_glossary_entry',
    'Devuelve una entrada completa del glosario por id (fórmula, qué es, por qué importa, archivos fuente). Los ids siguen la convención `<section-slug>-<block>` (ej. `health-score`, `dashboard-kpi-overdue`, `alertas-lista`). Si la entrada no existe o el usuario no tiene permiso para verla, devuelve `error`.',
    {
      id: z.string().describe('Id de la entrada del glosario (kebab-case)'),
    },
    async ({ id }) => {
      try {
        const { entries } = await loadGlossary();
        const entry = entries.find((e) => e.id === id);
        if (!entry) {
          return textResult({ error: `No se encontró la entrada "${id}" (no existe o no tienes permiso para verla).` });
        }
        return textResult(entry);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'search_glossary',
    'Busca entradas del glosario por substring (case-insensitive) en id/title/summary/whatIs/howCalculated/whyMatters. Devuelve metadata (sin el cuerpo completo); usa `get_glossary_entry` con el id para obtener el detalle. Filtrado por permisos como `list_glossary_sections`.',
    {
      query: z.string().describe('Texto a buscar (mín. 2 caracteres)'),
      sectionSlug: z.string().optional().describe('Limitar a una sección específica (ej. `costos`, `pronosticos`)'),
      limit: z.number().int().positive().max(50).optional().default(20),
    },
    async ({ query, sectionSlug, limit }) => {
      try {
        if (query.trim().length < 2) {
          return textResult({ error: 'La consulta debe tener al menos 2 caracteres.' });
        }
        const { entries } = await loadGlossary();
        const q = query.toLowerCase();
        const matches = entries.filter((e) => {
          if (sectionSlug && e.sectionSlug !== sectionSlug) return false;
          const hay = `${e.id} ${e.title} ${e.summary} ${e.whatIs} ${e.howCalculated} ${e.whyMatters}`.toLowerCase();
          return hay.includes(q);
        });
        return textResult({
          total: matches.length,
          returned: Math.min(matches.length, limit),
          results: matches.slice(0, limit).map(summarizeEntry),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
