import { useMemo } from 'react';
import { getEstatusColor } from '../../utils/colors';
import type { ProjectRecord, TareaRecord } from '../../utils/dataTransforms';
import { isTareaDone } from '../../utils/dataTransforms';
import GlossaryTooltip from '../ui/GlossaryTooltip';

const DAY = 86400000;

interface Props {
  tareas: TareaRecord[];
  projects: ProjectRecord[];
}

function pos(startMs: number, endMs: number, min: number, days: number): { left: number; width: number } | null {
  if (isNaN(startMs) || isNaN(endMs)) return null;
  const off = (startMs - min) / DAY;
  const span = Math.max(1, (endMs - startMs) / DAY);
  return { left: Math.max(0, (off / days) * 100), width: Math.min(100, (span / days) * 100) };
}

/** Gantt personal: las actividades asignadas a la persona, agrupadas por proyecto. */
export default function PersonGantt({ tareas, projects }: Props) {
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) m.set(p.id, p.actividad);
    return m;
  }, [projects]);

  const range = useMemo(() => {
    const xs: number[] = [];
    const push = (s?: string) => { const ms = Date.parse(s || ''); if (!isNaN(ms)) xs.push(ms); };
    for (const t of tareas) { push(t.inicioEstimado); push(t.inicio); push(t.finEstimado); push(t.finReal); }
    if (xs.length === 0) return null;
    const min = Math.min(...xs) - 2 * DAY;
    const max = Math.max(...xs) + 2 * DAY;
    return { min, max, days: Math.max(1, (max - min) / DAY) };
  }, [tareas]);

  const months = useMemo(() => {
    if (!range) return [];
    const out: { label: string; left: number }[] = [];
    const d = new Date(range.min); d.setDate(1); d.setHours(0, 0, 0, 0);
    let guard = 0;
    while (d.getTime() <= range.max && guard++ < 48) {
      const left = ((d.getTime() - range.min) / DAY) / range.days * 100;
      if (left >= 0 && left <= 100) out.push({ label: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }), left });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [range]);

  const todayLeft = useMemo(() => {
    if (!range) return null;
    const l = ((Date.now() - range.min) / DAY) / range.days * 100;
    return l >= 0 && l <= 100 ? l : null;
  }, [range]);

  const groups = useMemo(() => {
    const m = new Map<string, TareaRecord[]>();
    for (const t of tareas) {
      const k = t.proyectoId || '__none';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return [...m.entries()]
      .map(([pid, items]) => ({ pid, label: nameById.get(pid) || items[0]?.proyecto || 'Sin proyecto', items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [tareas, nameById]);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-medium text-slate-300">Gantt Personal</h3>
        <GlossaryTooltip id="persona-detalle-gantt" />
      </div>
      {!range || groups.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-400">Sin actividades con fechas asignadas todavía.</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 overflow-hidden">
          <div className="flex">
            <div className="w-52 shrink-0" />
            <div className="relative flex-1 h-5 border-b border-slate-700/50">
              {months.map((m) => (
                <span key={m.label + m.left} className="absolute top-0 text-[9px] text-slate-500 -translate-x-1/2" style={{ left: `${m.left}%` }}>{m.label}</span>
              ))}
            </div>
          </div>
          <div className="relative">
            {todayLeft !== null && (
              <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `calc(13rem + (100% - 13rem) * ${(todayLeft / 100).toFixed(4)})` }}>
                <div className="w-0.5 h-full bg-blue-400/60" />
              </div>
            )}
            {groups.map((g) => (
              <div key={g.pid} className="mt-3 first:mt-2">
                <div className="flex items-center mb-1">
                  <div className="w-52 shrink-0 pr-3">
                    {g.pid !== '__none' ? (
                      <a href={`/proyecto/${g.pid}`} className="text-xs font-semibold text-slate-200 hover:text-blue-300 truncate block transition-colors">{g.label}</a>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 truncate">{g.label}</p>
                    )}
                  </div>
                  <div className="flex-1" />
                </div>
                {g.items.map((t, idx) => {
                  const startMs = Date.parse(t.inicio || t.inicioEstimado || '');
                  const endMs = Date.parse(t.finReal || t.finEstimado || '');
                  const bar = pos(startMs, endMs, range.min, range.days);
                  const ec = getEstatusColor(t.estatus);
                  const done = isTareaDone(t.estatus);
                  return (
                    <div key={t.id || `${g.pid}-${idx}`} className="flex items-center h-7 hover:bg-slate-700/20 rounded">
                      <div className="w-52 shrink-0 pr-3 pl-3">
                        <a href={`/tarea/${t.id}`} className="text-[11px] text-slate-400 hover:text-blue-300 truncate block transition-colors">{t.nombre}</a>
                      </div>
                      <div className="relative flex-1 h-full">
                        {bar ? (
                          <div
                            className="absolute top-1.5 h-4 rounded flex items-center"
                            style={{ left: `${bar.left}%`, width: `${bar.width}%`, backgroundColor: ec.chart + (done ? '99' : '55'), border: `1px solid ${ec.chart}88` }}
                            title={`${t.estatus} · ${t.inicio || t.inicioEstimado || '?'} → ${t.finReal || t.finEstimado || '?'}`}
                          >
                            <span className="text-[8px] text-white/90 px-1 truncate">{t.puntos > 0 ? `${t.puntos}pt` : ''}</span>
                          </div>
                        ) : (
                          <span className="absolute top-1.5 left-0 text-[9px] text-slate-600 italic">sin fechas</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
