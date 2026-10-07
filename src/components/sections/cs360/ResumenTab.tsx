import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';
import {
  BrainCircuit,
  Sparkles,
  MessageSquare,
  Bot,
  CalendarDays,
  Users,
  LayoutGrid,
  CreditCard,
  FileText,
  BookOpen,
  Target,
  Inbox,
  Printer,
} from 'lucide-react';
import type { CsCliente, CsScoreResult, CsAiEntry } from '../../../utils/cs360';
import { parseFecha, aiMarkdownToHtml, normalizar } from '../../../utils/cs360';
import { CsDonutChart, CsBarChart, type NamedCount } from './charts';

interface Props {
  cliente: CsCliente;
  baseScore: CsScoreResult;
  aiEntry: CsAiEntry | null;
  onAiResult: (entry: CsAiEntry) => void;
}

const AI_FOCUS_OPTIONS = [
  { value: 'diagnostico', label: 'Análisis Integral: Diagnóstico, Estatus y Riesgos' },
  { value: 'renovacion', label: 'Enfoque: Probabilidad de Renovación y Puntos Críticos' },
  { value: 'adopcion', label: 'Enfoque: Adopción técnica y uso de la plataforma' },
  { value: 'relacion', label: 'Enfoque: Relación comercial y sentimiento en llamadas' },
];

/** Fechas de toda interacción del cliente (tickets + actividades + llamadas). */
function fechasDeInteraccion(cliente: CsCliente): Date[] {
  const fechas: Date[] = [];
  for (const t of cliente.tickets) {
    const d = parseFecha(t.fecha_registro);
    if (d) fechas.push(d);
  }
  for (const a of cliente.actividades) {
    const d = parseFecha(a.fecha_inicio);
    if (d) fechas.push(d);
  }
  for (const ll of cliente.llamadas) {
    const d = parseFecha(ll.fecha_inicio);
    if (d) fechas.push(d);
  }
  return fechas;
}

/**
 * NAV-85: la generación en Nexus (ai.vortex-it.com) es asíncrona — el POST responde
 * 202 con un requestId y el resultado se recoge por polling. En la práctica
 * suele estar listo en el primer intento (~5s).
 */
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

async function pollAnalysis(
  requestId: string,
): Promise<{ recalculated_score: number; markdown_report: string }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await fetch(`/api/cs360/analyze/${requestId}`);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error ?? `Error ${res.status}`);
    }
    if (json.status === 'completed') return json.data;
    if (json.status === 'failed') {
      throw new Error(json.error ?? 'La generación del análisis falló.');
    }
  }
  throw new Error('La IA tardó demasiado en responder. Intenta de nuevo.');
}

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Vista de impresión del reporte de IA ("Exportar PDF"). Se monta como portal
 * directo en `<body>` (hermano del root de la app) y sólo es visible en
 * `@media print` — ver los estilos en `cs360.astro`: cuando este nodo existe,
 * imprimir oculta la app completa y fluye únicamente el reporte, sin los
 * recortes de los contenedores con `overflow` de la vista en pantalla.
 */
function PrintableReport({ cliente, aiEntry }: { cliente: CsCliente; aiEntry: CsAiEntry }) {
  return createPortal(
    <div className="cs360-print-report">
      <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
        Neural Intelligence 360 · Reporte de análisis con IA
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mt-1">{cliente.nombre || cliente.alias}</h1>
      <div className="text-sm text-slate-600 mt-2 pb-3 border-b-2 border-slate-200">
        Health Score: <strong>{aiEntry.score}/100</strong> (ajustado por IA)
        {' · '}Vence: <strong>{cliente.fecha_vigencia ?? 'N/D'}</strong>
        {' · '}Análisis sobre periodo: <strong>{aiEntry.dateRange}</strong>
        {aiEntry.generatedAt && (
          <>
            {' · '}Generado el <strong>{formatGeneratedAt(aiEntry.generatedAt)}</strong>
          </>
        )}
      </div>
      <div className="ai-content text-sm mt-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(aiEntry.html) }} />
    </div>,
    document.body,
  );
}

const HEATMAP_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

