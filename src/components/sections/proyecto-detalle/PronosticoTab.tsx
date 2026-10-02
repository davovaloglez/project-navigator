import { useMemo } from 'react';
import { TrendingUp, ArrowRight, AlertTriangle, Calendar, Target, Gauge } from 'lucide-react';
import type { ProjectRecord, TareaRecord } from '../../../utils/dataTransforms';
import { forecastProjects, riskMeta, confidenceMeta } from '../../../utils/forecastEngine';
import PageLink from '../../auth/PageLink';
import GlossaryTooltip from '../../ui/GlossaryTooltip';

interface Props {
  project: ProjectRecord;
  allProjects: ProjectRecord[];
  allTareas: TareaRecord[];
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PronosticoTab({ project, allProjects, allTareas }: Props) {
  const forecast = useMemo(() => {
    const { forecasts } = forecastProjects(allProjects, allTareas);
    return forecasts.find((f) => f.project.id === project.id) ?? null;
  }, [allProjects, allTareas, project.id]);

  const linkBtn = (
    <PageLink
      pageKey="pronosticos"
      href={`/pronosticos/${project.id}`}
      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/15 text-purple-300 rounded-lg text-sm hover:bg-purple-500/25 transition-colors"
      deniedClassName="hidden"
    >
      <TrendingUp className="w-4 h-4" /> Ver pronóstico completo <ArrowRight className="w-3.5 h-3.5" />
    </PageLink>
  );

  if (!forecast || forecast.risk === 'insufficient-data') {
    return (
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-8 text-center">
        <p className="text-sm text-slate-400 mb-1">Sin pronóstico disponible para este proyecto.</p>
        <p className="text-xs text-slate-500 mb-4">Se necesita historial de actividades cerradas para proyectar una fecha.</p>
        {linkBtn}
      </div>
    );
  }

  const rm = riskMeta(forecast.risk);
  const cm = confidenceMeta(forecast.confidence);
  const slip = forecast.slippageDays;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Resumen del Pronóstico</h3>
          <GlossaryTooltip id="proyecto-pronostico" />
        </div>
        {linkBtn}
      </div>

      {/* Risk banner */}
      <div className={`rounded-xl p-4 border ${rm.bg} ${rm.border}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${rm.color}`}>{rm.label}</span>
          <span className="text-xs text-slate-400">· confianza</span>
          <span className={`text-xs font-semibold ${cm.color}`}>{cm.label}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><Calendar className="w-4 h-4 text-blue-400" /><span className="text-[10px] text-slate-500 uppercase tracking-wider">Fecha pronóstico</span></div>
          <p className="text-base font-bold text-white">{fmtDate(forecast.forecastDate)}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-4 h-4 text-amber-400" /><span className="text-[10px] text-slate-500 uppercase tracking-wider">Desvío vs plan</span></div>
          <p className={`text-base font-bold ${slip != null && slip > 0 ? 'text-red-400' : slip != null && slip < 0 ? 'text-green-400' : 'text-white'}`}>
            {slip == null ? '—' : `${slip > 0 ? '+' : ''}${slip}d`}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><Target className="w-4 h-4 text-cyan-400" /><span className="text-[10px] text-slate-500 uppercase tracking-wider">Prob. a tiempo</span></div>
          <p className="text-base font-bold text-white">{forecast.onTimeProbability == null ? '—' : `${Math.round(forecast.onTimeProbability * 100)}%`}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><Gauge className="w-4 h-4 text-purple-400" /><span className="text-[10px] text-slate-500 uppercase tracking-wider">Progreso esp.</span></div>
          <p className="text-base font-bold text-white">
            {Math.round(forecast.actualProgress * 100)}%
            {forecast.expectedProgress != null && <span className="text-xs text-slate-500 font-normal"> / {Math.round(forecast.expectedProgress * 100)}%</span>}
          </p>
        </div>
      </div>

      {/* Escenarios */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Escenarios</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-slate-500">Optimista</p>
            <p className="text-sm font-semibold text-green-400">{fmtDate(forecast.optimisticDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Más probable</p>
            <p className="text-sm font-semibold text-slate-200">{fmtDate(forecast.forecastDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Pesimista</p>
            <p className="text-sm font-semibold text-red-400">{fmtDate(forecast.pessimisticDate)}</p>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {forecast.warnings.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Factores</p>
          <ul className="space-y-1.5">
            {forecast.warnings.slice(0, 5).map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
