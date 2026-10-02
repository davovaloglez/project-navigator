import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { Cell } from '../../../utils/recharts';

/**
 * Wrappers mínimos de Recharts para el tablero CS 360 (el mock usaba Chart.js;
 * aquí se porta al estándar del proyecto). Tema claro fijo: la página vive
 * fuera del shell de Project Navigator.
 */

export interface NamedCount {
  name: string;
  value: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 12,
  color: '#334155',
} as const;

export function CsDonutChart({ data, colors }: { data: NamedCount[]; colors: string[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-400">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="85%" paddingAngle={2} strokeWidth={0}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CsBarChart({
  data,
  colors,
  color = '#3b82f6',
}: {
  data: NamedCount[];
  /** Si se pasa, colorea cada barra individualmente (como el chart de sentimiento del mock). */
  colors?: string[];
  color?: string;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-400">Sin datos</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
        <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]} fill={color}>
          {colors && data.map((entry, i) => <Cell key={entry.name} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
