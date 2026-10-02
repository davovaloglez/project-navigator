import { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ProjectRecord, TareaRecord } from '../../utils/dataTransforms';
import { isTareaDone } from '../../utils/dataTransforms';
import ChartCard from './ChartCard';
import { infoFor } from '../../data/glossary';

const DAY = 86400000;

function mondayOf(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d.getTime();
}

/**
 * Burndown del proyecto (HU NAV-70). Tres curvas de puntos restantes por semana:
 * - **Ideal**: decaimiento lineal de Σpts → 0 entre inicio y fin estimado.
 * - **Esperado**: restantes según la fecha ESTIMADA de cierre de cada actividad.
 * - **Real**: restantes según la fecha REAL de cierre (solo hasta hoy).
 * Usa las actividades del proyecto. Si no hay actividades/puntos, muestra vacío.
 */
export default function ProjectBurndown({ project, tareas }: { project: ProjectRecord; tareas: TareaRecord[] }) {
  const series = useMemo(() => {
    const totalPts = tareas.reduce((s, t) => s + (t.puntos || 0), 0);
    const startMs = Date.parse(project.inicioEstimado || project.fechaInicio || '');
    const endMs = Date.parse(project.finEstimado || '');
    if (!tareas.length || totalPts === 0 || isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return { rows: [], totalPts };
    }
    const today = Date.now();
    const firstWeek = mondayOf(startMs);
    const lastWeek = mondayOf(Math.max(endMs, today));
    const weekCount = Math.min(40, Math.max(1, Math.round((lastWeek - firstWeek) / (7 * DAY))) + 1);
    const endWeekIdx = Math.max(1, Math.round((mondayOf(endMs) - firstWeek) / (7 * DAY)));

    const rows: { label: string; ideal: number; esperado: number; real: number | null }[] = [];
    for (let i = 0; i < weekCount; i++) {
      const weekStart = firstWeek + i * 7 * DAY;
      const weekEnd = weekStart + 6 * DAY;
      let doneEst = 0, doneReal = 0;
      for (const t of tareas) {
        const fe = Date.parse(t.finEstimado || '');
        if (!isNaN(fe) && fe <= weekEnd) doneEst += t.puntos || 0;
        const fr = Date.parse(t.finReal || '');
        if (isTareaDone(t.estatus) && !isNaN(fr) && fr <= weekEnd) doneReal += t.puntos || 0;
      }
      const ideal = Math.max(0, totalPts - (totalPts / endWeekIdx) * i);
      rows.push({
        label: new Date(weekStart).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        ideal: Math.round(ideal),
        esperado: Math.max(0, totalPts - doneEst),
        real: weekStart <= today ? Math.max(0, totalPts - doneReal) : null,
      });
    }
    return { rows, totalPts };
  }, [project, tareas]);

  return (
    <ChartCard title="Burndown del Proyecto" info={infoFor('proyecto-burndown')}>
      {series.rows.length >= 2 ? (
        <>
          <p className="text-[11px] text-slate-500 mb-2">
            Puntos restantes por semana · {series.totalPts} pts totales — ideal (gris) vs esperado (azul) vs real (cyan)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={series.rows} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="pbFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: unknown, name) => {
                  const label = name === 'ideal' ? 'Ideal' : name === 'esperado' ? 'Esperado' : 'Real';
                  return [value == null ? '—' : `${value} pts`, label];
                }}
              />
              <Line type="monotone" dataKey="ideal" stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" dot={false} name="ideal" />
              <Line type="monotone" dataKey="esperado" stroke="#60a5fa" strokeWidth={2} dot={false} name="esperado" />
              <Area type="monotone" dataKey="real" stroke="#22d3ee" strokeWidth={2} fill="url(#pbFill)" connectNulls name="real" />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      ) : (
        <p className="text-[11px] text-slate-500 italic py-8 text-center">
          Sin actividades con puntos y fechas para este proyecto todavía.
        </p>
      )}
    </ChartCard>
  );
}
