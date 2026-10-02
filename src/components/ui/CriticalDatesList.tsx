import { Calendar, AlertCircle } from 'lucide-react';
import type { CriticalWindow } from '../../utils/forecastEngine';
import { riskMeta } from '../../utils/forecastEngine';
interface Props {
  windows: CriticalWindow[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function CriticalDatesList({ windows }: Props) {
  const totalEvents = windows.reduce((s, w) => s + w.events.length, 0);
  if (totalEvents === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-400">No hay entregas proyectadas en las próximas ventanas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {windows.map((w) => (
        <div key={w.windowDays} className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-medium text-white">{w.label}</h4>
            </div>
            <span className="text-[11px] text-slate-500">
              {w.events.length} entrega{w.events.length !== 1 ? 's' : ''}
            </span>
          </div>
          {w.events.length === 0 ? (
            <div className="px-4 py-4 text-[12px] text-slate-500">Sin entregas en esta ventana.</div>
          ) : (
            <ul className="divide-y divide-slate-700/50">
              {w.events.map((e) => {
                const r = riskMeta(e.forecast.risk);
                const isOverdue = e.daysFromNow < 0;
                return (
                  <li key={`${e.forecast.project.id}-${e.kind}`} className="px-4 py-3 hover:bg-slate-700/20 transition-colors">
                    <a
                      href={`/pronosticos/${e.forecast.project.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex flex-col items-center justify-center w-14 shrink-0 text-center">
                        <span className={`text-lg font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                          {Math.abs(e.daysFromNow)}d
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {isOverdue ? 'tarde' : 'por venir'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200 truncate" title={e.forecast.project.actividad}>
                          {e.forecast.project.actividad}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {formatDate(e.date)}
                          {e.forecast.project.hito && ` · ${e.forecast.project.hito}`}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${r.bg} ${r.color} ${r.border}`}>
                        {r.label}
                      </span>
                      {isOverdue && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
