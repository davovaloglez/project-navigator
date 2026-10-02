import { useCallback, useMemo } from 'react';
import { usePersistedFilters } from '../../hooks/usePersistedFilters';
import { useScopeView } from '../../hooks/useScopeView';
import { DollarSign, Users, Clock, TrendingUp, Receipt, Percent } from 'lucide-react';
import { useSheetData } from '../../hooks/useSheetData';
import type { CostoRecord, FinancialModel, ProjectRecord } from '../../utils/dataTransforms';
import { isActive } from '../../utils/projectStatus';
import { splitMulti } from '../../utils/dataTransforms';
import { applyFinancialModel, formatMoney, formatMoneyFull } from '../../utils/costEngine';
import Header from '../layout/Header';
import FilterDropdowns from '../ui/FilterDropdowns';
import KPICard from '../ui/KPICard';
import ChartCard from '../charts/ChartCard';
import GlossaryTooltip from '../ui/GlossaryTooltip';
import Gate from '../auth/Gate';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { Cell } from '../../utils/recharts';
import { infoFor } from '../../data/glossary';

const COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#2dd4bf', '#818cf8', '#e879f9', '#34d399', '#94a3b8', '#a78bfa'];

export default function CostosSection() {
  const { isScoped } = useScopeView();
  const costos = useSheetData<CostoRecord>('/api/costos');
  const projects = useSheetData<ProjectRecord>('/api/proyectos');
  const modelo = useSheetData<FinancialModel>('/api/costos-modelo');
  const { state: persisted, setState: setPersisted, clear: clearPersisted } = usePersistedFilters<{
    pmFilter: Record<string, string[]>;
  }>('costos', { pmFilter: {} });
  const pmFilter = persisted.pmFilter;
  const setPmFilter = useCallback(
    (next: Record<string, string[]>) => setPersisted((prev) => ({ ...prev, pmFilter: next })),
    [setPersisted],
  );

  const loading = costos.loading || projects.loading || modelo.loading;
  const error = costos.error || projects.error;

  function refetchAll() { costos.refetch(); projects.refetch(); modelo.refetch(); }

  const financialModel = modelo.data[0] ?? null;

  const pmOptions = useMemo(() =>
    [...new Set(projects.data.flatMap((p) => splitMulti(p.pm)))]
      .sort()
      .map((v) => ({ value: v, label: v })),
  [projects.data]);

  const filterConfigs = useMemo(
    () => (isScoped ? [] : [{ key: 'pm', label: 'PM', options: pmOptions, multi: false }]),
    [pmOptions, isScoped],
  );

  const activePmName = pmFilter.pm?.[0];

  // KPIs
  const kpis = useMemo(() => {
    const totalMensual = costos.data.reduce((s, c) => s + c.total, 0);
    const totalRecursos = costos.data.reduce((s, c) => s + c.recursos, 0);
    const totalHoras = costos.data.reduce((s, c) => s + c.horas, 0);
    const avgCostoHora = costos.data.length > 0
      ? Math.round(costos.data.reduce((s, c) => s + c.costoHora * c.recursos, 0) / Math.max(1, totalRecursos))
      : 0;
    return { totalMensual, totalRecursos, totalHoras, avgCostoHora };
  }, [costos.data]);

  // Donut: costo por rol
  const costoByRol = useMemo(() => {
    return costos.data
      .filter((c) => c.total > 0)
      .map((c) => ({ name: c.rol, value: c.total }))
      .sort((a, b) => b.value - a.value);
  }, [costos.data]);

  // Bar: costo/hora por rol
  const costoHoraByRol = useMemo(() => {
    return costos.data
      .filter((c) => c.costoHora > 0)
      .map((c) => ({ name: c.rol, costoHora: c.costoHora, recursos: c.recursos }))
      .sort((a, b) => b.costoHora - a.costoHora);
  }, [costos.data]);

  // Estimated cost per project: match roles to project team
  const projectCosts = useMemo(() => {
    if (!costos.data.length || !projects.data.length) return [];

    // Build a lookup: lowercase role keyword → CostoRecord
    const roleLookup = new Map<string, CostoRecord>();
    for (const c of costos.data) {
      const key = c.rol.toLowerCase();
      roleLookup.set(key, c);
    }

    // Helper to find cost by fuzzy role match
    function findCost(role: string): CostoRecord | null {
      const lower = role.toLowerCase();
      // Direct match
      if (roleLookup.has(lower)) return roleLookup.get(lower)!;
      // Partial match
      for (const [key, val] of roleLookup) {
        if (key.includes(lower) || lower.includes(key)) return val;
        if (key.includes('arquitecto') && lower.includes('arquitecto')) return val;
        if (key.includes('developer') && lower.includes('developer')) return val;
      }
      return null;
    }

    // For each project, estimate monthly cost based on team composition.
    // PM filter narrows the iterated projects, but divisors below still use the
    // full projects.data so cost shares aren't inflated when one PM is selected.
    const pmSelected = pmFilter.pm || [];
    return projects.data
      .filter((p) => isActive(p.estatus))
      .filter((p) => !pmSelected.length || splitMulti(p.pm).some((pm) => pmSelected.includes(pm)))
      .map((p) => {
        let estimatedMonthlyCost = 0;
        const breakdown: { role: string; cost: number }[] = [];
        const splitNames = (v: string) => (v || '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-');

        // Arquitecto(s) — multi: cada arquitecto suma su costo prorrateado.
        const arqCost = findCost('arquitecto');
        if (arqCost) {
          for (const arq of splitNames(p.arquitecto)) {
            const arqProjects = projects.data.filter((x) => splitNames(x.arquitecto).includes(arq) && x.estatus !== 'Done').length;
            const share = arqCost.costoMensual / Math.max(1, arqProjects);
            estimatedMonthlyCost += share;
            breakdown.push({ role: `Arquitecto (${arq})`, cost: share });
          }
        }

        // PM(s)
        const pmCost = findCost('project manager');
        if (pmCost) {
          for (const pm of splitNames(p.pm)) {
            const pmProjects = projects.data.filter((x) => splitNames(x.pm).includes(pm) && x.estatus !== 'Done').length;
            const share = pmCost.costoMensual / Math.max(1, pmProjects);
            estimatedMonthlyCost += share;
            breakdown.push({ role: `PM (${pm})`, cost: share });
          }
        }

        // Devs
        const devCost = findCost('developer');
        if (devCost) {
          for (const dev of p.devs) {
            const devProjects = projects.data.filter((x) => x.devs.includes(dev) && x.estatus !== 'Done').length;
            const share = devCost.costoMensual / Math.max(1, devProjects);
            estimatedMonthlyCost += share;
            breakdown.push({ role: `DEV (${dev})`, cost: share });
          }
        }

        return {
          id: p.id,
          folio: p.folio,
          actividad: p.actividad,
          estatus: p.estatus,
          estimatedMonthlyCost: Math.round(estimatedMonthlyCost),
          breakdown,
          teamSize: splitNames(p.arquitecto).length + splitNames(p.pm).length + p.devs.length,
        };
      })
      .sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost);
  }, [costos.data, projects.data, pmFilter]);

  // Cost by cuatrimestre
  const costByHito = useMemo(() => {
    const hitoMap = new Map<string, number>();
    for (const pc of projectCosts) {
      const p = projects.data.find((x) => x.id === pc.id);
      const cuatri = p?.cuatrimestre || 'Sin cuatrimestre';
      hitoMap.set(cuatri, (hitoMap.get(cuatri) || 0) + pc.estimatedMonthlyCost);
    }
    return [...hitoMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projectCosts, projects.data]);

  if (loading) {
    return (
      <div>
        <Header title="Costos" onRefresh={refetchAll} loading />
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

  if (costos.forbidden || modelo.forbidden) {
    return (
      <div>
        <Header title="Costos" />
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-200 font-medium mb-1">Sin acceso a costos</p>
          <p className="text-sm text-slate-500">
            No tienes permiso para ver la información financiera. Contacta a un administrador si crees que es un error.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Costos" onRefresh={refetchAll} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={refetchAll} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Header title="Costos" onRefresh={refetchAll} loading={loading} />
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
          Mostrando costos de proyectos del PM <span className="font-semibold">{activePmName}</span> (KPIs y tablas de roles son org-wide)
        </p>
      )}

      {/* KPIs */}
      <div className={`grid grid-cols-2 ${financialModel ? 'xl:grid-cols-6' : 'xl:grid-cols-4'} gap-3 sm:gap-4 mb-6`}>
        <KPICard title="Costo mensual total" value={formatMoney(kpis.totalMensual)} icon={DollarSign} accentColor="text-green-400" info={infoFor('costos-kpi-mensual-total')} />
        <KPICard title="Total recursos" value={kpis.totalRecursos} icon={Users} accentColor="text-blue-400" info={infoFor('costos-kpi-recursos')} />
        <KPICard title="Horas totales/mes" value={kpis.totalHoras} icon={Clock} accentColor="text-cyan-400" info={infoFor('costos-kpi-horas')} />
        <KPICard title="Costo/hora promedio" value={`$${kpis.avgCostoHora}`} icon={TrendingUp} accentColor="text-amber-400" info={infoFor('costos-kpi-costo-hora-promedio')} />
        {financialModel && (
          <>
            <KPICard title="Precio al cliente/mes" value={formatMoney(applyFinancialModel(kpis.totalMensual, financialModel).precioCliente)} icon={Receipt} accentColor="text-purple-400" info={infoFor('costos-kpi-precio-cliente')} />
            <KPICard title="Margen bruto" value={`${Math.round(financialModel.margenRate * 100)}%`} icon={Percent} accentColor="text-pink-400" info={infoFor('costos-kpi-margen-bruto')} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Cost distribution donut */}
        <ChartCard title="Distribución de Costo Mensual por Rol" info={infoFor('costos-distribucion-rol')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={costoByRol} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                {costoByRol.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: unknown) => [formatMoney(value as number), 'Costo']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 justify-center">
            {costoByRol.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                {entry.name} ({formatMoney(entry.value)})
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Cost per hour by role */}
        <ChartCard title="Costo por Hora por Rol" info={infoFor('costos-costo-hora-rol')}>
          <ResponsiveContainer width="100%" height={Math.max(300, costoHoraByRol.length * 30 + 40)}>
            <BarChart data={costoHoraByRol} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: unknown) => [`$${value}`, 'Costo/hora']}
              />
              <Bar dataKey="costoHora" radius={[0, 6, 6, 0]} name="Costo/hora">
                {costoHoraByRol.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cost by hito */}
      {costByHito.length > 0 && (
        <div className="mb-6">
          <ChartCard title="Costo Estimado Mensual por Q de entrega (proyectos activos)" info={infoFor('costos-por-hito')}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costByHito} margin={{ left: 10, right: 20 }}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value: unknown) => [formatMoney(value as number), 'Costo est.']}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Costo estimado">
                  {costByHito.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Financial model: waterfall + table */}
      {financialModel && (() => {
        const pricing = applyFinancialModel(kpis.totalMensual, financialModel);
        const waterfallData = [
          { name: 'Valor experiencia', value: pricing.valorExperiencia, pct: `${Math.round(financialModel.valorExperienciaRate * 100)}% del costo` },
          { name: '+ Admin', value: pricing.costoAdministrativo, pct: `${Math.round(financialModel.costoAdminRate * 100)}%` },
          { name: '+ Margen', value: pricing.margen, pct: `${Math.round(financialModel.margenRate * 100)}%` },
          { name: '+ IVA', value: pricing.iva, pct: `${Math.round(financialModel.ivaRate * 100)}%` },
          { name: 'Precio cliente', value: pricing.precioCliente, pct: 'TOTAL' },
        ];
        const WATERFALL_COLORS = ['#a78bfa', '#60a5fa', '#4ade80', '#fbbf24', '#c084fc'];
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ChartCard title="Composición del Precio al Cliente" info={infoFor('costos-composicion-precio')}>
              <p className="text-[11px] text-slate-500 mb-3">Aplicado al costo mensual total ({formatMoney(kpis.totalMensual)})</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={waterfallData} margin={{ left: 10, right: 20, top: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatMoney(v as number)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: unknown, _name, item) => [`${formatMoney(value as number)} (${item?.payload?.pct ?? ''})`, 'Valor']}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {waterfallData.map((_, idx) => (
                      <Cell key={idx} fill={WATERFALL_COLORS[idx]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <Gate resource="block:costos-modelo-financiero">
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <h3 className="text-sm font-medium text-slate-300">Modelo Financiero (Excel)</h3>
                <GlossaryTooltip id="costos-modelo-financiero" />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider py-2">Concepto</th>
                    <th className="text-center text-[10px] font-medium text-slate-500 uppercase tracking-wider py-2">%</th>
                    <th className="text-right text-[10px] font-medium text-slate-500 uppercase tracking-wider py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {financialModel.steps.map((s, idx) => {
                    const isBold = s.kind === 'total' || s.kind === 'subtotal';
                    const isTotal = s.kind === 'total';
                    const pct = s.factor !== null ? `${(s.factor * 100).toFixed(0)}%` : '—';
                    return (
                      <tr key={idx} className={`border-b border-slate-700/30 ${isTotal ? 'bg-slate-700/30' : ''}`}>
                        <td className={`py-2 ${isBold ? 'font-bold text-white' : 'text-slate-300'}`}>{s.label}</td>
                        <td className="py-2 text-center text-slate-400">{pct}</td>
                        <td className={`py-2 text-right font-mono text-xs ${isBold ? 'font-bold' : ''} ${isTotal ? 'text-green-400' : 'text-slate-200'}`}>{formatMoneyFull(s.value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </Gate>
          </div>
        );
      })()}

      {/* Roles table */}
      <div className="flex items-center gap-1.5 mb-3">
        <h3 className="text-sm font-medium text-slate-300">Detalle por Rol</h3>
        <GlossaryTooltip id="costos-detalle-rol" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50 mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Rol</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Recursos</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Hrs/recurso</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">$/Mensual</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">$/Hora</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Hrs total</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {costos.data.map((c) => (
              <tr key={c.rol} className="bg-slate-800/30">
                <td className="px-4 py-3 text-slate-200 font-medium">{c.rol}</td>
                <td className="px-3 py-3 text-center text-slate-300">{c.recursos}</td>
                <td className="px-3 py-3 text-center text-slate-300">{c.horasRecurso}</td>
                <td className="px-3 py-3 text-right text-slate-300">{formatMoney(c.costoMensual)}</td>
                <td className="px-3 py-3 text-right text-slate-300">${c.costoHora.toFixed(0)}</td>
                <td className="px-3 py-3 text-center text-slate-300">{c.horas}</td>
                <td className="px-3 py-3 text-right text-white font-medium">{formatMoney(c.total)}</td>
              </tr>
            ))}
            <tr className="bg-slate-700/30 font-bold">
              <td className="px-4 py-3 text-white">Total</td>
              <td className="px-3 py-3 text-center text-white">{kpis.totalRecursos}</td>
              <td className="px-3 py-3 text-center text-slate-400">—</td>
              <td className="px-3 py-3 text-right text-slate-400">—</td>
              <td className="px-3 py-3 text-right text-white">${kpis.avgCostoHora}</td>
              <td className="px-3 py-3 text-center text-white">{kpis.totalHoras}</td>
              <td className="px-3 py-3 text-right text-green-400">{formatMoney(kpis.totalMensual)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Project cost estimates */}
      {projectCosts.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 mb-3">
            <h3 className="text-sm font-medium text-slate-300">Costo Estimado por Proyecto (activos)</h3>
            <GlossaryTooltip id="costos-por-proyecto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectCosts.slice(0, 12).map((pc) => {
              const pricing = financialModel ? applyFinancialModel(pc.estimatedMonthlyCost, financialModel) : null;
              return (
                <a key={pc.id} href={`/proyecto/${pc.id}`} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500 font-mono">{pc.folio}</p>
                      <p className="text-sm font-medium text-slate-200 truncate">{pc.actividad}</p>
                    </div>
                    <p className="text-sm font-bold text-green-400 shrink-0">{formatMoney(pc.estimatedMonthlyCost)}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">{pc.teamSize} personas · {pc.estatus}</p>
                  {pricing && (
                    <div className="flex items-center justify-between text-[10px] mb-2 pb-2 border-b border-slate-700/50">
                      <span className="text-slate-500">Precio cliente</span>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-300 font-medium">{formatMoney(pricing.precioCliente)}/mes</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${pricing.utilidad >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                          {pricing.utilidad >= 0 ? '+' : ''}{formatMoney(pricing.utilidad)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {pc.breakdown.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">{b.role}</span>
                        <span className="text-slate-400">{formatMoney(b.cost)}/mes</span>
                      </div>
                    ))}
                  </div>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
