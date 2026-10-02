import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../utils/recharts';
import type { CursoRecord } from '../../utils/dataTransforms';
import { infoFor } from '../../data/glossary';
import ChartCard from './ChartCard';

interface Props {
  data: CursoRecord[];
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return '#4ade80';
  if (pct >= 50) return '#facc15';
  if (pct >= 1) return '#fb923c';
  return '#f87171';
}

export default function CursosProgressChart({ data }: Props) {
  const chartData = [...data]
    .sort((a, b) => b.progreso - a.progreso)
    .map((c) => ({ name: c.colaborador, progreso: c.progreso }));

  const chartHeight = chartData.length * 32 + 60;

  return (
    <ChartCard title="Progreso Individual de Cursos" info={infoFor('cursos-progreso-individual')}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 30, right: 20 }}>
          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value) => [`${value}%`, 'Progreso']}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Bar dataKey="progreso" radius={[0, 6, 6, 0]} name="Progreso">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={getProgressColor(entry.progreso)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
