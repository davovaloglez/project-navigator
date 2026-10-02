import { useMemo, useCallback } from 'react';
import { DollarSign, TrendingUp, Pause, Activity, ArrowUpDown, Check } from 'lucide-react';
import type { ProjectRecord, CostoRecord } from '../../../utils/dataTransforms';
import { estimatePersonCost, formatMoney, formatMoneyFull } from '../../../utils/costEngine';
import { usePersistedFilters } from '../../../hooks/usePersistedFilters';
import Avatar from '../../ui/Avatar';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import ChartCard from '../../charts/ChartCard';
import { infoFor } from '../../../data/glossary';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Cell } from '../../../utils/recharts';

const ROLE_COLORS = ['#60a5fa', '#4ade80', '#fbbf24', '#fb923c', '#f87171', '#c084fc', '#2dd4bf', '#818cf8', '#e879f9', '#34d399', '#a78bfa', '#fcd34d'];

export interface CostosMember {
  id: string;
  fullName: string;
  image: string | null;
  active: boolean;
  roleName?: string;
  title?: string;
  department?: string;
}

interface Props {
  equipo: CostosMember[];
  projects: ProjectRecord[];
  costos: CostoRecord[];
  costosLoading: boolean;
}

interface PersonCostRow {
  member: CostosMember;
  monthlyCost: number;
  costoHora: number;
  detectedRole: string;
  activeProjects: number;
  absorbed: number;
  idle: number;
}

type SortBy = 'cost' | 'utilization' | 'projects' | 'name';

interface Filters {
  showInactive: boolean;
  sortBy: SortBy;
}

const DEFAULT_FILTERS: Filters = { showInactive: false, sortBy: 'cost' };

const SORT_LABEL: Record<SortBy, string> = {
  cost: 'Costo',
  utilization: 'Utilización',
  projects: 'Proyectos',
  name: 'Nombre',
};

/**
 * Dashboard de costos AGREGADO del equipo (NAV-74, idea #4). Cruza el
 * registro `equipo` con `estimatePersonCost` para responder: cuánto cuesta
 * el equipo entero, cómo se reparte por rol y quién está absorbido vs idle.
 *
 * Permiso: render gated upstream por `data:costos`. Si llega aquí, asume
 * que el rol puede ver costos.
 */
