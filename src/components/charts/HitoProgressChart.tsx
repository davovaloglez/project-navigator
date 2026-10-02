import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { groupByField, type ProjectRecord } from '../../utils/dataTransforms';
import ChartCard from './ChartCard';

interface Props {
  data: ProjectRecord[];
}

export default function HitoProgressChart({ data }: Props) {
  const groups = groupByField(data, 'hito');
  const chartData = Object.entries(groups)
    .filter(([name]) => name && name !== 'Sin dato')
    .map(([name, items]) => {
      const avg = Math.round((items.reduce((s, p) => s + p.progreso, 0) / items.length) * 100);
      return { name, progreso: avg, proyectos: items.length };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ChartCard title="Progreso y Proyectos por Q de entrega">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ left: 10, right: 10 }}>
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Legend formatter={(value: string) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{value}</span>} />
          <Bar yAxisId="left" dataKey="progreso" fill="#60a5fa" radius={[6, 6, 0, 0]} name="Progreso %" />
          <Line yAxisId="right" type="monotone" dataKey="proyectos" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24', r: 4 }} name="# Proyectos" />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
