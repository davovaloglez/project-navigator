import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { ProjectRecord } from '../../../utils/dataTransforms';
import { estatusColors } from '../../../utils/colors';
import { isTerminal } from '../../../utils/projectStatus';
import KPICard from '../../ui/KPICard';
import ChartCard from '../../charts/ChartCard';
import { infoFor } from '../../../data/glossary';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import { Cell } from '../../../utils/recharts';
import type { PersonStats } from './shared';

interface Props {
  personProjects: ProjectRecord[];
  stats: PersonStats;
  includeDone: boolean;
  setIncludeDone: (v: boolean) => void;
}

export default function ResumenTab({
  personProjects,
  stats,
  includeDone,
  setIncludeDone,
}: Props) {
  const { kpis, performance } = stats;

  // Las gráficas respetan el toggle "Incluir terminados" (Done + Cancelado).
  // Los KPIs de arriba siguen siendo agregados duros (vienen de `stats`).
  const listProjects = useMemo(
    () =>
      includeDone ? personProjects : personProjects.filter((p) => !isTerminal(p.estatus)),
    [personProjects, includeDone],
  );
  const hiddenTerminalCount = useMemo(
    () => personProjects.filter((p) => isTerminal(p.estatus)).length,
    [personProjects],
  );

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of listProjects) counts[p.estatus] = (counts[p.estatus] || 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [listProjects]);

  const projectsChartData = useMemo(() => {
    return listProjects
      .map((p) => ({ name: p.actividad, progreso: Math.round(p.progreso * 100) }))
      .sort((a, b) => b.progreso - a.progreso);
  }, [listProjects]);

  const radarData = useMemo(
    () => [
      { metric: 'Completación', value: performance.completionRate },
      { metric: 'Progreso', value: kpis.avgProgress },
      { metric: 'Salud', value: performance.avgHealth },
      { metric: 'Puntualidad', value: performance.onTimeRate >= 0 ? performance.onTimeRate : 50 },
      { metric: 'Capacidad', value: Math.min(100, listProjects.length * 15) },
    ],
    [performance, kpis, listProjects],
  );

  const chartHeight = Math.max(200, projectsChartData.length * 36 + 60);

  if (personProjects.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <p className="text-slate-400">Sin proyectos asignados a esta persona.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle para ocultar/mostrar terminados en las gráficas del resumen */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setIncludeDone(!includeDone)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            includeDone
              ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
          title={includeDone ? 'Ocultar proyectos terminados' : 'Mostrar proyectos terminados'}
        >
          {includeDone
            ? '✓ Incluir terminados'
            : `Incluir terminados${hiddenTerminalCount > 0 ? ` (${hiddenTerminalCount})` : ''}`}
        </button>
      </div>

      {/* KPIs complementarios al strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <KPICard
          title="Completados"
          value={kpis.completed}
          icon={CheckCircle2}
          accentColor="text-green-400"
          info={infoFor('persona-detalle-kpi-completados')}
        />
        <KPICard
          title="En riesgo"
          value={kpis.atRisk}
          icon={AlertTriangle}
          accentColor="text-orange-400"
          highlight={kpis.atRisk > 0}
          info={infoFor('persona-detalle-kpi-en-riesgo')}
        />
        <KPICard
          title="Puntualidad"
          value={performance.onTimeRate >= 0 ? `${performance.onTimeRate}%` : 'N/A'}
          icon={Clock}
          accentColor="text-purple-400"
          info={infoFor('persona-detalle-kpi-puntualidad')}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column: Estatus + Radar */}
        <div className="space-y-4">
          {statusData.length > 0 && (
            <ChartCard
              title="Distribución de Estatus"
              info={infoFor('persona-detalle-status-pie')}
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={estatusColors[entry.name]?.chart || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {statusData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-1.5 text-[10px] text-slate-400"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: estatusColors[entry.name]?.chart || '#94a3b8',
                      }}
                    />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          <ChartCard title="Perfil de Rendimiento" info={infoFor('persona-detalle-radar')}>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Radar
                  dataKey="value"
                  stroke="#60a5fa"
                  fill="#60a5fa"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2 text-center">
              <div className="bg-slate-700/30 rounded-lg p-2">
                <p className="text-lg font-bold text-white">{performance.completionRate}%</p>
                <p className="text-[10px] text-slate-500">Tasa completación</p>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2">
                <p className="text-lg font-bold text-white">{kpis.totalPoints}</p>
                <p className="text-[10px] text-slate-500">Pts totales</p>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Right column: Progress per project */}
        {projectsChartData.length > 0 && (
          <ChartCard
            title="Progreso por Proyecto"
            info={infoFor('persona-detalle-progreso-chart')}
          >
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={projectsChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis
                  type="number"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value) => [`${value}%`, 'Progreso']}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Bar dataKey="progreso" radius={[0, 6, 6, 0]} name="Progreso">
                  {projectsChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.progreso >= 80
                          ? '#4ade80'
                          : entry.progreso >= 40
                            ? '#facc15'
                            : '#f87171'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
