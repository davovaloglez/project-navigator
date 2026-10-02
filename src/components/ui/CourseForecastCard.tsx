import { BookOpen, Calendar, TrendingUp } from 'lucide-react';
import type { CourseForecast } from '../../utils/courseForecast';
import { courseTrendMeta } from '../../utils/courseForecast';

interface Props {
  forecast: CourseForecast;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function CourseForecastCard({ forecast: f }: Props) {
  const trend = courseTrendMeta(f.trend);
  const progressColor =
    f.progresoActual >= 80
      ? 'bg-green-500'
      : f.progresoActual >= 40
        ? 'bg-blue-500'
        : f.progresoActual > 0
          ? 'bg-amber-500'
          : 'bg-slate-500';

  return (
    <a
      href={`/persona/${encodeURIComponent(f.colaborador.split(' ')[0])}`}
      className="block bg-slate-800 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/50 transition-colors group"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 group-hover:text-blue-300 shrink-0">
          {f.colaborador.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors" title={f.colaborador}>
            {f.colaborador}
          </h4>
          <p className="text-[11px] text-slate-500 truncate">
            {[f.rol, f.ou].filter(Boolean).join(' · ') || 'Sin rol'}
          </p>
        </div>
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${trend.bg} ${trend.color}`}>
          {trend.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-slate-500 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Progreso del curso
          </span>
          <span className="text-slate-300 font-medium">{f.progresoActual}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, Math.max(0, f.progresoActual))}%` }}
          />
        </div>
      </div>

      {/* Forecast */}
      {f.trend === 'done' ? (
        <div className="text-center py-2">
          <p className="text-xs text-green-400 font-medium">Curso completado</p>
        </div>
      ) : f.source === 'none' ? (
        <div className="bg-slate-900/40 rounded-lg p-3 text-center">
          <p className="text-[11px] text-slate-500">
            Sin suficientes snapshots para proyectar fecha.
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            Los snapshots se acumulan semanalmente en este navegador.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/40 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Ritmo
            </span>
            <span className="text-slate-300 font-medium">
              {f.velocityPerWeek !== null ? `${f.velocityPerWeek.toFixed(1)} pp/sem` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Finaliza
            </span>
            <span className="text-white font-semibold">{formatDate(f.forecastFinishDate)}</span>
          </div>
          {f.weeksToFinish !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Semanas restantes</span>
              <span
                className={`font-medium ${f.weeksToFinish > 20 ? 'text-red-400' : f.weeksToFinish > 10 ? 'text-amber-400' : 'text-green-400'}`}
              >
                {f.weeksToFinish.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
        <span>{f.pidsCreados} PIDs</span>
        {f.snapshotsUsed > 0 && <span>{f.snapshotsUsed} snap.</span>}
      </div>
    </a>
  );
}
