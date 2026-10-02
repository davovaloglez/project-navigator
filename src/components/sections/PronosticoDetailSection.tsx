import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { WeeklySnapshot } from '../../utils/snapshots';
import {
  Calendar,
  TrendingUp,
  Target,
  Gauge,
  History,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Flag,
  Clock,
  Sliders,
} from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord, TareaRecord, CostoRecord } from '../../utils/dataTransforms';
import { estimateProjectCost, formatMoney, formatMoneyFull } from '../../utils/costEngine';
import {
  forecastProject,
  computeTeamVelocity,
  computePortfolioBaseline,
  riskMeta,
  confidenceMeta,
  probabilityMeta,
} from '../../utils/forecastEngine';
import { loadSnapshots } from '../../utils/snapshots';
import { computeStaleness } from '../../utils/stale';
import Breadcrumbs from '../ui/Breadcrumbs';
import GlossaryTooltip from '../ui/GlossaryTooltip';

interface Props {
  id: string;
}

const DAY_MS = 86400000;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

interface RiskFactor {
  label: string;
  detail: string;
  tone: 'positive' | 'neutral' | 'warn' | 'bad';
}

export default function PronosticoDetailSection({ id }: Props) {
  const projectsQ = useSheetData<ProjectRecord>('/api/proyectos');
  const tareasQ = useSheetData<TareaRecord>('/api/tareas');
  const costosQ = useSheetData<CostoRecord>('/api/costos');
  const [snapshots, setSnapshots] = useState<WeeklySnapshot[]>([]);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const project = useMemo(
    () => projectsQ.data.find((p) => p.id === id) || null,
    [projectsQ.data, id]
  );

  const velocity = useMemo(() => computeTeamVelocity(tareasQ.data), [tareasQ.data]);
  const baseline = useMemo(() => computePortfolioBaseline(projectsQ.data), [projectsQ.data]);
  const forecast = useMemo(
    () => (project ? forecastProject(project, velocity) : null),
    [project, velocity]
  );
  const staleInfo = useMemo(() => {
    if (!project) return null;
    return computeStaleness([project], snapshots).get(project.id) || null;
  }, [project, snapshots]);
  const projectCost = useMemo(() => {
    if (!project) return { estimatedMonthlyCost: 0, breakdown: [], teamSize: 0 };
    return estimateProjectCost(project, projectsQ.data, costosQ.data);
  }, [project, projectsQ.data, costosQ.data]);

  const factors = useMemo<RiskFactor[]>(() => {
    if (!forecast || !project) return [];
    const out: RiskFactor[] = [];

    // Progress gap
    if (forecast.expectedProgress !== null) {
      const actual = Math.round(forecast.actualProgress * 100);
      const expected = Math.round(forecast.expectedProgress * 100);
      const gap = expected - actual;
      if (gap > 30) {
        out.push({
          label: 'Gap de progreso severo',
          detail: `Actual ${actual}% vs esperado ${expected}% (gap ${gap}pp). Escala automáticamente el riesgo a "en riesgo".`,
          tone: 'bad',
        });
      } else if (gap > 10) {
        out.push({
          label: 'Gap de progreso moderado',
          detail: `Actual ${actual}% vs esperado ${expected}% (gap ${gap}pp).`,
          tone: 'warn',
        });
      } else if (gap < -10) {
        out.push({
          label: 'Progreso adelantado',
          detail: `Actual ${actual}% supera al esperado ${expected}% por ${Math.abs(gap)}pp.`,
          tone: 'positive',
        });
      } else {
        out.push({
          label: 'Progreso alineado al plan',
          detail: `Actual ${actual}%, esperado ${expected}%.`,
          tone: 'positive',
        });
      }
    }

    // Slippage
    if (forecast.slippageDays !== null) {
      if (forecast.slippageDays > 14) {
        out.push({
          label: 'Desvío significativo',
          detail: `Pronóstico llega ${forecast.slippageDays} días después de fin estimado (umbral en riesgo: >14d).`,
          tone: 'bad',
        });
      } else if (forecast.slippageDays > 3) {
        out.push({
          label: 'Desvío moderado',
          detail: `Pronóstico llega ${forecast.slippageDays} días después de fin estimado (umbral deslizando: 4–14d).`,
          tone: 'warn',
        });
      } else if (forecast.slippageDays < -3) {
        out.push({
          label: 'Entrega anticipada proyectada',
          detail: `Pronóstico ${Math.abs(forecast.slippageDays)} días antes de fin estimado.`,
          tone: 'positive',
        });
      } else {
        out.push({
          label: 'Desvío despreciable',
          detail: `Pronóstico a ±3 días del fin estimado.`,
          tone: 'positive',
        });
      }
    }

    // Confidence context
    if (velocity.weeks > 0) {
      const cvPct = Math.round(velocity.cv * 100);
      out.push({
        label: `Variabilidad del equipo: ${cvPct}%`,
        detail: `CV del throughput semanal en ${velocity.weeks} semanas. Usado para el ancho de la banda optimista–pesimista.`,
        tone: velocity.cv < 0.3 ? 'positive' : velocity.cv < 0.6 ? 'neutral' : 'warn',
      });
    } else {
      out.push({
        label: 'Sin historial de velocity',
        detail: 'Aún no hay semanas con tareas completadas — la banda usa un ancho por defecto.',
        tone: 'warn',
      });
    }

    // Warnings from engine
    for (const w of forecast.warnings) {
      out.push({ label: 'Aviso del motor', detail: w, tone: 'warn' });
    }

    // Stalled
    if (forecast.risk === 'stalled') {
      out.push({
        label: 'Proyecto sin avance',
        detail: 'Ya inició pero el progreso registrado es 0 — no se puede extrapolar una tasa.',
        tone: 'bad',
      });
    }

    // Stale data
    if (staleInfo?.state === 'stale') {
      out.push({
        label: 'Datos potencialmente obsoletos',
        detail: `${staleInfo.reason}. La extrapolación asume que el progreso registrado es actual — si no se ha actualizado, el pronóstico se alarga artificialmente.`,
        tone: 'warn',
      });
    }

    return out;
  }, [forecast, project, velocity, staleInfo]);

  if (projectsQ.loading || tareasQ.loading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Pronósticos', href: '/pronosticos' }, { label: project?.actividad || id }]} />
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-32" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-60 lg:col-span-2" />
            <div className="bg-slate-800 rounded-xl p-6 animate-pulse h-60" />
          </div>
        </div>
      </div>
    );
  }

  if (projectsQ.error || !project || !forecast) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Pronósticos', href: '/pronosticos' }, { label: project?.actividad || id }]} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <p className="text-red-400 font-medium mb-2">
            {projectsQ.error ? 'Error al cargar datos' : 'Proyecto no encontrado'}
          </p>
          <p className="text-sm text-slate-400">
            {projectsQ.error || `No se encontró el proyecto ${id}`}
          </p>
        </div>
      </div>
    );
  }

  const r = riskMeta(forecast.risk);
  const c = confidenceMeta(forecast.confidence);
  const prob = probabilityMeta(forecast.onTimeProbability);
  const actualPct = Math.round(forecast.actualProgress * 100);
  const expectedPct = forecast.expectedProgress !== null ? Math.round(forecast.expectedProgress * 100) : null;

  const todayIso = new Date().toISOString().split('T')[0];
  const startIso = project.fechaInicio || project.registro;
  const timeline = buildTimelineRange({
    start: startIso,
    today: todayIso,
    planned: project.finEstimado,
    forecast: forecast.forecastDate,
    optimistic: forecast.optimisticDate,
    pessimistic: forecast.pessimisticDate,
  });

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Pronósticos', href: '/pronosticos' },
          { label: project.actividad },
        ]}
      />

      {/* Hero */}
      <div className={`bg-slate-800 border rounded-xl p-6 mb-4 ${r.border}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{project.actividad}</h1>
              <GlossaryTooltip id="pronosticos-detalle-hero" />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium border ${r.bg} ${r.color} ${r.border}`}>
                {r.label}
              </span>
              {forecast.onTimeProbability !== null && (
                <span
                  className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${prob.color} ${prob.bg}`}
                  title="Probabilidad de cumplir fin estimado"
                >
                  {prob.label} a tiempo
                </span>
              )}
              <span className="text-xs text-slate-500">
                Confianza: <span className={`font-medium ${c.color}`}>{c.label}</span>
              </span>
              {project.hito && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> {project.hito}
                </span>
              )}
              {project.pm && <span className="text-xs text-slate-500">PM: {project.pm}</span>}
            </div>
          </div>
          <a
            href={`/proyecto/${project.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 text-blue-400 rounded-lg text-sm hover:bg-blue-500/25 transition-colors shrink-0"
          >
            <ExternalLink className="w-4 h-4" /> Ver proyecto
          </a>
        </div>
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricTile
          icon={Target}
          iconColor="text-cyan-400"
          label="Progreso actual"
          value={`${actualPct}%`}
          sub={expectedPct !== null ? `esperado ${expectedPct}%` : undefined}
          infoId="pronosticos-detalle-progreso-actual"
        />
        <MetricTile
          icon={Calendar}
          iconColor="text-slate-400"
          label="Fin estimado"
          value={formatDate(project.finEstimado)}
          infoId="pronosticos-detalle-fin-estimado"
        />
        <MetricTile
          icon={TrendingUp}
          iconColor="text-blue-400"
          label="Fecha pronóstico"
          value={formatDate(forecast.forecastDate)}
          infoId="pronosticos-detalle-fecha-pronostico"
        />
        <MetricTile
          icon={Clock}
          iconColor={
            forecast.slippageDays === null
              ? 'text-slate-400'
              : forecast.slippageDays > 14
                ? 'text-red-400'
                : forecast.slippageDays > 3
                  ? 'text-amber-400'
                  : 'text-green-400'
          }
          label="Desvío vs plan"
          infoId="pronosticos-detalle-desvio"
          value={
            forecast.slippageDays === null
              ? '—'
              : `${forecast.slippageDays > 0 ? '+' : ''}${forecast.slippageDays}d`
          }
          sub={
            forecast.slippageDays !== null
              ? forecast.slippageDays > 0
                ? 'entrega más tarde'
                : forecast.slippageDays < 0
                  ? 'entrega más temprano'
                  : 'en fecha'
              : undefined
          }
        />
      </div>

      {/* Timeline */}
      {timeline && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Línea de tiempo
            <GlossaryTooltip id="pronosticos-detalle-timeline" />
          </h3>
          <TimelineBar timeline={timeline} />
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-block w-4 h-2 rounded bg-blue-500/20" />
            Banda optimista–pesimista del pronóstico
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Risk factors */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Factores del pronóstico
            <GlossaryTooltip id="pronosticos-detalle-factores" />
          </h3>
          {factors.length === 0 ? (
            <p className="text-sm text-slate-500">Sin factores relevantes para este proyecto.</p>
          ) : (
            <ul className="space-y-3">
              {factors.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <FactorIcon tone={f.tone} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200">{f.label}</p>
                    <p className="text-[12px] text-slate-500">{f.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Forecast band */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-400" />
            Escenarios
            <GlossaryTooltip id="pronosticos-detalle-escenarios" />
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Optimista</span>
              <span className="text-blue-300 font-medium">{formatDate(forecast.optimisticDate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Más probable</span>
              <span className="text-white font-semibold">{formatDate(forecast.forecastDate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Pesimista</span>
              <span className="text-amber-300 font-medium">{formatDate(forecast.pessimisticDate)}</span>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-700/50 text-[11px] text-slate-500">
              <p>
                Ancho de banda derivado del CV del equipo ({(velocity.cv * 100).toFixed(0)}%). El rango representa la
                incertidumbre del ritmo de ejecución semanal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What-if panel */}
      <WhatIfPanel
        forecast={forecast}
        velocity={velocity}
        monthlyCost={projectCost.estimatedMonthlyCost}
      />


      {/* Context row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-300">Velocity del equipo</h3>
            <GlossaryTooltip id="pronosticos-detalle-velocity" />
          </div>
          <p className="text-2xl font-bold text-white">{velocity.meanPoints.toFixed(1)} pts/sem</p>
          <p className="text-xs text-slate-500 mt-1">
            Últimas {velocity.weeks} sem. · {velocity.meanTasks.toFixed(1)} tareas/sem
          </p>
          {forecast.daysElapsed > 0 && (
            <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
              Este proyecto lleva {forecast.daysElapsed} días desde su inicio
              {forecast.daysPlanned !== null && ` (${forecast.daysPlanned} planeados)`}.
            </p>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-300">Baseline del portafolio</h3>
            <GlossaryTooltip id="pronosticos-detalle-baseline" />
          </div>
          {baseline.sampleSize > 0 ? (
            <>
              <p
                className={`text-2xl font-bold ${Math.abs(baseline.meanSlippage) <= 7 ? 'text-green-400' : 'text-amber-400'}`}
              >
                {baseline.meanSlippage > 0 ? '+' : ''}
                {baseline.meanSlippage}d promedio
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {baseline.sampleSize} proyectos Done · {Math.round(baseline.onTimeRate * 100)}% en fecha
              </p>
              <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
                Promedio histórico de desvío entre <code className="text-slate-300 text-[11px]">finEstimado</code> y{' '}
                <code className="text-slate-300 text-[11px]">finReal</code> en proyectos ya cerrados.
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">Sin muestras para baseline aún.</p>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-300">Reglas del riesgo</h3>
            <GlossaryTooltip id="pronosticos-detalle-reglas-riesgo" />
          </div>
          <ul className="text-[12px] text-slate-400 space-y-1.5">
            <li>
              <span className="text-green-400">En tiempo</span> → desvío ≤ 3d y gap progreso &lt; 30%
            </li>
            <li>
              <span className="text-amber-400">Deslizando</span> → desvío 4–14d o gap 30–50%
            </li>
            <li>
              <span className="text-red-400">En riesgo</span> → desvío &gt; 14d o gap &gt; 50%
            </li>
            <li>
              <span className="text-red-400">Estancado</span> → iniciado sin progreso registrado
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function WhatIfPanel({
  forecast,
  velocity,
  monthlyCost,
}: {
  forecast: NonNullable<ReturnType<typeof forecastProject>>;
  velocity: ReturnType<typeof computeTeamVelocity>;
  monthlyCost: number;
}) {
  const [extraDays, setExtraDays] = useState(0);

  if (!forecast.forecastDate || !forecast.slippageDays === null) {
    return null;
  }

  const baseDate = new Date(forecast.forecastDate!);
  const simulatedDate = new Date(baseDate.getTime() + extraDays * MS_DAY);
  simulatedDate.setHours(0, 0, 0, 0);
  const simulatedIso = simulatedDate.toISOString().split('T')[0];

  const baseSlip = forecast.slippageDays ?? 0;
  const newSlip = baseSlip + extraDays;

  // Rebuild the risk label using the same rules as the engine
  let newRisk: 'on-track' | 'slipping' | 'at-risk' = 'on-track';
  if (newSlip > 14) newRisk = 'at-risk';
  else if (newSlip > 3) newRisk = 'slipping';
  else newRisk = 'on-track';

  if (forecast.expectedProgress !== null) {
    const gap = forecast.expectedProgress - forecast.actualProgress;
    if (gap > 0.3 && newRisk === 'on-track') newRisk = 'slipping';
    if (gap > 0.5 && newRisk !== 'at-risk') newRisk = 'at-risk';
  }

  // Probability recompute (same formula as engine)
  const daysToFinish = Math.max(
    1,
    (baseDate.getTime() - today0().getTime()) / MS_DAY + extraDays
  );
  const spread = Math.max(0.15, Math.min(0.6, velocity.cv || 0.3));
  const sigma = daysToFinish * spread;
  const newProb = sigma > 0 ? normalCDF(-newSlip / sigma) : null;

  const r = riskMeta(newRisk);
  const p = probabilityMeta(newProb);
  const baseRisk = riskMeta(forecast.risk);
  const baseProb = probabilityMeta(forecast.onTimeProbability);

  // Cost impact
  const dailyCost = monthlyCost / 30;
  const baseAdditionalCost = Math.max(0, baseSlip) * dailyCost;
  const simulatedAdditionalCost = Math.max(0, newSlip) * dailyCost;
  const deltaCost = simulatedAdditionalCost - baseAdditionalCost;
  const hasCostData = monthlyCost > 0;

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 my-6">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-medium text-slate-300">What-if: ¿qué pasa si se extiende?</h3>
        <GlossaryTooltip id="pronosticos-detalle-whatif" />
      </div>

      {/* Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500">Días adicionales al pronóstico</span>
          <span className={`font-bold ${extraDays > 0 ? 'text-amber-400' : extraDays < 0 ? 'text-blue-400' : 'text-slate-300'}`}>
            {extraDays > 0 ? '+' : ''}
            {extraDays}d
          </span>
        </div>
        <input
          type="range"
          min={-30}
          max={60}
          step={1}
          value={extraDays}
          onChange={(e) => setExtraDays(Number(e.target.value))}
          className="w-full accent-cyan-400"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
          <span>−30d</span>
          <span>0</span>
          <span>+60d</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {[-7, 0, 7, 14, 30].map((v) => (
            <button
              key={v}
              onClick={() => setExtraDays(v)}
              className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                extraDays === v
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {v > 0 ? '+' : ''}
              {v}d
            </button>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-slate-900/40 rounded-lg p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Pronóstico actual</p>
          <p className="text-lg font-bold text-white">{formatDate(forecast.forecastDate)}</p>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Riesgo</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${baseRisk.bg} ${baseRisk.color}`}>
                {baseRisk.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Desvío</span>
              <span className="text-slate-200 font-medium">
                {baseSlip > 0 ? '+' : ''}
                {baseSlip}d
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Prob. a tiempo</span>
              <span className={`font-medium ${baseProb.color}`}>{baseProb.label}</span>
            </div>
            {hasCostData && (
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/50">
                <span className="text-slate-500">Costo adicional</span>
                <span className="text-slate-200 font-medium" title={formatMoneyFull(baseAdditionalCost)}>
                  {formatMoney(baseAdditionalCost)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-lg p-4 border ${extraDays !== 0 ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-slate-900/40 border-slate-700/50'}`}>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Escenario simulado</p>
          <p className="text-lg font-bold text-white">{formatDate(simulatedIso)}</p>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Riesgo</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.bg} ${r.color}`}>{r.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Desvío</span>
              <span
                className={`font-medium ${newSlip > 14 ? 'text-red-400' : newSlip > 3 ? 'text-amber-400' : newSlip < -3 ? 'text-blue-400' : 'text-green-400'}`}
              >
                {newSlip > 0 ? '+' : ''}
                {newSlip}d
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Prob. a tiempo</span>
              <span className={`font-medium ${p.color}`}>{p.label}</span>
            </div>
            {hasCostData && (
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/50">
                <span className="text-slate-500">Costo adicional</span>
                <span
                  className={`font-medium ${simulatedAdditionalCost > baseAdditionalCost ? 'text-red-400' : simulatedAdditionalCost < baseAdditionalCost ? 'text-green-400' : 'text-slate-200'}`}
                  title={formatMoneyFull(simulatedAdditionalCost)}
                >
                  {formatMoney(simulatedAdditionalCost)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cost delta summary */}
      {hasCostData && extraDays !== 0 && (
        <div
          className={`mt-4 rounded-lg p-3 border flex items-center justify-between ${deltaCost > 0 ? 'bg-red-500/10 border-red-500/30' : deltaCost < 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-900/40 border-slate-700/50'}`}
        >
          <div>
            <p className="text-[11px] text-slate-400">
              Impacto económico del escenario
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {monthlyCost > 0 && <>Costo mensual del equipo: {formatMoney(monthlyCost)}</>}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-xl font-bold ${deltaCost > 0 ? 'text-red-400' : deltaCost < 0 ? 'text-green-400' : 'text-slate-300'}`}
              title={formatMoneyFull(Math.abs(deltaCost))}
            >
              {deltaCost > 0 ? '+' : deltaCost < 0 ? '−' : ''}
              {formatMoney(Math.abs(deltaCost))}
            </p>
            <p className="text-[10px] text-slate-500">
              {deltaCost > 0 ? 'costo extra' : deltaCost < 0 ? 'costo evitado' : 'sin cambio'}
            </p>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-500 mt-4 pt-4 border-t border-slate-700/50 leading-relaxed">
        Este panel simula el impacto de extender (o acortar) el pronóstico en {extraDays}d. No modifica datos: recalcula riesgo, probabilidad y{' '}
        {hasCostData ? 'costo adicional' : 'métricas'} con las mismas reglas del motor. El costo se deriva de <code className="text-slate-300 text-[11px]">(costoMensual / 30) × max(0, desvío)</code>.
      </p>
    </div>
  );
}

const MS_DAY = 86400000;

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * abs);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-abs * abs);
  return sign * y;
}

function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function MetricTile({
  icon: Icon,
  iconColor,
  label,
  value,
  sub,
  infoId,
}: {
  icon: typeof Calendar;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  infoId?: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">{label}</span>
        {infoId && <GlossaryTooltip id={infoId} />}
      </div>
      <p className="text-lg font-bold text-white truncate">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function FactorIcon({ tone }: { tone: RiskFactor['tone'] }) {
  const map = {
    positive: { Icon: CheckCircle2, color: 'text-green-400 bg-green-500/15' },
    neutral: { Icon: Info, color: 'text-slate-400 bg-slate-500/15' },
    warn: { Icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/15' },
    bad: { Icon: AlertTriangle, color: 'text-red-400 bg-red-500/15' },
  }[tone];
  const { Icon, color } = map;
  return (
    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

interface TimelineRange {
  minIso: string;
  maxIso: string;
  startIso: string;
  todayIso: string;
  plannedIso: string | null;
  forecastIso: string | null;
  optimisticIso: string | null;
  pessimisticIso: string | null;
}

function buildTimelineRange(params: {
  start: string;
  today: string;
  planned: string;
  forecast: string | null;
  optimistic: string | null;
  pessimistic: string | null;
}): TimelineRange | null {
  const iso = (v: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };
  const startIso = iso(params.start);
  const todayIso = iso(params.today);
  if (!startIso || !todayIso) return null;
  const plannedIso = iso(params.planned);
  const forecastIso = iso(params.forecast);
  const optimisticIso = iso(params.optimistic);
  const pessimisticIso = iso(params.pessimistic);
  const candidates = [startIso, todayIso, plannedIso, forecastIso, optimisticIso, pessimisticIso].filter(
    (v): v is string => !!v
  );
  const minIso = candidates.reduce((a, b) => (a < b ? a : b));
  const maxIso = candidates.reduce((a, b) => (a > b ? a : b));
  return { minIso, maxIso, startIso, todayIso, plannedIso, forecastIso, optimisticIso, pessimisticIso };
}

interface TimelineMarker {
  key: string;
  pos: number;
  color: string;
  label: string;
  date: string;
}

const LABEL_MIN_GAP = 18;
const LANE_HEIGHT = 20;

function assignLanes(markers: TimelineMarker[]): Map<string, number> {
  const sorted = [...markers].sort((a, b) => a.pos - b.pos);
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();
  for (const m of sorted) {
    let lane = 0;
    while (laneEnds[lane] !== undefined && m.pos - laneEnds[lane] < LABEL_MIN_GAP) {
      lane++;
    }
    laneEnds[lane] = m.pos;
    lanes.set(m.key, lane);
  }
  return lanes;
}

function TimelineBar({ timeline }: { timeline: TimelineRange }) {
  const totalDays = Math.max(1, daysBetween(timeline.minIso, timeline.maxIso));
  const pos = (iso: string | null): number | null => {
    if (!iso) return null;
    return Math.max(0, Math.min(100, (daysBetween(timeline.minIso, iso) / totalDays) * 100));
  };
  const startPos = pos(timeline.startIso) ?? 0;
  const todayPos = pos(timeline.todayIso) ?? 0;
  const plannedPos = pos(timeline.plannedIso);
  const forecastPos = pos(timeline.forecastIso);
  const optPos = pos(timeline.optimisticIso);
  const pesPos = pos(timeline.pessimisticIso);

  const markers: TimelineMarker[] = [
    { key: 'start', pos: startPos, color: 'bg-slate-500', label: 'Inicio', date: timeline.startIso },
    { key: 'today', pos: todayPos, color: 'bg-cyan-400', label: 'Hoy', date: timeline.todayIso },
  ];
  if (plannedPos !== null && timeline.plannedIso) {
    markers.push({ key: 'planned', pos: plannedPos, color: 'bg-purple-400', label: 'Fin estimado', date: timeline.plannedIso });
  }
  if (forecastPos !== null && timeline.forecastIso) {
    markers.push({ key: 'forecast', pos: forecastPos, color: 'bg-blue-400', label: 'Pronóstico', date: timeline.forecastIso });
  }

  const lanes = assignLanes(markers);
  const maxLane = Math.max(0, ...[...lanes.values()]);
  const labelAreaHeight = (maxLane + 1) * LANE_HEIGHT + 6;

  return (
    <div className="relative">
      {/* Bar */}
      <div className="relative h-10 bg-slate-900/60 rounded-lg">
        {/* Elapsed segment */}
        <div
          className="absolute top-0 h-full bg-slate-700/40 rounded-l-lg"
          style={{ left: `${startPos}%`, width: `${Math.max(0, todayPos - startPos)}%` }}
        />
        {/* Band optimistic–pessimistic */}
        {optPos !== null && pesPos !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 bg-blue-500/20 rounded"
            style={{ left: `${optPos}%`, width: `${Math.max(0.5, pesPos - optPos)}%` }}
            title="Banda optimista–pesimista"
          />
        )}
        {/* Vertical markers */}
        {markers.map((m) => (
          <div
            key={m.key}
            className="absolute top-0 h-full pointer-events-none"
            style={{ left: `${m.pos}%` }}
            title={`${m.label}: ${formatDate(m.date)}`}
          >
            <div className={`absolute top-1 bottom-1 w-0.5 ${m.color} -translate-x-1/2`} />
            <div className={`absolute top-0 w-2 h-2 rounded-full ${m.color} -translate-x-1/2 -translate-y-1`} />
          </div>
        ))}
      </div>

      {/* Labels in lanes below the bar */}
      <div className="relative mt-2" style={{ height: `${labelAreaHeight}px` }}>
        {markers.map((m) => {
          const lane = lanes.get(m.key) ?? 0;
          // Edge alignment: labels near 0% left-align; near 100% right-align; else center
          const align = m.pos < 12 ? 'start' : m.pos > 88 ? 'end' : 'center';
          const style: CSSProperties = { top: `${lane * LANE_HEIGHT}px` };
          if (align === 'start') {
            style.left = `${m.pos}%`;
          } else if (align === 'end') {
            style.left = `${m.pos}%`;
            style.transform = 'translateX(-100%)';
          } else {
            style.left = `${m.pos}%`;
            style.transform = 'translateX(-50%)';
          }
          return (
            <div
              key={m.key}
              className="absolute text-[10px] whitespace-nowrap flex items-center gap-1"
              style={style}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${m.color}`} />
              <span className="text-slate-400">{m.label}:</span>
              <span className="text-slate-200 font-medium">{formatDate(m.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
