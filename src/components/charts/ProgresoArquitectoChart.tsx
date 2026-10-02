import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../utils/recharts';
import type { ProjectRecord } from '../../utils/dataTransforms';
import ChartCard from './ChartCard';

interface Props {
  data: ProjectRecord[];
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return '#4ade80';
  if (pct >= 40) return '#facc15';
  return '#f87171';
}

export default function ProgresoArquitectoChart({ data }: Props) {
  // Multi-arquitecto: "Luis, George" cuenta para cada arquitecto por separado.
  const groups = new Map<string, ProjectRecord[]>();
  for (const p of data) {
    for (const a of p.arquitecto.split(',').map((s) => s.trim()).filter((a) => a && a !== '-')) {
      if (!groups.has(a)) groups.set(a, []);
      groups.get(a)!.push(p);
    }
  }
  const chartData = [...groups.entries()]
    .map(([name, items]) => {
      const avg = Math.round((items.reduce((s, p) => s + p.progreso, 0) / items.length) * 100);
      return { name, progreso: avg };
    })
    .sort((a, b) => b.progreso - a.progreso);

  return (
    <ChartCard title="Progreso Promedio por Arquitecto">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(value) => [`${value}%`, 'Progreso']}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Bar dataKey="progreso" radius={[6, 6, 0, 0]} name="Progreso">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={getProgressColor(entry.progreso)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
