import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../utils/recharts';
import type { ProjectRecord } from '../../utils/dataTransforms';
import { splitMulti } from '../../utils/dataTransforms';
import ChartCard from './ChartCard';
import { infoFor } from '../../data/glossary';

interface Props {
  data: ProjectRecord[];
}

const COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#2dd4bf', '#818cf8', '#e879f9', '#34d399', '#94a3b8', '#a78bfa'];

/**
 * Conteo de proyectos por arquitecto. Multi-arquitecto ("Luis, George") cuenta
 * para cada uno individualmente (splitMulti). Reemplaza al KPI "Progreso
 * promedio" del Dashboard (HU NAV-69).
 */
export default function ProyectosPorArquitectoChart({ data }: Props) {
  const counts = new Map<string, number>();
  for (const p of data) {
    for (const a of splitMulti(p.arquitecto)) {
      counts.set(a, (counts.get(a) || 0) + 1);
    }
  }
  const chartData = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <ChartCard title="Proyectos por Arquitecto" info={infoFor('dashboard-proyectos-arquitecto')}>
      <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 30 + 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            formatter={(value: unknown) => [`${value} proyectos`, 'Asignados']}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Proyectos">
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
