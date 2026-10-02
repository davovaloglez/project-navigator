import { useMemo } from 'react';
import { Calendar, Flag } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import type { ProjectRecord, TareaRecord, HitoRecord } from '../../../utils/dataTransforms';
import { calcHealthScore } from '../../../utils/healthScore';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import { projectStats } from './shared';

interface Props {
  project: ProjectRecord;
  allProjects: ProjectRecord[];
  projectHitos: HitoRecord[];
  projectTareas: TareaRecord[];
}

export default function ResumenTab({ project, allProjects, projectHitos, projectTareas }: Props) {
  const { progressPct, health, daysLeft, isOverdue, isDone, gaugeData } = projectStats(project);

  // Avance por Hito (entidad) o Fase (agregado) — explica el % global
  const avanceByHito = useMemo(
    () => projectHitos
      .map((h) => ({ key: h.id, label: h.nombre || h.id, pct: Math.round((h.avance || 0) * 100) }))
      .sort((a, b) => b.pct - a.pct),
    [projectHitos],
  );
  const avanceByFase = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const t of projectTareas) {
      if (!t.fase) continue;
      const cur = m.get(t.fase) || { sum: 0, n: 0 };
      cur.sum += t.avance || 0;
      cur.n += 1;
      m.set(t.fase, cur);
    }
    return [...m.entries()]
      .map(([label, v]) => ({ key: label, label, pct: v.n ? Math.round((v.sum / v.n) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [projectTareas]);

  // Comparativa vs pares (excluye al proyecto actual)
  const epicComparison = useMemo(() => {
    if (!project.epica) return null;
    const peers = allProjects.filter((p) => p.epica === project.epica && p.id !== project.id);
    if (peers.length === 0) return null;
    return {
      avgProgress: Math.round((peers.reduce((s, p) => s + p.progreso, 0) / peers.length) * 100),
      avgHealth: Math.round(peers.reduce((s, p) => s + calcHealthScore(p).score, 0) / peers.length),
      count: peers.length,
    };
  }, [allProjects, project]);
  const hitoComparison = useMemo(() => {
    if (!project.cuatrimestre) return null;
    const peers = allProjects.filter((p) => p.cuatrimestre === project.cuatrimestre && p.id !== project.id);
    if (peers.length === 0) return null;
    return {
      avgProgress: Math.round((peers.reduce((s, p) => s + p.progreso, 0) / peers.length) * 100),
      avgHealth: Math.round(peers.reduce((s, p) => s + calcHealthScore(p).score, 0) / peers.length),
      count: peers.length,
    };
  }, [allProjects, project]);

  const startDate = (project.fechaInicio || project.registro) ? new Date(project.fechaInicio || project.registro) : null;
  const endDate = project.finEstimado ? new Date(project.finEstimado) : null;
  let timelineElapsedPct = 0;
  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    timelineElapsedPct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
  }

  const breakdown = avanceByHito.length ? avanceByHito : avanceByFase;
  const breakdownKind = avanceByHito.length ? 'hito' : 'fase';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Progress gauge */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 mb-2 self-start">
            <h3 className="text-sm font-medium text-slate-300">Progreso General</h3>
            <GlossaryTooltip id="proyecto-progress-gauge" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" startAngle={180} endAngle={0} data={gaugeData} barSize={14}>
              <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-3xl font-bold text-white -mt-16 mb-4">{progressPct}%</p>
          {health.factors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              {health.factors.map((f) => (
                <span key={f} className="px-2 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-400">{f}</span>
              ))}
            </div>
          )}
          {breakdown.length > 0 && (
            <div className="w-full mt-4 pt-3 border-t border-slate-700/40 self-stretch">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Avance por {breakdownKind}</p>
              <div className="space-y-1.5">
                {breakdown.slice(0, 6).map((b) => (
                  <div key={b.key} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 truncate w-28" title={b.label}>{b.label}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5 min-w-0">
                      <div className={`h-1.5 rounded-full ${b.pct >= 80 ? 'bg-green-500' : b.pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 w-8 text-right shrink-0">{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline visual + dates */}
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <h3 className="text-sm font-medium text-slate-300">Línea de Tiempo</h3>
            <GlossaryTooltip id="proyecto-timeline" />
          </div>

          {startDate && endDate && (
            <div className="mb-5">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                <span>{project.fechaInicio || project.registro}</span>
                <span>{project.finEstimado}</span>
              </div>
              <div className="relative w-full bg-slate-700 rounded-full h-3">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${progressPct >= 80 ? 'bg-green-500/60' : progressPct >= 40 ? 'bg-yellow-500/60' : 'bg-red-500/60'}`}
                  style={{ width: `${progressPct}%` }}
                />
                {!isDone && timelineElapsedPct > 0 && (
                  <div className="absolute top-0 h-full" style={{ left: `${Math.min(100, timelineElapsedPct)}%` }}>
                    <div className="w-0.5 h-full bg-blue-400" />
                    <span className="absolute -top-5 -translate-x-1/2 text-[8px] text-blue-400 font-bold whitespace-nowrap">HOY</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-1.5 text-[10px]">
                <span className="text-slate-500">Inicio</span>
                {isOverdue && <span className="text-red-400 font-medium">Vencido</span>}
                <span className="text-slate-500">Fin est.</span>
              </div>
            </div>
          )}

          {/* Date details — orden: Registro → Inicio estimado → Inicio → Fin estimado → Fin real */}
          <div className="space-y-2.5">
            {project.registro && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-500 w-28">Registro</span>
                <span className="text-xs text-slate-200">{project.registro}</span>
              </div>
            )}
            {project.inicioEstimado && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-500 w-28">Inicio estimado</span>
                <span className="text-xs text-slate-200">{project.inicioEstimado}</span>
              </div>
            )}
            {project.fechaInicio && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-500 w-28">Inicio</span>
                <span className="text-xs text-slate-200">{project.fechaInicio}</span>
              </div>
            )}
            {project.finEstimado && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-500 w-28">Fin estimado</span>
                <span className="text-xs text-slate-200">{project.finEstimado}</span>
                {daysLeft !== null && !isDone && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isOverdue ? 'bg-red-500/15 text-red-400' : daysLeft <= 7 ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                    {isOverdue ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d`}
                  </span>
                )}
              </div>
            )}
            {project.finReal && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span className="text-xs text-slate-500 w-28">Fin real</span>
                <span className="text-xs text-slate-200">{project.finReal}</span>
              </div>
            )}
            {project.cuatrimestre && (
              <div className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs text-slate-500 w-28">Q de entrega</span>
                <span className="text-xs text-slate-200">{project.cuatrimestre}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparativa */}
      {(epicComparison || hitoComparison) && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <h3 className="text-sm font-medium text-slate-300">Comparativa</h3>
            <GlossaryTooltip id="proyecto-comparativa" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {epicComparison && (
              <div>
                <p className="text-xs text-slate-500 mb-2">vs Épica "{project.epica}" ({epicComparison.count} {epicComparison.count === 1 ? 'par' : 'pares'})</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Progreso</span>
                      <span>Este: {progressPct}% · Prom: {epicComparison.avgProgress}%</span>
                    </div>
                    <div className="relative w-full bg-slate-700 rounded-full h-2">
                      <div className="absolute inset-y-0 left-0 bg-blue-500/40 rounded-full" style={{ width: `${epicComparison.avgProgress}%` }} />
                      <div className={`absolute inset-y-0 left-0 rounded-full ${progressPct >= epicComparison.avgProgress ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Salud</span>
                      <span>Este: {health.score} · Prom: {epicComparison.avgHealth}</span>
                    </div>
                    <div className="relative w-full bg-slate-700 rounded-full h-2">
                      <div className="absolute inset-y-0 left-0 bg-blue-500/40 rounded-full" style={{ width: `${epicComparison.avgHealth}%` }} />
                      <div className={`absolute inset-y-0 left-0 rounded-full ${health.score >= epicComparison.avgHealth ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${health.score}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {hitoComparison && (
              <div>
                <p className="text-xs text-slate-500 mb-2">vs Q de entrega "{project.cuatrimestre}" ({hitoComparison.count} {hitoComparison.count === 1 ? 'par' : 'pares'})</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Progreso</span>
                      <span>Este: {progressPct}% · Prom: {hitoComparison.avgProgress}%</span>
                    </div>
                    <div className="relative w-full bg-slate-700 rounded-full h-2">
                      <div className="absolute inset-y-0 left-0 bg-purple-500/40 rounded-full" style={{ width: `${hitoComparison.avgProgress}%` }} />
                      <div className={`absolute inset-y-0 left-0 rounded-full ${progressPct >= hitoComparison.avgProgress ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Salud</span>
                      <span>Este: {health.score} · Prom: {hitoComparison.avgHealth}</span>
                    </div>
                    <div className="relative w-full bg-slate-700 rounded-full h-2">
                      <div className="absolute inset-y-0 left-0 bg-purple-500/40 rounded-full" style={{ width: `${hitoComparison.avgHealth}%` }} />
                      <div className={`absolute inset-y-0 left-0 rounded-full ${health.score >= hitoComparison.avgHealth ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${health.score}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
