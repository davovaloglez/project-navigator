import { useMemo, useState } from 'react';
import { Cpu, Plus, Pencil, CircleDotDashed } from 'lucide-react';
import type { Technology, TeamTechnology } from '@/utils/dataTransforms';
import { LEVEL_ORDER, compareLevel, groupByCategory } from '@/utils/teamTechnology';
import { LevelChip, CATEGORY_LABEL, CATEGORY_ORDER } from '../equipo/tecnologiasShared';
import GlossaryTooltip from '@components/ui/GlossaryTooltip';
import Gate from '@components/auth/Gate';
import TecnologiaEditModal from './TecnologiaEditModal';

/**
 * Tab "Tecnologías" de `/persona/[id]` (Plan 016, Phase 2 de la matriz).
 *
 * Lectura para CUALQUIER autenticado con `page:equipo` (la página /persona la
 * hereda). La superficie de edición admin (botón "Agregar", lápiz por chip,
 * modal) vive AQUÍ y SÓLO se muestra con `action:tecnologia:manage` (gateada
 * client-side por <Gate>; el server es el gate real vía middleware sobre
 * `/api/admin/team-technologies`).
 *
 * La sección (`PersonaDetailSection`) es la dueña de los datos: este tab recibe
 * `catalog` + `matrix` (ya filtrada a esta persona) por props y un `onRefetch`
 * para recargar tras una edición. El `/equipo` aggregate tab queda SÓLO lectura.
 */

interface Props {
  /** equipo.id resuelto; null si la persona no se pudo resolver. */
  equipoId: string | null;
  personName: string;
  personImage: string | null;
  catalog: Technology[];
  catalogLoading: boolean;
  /** Filas de `equipo_technology` de ESTA persona. */
  matrix: TeamTechnology[];
  matrixLoading: boolean;
  /** Recarga la matriz de la persona tras una edición. */
  onRefetch: () => void;
}

export default function TecnologiasTab({
  equipoId,
  personName,
  personImage,
  catalog,
  catalogLoading,
  matrix,
  matrixLoading,
  onRefetch,
}: Props) {
  // null = cerrado; 'new' = agregar; objeto = editar esa fila.
  const [editTarget, setEditTarget] = useState<TeamTechnology | 'new' | null>(null);

  const grouped = useMemo(() => groupByCategory(catalog), [catalog]);
  const assignedById = useMemo(
    () => new Map(matrix.map((r) => [r.technologyId, r])),
    [matrix],
  );

  // Techs asignadas agrupadas por categoría (orden canónico), nivel desc dentro.
  const byCategory = useMemo(
    () =>
      CATEGORY_ORDER.flatMap((cat) => {
        const techs = (grouped[cat] ?? [])
          .filter((t) => assignedById.has(t.id))
          .map((t) => ({ tech: t, row: assignedById.get(t.id)! }))
          .sort((a, b) => compareLevel(b.row.level, a.row.level));
        if (techs.length === 0) return [];
        return [{ cat, techs }];
      }),
    [grouped, assignedById],
  );

  const totalTechs = matrix.length;
  const totalCats = byCategory.length;

  if (catalogLoading || matrixLoading) {
    return (
      <div className="py-10 text-center text-slate-500 text-sm">Cargando tecnologías…</div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">Perfil de tecnologías</h3>
          <GlossaryTooltip id="persona-detalle-tecnologias" />
        </div>
        <Gate resource="action:tecnologia:manage">
          {equipoId && (
            <button
              onClick={() => setEditTarget('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar tecnología
            </button>
          )}
        </Gate>
      </div>

      {/* Summary */}
      {totalTechs > 0 && (
        <p className="text-xs text-slate-500 mb-4">
          {totalTechs} tecnología{totalTechs !== 1 ? 's' : ''} en {totalCats} categoría
          {totalCats !== 1 ? 's' : ''}
        </p>
      )}

      {/* Empty state */}
      {totalTechs === 0 ? (
        <div className="py-12 text-center">
          <CircleDotDashed className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium mb-1">Sin tecnologías registradas</p>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Esta persona aún no tiene tecnologías registradas.
          </p>
          <Gate resource="action:tecnologia:manage">
            {equipoId && (
              <button
                onClick={() => setEditTarget('new')}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar primera tecnología
              </button>
            )}
          </Gate>
        </div>
      ) : (
        <div className="space-y-4">
          {byCategory.map(({ cat, techs }) => (
            <div key={cat} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {CATEGORY_LABEL[cat] ?? cat}
              </p>
              <div className="flex flex-wrap gap-2">
                {techs.map(({ tech, row }) => (
                  <div
                    key={tech.id}
                    className="flex items-center gap-1.5 bg-slate-700/50 border border-slate-600/30 rounded-lg px-2.5 py-1.5 group"
                  >
                    <span className="text-sm text-slate-200">{tech.name}</span>
                    <LevelChip level={row.level} />
                    <Gate resource="action:tecnologia:manage">
                      <button
                        onClick={() => setEditTarget(row)}
                        className="opacity-0 group-hover:opacity-100 ml-0.5 text-slate-500 hover:text-slate-200 transition-all"
                        title="Editar nivel"
                        aria-label={`Editar ${tech.name}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </Gate>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level legend */}
      {totalTechs > 0 && (
        <div className="flex items-center gap-3 flex-wrap mt-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Nivel:</span>
          {LEVEL_ORDER.map((level) => (
            <div key={level} className="flex items-center gap-1">
              <LevelChip level={level} />
            </div>
          ))}
        </div>
      )}

      {/* Edit modal (admin only — the affordance to open it is already gated) */}
      {editTarget !== null && equipoId && (
        <TecnologiaEditModal
          equipoId={equipoId}
          personName={personName}
          personImage={personImage}
          catalog={catalog}
          currentMatrix={matrix}
          initial={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            onRefetch();
          }}
        />
      )}
    </div>
  );
}
