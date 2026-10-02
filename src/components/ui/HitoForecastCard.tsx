import { Flag, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { HitoForecast } from '../../utils/forecastEngine';
import { riskMeta } from '../../utils/forecastEngine';

interface Props {
  hito: HitoForecast;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatSlippage(days: number | null): { label: string; color: string } {
  if (days === null) return { label: '—', color: 'text-slate-500' };
  if (days === 0) return { label: 'En fecha', color: 'text-green-400' };
  if (days > 0) {
    const color = days > 14 ? 'text-red-400' : days > 3 ? 'text-amber-400' : 'text-green-400';
    return { label: `+${days}d`, color };
  }
  return { label: `${days}d`, color: 'text-blue-400' };
}

export default function HitoForecastCard({ hito: h }: Props) {
  const r = riskMeta(h.worstRisk);
  const slip = formatSlippage(h.aggregateSlippage);
  const avgPct = Math.round(h.avgProgress * 100);
  const completionPct = h.count > 0 ? Math.round((h.doneCount / h.count) * 100) : 0;

  return (
    <div className={`bg-slate-800 border rounded-xl p-4 ${r.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Flag className="w-4 h-4 text-slate-400 shrink-0" />
          <h4 className="text-sm font-medium text-white truncate" title={h.hito}>
            {h.hito}
          </h4>
        </div>
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${r.bg} ${r.color} ${r.border}`}>
          {r.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500">Progreso promedio</span>
          <span className="text-slate-300 font-medium">{avgPct}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${avgPct}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="bg-slate-900/40 rounded-lg p-3 mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Último plan</span>
          <span className="text-slate-300">{formatDate(h.latestPlanned)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Cierre proyectado</span>
          <span className="font-semibold text-white">
            {formatDate(h.latestForecast)}{' '}
            <span className={`font-bold ${slip.color}`}>{slip.label}</span>
          </span>
        </div>
      </div>

      {/* Distribution */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-slate-500">
          <span className="text-slate-200 font-semibold">{h.count}</span> proyectos
        </span>
        {h.doneCount > 0 && (
          <span className="flex items-center gap-1 text-green-400" title="Completados">
            <CheckCircle2 className="w-3 h-3" /> {h.doneCount}
          </span>
        )}
        {h.onTrackCount > 0 && (
          <span className="flex items-center gap-1 text-green-400" title="En tiempo">
            {h.onTrackCount}
          </span>
        )}
        {h.slippingCount > 0 && (
          <span className="flex items-center gap-1 text-amber-400" title="Deslizando">
            <Clock className="w-3 h-3" /> {h.slippingCount}
          </span>
        )}
        {h.atRiskCount > 0 && (
          <span className="flex items-center gap-1 text-red-400" title="En riesgo">
            <AlertTriangle className="w-3 h-3" /> {h.atRiskCount}
          </span>
        )}
        <span className="ml-auto text-slate-500">{completionPct}% cerrado</span>
      </div>
    </div>
  );
}
