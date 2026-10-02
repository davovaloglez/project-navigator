import { useMemo } from 'react';
import { ListChecks, ExternalLink } from 'lucide-react';
import type { ProjectRecord, TareaRecord } from '../../../utils/dataTransforms';
import { isTareaDone } from '../../../utils/dataTransforms';
import PersonGantt from '../../charts/PersonGantt';
import PersonBurndown from '../../charts/PersonBurndown';
import GlossaryTooltip from '../../ui/GlossaryTooltip';

interface Props {
  personTareas: TareaRecord[];
  personProjects: ProjectRecord[];
  allProjects: ProjectRecord[];
}

export default function CronogramaTab({ personTareas, personProjects, allProjects }: Props) {
  const taskStats = useMemo(() => {
    const total = personTareas.length;
    let completadas = 0,
      activas = 0,
      atrasadas = 0;
    let puntosTotales = 0,
      puntosCompletados = 0;
    for (const t of personTareas) {
      const s = t.estatus.toLowerCase();
      const pts = t.puntos ?? 0;
      puntosTotales += pts;
      if (isTareaDone(t.estatus)) {
        completadas++;
        puntosCompletados += pts;
      } else if (
        s.includes('in progress') ||
        s.includes('review') ||
        s.includes('testing') ||
        s.includes('change') ||
        s.includes('pending') ||
        s.includes('pendiente')
      ) {
        activas++;
      }
      if (t.salud.toLowerCase().includes('atraz')) atrasadas++;
    }
    return { total, completadas, activas, atrasadas, puntosTotales, puntosCompletados };
  }, [personTareas]);

  const estimadoVsReal = useMemo(() => {
    let estimado = 0,
      real = 0;
    for (const t of personTareas) {
      estimado += t.puntos ?? 0;
      real += t.tracked ?? 0;
    }
    return { estimado, real };
  }, [personTareas]);

  const sortedTareas = useMemo(() => {
    const weight = (e: string) => {
      const s = e.toLowerCase();
      if (s.includes('in progress')) return 0;
      if (s.includes('review')) return 1;
      if (s.includes('testing') || s.includes('qa')) return 2;
      if (s.includes('change')) return 3;
      if (s.includes('pending') || s.includes('pendiente')) return 4;
      if (isTareaDone(e)) return 5;
      return 6;
    };
    return [...personTareas].sort((a, b) => weight(a.estatus) - weight(b.estatus));
  }, [personTareas]);

  if (personTareas.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <p className="text-slate-400">Sin tareas asignadas a esta persona.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gantt + Burndown */}
      <PersonGantt tareas={personTareas} projects={allProjects} />
      <PersonBurndown tareas={personTareas} projects={personProjects} />

      {/* Tareas del Cronograma */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Tareas del Cronograma ({personTareas.length})
            <GlossaryTooltip id="persona-detalle-tareas-cronograma" />
          </h3>
          <a
            href="/cronograma"
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            Ver cronograma completo <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 pb-4 border-b border-slate-700/50">
            <div>
              <p className="text-xl font-bold text-white">{taskStats.total}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{taskStats.completadas}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Completadas</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">{taskStats.activas}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Activas</p>
            </div>
            <div>
              <p
                className={`text-xl font-bold ${
                  taskStats.atrasadas > 0 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {taskStats.atrasadas}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Atrasadas</p>
            </div>
            <div>
              <p className="text-xl font-bold text-purple-400">{taskStats.puntosTotales}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pts totales</p>
            </div>
            <div>
              <p className="text-xl font-bold text-pink-400">
                {taskStats.puntosCompletados}
                {taskStats.puntosTotales > 0 && (
                  <span className="text-[10px] text-slate-500 font-normal ml-1">
                    (
                    {Math.round(
                      (taskStats.puntosCompletados / taskStats.puntosTotales) * 100,
                    )}
                    %)
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Pts entregados
              </p>
            </div>
          </div>

          {/* Estimado vs real */}
          {(estimadoVsReal.estimado > 0 || estimadoVsReal.real > 0) && (
            <div className="flex items-center gap-3 mb-4 text-[11px]">
              <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded">
                Estimado: {estimadoVsReal.estimado} pts
              </span>
              <span className="px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded">
                Real (tracked): {estimadoVsReal.real} pts
              </span>
            </div>
          )}

          {/* Lista de tareas */}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {sortedTareas.map((t, idx) => {
              const s = t.estatus.toLowerCase();
              const statusClass = isTareaDone(t.estatus)
                ? 'bg-green-500/15 text-green-400 border-green-500/30'
                : s.includes('in progress')
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : s.includes('review')
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : s.includes('testing') || s.includes('qa')
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : s.includes('cancelad')
                        ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30';
              return (
                <div
                  key={`${t.folio}-${idx}`}
                  className="flex items-center gap-2.5 p-2 rounded hover:bg-slate-700/30 transition-colors"
                >
                  {t.fase && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 bg-slate-700/60 text-slate-300">
                      {t.fase}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 truncate">{t.nombre}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {[t.epica, t.tipo].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {t.puntos > 0 && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/15 text-purple-300 shrink-0"
                      title="Story points"
                    >
                      {t.puntos} pts
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0 ${statusClass}`}
                  >
                    {t.estatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