function Heatmap({ cliente }: { cliente: CsCliente }) {
  const weeklyCounts = useMemo(() => {
    const weeks = 52;
    const counts = new Array<number>(weeks).fill(0);
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    for (const d of fechasDeInteraccion(cliente)) {
      if (d >= oneYearAgo && d <= now) {
        const diffWeeks = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const index = weeks - 1 - diffWeeks;
        if (index >= 0 && index < weeks) counts[index]++;
      }
    }
    return counts;
  }, [cliente]);

  return (
    <div>
      <div className="grid gap-0.5 mb-2" style={{ gridTemplateColumns: 'repeat(52, 1fr)' }}>
        {weeklyCounts.map((count, i) => {
          let level = 0;
          if (count > 0) level = 1;
          if (count > 2) level = 2;
          if (count > 5) level = 3;
          if (count > 10) level = 4;
          return (
            <div
              key={i}
              className="aspect-square rounded-xs transition-transform hover:scale-110"
              style={{ backgroundColor: HEATMAP_COLORS[level] }}
              title={count > 0 ? `${count} interacciones esta semana` : undefined}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        <span>Hace 1 año</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

function ContextLeaders({ cliente }: { cliente: CsCliente }) {
  const leaders = useMemo(() => {
    const counts: Record<string, number> = {};
    const add = (name: string | null) => {
      if (name && name !== 'Sin asignar') counts[name] = (counts[name] || 0) + 1;
    };
    cliente.tickets.forEach((t) => add(t.asignado_actual));
    cliente.actividades.forEach((a) => add(a.responsable));
    cliente.llamadas.forEach((l) => add(l.agente_nombre));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [cliente]);

  if (leaders.length === 0) {
    return <p className="text-xs text-slate-400">Sin datos suficientes de responsables.</p>;
  }

  return (
    <div className="space-y-2">
      {leaders.map(([name, count]) => (
        <div
          key={name}
          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-sm">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 truncate w-32" title={name}>
              {name}
            </span>
          </div>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full border border-slate-200">
            {count} logs
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ResumenTab({ cliente, baseScore, aiEntry, onAiResult }: Props) {
  const [focus, setFocus] = useState('diagnostico');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const ticketsPorEstatus: NamedCount[] = useMemo(() => {
    const cats: Record<string, number> = {};
    cliente.tickets.forEach((t) => {
      const c = t.estatus || 'Sin Estatus';
      cats[c] = (cats[c] || 0) + 1;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [cliente]);

  const sentimientoLlamadas: NamedCount[] = useMemo(() => {
    const buckets: Record<string, number> = {
      Excelente: 0,
      'Positivo / Bueno': 0,
      'Deficiente / Crítico': 0,
      'Sin Encuesta': 0,
    };
    cliente.llamadas.forEach((ll) => {
      const perc = normalizar(ll.percepcion_cliente_estado);
      if (perc !== '') {
        if (perc.includes('excelente')) buckets['Excelente']++;
        else if (perc.includes('buen') || perc.includes('positivo') || perc.includes('aceptable'))
          buckets['Positivo / Bueno']++;
        else if (perc.includes('deficient') || perc.includes('critic') || perc.includes('mal'))
          buckets['Deficiente / Crítico']++;
        // 'Sin Respuesta' (export real) cae aquí: sin encuesta efectiva.
        else buckets['Sin Encuesta']++;
      } else if (ll.calificacion != null) {
        if (ll.calificacion > 8) buckets['Excelente']++;
        else if (ll.calificacion >= 6) buckets['Positivo / Bueno']++;
        else buckets['Deficiente / Crítico']++;
      } else {
        buckets['Sin Encuesta']++;
      }
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [cliente]);

  const ticketBreakdown = useMemo(() => {
    const breakdown: Record<string, { mesa: string; tipo: string; count: number }> = {};
    cliente.tickets.forEach((t) => {
      const tipo = t.tipo_incidencia || 'Sin tipo definido';
      const mesa = t.equipo_actual || 'Sin mesa asignada';
      const key = `${mesa}::${tipo}`;
      if (!breakdown[key]) breakdown[key] = { mesa, tipo, count: 0 };
      breakdown[key].count++;
    });
    return Object.values(breakdown).sort((a, b) => b.count - a.count);
  }, [cliente]);

  async function analyze(customQuestion?: string) {
    setAiLoading(true);
    setAiError(null);
    try {
      // Payload compacto (mismo recorte que el mock) para optimizar tokens.
      const compact = {
        nombre: cliente.nombre,
        estatus: cliente.estatus,
        nivel_servicio: cliente.nivel_servicio,
        renovacion: cliente.fecha_vigencia,
        kpi: cliente.kpi_financiero,
        uso_plataforma: cliente.uso_plataforma,
        score_base_sistema: baseScore.total,
        ultimas_llamadas_percepcion: cliente.llamadas.slice(0, 5).map((l) => ({
          percepcion: l.percepcion_cliente_estado,
          notas: l.percepcion_cliente_texto,
        })),
        ultimos_tickets: cliente.tickets.slice(0, 10).map((t) => ({
          titulo: t.titulo,
          estatus: t.estatus,
          tipo: t.tipo_incidencia,
        })),
        actividades_recientes: cliente.actividades.slice(0, 5).map((a) => ({
          tipo: a.tipo_nombre,
          asunto: a.asunto,
        })),
      };

      const res = await fetch('/api/cs360/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus, customQuestion, cliente: compact }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? `Error ${res.status}`);
      }

      const analysis = await pollAnalysis(json.requestId);

      const fechas = fechasDeInteraccion(cliente).sort((a, b) => a.getTime() - b.getTime());
      const dateRange =
        fechas.length > 0
          ? `${fechas[0].toLocaleDateString('es-MX')} - ${fechas[fechas.length - 1].toLocaleDateString('es-MX')}`
          : 'Datos recientes';

      onAiResult({
        score: analysis.recalculated_score,
        html: aiMarkdownToHtml(analysis.markdown_report),
        dateRange,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setAiLoading(false);
    }
  }

  function askCustomQuestion() {
    const question = window.prompt('¿Qué quieres preguntarle a la IA sobre este cliente?');
    if (question) analyze(question);
  }

  return (
    <div className="space-y-6">
      {/* Top Row: IA + Heatmap & Líderes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Analysis Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col overflow-hidden">
          <div className="bg-linear-to-r from-slate-800 to-indigo-900 p-4 text-white flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-300" />
              Neural AI Insights
            </h3>
            <button
              onClick={() => window.print()}
              disabled={!aiEntry}
              className="text-xs bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors flex items-center gap-1 print:hidden"
              title={aiEntry ? 'Imprimir / guardar como PDF' : 'Genera primero un análisis con IA'}
            >
              <Printer className="w-3 h-3" /> Exportar PDF
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col bg-white">
            <div className="flex flex-col sm:flex-row gap-2 mb-4 print:hidden">
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-700"
              >
                {AI_FOCUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => analyze()}
                  disabled={aiLoading}
                  className="flex-1 sm:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm shadow-indigo-200"
                  title="Generar análisis predefinido"
                >
                  <Sparkles className="w-4 h-4" /> Generar
                </button>
                <button
                  onClick={askCustomQuestion}
                  disabled={aiLoading}
                  className="flex-1 sm:flex-none justify-center bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                  title="Hacer una pregunta libre a la IA"
                >
                  <MessageSquare className="w-4 h-4" /> Pregunta Libre
                </button>
              </div>
            </div>

            <div className="flex-1 border border-slate-100 rounded-lg p-5 bg-slate-50/50 ai-content text-sm overflow-y-auto min-h-62.5 relative text-slate-700">
              {aiLoading && (
                <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                  <p className="text-slate-600 font-medium text-sm">Generando insights...</p>
                </div>
              )}
              {aiError && (
                <div className="mb-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
                  {aiError}
                </div>
              )}
              {aiEntry ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(aiEntry.html) }} />
              ) : (
                !aiError && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Bot className="w-12 h-12 mb-3 opacity-30 text-indigo-500" />
                    <p className="font-medium text-slate-500">Selecciona un enfoque y genera los insights.</p>
                    <p className="text-xs mt-1 text-center max-w-sm">
                      El motor procesará el contexto integral de la cuenta (tickets, llamadas, uso) con
                      protección Anti-Prompt Injection vía el servicio de IA Nexus (ai.vortex-it.com).
                    </p>
                  </div>
                )
              )}
            </div>
            {aiEntry && (
              <div className="text-xs text-slate-400 mt-3 text-right font-medium">
                Análisis sobre periodo: <span>{aiEntry.dateRange}</span>
                {aiEntry.generatedAt && (
                  <>
                    {' · '}Generado el <span>{formatGeneratedAt(aiEntry.generatedAt)}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {aiEntry && <PrintableReport cliente={cliente} aiEntry={aiEntry} />}

        {/* Columna derecha: Heatmap + Líderes */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
            <h3 className="font-semibold text-sm mb-4 text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              Interacciones (Último Año)
            </h3>
            <Heatmap cliente={cliente} />
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl flex-1">
            <h3 className="font-semibold text-sm mb-4 text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Users className="w-4 h-4 text-purple-500" />
              Líderes de Contexto
            </h3>
            <p className="text-[11px] text-slate-400 mb-3 leading-tight">
              Personas con mayor volumen de interacción en tickets, llamadas y actividades.
            </p>
            <ContextLeaders cliente={cliente} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
          <h3 className="font-semibold text-sm mb-4 text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <LayoutGrid className="w-4 h-4 text-blue-500" />
            Uso de Plataforma Modular
          </h3>
          {cliente.uso_plataforma ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Alumnos (Admon)
                </span>
                <span className="font-semibold text-slate-800">
                  {cliente.uso_plataforma.alumnos_inscritos_admon_actuales.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Pagos/Finanzas
                </span>
                <span className="font-semibold text-emerald-600">
                  {cliente.uso_plataforma.admin_finanzas_pagos.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Facturas
                </span>
                <span className="font-semibold text-blue-600">
                  {cliente.uso_plataforma.admin_finanzas_facturas.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Contenidos / Clases
                </span>
                <span className="font-semibold text-indigo-600">
                  {cliente.uso_plataforma.control_escolar_clases_contenidos_adicionales.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> CRM Prospectos
                </span>
                <span className="font-semibold text-orange-500">
                  {cliente.uso_plataforma.crm_prospectos_actuales.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs">
                <span className="text-slate-400">Nivel de Servicio:</span>
                <span className="font-bold text-slate-700">{cliente.nivel_servicio ?? '--'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin datos de uso disponibles.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
          <h3 className="font-semibold text-sm mb-4 text-slate-700 border-b border-slate-100 pb-2">
            Tickets por Estatus
          </h3>
          <div className="h-48">
            <CsDonutChart
              data={ticketsPorEstatus}
              colors={['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#64748b']}
            />
          </div>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
          <h3 className="font-semibold text-sm mb-4 text-slate-700 border-b border-slate-100 pb-2">
            Sentimiento en Llamadas
          </h3>
          <div className="h-48">
            <CsBarChart data={sentimientoLlamadas} colors={['#10b981', '#3b82f6', '#ef4444', '#cbd5e1']} />
          </div>
        </div>
      </div>

      {/* Desglose de tickets */}
      <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
        <h3 className="font-semibold text-sm mb-4 text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Inbox className="w-4 h-4 text-indigo-500" />
          Desglose Analítico de Tickets (Mesa y Tipo)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg font-semibold">Mesa / Equipo Actual</th>
                <th className="px-4 py-3 font-semibold">Tipo de Incidencia</th>
                <th className="px-4 py-3 text-center rounded-tr-lg font-semibold w-32">Volumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ticketBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400 text-sm">
                    No hay tickets registrados para desglosar.
                  </td>
                </tr>
              ) : (
                ticketBreakdown.map((item) => (
                  <tr key={`${item.mesa}::${item.tipo}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700">{item.mesa}</td>
                    <td className="px-4 py-3 text-slate-600">{item.tipo}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-md text-xs border border-indigo-100">
                        {item.count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
