import type { APIRoute } from 'astro';
import { getDbClient } from '../../../../db/client';
import { ULID_REGEX, pollNexusWebhook } from '../../../../lib/nexus';

/**
 * GET /api/cs360/analyze/[requestId] — polling del análisis CS 360 iniciado
 * en Nexus (NAV-85). El cliente consulta cada pocos segundos hasta recibir
 * `status: 'completed'`.
 *
 * - Si la fila en Turso ya está `completed`, responde desde la BD sin tocar
 *   ai.vortex-it.com (cache permanente).
 * - Si está `pending`, consulta la webhook URL firmada; cuando hay respuesta
 *   la valida contra el shape esperado, persiste resultado + costo + modelo
 *   y responde `completed`.
 *
 * Respuesta: { requestId, status, data?: { recalculated_score,
 * markdown_report }, cost?, model? }
 *
 * Gateado en middleware por `page:cs360` (admin-only por default).
 */

function jsonError(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonOk(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
}

interface AnalysisData {
  recalculated_score: number;
  markdown_report: string;
}

/** Valida y normaliza el JSON generado por la IA (score clampeado 0-100). */
function parseAnalysis(responseMessage: string): AnalysisData | null {
  let parsed: { recalculated_score?: unknown; markdown_report?: unknown };
  try {
    parsed = JSON.parse(responseMessage);
  } catch {
    return null;
  }
  const score = Number(parsed.recalculated_score);
  if (!Number.isFinite(score) || typeof parsed.markdown_report !== 'string') {
    return null;
  }
  return {
    recalculated_score: Math.max(0, Math.min(100, Math.round(score))),
    markdown_report: parsed.markdown_report,
  };
}

export const GET: APIRoute = async ({ params }) => {
  const { requestId } = params;
  if (!requestId || !ULID_REGEX.test(requestId)) {
    return jsonError(400, 'requestId inválido: debe ser un ULID válido.', 'BAD_REQUEST');
  }

  const db = getDbClient();
  const result = await db.execute({
    sql: 'select status, webhook_url, cost, model, response_data from nexus_request where ulid = ?',
    args: [requestId],
  });
  const record = result.rows[0];
  if (!record) {
    return jsonError(404, 'Petición no encontrada.', 'NOT_FOUND');
  }

  if (record.status === 'completed') {
    return jsonOk({
      requestId,
      status: 'completed',
      data: JSON.parse(record.response_data as string) as AnalysisData,
      cost: record.cost ? JSON.parse(record.cost as string) : null,
      model: record.model,
    });
  }

  if (record.status === 'failed') {
    return jsonOk({ requestId, status: 'failed', error: 'La generación del análisis falló.' });
  }

  try {
    const { responseMessage, cost, model } = await pollNexusWebhook(record.webhook_url as string);

    if (!responseMessage) {
      return jsonOk({ requestId, status: 'pending' });
    }

    const data = parseAnalysis(responseMessage);
    if (!data) {
      console.error('Respuesta de Nexus no parseable:', responseMessage.slice(0, 500));
      await db.execute({
        sql: "update nexus_request set status = 'failed', completed_at = datetime('now') where ulid = ?",
        args: [requestId],
      });
      return jsonError(502, 'La IA devolvió un formato inesperado.', 'AI_BAD_FORMAT');
    }

    await db.execute({
      sql: `update nexus_request
            set status = 'completed', cost = ?, model = ?, response_data = ?,
                completed_at = datetime('now')
            where ulid = ?`,
      args: [cost ? JSON.stringify(cost) : null, model, JSON.stringify(data), requestId],
    });

    return jsonOk({ requestId, status: 'completed', data, cost, model });
  } catch (error) {
    console.error('[api:cs360/analyze/[requestId]]', error);
    return jsonError(502, 'No se pudo consultar el estado del análisis.', 'AI_UPSTREAM_ERROR');
  }
};
