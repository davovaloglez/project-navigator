import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadEquipo, loadEvaluaciones, loadMisEvaluaciones } from '../data/api.js';
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  calcCalificacion,
  comparePeriodos,
  scoresOf,
} from '../data/evaluacion.js';
import { textResult, errorResult } from './utils.js';

const PERIODO_RE = /^\d{4}-Q[1-4]$/;

/**
 * Tools de evaluaciones trimestrales (HU NAV-78). Modelo de privacidad Modo A:
 *
 * - `get_my_evaluations` funciona para cualquier usuario autenticado
 *   (filtrado server-side por `user.equipoId`).
 * - `list_evaluations` y `evaluation_summary` requieren
 *   `action:evaluacion:view-all` (admin por default). Si el rol no lo tiene,
 *   la API devuelve 403 y errorResult lo traduce a un mensaje claro.
 *
 * NO se exponen tools de escritura (POST/DELETE /api/admin/evaluaciones) por
 * diseño: editar la evaluación de alguien más es una acción sensible que
 * debe pasar por la UI con confirmación, no por el MCP.
 */
export function registerEvaluationTools(server: McpServer): void {
  server.tool(
    'get_my_evaluations',
    'Devuelve las evaluaciones trimestrales del usuario autenticado (HU NAV-78). Filtrado server-side por `user.equipoId`; no expone datos de nadie más. Si la cuenta no está vinculada a un miembro del equipo, devuelve lista vacía + `equipoId: null`. Cada evaluación incluye las 7 dimensiones (1-10) + calificación promedio + notas + timestamps.',
    {},
    async () => {
      try {
        const { evaluaciones, equipoId } = await loadMisEvaluaciones();
        const enriched = evaluaciones
          .slice()
          .sort((a, b) => comparePeriodos(b.periodo, a.periodo))
          .map((e) => ({ ...e, calificacion: calcCalificacion(scoresOf(e)) }));
        return textResult({
          equipoId,
          total: enriched.length,
          evaluaciones: enriched,
          dimensiones: DIMENSION_KEYS,
          escala: '1-10 entero por dimensión; calificación = promedio de las 7',
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'list_evaluations',
    'Lista todas las evaluaciones trimestrales cross-persona (HU NAV-78). **Gateado por `action:evaluacion:view-all`** — sólo admin por default; otros roles reciben 403. Cada fila incluye `equipoId`, `periodo`, las 7 dimensiones, calificación promedio derivada, notas, timestamps. Filtros opcionales: persona (equipoId resuelto), período (YYYY-Qn), rango de períodos. La calificación NO se persiste; se calcula al vuelo.',
    {
      equipoId: z.string().optional().describe('Filtra por persona (equipo.id).'),
      periodo: z.string().regex(PERIODO_RE, 'Formato esperado: YYYY-Qn (e.g. 2026-Q2)').optional().describe('Filtra por período trimestral exacto.'),
      desdePeriodo: z.string().regex(PERIODO_RE).optional().describe('Desde este período (inclusive).'),
      hastaPeriodo: z.string().regex(PERIODO_RE).optional().describe('Hasta este período (inclusive).'),
      minCalificacion: z.number().min(1).max(10).optional().describe('Sólo evaluaciones con calificación ≥ este valor.'),
      maxCalificacion: z.number().min(1).max(10).optional().describe('Sólo evaluaciones con calificación ≤ este valor.'),
    },
    async (args) => {
      try {
        const evaluaciones = await loadEvaluaciones();
        const filtered = evaluaciones
          .filter((e) => {
            if (args.equipoId && e.equipoId !== args.equipoId) return false;
            if (args.periodo && e.periodo !== args.periodo) return false;
            if (args.desdePeriodo && comparePeriodos(e.periodo, args.desdePeriodo) < 0) return false;
            if (args.hastaPeriodo && comparePeriodos(e.periodo, args.hastaPeriodo) > 0) return false;
            return true;
          })
          .map((e) => ({ ...e, calificacion: calcCalificacion(scoresOf(e)) }))
          .filter((e) => {
            if (args.minCalificacion !== undefined && e.calificacion < args.minCalificacion) return false;
            if (args.maxCalificacion !== undefined && e.calificacion > args.maxCalificacion) return false;
            return true;
          })
          .sort((a, b) => {
            const periodCmp = comparePeriodos(b.periodo, a.periodo);
            if (periodCmp !== 0) return periodCmp;
            return a.equipoId.localeCompare(b.equipoId);
          });

        return textResult({
          total: filtered.length,
          totalAll: evaluaciones.length,
          evaluaciones: filtered,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'evaluation_summary',
    'Resumen agregado de evaluaciones por persona para un período (HU NAV-78). **Gateado por `action:evaluacion:view-all`** (admin). Cruza `/api/evaluaciones` con `/api/equipo` para devolver, por miembro activo: nombre, rol, categoría implícita del rol, calificación promedio del período, scores por dimensión, y un flag `capturada` para distinguir quién hizo su autoevaluación. Útil para preguntar "¿quién no se autoevaluó este Q?" o "promedios por dimensión en el equipo".',
    {
      periodo: z.string().regex(PERIODO_RE, 'Formato esperado: YYYY-Qn (e.g. 2026-Q2)').describe('Período a resumir (e.g. "2026-Q2").'),
      soloCapturadas: z.boolean().optional().describe('Si true, omite personas que no capturaron evaluación en ese período.'),
      roleName: z.string().optional().describe('Filtra por nombre de rol (e.g. "Desarrollador Sr").'),
    },
    async ({ periodo, soloCapturadas, roleName }) => {
      try {
        const [evaluaciones, equipoPayload] = await Promise.all([loadEvaluaciones(), loadEquipo()]);
        const inPeriod = evaluaciones.filter((e) => e.periodo === periodo);
        const byEquipoId = new Map(inPeriod.map((e) => [e.equipoId, e] as const));

        type Row = {
          equipoId: string;
          name: string;
          roleName: string;
          managerName: string;
          capturada: boolean;
          calificacion: number | null;
          scores: Record<string, number> | null;
          notas: string | null;
          updatedAt: string | null;
        };

        const rows: Row[] = [];
        for (const m of equipoPayload.equipo) {
          if (!m.active) continue;
          if (roleName && m.roleName !== roleName) continue;
          const ev = byEquipoId.get(m.id);
          if (soloCapturadas && !ev) continue;
          rows.push({
            equipoId: m.id,
            name: m.tag || m.fullName || m.nickname || m.id,
            roleName: m.roleName,
            managerName: m.managerName,
            capturada: !!ev,
            calificacion: ev ? calcCalificacion(scoresOf(ev)) : null,
            scores: ev ? scoresOf(ev) : null,
            notas: ev?.notas ?? null,
            updatedAt: ev?.updatedAt ?? null,
          });
        }

        rows.sort((a, b) => {
          if (a.capturada !== b.capturada) return a.capturada ? -1 : 1;
          return (b.calificacion ?? -1) - (a.calificacion ?? -1);
        });

        // Promedios por dimensión sobre las personas con captura
        const captured = rows.filter((r) => r.scores);
        const promedios: Record<string, number> = {};
        for (const k of DIMENSION_KEYS) {
          if (captured.length === 0) { promedios[k] = 0; continue; }
          const sum = captured.reduce((acc, r) => acc + (r.scores?.[k] ?? 0), 0);
          promedios[k] = Number((sum / captured.length).toFixed(2));
        }
        const promedioGeneral = captured.length === 0
          ? 0
          : Number((captured.reduce((acc, r) => acc + (r.calificacion ?? 0), 0) / captured.length).toFixed(2));

        return textResult({
          periodo,
          totalActivos: rows.filter((r) => !roleName || r.roleName === roleName).length,
          capturadas: captured.length,
          sinCapturar: rows.filter((r) => !r.capturada).map((r) => ({ equipoId: r.equipoId, name: r.name, roleName: r.roleName })),
          promediosPorDimension: promedios,
          dimensionLabels: DIMENSION_LABELS,
          promedioGeneral,
          rows,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
