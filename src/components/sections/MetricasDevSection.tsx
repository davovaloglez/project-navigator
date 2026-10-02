import { useCallback, useMemo, useState } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord } from '../../utils/dataTransforms';
import { isActive } from '../../utils/projectStatus';
import { splitMulti } from '../../utils/dataTransforms';
import { calcHealthScore } from '../../utils/healthScore';
import { getEstatusColor } from '../../utils/colors';
import StatusBadge from '../ui/StatusBadge';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import ChartCard from '../charts/ChartCard';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import { infoFor } from '../../data/glossary';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Cell } from '../../utils/recharts';

interface DevMetrics {
  name: string;
  totalProjects: number;
  activeProjects: number;
  doneProjects: number;
  atRiskProjects: number;
  completionRate: number;
  avgProgress: number;
  avgHealthScore: number;
  totalPoints: number;
  donePoints: number;
  onTimeRate: number;       // % projects finished on time
  avgPointsPerProject: number;
  roles: string[];
}

export default function MetricasDevSection() {
  const { isScoped } = useScopeView();
  const { data: allData, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    sortKey: keyof DevMetrics;
    sortDir: 'asc' | 'desc';
    pmFilter: Record<string, string[]>;
  }>('metricas-dev', { sortKey: 'avgHealthScore', sortDir: 'desc', pmFilter: {} });
  const { sortKey, sortDir, pmFilter } = persisted;
  const setSortKey = useCallback(
    (next: keyof DevMetrics) => setPersisted((prev) => ({ ...prev, sortKey: next })),
    [setPersisted],
  );
  const setSortDir = useCallback(
    (updater: 'asc' | 'desc' | ((prev: 'asc' | 'desc') => 'asc' | 'desc')) =>
      setPersisted((prev) => ({ ...prev, sortDir: typeof updater === 'function' ? updater(prev.sortDir) : updater })),
    [setPersisted],
  );
  const setPmFilter = useCallback(
    (next: Record<string, string[]>) => setPersisted((prev) => ({ ...prev, pmFilter: next })),
    [setPersisted],
  );
  const [selectedDev, setSelectedDev] = useState<string | null>(null);

  const pmOptions = useMemo(() =>
    [...new Set(allData.flatMap((p) => splitMulti(p.pm)))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [allData]);

  const filterConfigs = useMemo(
    () => (isScoped ? [] : [{ key: 'pm', label: 'PM', options: pmOptions, multi: false }]),
    [pmOptions, isScoped],
  );

  const data = useMemo(() => {
    const selected = pmFilter.pm || [];
    return selected.length ? allData.filter((p) => splitMulti(p.pm).some((pm) => selected.includes(pm))) : allData;
  }, [allData, pmFilter]);

  const activePmName = pmFilter.pm?.[0];

  const devMetrics = useMemo(() => {
    const map = new Map<string, { roles: Set<string>; projects: Set<string>; records: ProjectRecord[] }>();

    function add(name: string, role: string, p: ProjectRecord) {
      if (!name || name === '-') return;
      if (!map.has(name)) map.set(name, { roles: new Set(), projects: new Set(), records: [] });
      const entry = map.get(name)!;
      entry.roles.add(role);
      if (!entry.projects.has(p.folio)) {
        entry.projects.add(p.folio);
        entry.records.push(p);
      }
    }

    const splitN = (v: string) => v.split(',').map((s) => s.trim()).filter((s) => s && s !== '-');
    for (const p of data) {
      for (const a of splitN(p.arquitecto)) add(a, 'Arquitecto', p); // multi: "Luis, George"
      for (const pm of splitN(p.pm)) add(pm, 'PM', p);
      for (const d of p.devs) add(d, 'Developer', p);
    }

    const result: DevMetrics[] = [];
    for (const [name, entry] of map) {
      const projects = entry.records;
      const total = projects.length;
      const done = projects.filter((p) => p.estatus === 'Done');
      const active = projects.filter((p) => isActive(p.estatus));
      const atRisk = projects.filter((p) => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical');
      const avgProg = total > 0 ? Math.round((projects.reduce((s, p) => s + p.progreso, 0) / total) * 100) : 0;
      const avgHealth = total > 0 ? Math.round(projects.reduce((s, p) => s + calcHealthScore(p).score, 0) / total) : 0;
      const totalPts = projects.reduce((s, p) => s + p.puntos, 0);
      const donePts = done.reduce((s, p) => s + p.puntos, 0);

      // On-time: projects with finReal <= finEstimado (only Done with both dates)
      const withDates = done.filter((p) => p.finReal && p.finEstimado);
      const onTime = withDates.filter((p) => new Date(p.finReal) <= new Date(p.finEstimado));
      const onTimeRate = withDates.length > 0 ? Math.round((onTime.length / withDates.length) * 100) : -1;

      result.push({
        name,
        totalProjects: total,
        activeProjects: active.length,
        doneProjects: done.length,
        atRiskProjects: atRisk.length,
        completionRate: total > 0 ? Math.round((done.length / total) * 100) : 0,
        avgProgress: avgProg,
        avgHealthScore: avgHealth,
        totalPoints: totalPts,
        donePoints: donePts,
        onTimeRate,
        avgPointsPerProject: total > 0 ? Math.round(totalPts / total) : 0,
        roles: [...entry.roles],
      });
    }

    return result;
  }, [data]);

  const sorted = useMemo(() => {
    return [...devMetrics].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [devMetrics, sortKey, sortDir]);

  const selectedDevData = useMemo(() => {
    if (!selectedDev) return null;
    const metrics = devMetrics.find((d) => d.name === selectedDev);
    const inField = (v: string) => v.split(',').map((s) => s.trim()).includes(selectedDev);
    const projects = data.filter((p) => inField(p.arquitecto) || inField(p.pm) || p.devs.includes(selectedDev));
    const uniqueProjects = [...new Map(projects.map(p => [p.id, p])).values()];
    return { metrics, projects: uniqueProjects };
  }, [selectedDev, devMetrics, data]);

  // Radar chart data for selected dev
  const radarData = useMemo(() => {
    if (!selectedDevData?.metrics) return [];
    const m = selectedDevData.metrics;
    return [
      { metric: 'Completación', value: m.completionRate },
      { metric: 'Progreso', value: m.avgProgress },
      { metric: 'Salud', value: m.avgHealthScore },
      { metric: 'Puntualidad', value: m.onTimeRate >= 0 ? m.onTimeRate : 50 },
      { metric: 'Capacidad', value: Math.min(100, m.totalProjects * 15) },
    ];
  }, [selectedDevData]);

  // Ranking chart
  const rankingData = useMemo(() => {
    return [...devMetrics]
      .sort((a, b) => b.avgHealthScore - a.avgHealthScore)
      .map((d) => ({ name: d.name, score: d.avgHealthScore }));
  }, [devMetrics]);

  function toggleSort(key: keyof DevMetrics) {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ col }: { col: keyof DevMetrics }) {
    if (sortKey !== col) return null;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  }

  if (loading) {
    return (
      <div>
        <Header title="Métricas por DEV" onRefresh={refetch} loading />
        <div className="space-y-4 mt-6">
          <div className="bg-slate-800 rounded-xl p-5 animate-pulse h-80" />
          <div className="bg-slate-800 rounded-xl p-5 animate-pulse h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Métricas por DEV" onRefresh={refetch} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetch} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Header title="Métricas por DEV" onRefresh={refetch} loading={loading} />
        {pmOptions.length > 0 && (
          <FilterDropdowns
            filters={filterConfigs}
            activeFilters={pmFilter}
            onFilterChange={(key, values) => setPmFilter({ [key]: values })}
            onClear={clearPersisted}
          />
        )}
      </div>
      {activePmName && (
        <p className="text-xs text-blue-300 mb-4">
          Métricas calculadas sobre proyectos del PM <span className="font-semibold">{activePmName}</span>
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Health ranking chart */}
        <ChartCard title="Ranking por Health Score" info={infoFor('metricas-dev-ranking-chart')}>
          <ResponsiveContainer width="100%" height={Math.max(250, rankingData.length * 32 + 40)}>
            <BarChart data={rankingData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} name="Health Score">
                {rankingData.map((d) => (
                  <Cell key={d.name} fill={d.score >= 65 ? '#4ade80' : d.score >= 45 ? '#facc15' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Radar chart for selected dev */}
        <ChartCard title={selectedDev ? `Perfil: ${selectedDev}` : 'Selecciona un DEV de la tabla'} info={infoFor('metricas-dev-perfil')}>
          {selectedDevData?.metrics ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                {selectedDevData.metrics.roles.map((r) => (
                  <span key={r} className="px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-400">{r}</span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{selectedDevData.metrics.donePoints}</p>
                  <p className="text-[10px] text-slate-500">Pts entregados</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{selectedDevData.metrics.completionRate}%</p>
                  <p className="text-[10px] text-slate-500">Tasa completación</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{selectedDevData.metrics.onTimeRate >= 0 ? `${selectedDevData.metrics.onTimeRate}%` : 'N/A'}</p>
                  <p className="text-[10px] text-slate-500">Puntualidad</p>
                </div>
              </div>
              {/* Mini project list */}
              <div className="mt-4 space-y-1 max-h-48 overflow-y-auto">
                {selectedDevData.projects.map((p) => {
                  const ec = getEstatusColor(p.estatus);
                  return (
                    <a key={p.id} href={`/proyecto/${p.id}`} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-700/50 transition-colors text-xs">
                      <StatusBadge label={p.estatus} {...ec} />
                      <span className="text-slate-300 truncate">{p.actividad}</span>
                      <span className="text-slate-500 ml-auto shrink-0">{Math.round(p.progreso * 100)}%</span>
                    </a>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
              Haz click en una fila de la tabla para ver el perfil del DEV
            </div>
          )}
        </ChartCard>
      </div>

      {/* Metrics table */}
      <div className="flex items-center gap-1.5 mb-3">
        <h3 className="text-sm font-medium text-slate-300">Tabla comparativa</h3>
        <GlossaryTooltip id="metricas-dev-tabla" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">DEV</th>
              {([
                ['totalProjects', 'Proy.'],
                ['doneProjects', 'Done'],
                ['activeProjects', 'Activos'],
                ['atRiskProjects', 'Riesgo'],
                ['completionRate', '% Compl.'],
                ['avgProgress', '% Prog.'],
                ['avgHealthScore', 'Salud'],
                ['totalPoints', 'Pts Total'],
                ['donePoints', 'Pts Done'],
                ['onTimeRate', 'Puntual.'],
              ] as [keyof DevMetrics, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="px-3 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none text-center whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">{label} <SortIcon col={key} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sorted.map((dev) => {
              const healthColor = dev.avgHealthScore >= 65 ? 'text-green-400' : dev.avgHealthScore >= 45 ? 'text-yellow-400' : 'text-red-400';
              const isSelected = selectedDev === dev.name;
              return (
                <tr
                  key={dev.name}
                  onClick={() => setSelectedDev(isSelected ? null : dev.name)}
                  className={`transition-colors cursor-pointer ${isSelected ? 'bg-blue-500/10' : 'bg-slate-800/30 hover:bg-slate-700/50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {dev.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{dev.name}</p>
                        <p className="text-[10px] text-slate-500">{dev.roles.join(', ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-300">{dev.totalProjects}</td>
                  <td className="px-3 py-3 text-center text-green-400">{dev.doneProjects}</td>
                  <td className="px-3 py-3 text-center text-blue-400">{dev.activeProjects}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={dev.atRiskProjects > 0 ? 'text-red-400 font-bold' : 'text-slate-500'}>{dev.atRiskProjects}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-300">{dev.completionRate}%</td>
                  <td className="px-3 py-3 text-center text-slate-300">{dev.avgProgress}%</td>
                  <td className={`px-3 py-3 text-center font-bold ${healthColor}`}>{dev.avgHealthScore}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{dev.totalPoints}</td>
                  <td className="px-3 py-3 text-center text-slate-300">{dev.donePoints}</td>
                  <td className="px-3 py-3 text-center">
                    {dev.onTimeRate >= 0 ? (
                      <span className={dev.onTimeRate >= 80 ? 'text-green-400' : dev.onTimeRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>{dev.onTimeRate}%</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
