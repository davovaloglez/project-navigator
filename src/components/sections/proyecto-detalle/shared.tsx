import { Mail } from 'lucide-react';
import type { ProjectRecord } from '../../../utils/dataTransforms';
import { calcHealthScore } from '../../../utils/healthScore';
import PageLink from '../../auth/PageLink';

const DAY_MS = 86400000;

/** Subconjunto del registro `equipo` (GET /api/equipo) usado en el detalle. */
export interface EquipoMember {
  id: string;
  fullName: string;
  title: string;
  roleName: string;
  email: string;
  managerName: string;
  active: boolean;
  hasLogin: boolean;
}

export type RelatedCriterion = 'epica' | 'producto' | 'aliado' | 'arquitecto' | 'cuatrimestre';
export const RELATED_OPTIONS: { value: RelatedCriterion; label: string }[] = [
  { value: 'epica', label: 'Épica' },
  { value: 'producto', label: 'Producto' },
  { value: 'aliado', label: 'Cliente' },
  { value: 'arquitecto', label: 'Arquitecto' },
  { value: 'cuatrimestre', label: 'Q de entrega' },
];

export function daysFromNow(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / DAY_MS);
}

/** Métricas derivadas del proyecto, compartidas por el header y las tabs. */
export function projectStats(project: ProjectRecord) {
  const progressPct = Math.round(project.progreso * 100);
  const health = calcHealthScore(project);
  const daysLeft = daysFromNow(project.finEstimado);
  const isOverdue = daysLeft !== null && daysLeft < 0 && project.estatus !== 'Done';
  const isDone = project.estatus === 'Done';
  const gaugeData = [{
    name: 'Progreso',
    value: progressPct,
    fill: progressPct >= 80 ? '#4ade80' : progressPct >= 40 ? '#facc15' : '#f87171',
  }];
  return { progressPct, health, daysLeft, isOverdue, isDone, gaugeData };
}

/**
 * Tarjeta de persona del proyecto. Si `record` resolvió contra el registro
 * `equipo` muestra título y email; si no, degrada a nombre + rol del proyecto.
 */
export function TeamMemberCard({
  record,
  fallbackName,
  role,
}: {
  record: EquipoMember | null;
  fallbackName: string;
  role: string;
}) {
  const name = (record?.fullName || fallbackName || '').trim();
  if (!name || name === '-') return null;
  // Preferimos `equipo.id` cuando lo tenemos resuelto (URL más estable y
  // amigable al cruzar fuentes); cae a nombre encodeado si no hay record.
  const target = record?.id || encodeURIComponent(name);
  return (
    <PageLink
      pageKey="equipo"
      href={`/persona/${target}`}
      className="block p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600 transition-colors"
      deniedClassName="block p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
          {name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200 truncate">{name}</p>
          <p className="text-xs text-slate-500 truncate">
            {role}
            {record?.title ? ` · ${record.title}` : ''}
          </p>
        </div>
        {record && !record.active && (
          <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 bg-amber-500/15 text-amber-400">
            Inactivo
          </span>
        )}
      </div>
      {record?.email && (
        <p className="mt-2 pl-12 flex items-center gap-1 text-[11px] text-slate-500 truncate">
          <Mail className="w-3 h-3 shrink-0" />
          {record.email}
        </p>
      )}
    </PageLink>
  );
}
