import { GitBranch, BookOpen } from 'lucide-react';
import type { CursoRecord, RepoRecord } from '../../../utils/dataTransforms';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import { ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

interface Props {
  personRepos: { repo: RepoRecord; roles: string[] }[];
  curso: CursoRecord | null;
}

export default function AccesosTab({ personRepos, curso }: Props) {
  if (personRepos.length === 0 && !curso) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <p className="text-slate-400">
          Sin accesos a repositorios ni progreso de cursos registrados para esta persona.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Curso */}
      {curso && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Progreso en Cursos
            <GlossaryTooltip id="persona-detalle-cursos" />
          </h3>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="w-32">
              <ResponsiveContainer width="100%" height={100}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="90%"
                  startAngle={180}
                  endAngle={0}
                  data={[
                    {
                      value: curso.progreso,
                      fill:
                        curso.progreso >= 100
                          ? '#4ade80'
                          : curso.progreso >= 50
                            ? '#facc15'
                            : '#f87171',
                    },
                  ]}
                  barSize={10}
                >
                  <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="text-center text-lg font-bold text-white -mt-8">{curso.progreso}%</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-400">
                O.U.: <span className="text-slate-200">{curso.ou}</span>
              </p>
              <p className="text-slate-400">
                Rol: <span className="text-slate-200">{curso.rol}</span>
              </p>
              <p className="text-slate-400">
                Jefe directo: <span className="text-slate-200">{curso.jefeDirecto}</span>
              </p>
              {curso.pidsCreados > 0 && (
                <p className="text-slate-400">
                  PIDs creados: <span className="text-slate-200">{curso.pidsCreados}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Accesos a repositorios */}
      {personRepos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Accesos a Repositorios ({personRepos.length})
            <GlossaryTooltip id="persona-detalle-accesos" />
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {personRepos.map(({ repo, roles }) => (
              <div
                key={repo.nombre}
                className="bg-slate-800 border border-slate-700/50 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{repo.nombre}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{repo.github}</p>
                  </div>
                  {repo.estatus && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 ${
                        repo.estatus.toLowerCase() === 'activo'
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {repo.estatus}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="px-1.5 py-0.5 bg-blue-500/15 text-blue-300 rounded text-[10px] font-medium"
                    >
                      {r}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  {repo.producto && (
                    <span className="px-1.5 py-0.5 bg-slate-700 rounded">{repo.producto}</span>
                  )}
                  {repo.ambientes && <span>{repo.ambientes}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
