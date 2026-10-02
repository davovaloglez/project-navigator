import { useMemo } from 'react';
import type { CsClienteResumen } from '../../../utils/cs360';
import { diasParaRenovacion, esVital } from '../../../utils/cs360';
import { CsDonutChart, CsBarChart, type NamedCount } from './charts';

interface Props {
  clientes: CsClienteResumen[];
  getScore: (c: CsClienteResumen) => number;
}

/** Vista "Panorama General de Cartera": KPIs + distribución de score + estatus. */
export default function GlobalDashboard({ clientes, getScore }: Props) {
  const stats = useMemo(() => {
    let risk = 0;
    let renewals = 0;
    let vital = 0;
    const healthBuckets: Record<string, number> = {
      'Crítico (<50)': 0,
      'Riesgo (50-74)': 0,
      'Saludable (75+)': 0,
    };
    const statusBuckets: Record<string, number> = {};

    for (const c of clientes) {
      const s = getScore(c);
      if (s < 50) {
        risk++;
        healthBuckets['Crítico (<50)']++;
      } else if (s < 75) {
        healthBuckets['Riesgo (50-74)']++;
      } else {
        healthBuckets['Saludable (75+)']++;
      }

      if (esVital(c)) vital++;

      const diff = diasParaRenovacion(c);
      if (diff !== null && diff > 0 && diff <= 60) renewals++;

      const est = c.estatus || 'Desconocido';
      statusBuckets[est] = (statusBuckets[est] || 0) + 1;
    }

    const toCounts = (rec: Record<string, number>): NamedCount[] =>
      Object.entries(rec).map(([name, value]) => ({ name, value }));

    return {
      total: clientes.length,
      risk,
      renewals,
      vital,
      health: toCounts(healthBuckets),
      status: toCounts(statusBuckets),
    };
  }, [clientes, getScore]);

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">Panorama General de Cartera</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/90 border border-slate-200 shadow-sm p-5 rounded-xl">
          <p className="text-sm text-slate-500 font-medium mb-1">Total Clientes</p>
          <h3 className="text-3xl font-bold text-slate-800">{stats.total}</h3>
        </div>
        <div className="bg-white/90 border border-slate-200 shadow-sm p-5 rounded-xl border-l-4 border-l-red-500">
          <p className="text-sm text-slate-500 font-medium mb-1">Clientes en Riesgo (Score &lt; 50)</p>
          <h3 className="text-3xl font-bold text-red-600">{stats.risk}</h3>
        </div>
        <div className="bg-white/90 border border-slate-200 shadow-sm p-5 rounded-xl border-l-4 border-l-amber-500">
          <p className="text-sm text-slate-500 font-medium mb-1">Renovaciones (Próx 60 días)</p>
          <h3 className="text-3xl font-bold text-amber-600">{stats.renewals}</h3>
        </div>
        <div className="bg-white/90 border border-slate-200 shadow-sm p-5 rounded-xl border-l-4 border-l-purple-500">
          <p className="text-sm text-slate-500 font-medium mb-1">Clientes Vitales (Clase A)</p>
          <h3 className="text-3xl font-bold text-purple-700">{stats.vital}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/90 border border-slate-200 shadow-sm p-5 rounded-xl">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribución de Health Score</h3>
          <div className="h-64">
            <CsDonutChart data={stats.health} colors={['#ef4444', '#f59e0b', '#10b981']} />
          </div>
        </div>
        <div className="bg-white/90 border border-slate-200 shadow-sm p-5 rounded-xl">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Estatus de Cuentas</h3>
          <div className="h-64">
            <CsBarChart data={stats.status} color="#3b82f6" />
          </div>
        </div>
      </div>
    </div>
  );
}
