/**
 * CS 360 (Neural Intelligence 360) — tipos del contrato con el back y motor de
 * Health Score de clientes.
 *
 * El contrato canónico vive en `src/data/cs360-clientes.json` (mock del back):
 * snake_case en español, fechas SIEMPRE en ISO 8601 y `null` en lugar de los
 * centinelas sucios del export original de Samva ("- - - - - -").
 *
 * La fórmula de `calculateBaseScore` replica 1:1 la del mock aprobado
 * (mocks/healt-score/Neural360.html): inicia en 100 y ajusta por tickets
 * abiertos/críticos (tope -30), actividad proactiva reciente, riesgo de
 * renovación, adopción (alumnos vigentes) y sentimiento en llamadas.
 */

export interface CsTicket {
  id: string;
  folio: string;
  titulo: string;
  estatus: string;
  prioridad: string;
  tipo_incidencia: string;
  equipo_actual: string;
  asignado_actual: string | null;
  fecha_registro: string;
  /**
   * Señal canónica de cierre en el export real de Samva (null = abierto).
   * Si viene definido, manda sobre la heurística por `estatus`.
   */
  fecha_termino?: string | null;
  /** HTML confiable provisto por el back (decisión: sin sanitizar por ahora). */
  descripcion: string | null;
  comentarios: string | null;
  url: string | null;
}

export interface CsActividad {
  id: string;
  fecha_inicio: string;
  tipo_nombre: string;
  responsable: string | null;
  asunto: string;
  contenido: string | null;
}

export interface CsLlamada {
  id: string;
  fecha_inicio: string;
  agente_nombre: string | null;
  duracion_textual: string | null;
  percepcion_cliente_estado: string | null;
  percepcion_cliente_texto: string | null;
  calificacion: number | null;
  grabacion: string | null;
  resumen: string | null;
}

export interface CsUsoPlataforma {
  alumnos_inscritos_admon_actuales: number;
  admin_finanzas_pagos: number;
  admin_finanzas_facturas: number;
  control_escolar_clases_contenidos_adicionales: number;
  crm_prospectos_actuales: number;
}

export interface CsKpiFinanciero {
  ranking: number | null;
  clasificacion_abc: 'A' | 'B' | 'C' | null;
  es_vital: boolean;
}

export interface CsCliente {
  id: string;
  numero_cliente: string;
  nombre: string;
  alias: string | null;
  estatus: string;
  url: string | null;
  url_academic: string | null;
  fecha_vigencia: string | null;
  alumnos_vigentes: number;
  nivel_servicio: string | null;
  resultado_html_magnum: string | null;
  kpi_financiero: CsKpiFinanciero;
  uso_plataforma: CsUsoPlataforma | null;
  tickets: CsTicket[];
  actividades: CsActividad[];
  llamadas: CsLlamada[];
}

export interface CsScoreResult {
  total: number;
  log: string;
}

/**
 * Proyección ligera de un cliente para la lista/dashboard global. El detalle
 * completo (tickets/actividades/llamadas con HTML) se pide por cliente vía
 * `GET /api/cs360/clientes/[id]` — el export real pesa ~44MB y no debe viajar
 * entero al navegador. El `score` viene precalculado server-side con
 * `calculateBaseScore` sobre los datos completos.
 */
export interface CsClienteResumen {
  id: string;
  numero_cliente: string;
  nombre: string;
  alias: string | null;
  estatus: string;
  fecha_vigencia: string | null;
  alumnos_vigentes: number;
  nivel_servicio: string | null;
  kpi_financiero: CsKpiFinanciero;
  score: CsScoreResult;
  total_tickets: number;
  total_actividades: number;
  total_llamadas: number;
}

/** Resultado de la IA persistido en localStorage (key `pn-cs360-ai-store`). */
export interface CsAiEntry {
  score: number;
  html: string;
  dateRange: string;
  /** ISO timestamp de la generación. Opcional: entradas viejas no lo traen. */
  generatedAt?: string;
}

export const CS360_AI_STORE_KEY = 'pn-cs360-ai-store';

