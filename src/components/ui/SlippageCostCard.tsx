import { DollarSign, TrendingDown } from 'lucide-react';
import type { SlippageCostImpact } from '../../utils/forecastEngine';
import { formatMoney, formatMoneyFull } from '../../utils/costEngine';
interface Props {
  impact: SlippageCostImpact;
}

export default function SlippageCostCard({ impact }: Props) {
  if (impact.sampleSize === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-medium text-slate-300">Costo proyectado de desvíos</h3>
        </div>
        <p className="text-sm text-slate-400">
          Ningún proyecto proyectado con desvío positivo — o sin datos de costo suficientes.
        </p>
      </div>
    );
  }

  const top = impact.items.slice(0, 5);

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-medium text-slate-300">Costo proyectado de desvíos</h3>
        </div>
        <span className="text-[11px] text-slate-500">
          {impact.sampleSize} proyecto{impact.sampleSize !== 1 ? 's' : ''} con desvío
        </span>
      </div>

      {/* Headline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Costo adicional total</p>
          <p className="text-2xl font-bold text-red-400" title={formatMoneyFull(impact.total)}>
            {formatMoney(impact.total)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">operativo por deslizamientos</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Portafolio mensual</p>
          <p className="text-2xl font-bold text-slate-200" title={formatMoneyFull(impact.portfolioMonthly)}>
            {formatMoney(impact.portfolioMonthly)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">costo mensual afectado</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">% del mensual</p>
          <p className="text-2xl font-bold text-amber-400">
            {impact.portfolioMonthly > 0
              ? Math.round((impact.total / impact.portfolioMonthly) * 100)
              : 0}
            %
          </p>
          <p className="text-[11px] text-slate-500 mt-1">equivalente en meses de operación</p>
        </div>
      </div>

      {/* Top offenders */}
      {top.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3" /> Top proyectos por impacto
          </p>
          <ul className="divide-y divide-slate-700/50">
            {top.map((item) => (
              <li key={item.forecast.project.id} className="py-2">
                <a
                  href={`/pronosticos/${item.forecast.project.id}`}
                  className="flex items-center gap-3 hover:bg-slate-700/20 transition-colors rounded px-2 -mx-2 py-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate" title={item.forecast.project.actividad}>
                      {item.forecast.project.actividad}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      +{item.slippageDays}d · {formatMoney(item.monthlyCost)}/mes
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-400 shrink-0" title={formatMoneyFull(item.additionalCost)}>
                    {formatMoney(item.additionalCost)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {impact.uncoveredProjects > 0 && (
        <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
          {impact.uncoveredProjects} proyecto{impact.uncoveredProjects !== 1 ? 's' : ''} con desvío pero sin datos de costo completos — no incluidos en el total.
        </p>
      )}
    </div>
  );
}
