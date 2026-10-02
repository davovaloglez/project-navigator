import { useCallback, useState, useMemo } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { Users, TrendingUp, CheckCircle2, Clock, Award } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { CursoRecord } from '../../utils/dataTransforms';
import { countByField, groupByField } from '../../utils/dataTransforms';
import { getOUColor } from '../../utils/colors';
import { infoFor } from '../../data/glossary';
import Header from '../layout/Header';
import KPICard from '../ui/KPICard';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import FilterDropdowns from '../ui/FilterDropdowns';
import ChartCard from '../charts/ChartCard';
import CursosProgressChart from '../charts/CursosProgressChart';

import { PieChart, Pie, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Cell } from '../../utils/recharts';

const filterConfigs = [
  { key: 'ou', label: 'O.U.', options: ['Tech Ambition', 'Growth Experiences', 'Allies Networking', 'Analytics Solutions'].map(v => ({ value: v, label: v })), multi: true },
  { key: 'rol', label: 'Rol', options: ['Software Architect', 'Project Manager', 'QA Analyst', 'Customer Success Explorer', 'Data Empowerment Explorer', 'Developers'].map(v => ({ value: v, label: v })), multi: true },
];

function getProgressColor(pct: number): string {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  if (pct >= 1) return 'bg-orange-500';
  return 'bg-red-500';
}

function getProgressTextColor(pct: number): string {
  if (pct >= 100) return 'text-green-400';
  if (pct >= 50) return 'text-yellow-400';
  if (pct >= 1) return 'text-orange-400';
  return 'text-red-400';
}

export default function CursosSection() {
  const { data, loading, error, refetch } = useSheetData<CursoRecord>('/api/cursos');
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    filters: Record<string, string[]>;
  }>('cursos', { filters: {} });
  const activeFilters = persisted.filters;
  const setActiveFilters = useCallback(
    (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) =>
      setPersisted((prev) => ({ ...prev, filters: typeof updater === 'function' ? updater(prev.filters) : updater })),
    [setPersisted],
  );
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = data;
    const q = search.toLowerCase();
    if (q) {
      result = result.filter((c) =>
        c.colaborador.toLowerCase().includes(q) || c.rol.toLowerCase().includes(q)
      );
    }
    for (const [key, values] of Object.entries(activeFilters)) {
      if (!values.length) continue;
      result = result.filter((c) => values.includes(String((c as unknown as Record<string, unknown>)[key] || '')));
    }
    return result;
  }, [data, activeFilters, search]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const avgProgress = total > 0 ? Math.round(filtered.reduce((s, c) => s + c.progreso, 0) / total) : 0;
    const completed = filtered.filter((c) => c.progreso === 100).length;
    const notStarted = filtered.filter((c) => c.progreso === 0).length;
    return { total, avgProgress, completed, notStarted };
  }, [filtered]);

  const ouDistribution = useMemo(() => {
    const counts = countByField(filtered, 'ou');
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const ouProgressData = useMemo(() => {
    const groups = groupByField(filtered, 'ou');
    return Object.entries(groups)
      .filter(([name]) => name && name !== 'Sin dato')
      .map(([name, items]) => {
        const avg = Math.round(items.reduce((s, c) => s + c.progreso, 0) / items.length);
        return { name, progreso: avg };
      })
      .sort((a, b) => b.progreso - a.progreso);
  }, [filtered]);

  // Group by jefe directo for team view
  const teamGroups = useMemo(() => {
    const groups = groupByField(filtered, 'jefeDirecto');
    return Object.entries(groups)
      .filter(([name]) => name && name !== 'Sin dato')
      .sort(([, a], [, b]) => b.length - a.length);
  }, [filtered]);

  if (loading) {
    return (
      <div>
        <Header title="Cursos del Equipo" onRefresh={refetch} loading />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Cursos del Equipo" onRefresh={refetch} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Cursos del Equipo" onRefresh={refetch} loading={loading} />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard title="Total colaboradores" value={kpis.total} icon={Users} accentColor="text-blue-400" info={infoFor('cursos-kpi-total')} />
        <KPICard title="Progreso promedio" value={`${kpis.avgProgress}%`} icon={TrendingUp} accentColor="text-cyan-400" info={infoFor('cursos-kpi-progreso')} />
        <KPICard title="Completados" value={kpis.completed} icon={CheckCircle2} accentColor="text-green-400" info={infoFor('cursos-kpi-completados')} />
        <KPICard title="Sin iniciar" value={kpis.notStarted} icon={Clock} highlight={kpis.notStarted > 0} info={infoFor('cursos-kpi-sin-iniciar')} />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FilterDropdowns
          filters={filterConfigs}
          activeFilters={activeFilters}
          onFilterChange={(key, values) => setActiveFilters((prev) => ({ ...prev, [key]: values }))}
          onClear={() => { clearPersisted(); setSearch(''); }}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre o rol..."
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Distribución por O.U." info={infoFor('cursos-ou-distribution')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={ouDistribution} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                {ouDistribution.map((entry) => (
                  <Cell key={entry.name} fill={getOUColor(entry.name).chart} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
            {ouDistribution.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getOUColor(entry.name).chart }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Progreso Promedio por O.U." info={infoFor('cursos-ou-progress')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ouProgressData} margin={{ left: 10, right: 20 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value) => [`${value}%`, 'Progreso']}
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              />
              <Bar dataKey="progreso" radius={[6, 6, 0, 0]} name="Progreso">
                {ouProgressData.map((entry) => (
                  <Cell key={entry.name} fill={getOUColor(entry.name).chart} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Team cards grouped by jefe directo */}
      <div className="flex items-center gap-1.5 mb-4">
        <h3 className="text-sm font-medium text-slate-300">Equipos por Jefe Directo</h3>
        <GlossaryTooltip id="cursos-equipos-jefe" />
      </div>
      <div className="space-y-4 mb-6">
        {teamGroups.map(([jefe, members]) => {
          const teamAvg = Math.round(members.reduce((s, c) => s + c.progreso, 0) / members.length);
          return (
            <div key={jefe} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                    {jefe.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{jefe}</p>
                    <p className="text-xs text-slate-500">{members.length} miembros — Promedio: {teamAvg}%</p>
                  </div>
                </div>
                <div className="w-20">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(teamAvg)}`}
                      style={{ width: `${teamAvg}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {members
                  .sort((a, b) => b.progreso - a.progreso)
                  .map((member) => (
                  <a
                    key={member.emailColaborador}
                    href={`/persona/${member.equipoId || encodeURIComponent(member.colaborador)}`}
                    className="flex items-center gap-3 p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-600 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                      {member.colaborador.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-200 truncate">{member.colaborador}</p>
                      <p className="text-[10px] text-slate-500 truncate">{member.rol}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${getProgressTextColor(member.progreso)}`}>{member.progreso}%</p>
                      {member.progreso === 100 && <Award className="w-3.5 h-3.5 text-green-400 ml-auto" />}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual progress chart */}
      <CursosProgressChart data={filtered} />
    </div>
  );
}
