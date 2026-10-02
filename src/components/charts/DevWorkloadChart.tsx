import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../utils/recharts';
import type { ProjectRecord } from '../../utils/dataTransforms';
import ChartCard from './ChartCard';
import { infoFor } from '../../data/glossary';

interface Props {
  data: ProjectRecord[];
}

const INACTIVE_STATUSES = ['Done', 'On Hold', 'Cancelado'];
const COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#2dd4bf', '#818cf8', '#e879f9', '#34d399', '#94a3b8', '#a78bfa'];

/**
 * Dona con la mezcla de proyectos activos por DEV. Cada proyecto cuenta una vez
 * por cada developer asignado (p.devs ya es un arreglo resuelto en /api/proyectos).
 * Convertido de bar chart a dona en HU NAV-69.
 */
export default function DevWorkloadChart({ data }: Props) {
  const active = data.filter((p) => !INACTIVE_STATUSES.includes(p.estatus));
  const devCounts: Record<string, number> = {};
  for (const p of active) {
    for (const dev of p.devs) {
      devCounts[dev] = (devCounts[dev] || 0) + 1;
    }
  }
  const chartData = Object.entries(devCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <ChartCard title="Carga de Trabajo por DEV (activos)" info={infoFor('dashboard-dev-workload')}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="count"
            nameKey="name"
            stroke="none"
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value: unknown, name) => [`${value} proyectos`, String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
        {chartData.map((entry, idx) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
            {entry.name} ({entry.count})
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