export function parseFecha(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Normaliza para comparaciones tolerantes a acentos ("Auditoría" → "auditoria"). */
export function normalizar(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Estados de cierre observados en el export real (`estado_nombre` trae 38+
 * estados de workflow; sin esta lista, "Liberado" o "No viable" contarían como
 * abiertos y castigarían el score injustamente).
 */
const ESTADOS_CERRADOS = [
  'solucionado',
  'cerrado',
  'terminad', // Terminado / Terminada
  'liberado',
  'declinado',
  'no viable',
  'ya se realiza',
  'cancelado',
  'rechazada',
];

export function isTicketAbierto(t: CsTicket): boolean {
  // Export real: `fecha_termino` viene definido ⇒ null/'' = abierto.
  if (t.fecha_termino !== undefined) return !t.fecha_termino;
  const est = normalizar(t.estatus);
  return !ESTADOS_CERRADOS.some((s) => est.includes(s));
}

export function isTicketCritico(t: CsTicket): boolean {
  const pri = normalizar(t.prioridad);
  // Vocabulario del export real: Trivial < Menor < Mayor < Crítica < Bloqueadora.
  return (
    pri.includes('critica') ||
    pri.includes('bloqueadora') ||
    pri.includes('mayor') ||
    pri.includes('alta') ||
    pri.includes('urgente')
  );
}

export type CsSentimiento = 'positivo' | 'negativo' | 'neutro';

export function sentimientoLlamada(ll: CsLlamada): CsSentimiento {
  const perc = normalizar(ll.percepcion_cliente_estado);
  if (perc.includes('excelente') || perc.includes('buen') || perc.includes('positivo')) return 'positivo';
  if (perc.includes('deficiente') || perc.includes('critico') || perc.includes('mal')) return 'negativo';
  if (perc === '' && ll.calificacion != null) {
    if (ll.calificacion > 8) return 'positivo';
    if (ll.calificacion < 6) return 'negativo';
  }
  return 'neutro';
}

/**
 * Réplica fiel de `calculateBaseScore` del mock: score 0-100 + log explicativo
 * (el mismo texto que muestra el modal "Desglose del cálculo").
 */
export function calculateBaseScore(client: CsCliente, now: Date = new Date()): CsScoreResult {
  let score = 100;
  const details: string[] = ['=== CÁLCULO BASE DEL SISTEMA ===\nIniciando con 100 puntos...\n'];

  // Factor 1: Tickets abiertos / críticos (suavizado con tope de -30)
  let openTickets = 0;
  let criticalTickets = 0;
  for (const t of client.tickets ?? []) {
    if (isTicketAbierto(t)) {
      openTickets++;
      if (isTicketCritico(t)) criticalTickets++;
    }
  }
  if (openTickets > 0) {
    const rawPenalty = openTickets * 2 + criticalTickets * 5;
    const penalty = Math.min(30, rawPenalty);
    score -= penalty;
    details.push(
      `[-] ${penalty} pts deducidos por ${openTickets} tickets abiertos (${criticalTickets} críticos). *Tope max de deducción aplicado: -30*`,
    );
  } else {
    details.push('[+] 0 pts (Sin tickets críticos pendientes).');
  }

  // Factor 2: Actividades recientes (últimos 3 meses)
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  let recentActs = 0;
  for (const a of client.actividades ?? []) {
    const actDate = parseFecha(a.fecha_inicio);
    if (actDate && actDate >= threeMonthsAgo) recentActs++;
  }
  if (recentActs === 0) {
    score -= 10;
    details.push('[-] 10 pts por falta de actividad de acercamiento proactivo en últimos 3 meses.');
  } else if (recentActs > 3) {
    score += 5;
    details.push(
      `[+] 5 pts por alta interacción proactiva y seguimiento (${recentActs} actividades recientes).`,
    );
  }

  // Factor 3: Riesgo de renovación
  const renDate = parseFecha(client.fecha_vigencia);
  if (renDate) {
    const diffDays = Math.ceil((renDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      score -= 20;
      details.push(`[-] 20 pts (Contrato vencido hace ${Math.abs(diffDays)} días).`);
    } else if (diffDays <= 60) {
      score -= 15;
      details.push(`[-] 15 pts (Renovación en zona de riesgo a ${diffDays} días).`);
    }
  }

  // Factor 4: Alumnos vigentes (adopción)
  if (client.alumnos_vigentes === 0) {
    score -= 20;
    details.push('[-] 20 pts por registrar 0 alumnos vigentes (Alto riesgo de adopción/abandono).');
  }

  // Factor 5: Percepción en llamadas / encuestas
  let goodSentiments = 0;
  let badSentiments = 0;
  for (const ll of client.llamadas ?? []) {
    const perc = normalizar(ll.percepcion_cliente_estado);
    if (perc.includes('excelente') || perc.includes('bueno')) goodSentiments++;
    if (perc.includes('deficiente') || perc.includes('critico') || perc.includes('malo')) badSentiments++;
  }
  if (badSentiments > goodSentiments) {
    score -= 10;
    details.push('[-] 10 pts por tendencia o sentimiento negativo detectado en encuestas/llamadas.');
  } else if (goodSentiments > badSentiments && goodSentiments > 0) {
    score += 5;
    details.push('[+] 5 pts por tendencia general muy positiva en el trato y llamadas.');
  }

  score = Math.max(0, Math.min(100, score));
  details.push(`\n>>> SCORE MATEMÁTICO FINAL: ${score} <<<`);

  return { total: score, log: details.join('\n') };
}

/** Días hasta la renovación (negativo = vencido), o null sin fecha. */
export function diasParaRenovacion(
  client: Pick<CsCliente, 'fecha_vigencia'>,
  now: Date = new Date(),
): number | null {
  const renDate = parseFecha(client.fecha_vigencia);
  if (!renDate) return null;
  return (renDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
}

export function esVital(client: Pick<CsCliente, 'kpi_financiero'>): boolean {
  return client.kpi_financiero?.clasificacion_abc === 'A' || client.kpi_financiero?.es_vital === true;
}

/** Proyección lista/dashboard de un cliente completo (usada por el endpoint y el fallback). */
export function toClienteResumen(c: CsCliente, score: CsScoreResult): CsClienteResumen {
  return {
    id: c.id,
    numero_cliente: c.numero_cliente,
    nombre: c.nombre,
    alias: c.alias,
    estatus: c.estatus,
    fecha_vigencia: c.fecha_vigencia,
    alumnos_vigentes: c.alumnos_vigentes,
    nivel_servicio: c.nivel_servicio,
    kpi_financiero: c.kpi_financiero,
    score,
    total_tickets: c.tickets.length,
    total_actividades: c.actividades.length,
    total_llamadas: c.llamadas.length,
  };
}

/**
 * Conversor mínimo Markdown → HTML para el reporte de la IA (formato definido
 * en el JSON Schema del template de Nexus: `###`, listas `- `, `**bold**` y
 * spans text-red-600/text-green-600 embebidos, que pasan crudos por ser
 * confiables).
 */
export function aiMarkdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  const inline = (text: string): string =>
    text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      closeList();
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}
