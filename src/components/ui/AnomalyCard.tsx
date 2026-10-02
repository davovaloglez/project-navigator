import { TrendingDown, PauseCircle, TrendingUp } from 'lucide-react';
import type { ProjectAnomaly } from '../../utils/anomalies';
import { anomalyMeta } from '../../utils/anomalies';
interface Props {
  anomaly: ProjectAnomaly;
}

export default function AnomalyCard({ anomaly: a }: Props) {
  const m = anomalyMeta(a.kind);
  const Icon = a.kind === 'stall' ? PauseCircle : a.kind === 'slowdown' ? TrendingDown : TrendingUp;

  return (
    <a
      href={`/pronosticos/${a.project.id}`}
      className={`block bg-slate-800 border rounded-xl p-4 hover:bg-slate-700/50 transition-colors group ${m.border}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${m.bg}`}>
          <Icon className={`w-4 h-4 ${m.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors" title={a.project.actividad}>
              {a.project.actividad}
            </h4>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${m.bg} ${m.color} shrink-0`}>
              {m.label}
            </span>
          </div>
          <p className="text-[12px] text-slate-400 leading-relaxed mb-2">{a.reason}</p>
          <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-700/50">
            <div>
              <p className="text-slate-500">Ritmo reciente</p>
              <p className={`font-semibold ${a.kind === 'acceleration' ? 'text-green-400' : 'text-slate-200'}`}>
                {a.recentRatePerWeek.toFixed(1)} pp/sem
              </p>
            </div>
            <div>
              <p className="text-slate-500">Línea base</p>
              <p className="font-semibold text-slate-200">{a.baselineRatePerWeek.toFixed(1)} pp/sem</p>
            </div>
            <div>
              <p className="text-slate-500">Ratio</p>
              <p className={`font-semibold ${m.color}`}>{Math.round(a.ratio * 100)}%</p>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
