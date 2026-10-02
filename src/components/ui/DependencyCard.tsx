import { Link2, ArrowRight, AlertCircle } from 'lucide-react';
import type { ProjectDependency } from '../../utils/dependencies';
import { blockerStatusMeta } from '../../utils/dependencies';
import { Avatar } from './Avatar';
interface Props {
  dependency: ProjectDependency;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function DependencyCard({ dependency: d }: Props) {
  const hasUnresolved = d.unresolvedBlockerCount > 0;
  const borderColor = hasUnresolved ? 'border-amber-500/30' : 'border-green-500/20';

  return (
    <div className={`bg-slate-800 border rounded-xl p-4 ${borderColor}`}>
      {/* Dependent header */}
      <div className="flex items-start gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <a
              href={`/pronosticos/${d.dependent.id}`}
              className="text-sm font-medium text-white hover:text-blue-300 transition-colors truncate"
              title={d.dependent.actividad}
            >
              {d.dependent.actividad}
            </a>
          </div>
          {d.dependent.hito && (
            <p className="text-[11px] text-slate-500 ml-5 truncate">{d.dependent.hito}</p>
          )}
        </div>
        {hasUnresolved && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 shrink-0">
            <AlertCircle className="w-2.5 h-2.5" /> {d.unresolvedBlockerCount} pend.
          </span>
        )}
      </div>

      {/* Impact summary */}
      {(d.worstBlockerDate || d.additionalSlippageDays) && (
        <div className="bg-slate-900/40 rounded-lg p-3 mb-3 space-y-1 text-xs">
          {d.worstBlockerDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Bloqueador más tardío</span>
              <span className="text-slate-200 font-medium">{formatDate(d.worstBlockerDate)}</span>
            </div>
          )}
          {d.effectiveStartDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Inicio efectivo</span>
              <span className="text-slate-200 font-medium">{formatDate(d.effectiveStartDate)}</span>
            </div>
          )}
          {d.additionalSlippageDays !== null && d.additionalSlippageDays !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Cascada esperada</span>
              <span className={`font-semibold ${d.additionalSlippageDays > 14 ? 'text-red-400' : d.additionalSlippageDays > 3 ? 'text-amber-400' : 'text-slate-200'}`}>
                +{d.additionalSlippageDays}d
              </span>
            </div>
          )}
        </div>
      )}

      {/* Blockers list */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Depende de</p>
        <ul className="space-y-1.5">
          {d.blockers.map((b, i) => {
            const meta = blockerStatusMeta(b.status);
            return (
              <li key={i} className="flex items-center gap-2 text-[12px]">
                <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                {b.target ? (
                  <a
                    href={`/pronosticos/${b.target.id}`}
                    className="text-slate-300 hover:text-blue-300 truncate transition-colors flex-1"
                    title={b.target.actividad}
                  >
                    {b.target.actividad}
                  </a>
                ) : b.person ? (
                  <a
                    href={`/persona/${b.person.id}`}
                    className="flex items-center gap-2 text-slate-300 hover:text-blue-300 truncate transition-colors flex-1 min-w-0"
                    title={b.person.name}
                  >
                    <Avatar name={b.person.name} image={b.person.image} size={20} />
                    <span className="truncate">{b.person.name}</span>
                  </a>
                ) : (
                  <span className="text-slate-500 truncate flex-1 italic" title={b.rawText}>
                    "{b.rawText}"
                  </span>
                )}
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${meta.bg} ${meta.color}`}>
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
