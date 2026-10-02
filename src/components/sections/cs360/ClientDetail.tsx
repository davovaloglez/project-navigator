import { useMemo, useState } from 'react';
import {
  PieChart,
  Activity,
  Ticket,
  PhoneCall,
  ClipboardCheck,
  ExternalLink,
  Globe,
  Calendar,
  Users,
  Star,
  AlarmClock,
  BarChart2,
  Sparkles,
  Calculator,
  X,
} from 'lucide-react';
import type { CsCliente, CsScoreResult, CsAiEntry } from '../../../utils/cs360';
import { diasParaRenovacion, esVital } from '../../../utils/cs360';
import ResumenTab from './ResumenTab';
import ActividadesTab from './ActividadesTab';
import TicketsTab from './TicketsTab';
import LlamadasTab from './LlamadasTab';
import AuditoriaTab from './AuditoriaTab';

interface Props {
  cliente: CsCliente;
  baseScore: CsScoreResult;
  aiEntry: CsAiEntry | null;
  onAiResult: (entry: CsAiEntry) => void;
}

type TabId = 'resumen' | 'actividades' | 'tickets' | 'llamadas' | 'auditoria';

const TABS: Array<{ id: TabId; label: string; icon: typeof PieChart }> = [
  { id: 'resumen', label: 'Resumen 360', icon: PieChart },
  { id: 'actividades', label: 'Actividades', icon: Activity },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'llamadas', label: 'Llamadas', icon: PhoneCall },
  { id: 'auditoria', label: 'Guías/Auditoría', icon: ClipboardCheck },
];

function scoreBadgeClasses(score: number): string {
  if (score < 50) return 'bg-red-50 text-red-700 border-red-200';
  if (score < 75) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export default function ClientDetail({ cliente, baseScore, aiEntry, onAiResult }: Props) {
  const [tab, setTab] = useState<TabId>('resumen');
  const [scoreModalOpen, setScoreModalOpen] = useState(false);

  const score = aiEntry?.score ?? baseScore.total;
  const vital = esVital(cliente);
  const diasRenovacion = diasParaRenovacion(cliente);

  const scoreDetails = useMemo(() => {
    let details = baseScore.log;
    if (aiEntry) {
      details += `\n\n=== REEVALUACIÓN POR IA ===\nAnalizando contexto (sentimientos en tickets, llamadas y actividades), la IA ha decidido ajustar el Score final a: ${aiEntry.score} pts.`;
    }
    return details;
  }, [baseScore, aiEntry]);

  const renewalBadge = useMemo(() => {
    if (diasRenovacion === null) return null;
    if (diasRenovacion < 0) {
      return { text: `Vencido (${cliente.fecha_vigencia})`, cls: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (diasRenovacion <= 60) {
      return {
        text: `Renovación Próxima (${cliente.fecha_vigencia})`,
        cls: 'bg-amber-100 text-amber-700 border-amber-200',
      };
    }
    return null;
  }, [diasRenovacion, cliente.fecha_vigencia]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Client Header */}
      <div className="bg-white border-b border-slate-200 p-4 sm:p-6 shrink-0 relative">
        {/* Score badge: en móvil fluye arriba del nombre a ancho completo; en sm+ queda fijo a la derecha */}
        <div className="flex flex-col items-end gap-1.5 w-full mb-4 sm:absolute sm:top-6 sm:right-6 sm:w-40 sm:mb-0 z-10">
          <div
            className={`w-full text-center px-4 py-2 rounded-xl font-bold shadow-sm border transition-colors flex flex-col items-center justify-center ${scoreBadgeClasses(score)}`}
          >
            <span className="text-[10px] uppercase tracking-wider opacity-80 mb-0.5">Health Score</span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl leading-none">{score}</span>
              {aiEntry && <Sparkles className="w-4 h-4" />}
            </div>
          </div>
          <button
            onClick={() => setScoreModalOpen(true)}
            className="text-[11px] text-slate-400 hover:text-blue-600 transition-colors w-full text-right font-medium"
          >
            Ver desglose del cálculo
          </button>
        </div>

        <div className="flex items-start gap-4 mb-4 sm:pr-44">
          <div className="w-14 h-14 bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl text-white flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
            {(cliente.nombre || cliente.alias || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{cliente.nombre || cliente.alias}</h2>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200 flex items-center gap-1">
                <BarChart2 className="w-3 h-3" /> Rank: {cliente.kpi_financiero?.ranking ?? 'N/A'}
              </span>
              {vital && (
                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200 inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> Top 20%
                </span>
              )}
              {renewalBadge && (
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-full border inline-flex items-center gap-1 ${renewalBadge.cls}`}
                >
                  <AlarmClock className="w-3 h-3" /> {renewalBadge.text}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-2">
              {cliente.url && (
                <a
                  href={cliente.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> CRM
                </a>
              )}
              {cliente.url_academic && (
                <a
                  href={cliente.url_academic}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  {cliente.url_academic.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className="flex items-center gap-1" title="Renovación">
                <Calendar className="w-4 h-4" /> Vence: <strong>{cliente.fecha_vigencia ?? '--/--/--'}</strong>
              </span>
              <span className="flex items-center gap-1" title="Alumnos Vigentes">
                <Users className="w-4 h-4" /> {cliente.alumnos_vigentes} alumnos
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 sm:gap-6 mt-4 sm:mt-6 border-b border-slate-200 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 flex items-center gap-2 text-sm whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        {tab === 'resumen' && (
          <ResumenTab cliente={cliente} baseScore={baseScore} aiEntry={aiEntry} onAiResult={onAiResult} />
        )}
        {tab === 'actividades' && <ActividadesTab actividades={cliente.actividades} />}
        {tab === 'tickets' && <TicketsTab tickets={cliente.tickets} />}
        {tab === 'llamadas' && <LlamadasTab llamadas={cliente.llamadas} />}
        {tab === 'auditoria' && <AuditoriaTab cliente={cliente} />}
      </div>

      {/* Modal: desglose del score */}
      {scoreModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-800/60 flex items-center justify-center p-4"
          onClick={() => setScoreModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" /> Desglose del Health Score
              </h3>
              <button
                onClick={() => setScoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <pre className="text-sm text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                {scoreDetails}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setScoreModalOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl font-medium transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
