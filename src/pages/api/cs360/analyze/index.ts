import type { APIRoute } from 'astro';
import { getDbClient } from '../../../../db/client';
import {
  NEXUS_TENANT_ID,
  nexusBearerToken,
  startNexusGeneration,
} from '../../../../lib/nexus';

/**
 * POST /api/cs360/analyze — inicia la generación de insights del tablero
 * CS 360 en el servicio de IA Nexus (ai.bit.lat). NAV-85: reemplaza al
 * antiguo proxy síncrono de OpenAI.
 *
 * El prompt (persona, regla anti-prompt-injection y JSON Schema de la
 * respuesta) vive en el template de Nexus; aquí sólo se mandan los
 * `parameters` (`focus_instruction` + `cliente_json`). La generación es
 * asíncrona: se responde 202 con un `requestId` y el cliente hace polling a
 * `GET /api/cs360/analyze/[requestId]`.
 *
 * Body: { focus, customQuestion?, cliente: <payload compacto> }
 * Respuesta: 202 { requestId, status: 'pending' }
 *
 * Gateado en middleware por `page:cs360` (admin-only por default).
 */

const CS360_TEMPLATE_ID = '01KTYKWS28RDRZEVQ1JPM6TWBE';

const FOCUS_INSTRUCTIONS: Record<string, string> = {
  diagnostico:
    'Haz un análisis integral exhaustivo buscando riesgos de fuga (churn), oportunidades de upsell y evalúa el estatus general. Identifica problemas críticos en tickets.',
  renovacion:
    'Enfócate exclusivamente en las probabilidades de que este cliente renueve su contrato. Analiza fechas, uso, alumnos y quejas previas.',
  adopcion:
    "Enfócate en la adopción técnica y modular: Evalúa los stats de 'uso_plataforma'. ¿Tienen pocos alumnos vigentes comparado con los anteriores? ¿Pocos pagos?",
  relacion:
    "Enfócate en el 'sentimiento' humano y percepción. Lee las descripciones de las llamadas, las percepciones del cliente, y evalúa si la relación es saludable o crítica.",
};

/**
 * Refuerzo de formato anexado a todo `focus_instruction`: la regla de los
 * spans vive también en el JSON Schema del template, pero gpt-4o-mini la
 * cumple de forma inconsistente cuando sólo está allá; cerca del mensaje de
 * usuario el cumplimiento es consistente (verificado contra el servicio).
 */
const SPAN_RULE =
  " MUY IMPORTANTE: En markdown_report DEBES envolver cada riesgo, caída o problema crítico en <span class='text-red-600'>...</span> y cada acierto, logro o punto fuerte en <span class='text-green-600'>...</span>.";

function jsonError(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const token = nexusBearerToken();
  if (!token) {
    return jsonError(
      503,
      'El análisis con IA no está configurado en este ambiente (falta AI_BEARER_TOKEN).',
      'AI_NOT_CONFIGURED',
    );
  }

  let body: { focus?: string; customQuestion?: string; cliente?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Body JSON inválido.', 'BAD_REQUEST');
  }

  if (!body.cliente || typeof body.cliente !== 'object') {
    return jsonError(400, 'Falta el payload `cliente` a analizar.', 'BAD_REQUEST');
  }

  const customQuestion = typeof body.customQuestion === 'string' ? body.customQuestion.trim() : '';
  let focusInstruction: string;
  if (customQuestion) {
    focusInstruction = `RESPONDE A LA SIGUIENTE PREGUNTA DEL USUARIO BASÁNDOTE EN EL CONTEXTO DEL CLIENTE: "${customQuestion.slice(0, 500)}"`;
  } else {
    focusInstruction = FOCUS_INSTRUCTIONS[body.focus ?? 'diagnostico'] ?? FOCUS_INSTRUCTIONS.diagnostico;
  }
  focusInstruction += SPAN_RULE;

  try {
    const { requestId, webhookUrl } = await startNexusGeneration(token, CS360_TEMPLATE_ID, {
      focus_instruction: focusInstruction,
      cliente_json: JSON.stringify(body.cliente),
    });

    await getDbClient().execute({
      sql: `insert into nexus_request (ulid, template_id, tenant_id, user_id, webhook_url)
            values (?, ?, ?, ?, ?)`,
      args: [requestId, CS360_TEMPLATE_ID, NEXUS_TENANT_ID, locals.user?.id ?? null, webhookUrl],
    });

    return new Response(JSON.stringify({ requestId, status: 'pending' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[api:cs360/analyze]', error);
    return jsonError(502, 'No se pudo iniciar el análisis con IA.', 'AI_UPSTREAM_ERROR');
  }
};
