import { AlertCircle, Gauge } from 'lucide-react';
import type { PersonCapacity } from '../../utils/forecastEngine';

interface Props {
  capacity: PersonCapacity;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function PersonCapacityCard({ capacity: c }: Props) {
  const weeksColor =
    c.weeksToClear === null
      ? 'text-slate-400'
      : c.weeksToClear > 12
        ? 'text-red-400'
        : c.weeksToClear > 6
          ? 'text-amber-400'
          : 'text-green-400';

  const borderColor =
    c.weeksToClear !== null && c.weeksToClear > 12
      ? 'border-red-500/30'
      : c.overdueTasks > 0
        ? 'border-amber-500/30'
        : 'border-slate-700/50';

  return (
    <a
      href={`/persona/${encodeURIComponent(c.name.split(' ')[0])}`}
      className={`block bg-slate-800 border rounded-xl p-4 hover:bg-slate-700/50 transition-colors group ${borderColor}`}
    >
      {/* Header: name + initial avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 group-hover:text-blue-300 shrink-0">
          {c.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">
            {c.name}
          </h4>
          <p className="text-[11px] text-slate-500">
            {c.pendingTasks === 0 ? 'Sin carga pendiente' : `${c.pendingTasks} tarea${c.pendingTasks !== 1 ? 's' : ''} pendiente${c.pendingTasks !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Velocity */}
      <div className="bg-slate-900/40 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Gauge className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">Velocity · 8 sem</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-white">{c.velocityPointsWeek.toFixed(1)}</span>
          <span className="text-[11px] text-slate-500">pts/sem</span>
          <span className="text-[11px] text-slate-600 ml-2">·</span>
          <span className="text-sm text-slate-400">{c.velocityTasksWeek.toFixed(1)}</span>
          <span className="text-[11px] text-slate-500">tareas/sem</span>
        </div>
      </div>

      {/* Capacity forecast */}
      {c.pendingTasks > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Pts pendientes</span>
            <span className="text-slate-300 font-medium">{c.pendingPoints}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Semanas para liquidar</span>
            <span className={`font-semibold ${weeksColor}`}>
              {c.weeksToClear !== null ? c.weeksToClear.toFixed(1) : '?'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Queda libre</span>
            <span className="text-slate-300 font-medium">{formatDate(c.forecastClearDate)}</span>
          </div>
          {c.overdueTasks > 0 && (
            <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-700/50">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-[11px] text-red-400 font-medium">
                {c.overdueTasks} tarea{c.overdueTasks !== 1 ? 's' : ''} vencida{c.overdueTasks !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-green-400 font-medium">Cola vacía</p>
        </div>
      )}
    </a>
  );
}
