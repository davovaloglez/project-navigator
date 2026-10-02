import { Gauge } from 'lucide-react';
import type { CapacityHorizon } from '../../utils/forecastEngine';
import { capacityStatusMeta } from '../../utils/forecastEngine';

interface Props {
  horizon: CapacityHorizon;
}

export default function CapacityHorizonCard({ horizon: h }: Props) {
  const meta = capacityStatusMeta(h.status);
  const utilizationPct = Math.round(h.utilization * 100);
  const overflow = Math.max(0, utilizationPct - 100);
  const filledPct = Math.min(100, utilizationPct);

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-medium text-white">Próximas {h.weeks} semanas</h4>
        </div>
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${meta.bg} ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      {/* Utilization bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500">Utilización estimada</span>
          <span className={`font-semibold ${meta.color}`}>{utilizationPct}%</span>
        </div>
        <div className="relative w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-2 ${meta.barColor} transition-all duration-500`}
            style={{ width: `${filledPct}%` }}
          />
          {overflow > 0 && (
            <div
              className="absolute top-0 h-2 bg-red-500/60 animate-pulse"
              style={{ left: '100%', width: '0%' }}
            />
          )}
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Capacidad</p>
          <p className="text-lg font-bold text-white">{h.supplyPoints}</p>
          <p className="text-[10px] text-slate-500">pts esperados</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Demanda</p>
          <p className={`text-lg font-bold ${h.demandPoints > h.supplyPoints ? 'text-red-400' : 'text-slate-200'}`}>
            {h.demandPoints}
          </p>
          <p className="text-[10px] text-slate-500">pts requeridos</p>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
        {h.status === 'overloaded'
          ? 'Más carga de la que el equipo puede absorber al ritmo actual.'
          : h.status === 'saturated'
            ? 'Carga al límite. Sin margen para imprevistos.'
            : h.status === 'healthy'
              ? 'Ritmo sostenible con margen razonable.'
              : 'Hay holgura para tomar nuevos compromisos.'}
      </p>
    </div>
  );
}
