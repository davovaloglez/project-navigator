import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../utils/recharts';
import { estatusColors } from '../../utils/colors';
import { countByField, type ProjectRecord } from '../../utils/dataTransforms';
import ChartCard from './ChartCard';

interface Props {
  data: ProjectRecord[];
}

export default function EstatusDonutChart({ data }: Props) {
  const counts = countByField(data, 'estatus');
  const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

  return (
    <ChartCard title="Distribución por Estatus">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={estatusColors[entry.name]?.chart || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: estatusColors[entry.name]?.chart || '#94a3b8' }} />
            {entry.name} ({entry.value})
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
