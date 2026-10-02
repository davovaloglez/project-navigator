import { Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { BacktestResult } from '../../utils/backtest';
interface Props {
  result: BacktestResult;
  snapshotWeeks: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function BacktestCard({ result, snapshotWeeks }: Props) {
  if (result.sampleSize === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-300">Precisión del pronóstico (backtest)</h3>
        </div>
        <div className="bg-slate-900/40 rounded-lg p-4 text-center">
          {snapshotWeeks === 0 ? (
            <>
              <p className="text-sm text-slate-400 mb-1">Aún no hay snapshots registrados.</p>
              <p className="text-[11px] text-slate-500">
                Cada vez que abras esta vista se guarda un snapshot semanal del estado en tu navegador. El backtest requiere al menos un proyecto que se haya cerrado después de ser capturado con progreso intermedio.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-1">
                {snapshotWeeks} snapshot{snapshotWeeks !== 1 ? 's' : ''} acumulado{snapshotWeeks !== 1 ? 's' : ''}.
              </p>
              <p className="text-[11px] text-slate-500">
                Todavía no hay proyectos cerrados que hayan sido capturados en estado intermedio (20–95% de progreso) — el backtest necesita ambos extremos.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const headlineColor =
    result.mae <= 7 ? 'text-green-400' : result.mae <= 21 ? 'text-amber-400' : 'text-red-400';

  const top = result.entries.slice(0, 4);

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-300">Precisión del pronóstico (backtest)</h3>
        </div>
        <span className="text-[11px] text-slate-500">
          {result.sampleSize} proyecto{result.sampleSize !== 1 ? 's' : ''} cerrado{result.sampleSize !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div>
          <p className={`text-2xl font-bold ${headlineColor}`}>{result.mae}d</p>
          <p className="text-[11px] text-slate-500 mt-1">Error absoluto medio</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-200">
            {result.meanError > 0 ? '+' : ''}
            {result.meanError}d
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Sesgo medio</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-200">
            {Math.round(result.within7d * 100)}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Dentro de ±7d</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-200">
            {Math.round(result.within14d * 100)}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Dentro de ±14d</p>
        </div>
      </div>

      {top.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Top desviaciones</p>
          <ul className="divide-y divide-slate-700/50">
            {top.map((e) => {
              const isOverEst = e.errorDays > 0;
              return (
                <li key={e.project.id} className="py-2">
                  <a
                    href={`/proyecto/${e.project.id}`}
                    className="flex items-center gap-3 hover:bg-slate-700/20 transition-colors rounded px-2 -mx-2 py-1"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-slate-700/60">
                      {Math.abs(e.errorDays) <= 7 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate" title={e.project.actividad}>
                        {e.project.actividad}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        predicción: {formatDate(e.predictedDate)} · real:{' '}
                        {formatDate(e.actualDate)} · {Math.round(e.snapshotProgress * 100)}% al momento
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold shrink-0 ${Math.abs(e.errorDays) <= 7 ? 'text-green-400' : isOverEst ? 'text-amber-400' : 'text-blue-400'}`}
                    >
                      {e.errorDays > 0 ? '+' : ''}
                      {e.errorDays}d
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
