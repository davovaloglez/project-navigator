import { useMemo } from 'react';
import { Users, Briefcase, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import type { ProjectRecord, CostoRecord, TareaRecord } from '../../../utils/dataTransforms';
import { estimateProjectCost, formatMoney } from '../../../utils/costEngine';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import { TeamMemberCard, type EquipoMember } from './shared';

interface Props {
  project: ProjectRecord;
  allProjects: ProjectRecord[];
  costos: CostoRecord[];
  projectTareas: TareaRecord[];
  registry: EquipoMember[];
}

export default function DetalleTab({ project, allProjects, costos, projectTareas, registry }: Props) {
  const byId = useMemo(() => {
    const m = new Map<string, EquipoMember>();
    for (const e of registry) m.set(e.id, e);
    return m;
  }, [registry]);

  const costEstimate = useMemo(
    () => estimateProjectCost(project, allProjects, costos),
    [project, allProjects, costos],
  );

  const effort = useMemo(() => {
    const asignadosPts = projectTareas.length
      ? projectTareas.reduce((s, t) => s + (t.puntos || 0), 0)
      : (project.puntos || 0);
    const invertidosPts = projectTareas.reduce((s, t) => s + (t.tracked || 0), 0);
    const hasInvertido = projectTareas.some((t) => (t.tracked || 0) > 0);
    return { asignadosPts, invertidosPts, hasInvertido };
  }, [projectTareas, project]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Equipo */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Equipo
        </h3>
        <div className="space-y-2">
          {([
            { role: 'Product Owner', ids: project.poIds, raw: project.po },
            { role: 'PM', ids: project.pmIds, raw: project.pm },
            { role: 'Arquitecto', ids: project.arquitectoIds, raw: project.arquitecto },
            { role: 'Developer', ids: project.devIds, raw: project.devs.join(', ') },
            { role: 'SQA', ids: project.sqaIds, raw: project.sqa },
          ]).flatMap(({ role, ids, raw }) => {
            const names = raw.split(',').map((s) => s.trim()).filter((s) => s && s !== '-');
            const items = registry.length && ids.length
              ? ids.map((id) => ({ key: `${role}-${id}`, record: byId.get(id) ?? null, name: byId.get(id)?.fullName ?? id }))
              : names.map((n, i) => ({ key: `${role}-${n}-${i}`, record: null as EquipoMember | null, name: n }));
            return items.map((it) => (
              <TeamMemberCard key={it.key} record={it.record} fallbackName={it.name} role={role} />
            ));
          })}
        </div>
      </div>

      <div className="space-y-4">
        {/* Detalles */}
        {(project.producto || project.servicio || project.aliado || project.cuatrimestre || project.sprint) && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Detalles
            </h3>
            <dl className="space-y-1.5 text-sm">
              {project.producto && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Producto</dt><dd className="text-slate-200 text-right">{project.producto}</dd></div>
              )}
              {project.servicio && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Servicio</dt><dd className="text-slate-200 text-right">{project.servicio}</dd></div>
              )}
              {project.aliado && project.aliado !== 'Ninguno' && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Cliente</dt><dd className="text-slate-200 text-right">{project.aliado}</dd></div>
              )}
              {project.cuatrimestre && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Q de entrega</dt><dd className="text-slate-200 text-right">{project.cuatrimestre}</dd></div>
              )}
              {project.sprint && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Sprint</dt><dd className="text-slate-200 text-right">{project.sprint}</dd></div>
              )}
            </dl>
          </div>
        )}

        {/* Esfuerzo: Asignado vs Invertido */}
        {effort.asignadosPts > 0 && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Esfuerzo
              <GlossaryTooltip id="proyecto-esfuerzo" />
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-[72px_1fr_1fr_1fr] items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider">
                <span />
                <span className="text-right">Pts</span>
                <span className="text-right">Horas</span>
                <span className="text-right">Días</span>
              </div>
              <div className="grid grid-cols-[72px_1fr_1fr_1fr] items-center gap-2">
                <span className="text-[11px] text-slate-400">Asignado</span>
                <span className="text-sm font-bold text-amber-400 text-right">{effort.asignadosPts}</span>
                <span className="text-sm font-semibold text-slate-200 text-right">{effort.asignadosPts}</span>
                <span className="text-sm font-semibold text-slate-200 text-right">{(effort.asignadosPts / 8).toFixed(1)}</span>
              </div>
              {effort.hasInvertido && (
                <div className="grid grid-cols-[72px_1fr_1fr_1fr] items-center gap-2">
                  <span className="text-[11px] text-slate-400">Invertido</span>
                  <span className="text-sm font-bold text-cyan-400 text-right">{effort.invertidosPts}</span>
                  <span className="text-sm font-semibold text-slate-200 text-right">{effort.invertidosPts}</span>
                  <span className="text-sm font-semibold text-slate-200 text-right">{(effort.invertidosPts / 8).toFixed(1)}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-3">1 pt = 1 h · jornada 8 h (L-V)</p>
          </div>
        )}

        {/* Costo */}
        {costEstimate.estimatedMonthlyCost > 0 && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Costo Estimado
              <GlossaryTooltip id="proyecto-costo-estimado" />
            </h3>
            <p className="text-2xl font-bold text-green-400 mb-3">{formatMoney(costEstimate.estimatedMonthlyCost)}<span className="text-xs text-slate-500 font-normal ml-1">/mes</span></p>
            <div className="space-y-2">
              {costEstimate.breakdown.map((b, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-500">{b.role}</span>
                    <span className="text-slate-400 truncate">{b.person}</span>
                  </div>
                  <span className="text-slate-300 shrink-0">{formatMoney(b.cost)}</span>
                </div>
              ))}
            </div>
            <a href="/costos" className="text-[10px] text-blue-400 hover:text-blue-300 mt-3 inline-block transition-colors">Ver costos completos</a>
          </div>
        )}

        {/* Acciones / dependencias */}
        {(project.requiereDe || project.accionRequerida) && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
            <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Acciones Pendientes
              <GlossaryTooltip id="proyecto-acciones-pendientes" />
            </h3>
            {project.requiereDe && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Requiere de</p>
                <p className="text-sm text-slate-200">{project.requiereDe}</p>
              </div>
            )}
            {project.accionRequerida && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Acción requerida</p>
                <p className="text-sm text-slate-200">{project.accionRequerida}</p>
              </div>
            )}
            {project.fechaAccion && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Fecha de acción</p>
                <p className="text-sm text-slate-200">{project.fechaAccion}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
