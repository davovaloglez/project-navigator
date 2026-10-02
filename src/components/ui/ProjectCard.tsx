import { AlertCircle, DollarSign } from 'lucide-react';
import type { ProjectRecord } from '../../utils/dataTransforms';
import type { ProjectForecast } from '../../utils/forecastEngine';
import { riskMeta, probabilityMeta } from '../../utils/forecastEngine';
import { formatMoney } from '../../utils/costEngine';
import type { StaleInfo } from '../../utils/stale';
import { getEstatusColor, getSaludColor } from '../../utils/colors';
import StatusBadge from './StatusBadge';

interface Props {
  project: ProjectRecord;
  forecast?: ProjectForecast;
  stale?: StaleInfo;
  /** Mostrar el PM en la card (útil para roles scopeados que no tienen filtro PM). */
  showPm?: boolean;
  /** Costo mensual estimado del proyecto. Sólo se pasa si el rol tiene acceso a costos (data:costos). */
  monthlyCost?: number;
}

export default function ProjectCard({ project, forecast, stale, showPm, monthlyCost }: Props) {
  const isStale = stale?.state === 'stale';
  const estatusColor = getEstatusColor(project.estatus);
  const saludColor = getSaludColor(project.salud);
  const progressPct = Math.round(project.progreso * 100);
  const progressColor =
    progressPct >= 80 ? 'bg-green-500' : progressPct >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  const showForecast =
    forecast &&
    forecast.risk !== 'done' &&
    forecast.risk !== 'insufficient-data';
  const risk = showForecast ? riskMeta(forecast.risk) : null;
  const prob = showForecast ? probabilityMeta(forecast.onTimeProbability) : null;
  const slippage = showForecast ? forecast.slippageDays : null;

  return (
    <a
      href={`/proyecto/${project.id}`}
      className="block bg-slate-800 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/50 transition-colors group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 font-mono">{project.folio}</p>
          <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
            {project.actividad}
          </h4>
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
          <StatusBadge label={project.estatus} {...estatusColor} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500">Progreso</span>
          <span className="text-xs font-medium text-slate-300">{progressPct}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div
            className={`${progressColor} h-1.5 rounded-full transition-all duration-500`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400">
        {showPm && project.pm && project.pm !== '-' && (
          <>
            <span title="PM" className="text-slate-300">PM: {project.pm}</span>
            <span className="text-slate-600">|</span>
          </>
        )}
        <span title="Arquitecto">{project.arquitecto}</span>
        {project.cuatrimestre && (
          <>
            <span className="text-slate-600">|</span>
            <span title="Q de entrega">{project.cuatrimestre}</span>
          </>
        )}
        {project.puntos > 0 && (
          <>
            <span className="text-slate-600">|</span>
            <span title="Puntos">{project.puntos} pts</span>
          </>
        )}
        {monthlyCost != null && monthlyCost > 0 && (
          <>
            <span className="text-slate-600">|</span>
            <span
              className="inline-flex items-center gap-0.5 text-emerald-300"
              title="Costo mensual estimado (prorrateado por equipo)"
            >
              <DollarSign className="w-3 h-3" />
              {formatMoney(monthlyCost)}/mes
            </span>
          </>
        )}
        <span className="ml-auto">
          <StatusBadge label={project.salud} bg={saludColor.bg} text={saludColor.text} />
        </span>
      </div>

      {/* DEVs */}
      {project.devs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.devs.slice(0, 4).map((dev) => (
            <span key={dev} className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-400">
              {dev}
            </span>
          ))}
          {project.devs.length > 4 && (
            <span className="px-1.5 py-0.5 text-[10px] text-slate-500">+{project.devs.length - 4}</span>
          )}
        </div>
      )}

      {/* Forecast chip */}
      {showForecast && risk && prob && (
        <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center gap-2 flex-wrap text-[10px]">
          <span
            className={`inline-flex px-1.5 py-0.5 rounded font-medium border ${risk.bg} ${risk.color} ${risk.border}`}
            title="Riesgo del pronóstico"
          >
            {risk.label}
          </span>
          {slippage !== null && slippage !== 0 && (
            <span
              className={`font-semibold ${slippage > 14 ? 'text-red-400' : slippage > 3 ? 'text-amber-400' : slippage < -3 ? 'text-blue-400' : 'text-green-400'}`}
              title="Desvío vs fin estimado"
            >
              {slippage > 0 ? '+' : ''}
              {slippage}d
            </span>
          )}
          {forecast?.onTimeProbability !== null && forecast?.onTimeProbability !== undefined && (
            <span className={`${prob.color} font-medium`} title="Probabilidad de cumplir fin estimado">
              {prob.label} a tiempo
            </span>
          )}
        </div>
      )}
    </a>
  );
}
