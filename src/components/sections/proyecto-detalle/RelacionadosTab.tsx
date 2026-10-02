import { useMemo, useState } from 'react';
import type { ProjectRecord } from '../../../utils/dataTransforms';
import { splitMulti } from '../../../utils/dataTransforms';
import { getEstatusColor } from '../../../utils/colors';
import StatusBadge from '../../ui/StatusBadge';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import { RELATED_OPTIONS, type RelatedCriterion } from './shared';

interface Props {
  project: ProjectRecord;
  allProjects: ProjectRecord[];
}

export default function RelacionadosTab({ project, allProjects }: Props) {
  const [relatedBy, setRelatedBy] = useState<RelatedCriterion>('epica');

  const related = useMemo(() => {
    const matches = (p: ProjectRecord): boolean => {
      switch (relatedBy) {
        case 'epica':
          return !!project.epica && p.epica === project.epica;
        case 'producto':
          return !!project.producto && p.producto === project.producto;
        case 'aliado':
          return !!project.aliado && project.aliado !== 'Ninguno' && p.aliado === project.aliado;
        case 'arquitecto': {
          const arqs = splitMulti(project.arquitecto);
          return splitMulti(p.arquitecto).some((a) => arqs.includes(a));
        }
        case 'cuatrimestre':
          return !!project.cuatrimestre && p.cuatrimestre === project.cuatrimestre;
        default:
          return false;
      }
    };
    return allProjects.filter((p) => p.id !== project.id && matches(p)).slice(0, 9);
  }, [allProjects, project, relatedBy]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-slate-300">Proyectos Relacionados</h3>
          <GlossaryTooltip id="proyecto-relacionados" />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Relacionar por</span>
          {RELATED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRelatedBy(opt.value)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                relatedBy === opt.value ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {related.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {related.map((rp) => {
            const rc = getEstatusColor(rp.estatus);
            const rpPct = Math.round(rp.progreso * 100);
            return (
              <a
                key={rp.id}
                href={`/proyecto/${rp.id}`}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 font-mono">{rp.folio}</p>
                    <p className="text-xs font-medium text-slate-200 truncate">{rp.actividad}</p>
                  </div>
                  <StatusBadge label={rp.estatus} {...rc} />
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
                  <div
                    className={`h-1 rounded-full ${rpPct >= 80 ? 'bg-green-500' : rpPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${rpPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{rpPct}% — {rp.arquitecto}</p>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-400">Sin proyectos relacionados por {RELATED_OPTIONS.find((o) => o.value === relatedBy)?.label.toLowerCase()}</p>
        </div>
      )}
    </div>
  );
}
