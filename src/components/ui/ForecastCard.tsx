import { ArrowRight, AlertCircle } from 'lucide-react';
import type { ProjectForecast } from '../../utils/forecastEngine';
import { riskMeta, confidenceMeta, probabilityMeta } from '../../utils/forecastEngine';
import type { StaleInfo } from '../../utils/stale';
interface Props {
  forecast: ProjectForecast;
  stale?: StaleInfo;
}

function formatDate(iso: string | null | undefined): string {
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
  return { label: `${days}d`, color: days < -3 ? 'text-blue-400' : 'text-green-400' };
}

export default function ForecastCard({ forecast: f, stale }: Props) {
  const r = riskMeta(f.risk);
  const c = confidenceMeta(f.confidence);
  const prob = probabilityMeta(f.onTimeProbability);
  const slip = formatSlippage(f.slippageDays);
  const actualPct = Math.round(f.actualProgress * 100);
  const expectedPct = f.expectedProgress !== null ? Math.round(f.expectedProgress * 100) : null;
  const gap = expectedPct !== null ? expectedPct - actualPct : null;
  const isStale = stale?.state === 'stale';

  return (
    <a
      href={`/pronosticos/${f.project.id}`}
      className={`block bg-slate-800 border rounded-xl p-4 hover:bg-slate-700/50 transition-colors group ${r.border}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors" title={f.project.actividad}>
            {f.project.actividad}
          </h4>
          {f.project.hito && (
            <p className="text-[11px] text-slate-500 truncate">{f.project.hito}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isStale && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
              title={stale!.reason}
            >
              <AlertCircle className="w-2.5 h-2.5" /> Stale
            </span>
          )}
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${r.bg} ${r.color} ${r.border}`}>
            {r.label}
          </span>
        </div>
      </div>

      {/* Progress bar: actual vs expected */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500">Progreso</span>
          <span className="text-slate-300 font-medium">
            {actualPct}%
            {expectedPct !== null && (
              <span className="text-slate-500 font-normal"> · esp. {expectedPct}%</span>
            )}
          </span>
        </div>
        <div className="relative w-full bg-slate-700 rounded-full h-1.5">
          <div
            className={`absolute left-0 top-0 h-1.5 rounded-full transition-all duration-500 ${
              gap !== null && gap > 20 ? 'bg-red-500' : gap !== null && gap > 10 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${actualPct}%` }}
          />
          {expectedPct !== null && (
            <div
              className="absolute top-0 h-1.5 w-0.5 bg-slate-300 opacity-70"
              style={{ left: `${expectedPct}%` }}
              title={`Esperado ${expectedPct}%`}
            />
          )}
        </div>
      </div>

      {/* Dates block */}
      <div className="bg-slate-900/40 rounded-lg p-3 mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Fin estimado</span>
          <span className="text-slate-300">{formatDate(f.project.finEstimado)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Pronóstico</span>
          <span className="font-semibold text-white">
            {formatDate(f.forecastDate)}{' '}
            <span className={`font-bold ${slip.color}`} title="Desvío vs fin estimado (días)">
              {slip.label}
            </span>
          </span>
        </div>
        {f.onTimeProbability !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Prob. a tiempo</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${prob.color} ${prob.bg}`}
              title="Probabilidad de cumplir fin estimado dada la variabilidad histórica del equipo"
            >
              {prob.label}
            </span>
          </div>
        )}
        {f.optimisticDate && f.pessimisticDate && (
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-700/50">
            <span className="text-slate-500">Banda</span>
            <span className="text-slate-500">
              {formatDate(f.optimisticDate)} – {formatDate(f.pessimisticDate)}
            </span>
          </div>
        )}
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">
            Confianza: <span className={`font-medium ${c.color}`}>{c.label}</span>
          </span>
          {f.warnings[0] && (
            <span className="text-slate-500 truncate" title={f.warnings.join(' · ')}>
              · {f.warnings[0]}
            </span>
          )}
        </div>
        <span className="text-slate-500 group-hover:text-blue-300 flex items-center gap-1 transition-colors shrink-0">
          Detalle <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </a>
  );
}
