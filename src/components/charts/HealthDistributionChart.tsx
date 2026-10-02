import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../utils/recharts';
import type { ProjectRecord } from '../../utils/dataTransforms';
import { isActive } from '../../utils/projectStatus';
import { calcHealthScore } from '../../utils/healthScore';
import ChartCard from './ChartCard';
import { infoFor } from '../../data/glossary';

interface Props {
  data: ProjectRecord[];
}

const HEALTH_COLORS: Record<string, string> = {
  'Excelente': '#4ade80',
  'Bueno': '#60a5fa',
  'Medio': '#facc15',
  'Bajo': '#fb923c',
  'Crítico': '#f87171',
};

/**
 * Distribución de proyectos por bucket de Health Score (Excelente / Bueno /
 * Medio / Bajo / Crítico). Movido desde Resumen → Dashboard en HU NAV-69.
 * Sólo cuenta proyectos activos (no Done ni On Hold), consistente con el resto
 * del Dashboard.
 */
export default function HealthDistributionChart({ data }: Props) {
  const active = data.filter((p) => isActive(p.estatus));
  const buckets: Record<string, number> = { 'Excelente': 0, 'Bueno': 0, 'Medio': 0, 'Bajo': 0, 'Crítico': 0 };
  for (const p of active) {
    const h = calcHealthScore(p);
    if (h.label in buckets) buckets[h.label]++;
  }
  const chartData = Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <ChartCard title="Distribución de Salud" info={infoFor('dashboard-health-distribution')}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            formatter={(value: unknown) => [`${value} proyectos`, 'Proyectos']}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Proyectos">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={HEALTH_COLORS[entry.name] || '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
