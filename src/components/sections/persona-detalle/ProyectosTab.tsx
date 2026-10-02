import { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import type { ProjectRecord } from '../../../utils/dataTransforms';
import { getEstatusColor } from '../../../utils/colors';
import StatusBadge from '../../ui/StatusBadge';
import GlossaryTooltip from '../../ui/GlossaryTooltip';
import { formatMoney } from '../../../utils/costEngine';
import { isTerminal } from '../../../utils/projectStatus';

interface PersonCost {
  monthlyCost: number;
  costoHora: number;
  projectsCost: { id: string; folio: string; actividad: string; cost: number }[];
}

interface Props {
  personId: string | null;
  personProjects: ProjectRecord[];
  displayName: string;
  includeDone: boolean;
  setIncludeDone: (v: boolean) => void;
  personCost: PersonCost;
}

export default function ProyectosTab({
  personId,
  personProjects,
  displayName,
  includeDone,
  setIncludeDone,
  personCost,
}: Props) {
  const listProjects = useMemo(
    () =>
      includeDone
        ? personProjects
        : personProjects.filter((p) => !isTerminal(p.estatus)),
    [personProjects, includeDone],
  );
  const hiddenDoneCount = useMemo(
    () => personProjects.filter((p) => isTerminal(p.estatus)).length,
    [personProjects],
  );

  // Costo mensual prorrateado de ESTA persona por proyecto (vacío si no hay acceso a costos).
  const costByProject = useMemo(
    () => new Map(personCost.projectsCost.map((pc) => [pc.id, pc.cost])),
    [personCost.projectsCost],
  );
  const hasCost = personCost.projectsCost.length > 0;

  return (
    <div className="space-y-6">
      {/* Header con toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
            Proyectos Asignados
            <GlossaryTooltip id="persona-detalle-proyectos-asignados" />
          </h3>
          {hasCost && (
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-green-400" />
              Costo mensual total {formatMoney(personCost.monthlyCost)}
              {personCost.costoHora > 0 && <span> · ${personCost.costoHora}/hr</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => setIncludeDone(!includeDone)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            includeDone
              ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
          title={includeDone ? 'Ocultar proyectos terminados' : 'Mostrar proyectos terminados'}
        >
          {includeDone
            ? '✓ Incluir terminados'
            : `Incluir terminados${hiddenDoneCount > 0 ? ` (${hiddenDoneCount})` : ''}`}
        </button>
      </div>

      {/* Lista de proyectos */}
      {listProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listProjects.map((p) => {
            const ec = getEstatusColor(p.estatus);
            const pPct = Math.round(p.progreso * 100);
            const pid = personId ?? '';
            const roleInProject = p.arquitectoIds.includes(pid)
              ? 'Arquitecto'
              : p.pmIds.includes(pid)
                ? 'PM'
                : p.poIds.includes(pid)
                  ? 'PO'
                  : p.sqaIds.includes(pid)
                    ? 'SQA'
                    : 'Developer';
            return (
              <a
                key={p.id}
                href={`/proyecto/${p.id}`}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 font-mono">{p.folio}</p>
                    <p className="text-sm font-medium text-slate-200 truncate">{p.actividad}</p>
                  </div>
                  <StatusBadge label={p.estatus} {...ec} />
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
                  <div
                    className={`h-1.5 rounded-full ${
                      pPct >= 80 ? 'bg-green-500' : pPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{pPct}%</span>
                  <div className="flex items-center gap-2 min-w-0">
                    {costByProject.has(p.id) && (
                      <span
                        className="text-[10px] font-medium text-green-400 shrink-0"
                        title="Costo mensual prorrateado de esta persona en el proyecto"
                      >
                        {formatMoney(costByProject.get(p.id)!)}/mes
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] shrink-0">
                      {roleInProject}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
          <p className="text-slate-400">
            {includeDone
              ? `No se encontraron proyectos para ${displayName}`
              : 'Sin proyectos activos — usa "Incluir terminados" para ver los cerrados'}
          </p>
        </div>
      )}
    </div>
  );
}
