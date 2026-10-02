import { useMemo, useState } from 'react';
import { getEstatusColor } from '../../utils/colors';
import type { ProjectRecord, TareaRecord, HitoRecord } from '../../utils/dataTransforms';
import { isTareaDone } from '../../utils/dataTransforms';
import GlossaryTooltip from '../ui/GlossaryTooltip';

const DAY = 86400000;

interface Props {
  project: ProjectRecord;
  tareas: TareaRecord[];
  hitos: HitoRecord[];
}

interface Group {
  id: string;
  label: string;
  hito: HitoRecord | null;
  items: TareaRecord[];
}

function pos(startMs: number, endMs: number, min: number, days: number): { left: number; width: number } | null {
  if (isNaN(startMs) || isNaN(endMs)) return null;
  const off = (startMs - min) / DAY;
  const span = Math.max(1, (endMs - startMs) / DAY);
  return { left: Math.max(0, (off / days) * 100), width: Math.min(100, (span / days) * 100) };
}

export default function ProjectGantt({ project: _project, tareas, hitos }: Props) {
  const [groupBy, setGroupBy] = useState<'hito' | 'fase'>('hito');

  const range = useMemo(() => {
    const xs: number[] = [];
    const push = (s?: string) => { const ms = Date.parse(s || ''); if (!isNaN(ms)) xs.push(ms); };
    for (const t of tareas) { push(t.inicioEstimado); push(t.inicio); push(t.finEstimado); push(t.finReal); }
    for (const h of hitos) { push(h.inicio); push(h.fin); }
    if (xs.length === 0) return null;
    const min = Math.min(...xs) - 2 * DAY;
    const max = Math.max(...xs) + 2 * DAY;
    return { min, max, days: Math.max(1, (max - min) / DAY) };
  }, [tareas, hitos]);

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

  const groups = useMemo<Group[]>(() => {
    if (groupBy === 'hito') {
      const byHito = new Map<string, TareaRecord[]>();
      for (const t of tareas) {
        const k = t.hitoId || '__none';
        if (!byHito.has(k)) byHito.set(k, []);
        byHito.get(k)!.push(t);
      }
      const res: Group[] = hitos.map((h) => ({ id: h.id, label: h.nombre || h.id, hito: h, items: byHito.get(h.id) || [] }));
      const none = byHito.get('__none');
      if (none?.length) res.push({ id: '__none', label: 'Sin hito asignado', hito: null, items: none });
      return res.filter((g) => g.items.length > 0 || g.hito);
    }
    const byFase = new Map<string, TareaRecord[]>();
    for (const t of tareas) {
      const k = t.fase || 'Sin fase';
      if (!byFase.has(k)) byFase.set(k, []);
      byFase.get(k)!.push(t);
    }
    return [...byFase.entries()].map(([label, items]) => ({ id: label, label, hito: null, items }));
  }, [tareas, hitos, groupBy]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Cronograma del Proyecto (Gantt)</h3>
          <GlossaryTooltip id="proyecto-gantt" />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Agrupar</span>
          {(['hito', 'fase'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setGroupBy(opt)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                groupBy === opt ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt === 'hito' ? 'Hito' : 'Fase'}
            </button>
          ))}
        </div>
      </div>

      {!range || groups.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-400">Sin actividades con fechas para graficar todavía.</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 overflow-hidden">
          {/* Month header */}
          <div className="flex">
            <div className="w-56 shrink-0" />
            <div className="relative flex-1 h-5 border-b border-slate-700/50">
              {months.map((m) => (
                <span key={m.label + m.left} className="absolute top-0 text-[9px] text-slate-500 -translate-x-1/2" style={{ left: `${m.left}%` }}>{m.label}</span>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* HOY line across all rows */}
            {todayLeft !== null && (
              <div className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `calc(14rem + (100% - 14rem) * ${(todayLeft / 100).toFixed(4)})` }}>
                <div className="w-0.5 h-full bg-blue-400/60" />
              </div>
            )}

            {groups.map((g) => {
              const hitoBar = g.hito ? pos(Date.parse(g.hito.inicio || ''), Date.parse(g.hito.fin || ''), range.min, range.days) : null;
              const hc = g.hito ? getEstatusColor(g.hito.estatus) : null;
              return (
                <div key={g.id} className="mt-3 first:mt-2">
                  {/* Group header */}
                  <div className="flex items-center">
                    <div className="w-56 shrink-0 pr-3">
                      <p className="text-xs font-semibold text-slate-200 truncate">{g.label}</p>
                      <p className="text-[10px] text-slate-500">
                        {g.hito
                          ? `${g.hito.estatus || '—'} · ${Math.round((g.hito.avance || 0) * 100)}% · ${g.items.length} act.`
                          : `${g.items.length} actividad${g.items.length !== 1 ? 'es' : ''}`}
                      </p>
                    </div>
                    <div className="relative flex-1 h-6">
                      {hitoBar && hc && (
                        <div
                          className="absolute top-1 h-4 rounded"
                          style={{ left: `${hitoBar.left}%`, width: `${hitoBar.width}%`, backgroundColor: hc.chart + '33', border: `1px solid ${hc.chart}66` }}
                          title={`${g.hito!.inicio} → ${g.hito!.fin}`}
                        >
                          <div className="h-full rounded-l" style={{ width: `${Math.round((g.hito!.avance || 0) * 100)}%`, backgroundColor: hc.chart + '99' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activities */}
                  {g.items.map((t, idx) => {
                    const startMs = Date.parse(t.inicio || t.inicioEstimado || '');
                    const endMs = Date.parse(t.finReal || t.finEstimado || '');
                    const bar = pos(startMs, endMs, range.min, range.days);
                    const ec = getEstatusColor(t.estatus);
                    const done = isTareaDone(t.estatus);
                    return (
                      <div key={t.id || `${g.id}-${idx}`} className="flex items-center h-7 hover:bg-slate-700/20 rounded">
                        <div className="w-56 shrink-0 pr-3 pl-3">
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