export default function CostosEquipo({ equipo, projects, costos, costosLoading }: Props) {
  const { state: filters, setState: setFilters } = usePersistedFilters<Filters>(
    'equipo-costos',
    DEFAULT_FILTERS,
  );
  const setShowInactive = useCallback(
    (v: boolean) => setFilters((p) => ({ ...p, showInactive: v })),
    [setFilters],
  );
  const setSortBy = useCallback(
    (v: SortBy) => setFilters((p) => ({ ...p, sortBy: v })),
    [setFilters],
  );

  const personRows = useMemo<PersonCostRow[]>(() => {
    const base = filters.showInactive ? equipo : equipo.filter((m) => m.active);
    return base.map((member) => {
      const cost = estimatePersonCost(member.id, projects, costos);
      const absorbed = cost.projectsCost.length > 0 ? cost.monthlyCost : 0;
      const idle = cost.monthlyCost - absorbed;
      return {
        member,
        monthlyCost: cost.monthlyCost,
        costoHora: cost.costoHora,
        detectedRole: cost.role || 'Sin rol detectado',
        activeProjects: cost.projectsCost.length,
        absorbed,
        idle,
      };
    });
  }, [equipo, projects, costos, filters.showInactive]);

  const sortedRows = useMemo(() => {
    return [...personRows].sort((a, b) => {
      switch (filters.sortBy) {
        case 'name':
          return a.member.fullName.localeCompare(b.member.fullName);
        case 'projects':
          return b.activeProjects - a.activeProjects;
        case 'utilization': {
          // Idle primero, luego baja utilización (proxy: pocos proyectos)
          if (a.idle !== b.idle) return b.idle - a.idle;
          return a.activeProjects - b.activeProjects;
        }
        case 'cost':
        default:
          return b.monthlyCost - a.monthlyCost;
      }
    });
  }, [personRows, filters.sortBy]);

  // KPIs agregados
  const summary = useMemo(() => {
    const totalCost = personRows.reduce((s, r) => s + r.monthlyCost, 0);
    const totalAbsorbed = personRows.reduce((s, r) => s + r.absorbed, 0);
    const totalIdle = personRows.reduce((s, r) => s + r.idle, 0);
    const idlePeople = personRows.filter((r) => r.idle > 0).length;
    const peopleWithCost = personRows.filter((r) => r.monthlyCost > 0).length;
    const utilization = totalCost > 0 ? Math.round((totalAbsorbed / totalCost) * 100) : 0;
    // Tasa promedio/hr ponderada por costo mensual (las personas más caras pesan más).
    const weightedHourly = totalCost > 0
      ? personRows.reduce((s, r) => s + r.costoHora * r.monthlyCost, 0) / totalCost
      : 0;
    return {
      totalCost,
      totalAbsorbed,
      totalIdle,
      idlePeople,
      peopleWithCost,
      utilization,
      weightedHourly: Math.round(weightedHourly),
    };
  }, [personRows]);

  // Distribución por roleName (banda)
  const byRole = useMemo(() => {
    const map = new Map<string, { cost: number; people: number }>();
    for (const r of personRows) {
      if (r.monthlyCost <= 0) continue;
      const role = r.member.roleName || 'Sin banda asignada';
      const curr = map.get(role) || { cost: 0, people: 0 };
      curr.cost += r.monthlyCost;
      curr.people += 1;
      map.set(role, curr);
    }
    return [...map.entries()]
      .map(([role, v], i) => ({
        role,
        cost: v.cost,
        people: v.people,
        color: ROLE_COLORS[i % ROLE_COLORS.length],
        share: summary.totalCost > 0 ? v.cost / summary.totalCost : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [personRows, summary.totalCost]);

  const noData = costos.length === 0 && !costosLoading;

  return (
    <div className="space-y-4">
      {/* Strip KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={DollarSign}
          value={formatMoney(summary.totalCost)}
          label="Costo total/mes"
          color="text-green-400"
          tooltipId="equipo-costos-total"
        />
        <SummaryCard
          icon={TrendingUp}
          value={formatMoney(summary.totalAbsorbed)}
          subValue={`${summary.utilization}%`}
          label="Absorbido por proyectos"
          color="text-blue-400"
          tooltipId="equipo-costos-absorbido"
        />
        <SummaryCard
          icon={Pause}
          value={formatMoney(summary.totalIdle)}
          subValue={`${summary.idlePeople} ${summary.idlePeople === 1 ? 'persona' : 'personas'}`}
          label="Costo idle"
          color={summary.totalIdle > 0 ? 'text-amber-400' : 'text-slate-400'}
          highlight={summary.totalIdle > 0}
          tooltipId="equipo-costos-idle"
        />
        <SummaryCard
          icon={Activity}
          value={`$${summary.weightedHourly}/hr`}
          label="Tasa prom. ponderada"
          color="text-cyan-400"
          tooltipId="equipo-costos-tasa-prom"
        />
      </div>

      {noData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
          La hoja de costos vino vacía. Verifica permisos del service account o que la pestaña <code className="text-amber-200">Costos</code> tenga las filas 1-12 pobladas.
        </div>
      )}

      {/* Distribución por rol */}
      {byRole.length > 0 && (
        <ChartCard title="Distribución por banda de rol" info={infoFor('equipo-costos-distribucion')}>
          <ResponsiveContainer width="100%" height={Math.max(200, byRole.length * 40 + 40)}>
            <BarChart data={byRole} layout="vertical" margin={{ left: 20, right: 60 }}>
              <XAxis
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatMoney(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="role"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: unknown, _n, item) => {
                  const payload = (item as { payload?: { people?: number; share?: number } })?.payload;
                  const people = payload?.people ?? 0;
                  const share = payload?.share ?? 0;
                  return [
                    `${formatMoneyFull(Number(value))} · ${people} ${people === 1 ? 'persona' : 'personas'} · ${(share * 100).toFixed(1)}%`,
                    'Costo mensual',
                  ];
                }}
                cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              />
              <Bar dataKey="cost" radius={[0, 6, 6, 0]} name="Costo mensual">
                {byRole.map((r) => (
                  <Cell key={r.role} fill={r.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Controles tabla */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Costo por persona</h3>
          <GlossaryTooltip id="equipo-costos-tabla" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowInactive(!filters.showInactive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filters.showInactive
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center ${
                filters.showInactive ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
              }`}
            >
              {filters.showInactive && <Check className="w-3 h-3 text-white" />}
            </span>
            Incluir inactivos
          </button>
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Ordenar</span>
            {(Object.keys(SORT_LABEL) as SortBy[]).map((v) => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filters.sortBy === v ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                {SORT_LABEL[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla por persona */}
      {sortedRows.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-400">Sin personas para mostrar.</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="grid gap-3 px-4 py-2 border-b border-slate-700/50 bg-slate-800/80 text-[10px] text-slate-500 uppercase tracking-wider"
               style={{ gridTemplateColumns: '1fr 100px 80px 200px 80px' }}>
            <div>Persona</div>
            <div className="text-right">Costo/mes</div>
            <div className="text-right">$/hr</div>
            <div>Utilización</div>
            <div className="text-right">Proyectos</div>
          </div>
          <div className="divide-y divide-slate-700/30">
            {sortedRows.map((row) => (
              <PersonRow key={row.member.id} row={row} maxCost={summary.totalCost > 0 ? Math.max(...sortedRows.map(r => r.monthlyCost)) : 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PersonRow({ row, maxCost }: { row: PersonCostRow; maxCost: number }) {
  const { member, monthlyCost, costoHora, activeProjects, idle } = row;
  const utilization = monthlyCost > 0 ? (idle === 0 ? 100 : 0) : 0;
  const costWidth = maxCost > 0 ? Math.max(2, (monthlyCost / maxCost) * 100) : 0;

  return (
    <div
      className="grid gap-3 px-4 py-2 items-center hover:bg-slate-700/20 transition-colors"
      style={{ gridTemplateColumns: '1fr 100px 80px 200px 80px' }}
    >
      <a
        href={`/persona/${member.id}`}
        className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
      >
        <Avatar name={member.fullName} image={member.image} size={28} />
        <div className="min-w-0">
          <p className="text-sm text-slate-200 truncate">
            {member.fullName}
            {!member.active && <span className="ml-1.5 text-[9px] text-amber-400">Inactivo</span>}
          </p>
          <p className="text-[10px] text-slate-500 truncate">
            {member.roleName || row.detectedRole || '—'}
          </p>
        </div>
      </a>
      <div className="text-right">
        <p className="text-sm font-medium text-slate-200">{monthlyCost > 0 ? formatMoney(monthlyCost) : '—'}</p>
        {monthlyCost > 0 && (
          <div className="mt-0.5 ml-auto w-16 bg-slate-700/40 rounded-full h-0.5">
            <div className="h-0.5 rounded-full bg-green-500/70" style={{ width: `${costWidth}%` }} />
          </div>
        )}
      </div>
      <div className="text-right text-xs text-slate-300">
        {costoHora > 0 ? `$${costoHora}` : '—'}
      </div>
      <div>
        {monthlyCost > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-4 bg-slate-700/40 rounded overflow-hidden flex">
              <div className="h-full bg-blue-500/60" style={{ width: `${utilization}%` }} title="Absorbido por proyectos activos" />
              <div className="h-full bg-amber-500/60" style={{ width: `${100 - utilization}%` }} title="Idle (sin proyectos activos)" />
            </div>
            <span className={`text-[10px] font-medium shrink-0 w-12 text-right ${utilization === 100 ? 'text-blue-300' : 'text-amber-300'}`}>
              {utilization}%
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-600">Sin costo</span>
        )}
      </div>
      <div className="text-right text-xs text-slate-200 font-medium">
        {activeProjects}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  value,
  subValue,
  label,
  color,
  highlight = false,
  tooltipId,
}: {
  icon: typeof DollarSign;
  value: string;
  subValue?: string;
  label: string;
  color: string;
  highlight?: boolean;
  tooltipId?: string;
}) {
  return (
    <div
      className={`bg-slate-800 border rounded-xl p-3 flex items-center gap-3 ${
        highlight ? 'border-amber-500/30' : 'border-slate-700/50'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
          {subValue && <span className="text-[10px] text-slate-500 shrink-0">{subValue}</span>}
        </div>
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-slate-500 truncate">{label}</p>
          {tooltipId && <GlossaryTooltip id={tooltipId} />}
        </div>
      </div>
    </div>
  );
}
