import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../utils/recharts';
import { prioridadColors } from '../../utils/colors';
import { countByField, type ProjectRecord } from '../../utils/dataTransforms';
import ChartCard from './ChartCard';

interface Props {
  data: ProjectRecord[];
}

const ORDER = ['Bloqueadora', 'Crítica', 'Mayor', 'Menor', 'Trivial'];

export default function PrioridadBarChart({ data }: Props) {
  const counts = countByField(data, 'prioridad');
  const chartData = ORDER
    .filter((name) => counts[name])
    .map((name) => ({ name, value: counts[name] }));

  return (
    <ChartCard title="Proyectos por Prioridad">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Proyectos">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={prioridadColors[entry.name]?.chart || '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
