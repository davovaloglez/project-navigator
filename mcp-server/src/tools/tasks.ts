import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadTareas, loadProjects } from '../data/api.js';
import { isTareaDone } from '../data/types.js';
import { textResult, errorResult } from './utils.js';

export function registerTaskTools(server: McpServer): void {
  server.tool(
    'list_tasks',
    'Lista actividades (hoja `actividades` unificada — ya no se discrimina App/Core; `producto` es la línea de producto/OU). Cada tarea trae id sintético, proyectoId (= ProjectRecord.id), asignado + asignadoId resuelto, sprint, fase, puntos, tracked y avance.',
    {
      proyectoId: z.string().optional().describe('Filtra tareas del proyecto con ese id'),
      asignadoId: z.string().optional().describe('Filtra por equipo.id del asignado'),
      asignado: z.string().optional().describe('Nombre parcial del asignado (substring case-insensitive)'),
      producto: z.string().optional().describe('OU / línea de producto (Academic, Atrevus, …)'),
      sprint: z.string().optional(),
      estatus: z.string().optional().describe('Ej. "Done", "In Progress", "To Do"'),
      tipo: z.string().optional().describe('Tipo de tarea: API, SP, App, Web, Análisis, SQA, Prototipo'),
      fase: z.string().optional().describe('Desarrollo, SQA, Soporte, Análisis, …'),
      rol: z.string().optional().describe('Rol del asignado (Dev Jr, ARQ, SQA, PO, …)'),
      prioridad: z.string().optional(),
      epica: z.string().optional().describe('Substring match'),
      search: z.string().optional().describe('Búsqueda libre sobre nombre/folio/épica/proyecto'),
      includeDone: z.boolean().optional().default(true),
      limit: z.number().int().positive().max(1000).optional().default(100),
    },
    async (args) => {
      try {
        const all = await loadTareas();
        const filtered = all.filter((t) => {
          if (args.proyectoId && t.proyectoId !== args.proyectoId) return false;
          if (args.asignadoId && t.asignadoId !== args.asignadoId) return false;
          if (args.asignado && !t.asignado.toLowerCase().includes(args.asignado.toLowerCase())) return false;
          if (args.producto && t.producto !== args.producto) return false;
          if (args.sprint && t.sprint !== args.sprint) return false;
          if (args.estatus && t.estatus !== args.estatus) return false;
          if (args.tipo && t.tipo !== args.tipo) return false;
          if (args.fase && t.fase !== args.fase) return false;
          if (args.rol && t.rol !== args.rol) return false;
          if (args.prioridad && t.prioridad !== args.prioridad) return false;
          if (args.epica && !t.epica.toLowerCase().includes(args.epica.toLowerCase())) return false;
          if (!args.includeDone && isTareaDone(t.estatus)) return false;
          if (args.search) {
            const q = args.search.toLowerCase();
            const hay = `${t.nombre} ${t.folio} ${t.proyecto} ${t.epica}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        return textResult({
          total: filtered.length,
          returned: Math.min(filtered.length, args.limit),
          tasks: filtered.slice(0, args.limit),
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'get_task',
    'Detalle de una tarea por id sintético. Si proveés `proyectoId` adicionalmente, busca solo en ese proyecto.',
    {
      id: z.string().describe('Id sintético de la tarea'),
      proyectoId: z.string().optional(),
    },
    async ({ id, proyectoId }) => {
      try {
        const all = await loadTareas();
        const t = all.find((x) => x.id === id && (!proyectoId || x.proyectoId === proyectoId));
        if (!t) return textResult({ error: `No se encontró tarea con id "${id}"` });
        return textResult(t);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'task_throughput',
    'Throughput semanal (tareas terminadas por semana ISO) y total de puntos. Acepta filtros por sprint, producto u OU.',
    {
      producto: z.string().optional().describe('OU / línea de producto'),
      sprint: z.string().optional(),
      weeks: z.number().int().positive().max(52).optional().default(12),
    },
    async ({ producto, sprint, weeks }) => {
      try {
        const all = await loadTareas();
        const scoped = all.filter((t) => {
          if (producto && t.producto !== producto) return false;
          if (sprint && t.sprint !== sprint) return false;
          return true;
        });
        const done = scoped.filter((t) => isTareaDone(t.estatus) && t.finReal);

        const buckets = new Map<string, number>();
        const ptsBuckets = new Map<string, number>();
        for (const t of done) {
          const d = new Date(t.finReal);
          if (isNaN(d.getTime())) continue;
          const key = isoWeek(d);
          buckets.set(key, (buckets.get(key) || 0) + 1);
          ptsBuckets.set(key, (ptsBuckets.get(key) || 0) + (t.puntos || 0));
        }

        const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-weeks);
        const series = sorted.map(([week, count]) => ({
          week,
          count,
          points: ptsBuckets.get(week) || 0,
        }));
        const totalPoints = done.reduce((acc, t) => acc + (t.puntos ?? 0), 0);
        const totalTracked = done.reduce((acc, t) => acc + (t.tracked ?? 0), 0);
        const estimationBias = totalPoints > 0 ? (totalTracked - totalPoints) / totalPoints : 0;

        return textResult({
          totalDone: done.length,
          totalPoints,
          totalTracked,
          estimationBias: Math.round(estimationBias * 1000) / 1000,
          weeksWithCompletions: series.length,
          throughputPerWeek: series,
          avgPerWeek: series.length ? Math.round((series.reduce((a, b) => a + b.count, 0) / series.length) * 10) / 10 : 0,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'project_tasks',
    'Lista las tareas que pertenecen a un proyecto (por id). Útil para inspeccionar el cronograma de un proyecto específico.',
    {
      proyectoId: z.string().describe('id canónico del proyecto'),
      includeDone: z.boolean().optional().default(true),
    },
    async ({ proyectoId, includeDone }) => {
      try {
        const [projects, tareas] = await Promise.all([loadProjects(), loadTareas()]);
        const project = projects.find((p) => p.id === proyectoId);
        const tasks = tareas.filter((t) => t.proyectoId === proyectoId && (includeDone || !isTareaDone(t.estatus)));
        return textResult({
          project: project ? { id: project.id, folio: project.folio, actividad: project.actividad } : null,
          totalTasks: tasks.length,
          totalPoints: tasks.reduce((a, t) => a + (t.puntos || 0), 0),
          totalTracked: tasks.reduce((a, t) => a + (t.tracked || 0), 0),
          tasks,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
