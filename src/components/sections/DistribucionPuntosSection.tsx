import { useCallback, useMemo } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { PieChart as PieChartIcon, Star, Target, Briefcase } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord, TareaRecord } from '../../utils/dataTransforms';
import { isActive } from '../../utils/projectStatus';
import { groupByField, splitMulti } from '../../utils/dataTransforms';
import { getTipoTareaColor } from '../../utils/colors';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import KPICard from '../ui/KPICard';
import ChartCard from '../charts/ChartCard';
import { infoFor } from '../../data/glossary';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { Cell } from '../../utils/recharts';

const COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#2dd4bf', '#94a3b8', '#818cf8', '#e879f9', '#34d399', '#a78bfa'];

export default function DistribucionPuntosSection() {
  const { isScoped } = useScopeView();
  const { data: allData, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const { data: tareas } = useSheetData<TareaRecord>('/api/tareas');
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    pmFilter: Record<string, string[]>;
  }>('distribucion', { pmFilter: {} });
  const pmFilter = persisted.pmFilter;
  const setPmFilter = useCallback(
    (next: Record<string, string[]>) => setPersisted((prev) => ({ ...prev, pmFilter: next })),
    [setPersisted],
  );

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

  const totalPoints = useMemo(() => data.reduce((s, p) => s + p.puntos, 0), [data]);
  const donePoints = useMemo(() => data.filter(p => p.estatus === 'Done').reduce((s, p) => s + p.puntos, 0), [data]);
  const activePoints = useMemo(() => data.filter(p => isActive(p.estatus)).reduce((s, p) => s + p.puntos, 0), [data]);
  const avgPerProject = useMemo(() => data.length > 0 ? Math.round(totalPoints / data.length) : 0, [data, totalPoints]);

  // By cliente
  const byCliente = useMemo(() => {
    const groups = groupByField(data, 'cliente');
    return Object.entries(groups)
      .filter(([name]) => name && name !== 'Sin dato')
      .map(([name, items]) => ({
        name,
        puntos: items.reduce((s, p) => s + p.puntos, 0),
        proyectos: items.length,
      }))
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos);
  }, [data]);

  // By épica
  const byEpica = useMemo(() => {
    const groups = groupByField(data, 'epica');
    return Object.entries(groups)
      .filter(([name]) => name && name !== 'Sin dato')
      .map(([name, items]) => ({
        name,
        puntos: items.reduce((s, p) => s + p.puntos, 0),
        proyectos: items.length,
        avgProgress: items.length > 0 ? Math.round((items.reduce((s, p) => s + p.progreso, 0) / items.length) * 100) : 0,
      }))
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos);
  }, [data]);

  // By cuatrimestre (antes "cuenta", campo eliminado de la hoja)
  const byCuatrimestre = useMemo(() => {
    const groups = groupByField(data, 'cuatrimestre');
    return Object.entries(groups)
      .filter(([name]) => name && name !== 'Sin dato')
      .map(([name, items]) => ({
        name,
        puntos: items.reduce((s, p) => s + p.puntos, 0),
        proyectos: items.length,
      }))
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos);
  }, [data]);

  // By tipo de tarea (movido desde Cronograma)
  const byTipoTarea = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tareas) {
      if (!t.tipo) continue;
      map.set(t.tipo, (map.get(t.tipo) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tareas]);

  // By arquitecto (multi: "Luis, George" cuenta para cada uno)
  const byArquitecto = useMemo(() => {
    const m = new Map<string, ProjectRecord[]>();
    for (const p of data) {
      for (const a of p.arquitecto.split(',').map((s) => s.trim()).filter((a) => a && a !== '-')) {
        if (!m.has(a)) m.set(a, []);
        m.get(a)!.push(p);
      }
    }
    return [...m.entries()]
      .map(([name, items]) => ({
        name,
        puntos: items.reduce((s, p) => s + p.puntos, 0),
        done: items.filter((p) => p.estatus === 'Done').reduce((s, p) => s + p.puntos, 0),
        pending: items.filter((p) => p.estatus !== 'Done').reduce((s, p) => s + p.puntos, 0),
      }))
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos);
  }, [data]);

  if (loading) {
    return (
      <div>
        <Header title="Distribución de Puntos" onRefresh={refetch} loading />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 animate-pulse h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Distribución de Puntos" onRefresh={refetch} />
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
        <Header title="Distribución de Puntos" onRefresh={refetch} loading={loading} />
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
          Mostrando {data.length} proyecto{data.length !== 1 ? 's' : ''} del PM <span className="font-semibold">{activePmName}</span>
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard title="Puntos totales" value={totalPoints} icon={Star} accentColor="text-amber-400" info={infoFor('distribucion-kpi-total')} />
        <KPICard title="Puntos entregados" value={donePoints} icon={Target} accentColor="text-green-400" info={infoFor('distribucion-kpi-done')} />
        <KPICard title="Puntos activos" value={activePoints} icon={PieChartIcon} accentColor="text-blue-400" info={infoFor('distribucion-kpi-activos')} />
        <KPICard title="Promedio / proyecto" value={avgPerProject} icon={Briefcase} accentColor="text-purple-400" info={infoFor('distribucion-kpi-promedio')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* By cliente - donut */}
        <ChartCard title="Puntos por Cliente" info={infoFor('distribucion-por-cliente')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byCliente} cx="50%" cy="45%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="puntos" stroke="none">
                {byCliente.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: unknown) => [`${value} pts`, 'Puntos']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
            {byCliente.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                {entry.name} ({entry.puntos})
              </div>
            ))}
          </div>
        </ChartCard>

        {/* By arquitecto - stacked bar */}
        <ChartCard title="Puntos por Arquitecto (Done vs Pendiente)" info={infoFor('distribucion-por-arquitecto')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byArquitecto} margin={{ left: 10, right: 20 }}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              />
              <Bar dataKey="done" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} name="Entregados" />
              <Bar dataKey="pending" stackId="a" fill="#60a5fa" radius={[6, 6, 0, 0]} name="Pendientes" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By épica - horizontal bars */}
        <ChartCard title="Puntos por Épica" info={infoFor('distribucion-por-epica')}>
          <ResponsiveContainer width="100%" height={Math.max(250, byEpica.length * 32 + 40)}>
            <BarChart data={byEpica} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="puntos" radius={[0, 6, 6, 0]} name="Puntos">
                {byEpica.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribución por Tipo de Trabajo (movido desde Cronograma) */}
        <ChartCard title="Distribución por Tipo de Trabajo" info={infoFor('distribucion-tipo-tarea')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byTipoTarea} cx="50%" cy="45%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" stroke="none">
                {byTipoTarea.map((entry) => (
                  <Cell key={entry.name} fill={getTipoTareaColor(entry.name).chart} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
            {byTipoTarea.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getTipoTareaColor(entry.name).chart }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </ChartCard>

        {/* By cuatrimestre - horizontal bars */}
        <ChartCard title="Puntos por Q de entrega" info={infoFor('distribucion-por-cuenta')}>
          <ResponsiveContainer width="100%" height={Math.max(250, byCuatrimestre.length * 32 + 40)}>
            <BarChart data={byCuatrimestre} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="puntos" radius={[0, 6, 6, 0]} name="Puntos">
                {byCuatrimestre.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[(idx + 4) % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
