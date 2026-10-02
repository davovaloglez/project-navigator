/**
 * Tab "Tecnologías" de /equipo — Plan 015 (spike 013).
 *
 * Dos vistas:
 *  1. Heatmap persona × tecnología: filas = personas, columnas = tecnologías
 *     agrupadas por categoría; celda = chip de nivel coloreado.
 *  2. By-technology: selecciona una tecnología → lista de personas con esa
 *     skill + nivel + proyectos activos inferidos (decision #3: sin campo
 *     almacenado; se infiere del equipo de cada proyecto).
 *
 * Estado vacío (decision #4): cuando `equipo_technology` no tiene filas,
 * muestra un mensaje claro en vez de una cuadrícula rota.
 *
 * Visibilidad: todos los roles (decision #5). No se agrega a la lista de tabs
 * default-deny de `blockDenyByRole` (ver roles.ts — sólo se niegan
 * `equipo-capacity-heatmap` y `equipo-comparativa`).
 */
import { useState, useMemo } from 'react';
import { Search, CircleDotDashed } from 'lucide-react';
import type { Technology, TeamTechnology, ProjectRecord } from '@/utils/dataTransforms';
import {
  LEVEL_ORDER,
  peopleForTech,
  projectsForTech,
  groupByCategory,
} from '@/utils/teamTechnology';
import { LevelChip, CATEGORY_LABEL, CATEGORY_ORDER } from './tecnologiasShared';
import Avatar from '@components/ui/Avatar';
import GlossaryTooltip from '@components/ui/GlossaryTooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TecnologiasMember {
  id: string;
  fullName: string;
  image: string | null;
  active: boolean;
  roleName?: string;
}

interface Props {
  equipo: TecnologiasMember[];
  catalog: Technology[];
  matrix: TeamTechnology[];
  projects: ProjectRecord[];
}

// ---------------------------------------------------------------------------
// Presentational bits (LevelChip / LEVEL_COLORS / CATEGORY_LABEL /
// CATEGORY_ORDER) viven en `./tecnologiasShared` — compartidos con el tab
// Tecnologías de /persona/[id] (Plan 016).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Tecnologias({ equipo, catalog, matrix, projects }: Props) {
  const [view, setView] = useState<'heatmap' | 'by-tech'>('heatmap');
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [search, setSearch] = useState('');

  // Only active people with at least one matrix row
  const activeMembers = useMemo(
    () => equipo.filter((p) => p.active),
    [equipo],
  );

  const isEmpty = matrix.length === 0;

  // Filtered members for heatmap
  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return activeMembers.filter(
      (p) => !q || p.fullName.toLowerCase().includes(q) || (p.roleName ?? '').toLowerCase().includes(q),
    );
  }, [activeMembers, search]);

  // Catalog grouped by category, filtered to active only
  const grouped = useMemo(() => groupByCategory(catalog), [catalog]);

  // Technologies that have at least one matrix row (for column display)
  const usedTechIds = useMemo(() => new Set(matrix.map((r) => r.technologyId)), [matrix]);

  // Build an index: equipoId -> Map<technologyId, TeamTechnology>
  const matrixIndex = useMemo(() => {
    const idx = new Map<string, Map<string, TeamTechnology>>();
    for (const row of matrix) {
      if (!idx.has(row.equipoId)) idx.set(row.equipoId, new Map());
      idx.get(row.equipoId)!.set(row.technologyId, row);
    }
    return idx;
  }, [matrix]);

  // For by-tech view: people sorted by level desc
  const byTechPeople = useMemo(() => {
    if (!selectedTech) return [];
    return peopleForTech(selectedTech, matrix)
      .map((r) => ({
        row: r,
        member: equipo.find((p) => p.id === r.equipoId),
      }))
      .filter((x) => x.member !== undefined);
  }, [selectedTech, matrix, equipo]);

  const byTechProjects = useMemo(() => {
    if (!selectedTech) return [];
    return projectsForTech(selectedTech, matrix, projects);
  }, [selectedTech, matrix, projects]);

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  if (isEmpty) {
    return (
      <div className="py-16 text-center">
        <CircleDotDashed className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-300 font-medium mb-1">Aún no hay tecnologías registradas</p>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          El catálogo está listo. Un administrador debe poblar la tabla{' '}
          <code className="text-slate-400">equipo_technology</code> en la BD para que
          aparezca la matriz.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-300">Tecnologías del equipo</h3>
          <GlossaryTooltip id="equipo-tecnologias-heatmap" />
        </div>
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
          {(['heatmap', 'by-tech'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                view === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {v === 'heatmap' ? 'Matriz' : 'Por tecnología'}
            </button>
          ))}
        </div>
      </div>

      {view === 'heatmap' && (
        <>
          {/* Search */}
          <div className="relative max-w-xs mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar persona..."
              className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Matrix */}
          <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/30">
            <table className="w-full text-xs border-collapse">
              <thead>
                {/* Category headers */}
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-900 p-3 min-w-[180px] text-left font-medium text-slate-400 border-b border-r border-slate-700/50">
                    Persona
                  </th>
                  {CATEGORY_ORDER.map((cat) => {
                    const techs = (grouped[cat] ?? []).filter((t) => usedTechIds.has(t.id));
                    if (techs.length === 0) return null;
                    return (
                      <th
                        key={cat}
                        colSpan={techs.length}
                        className="text-center font-semibold text-slate-400 py-1.5 px-2 border-b border-l border-slate-700/50 bg-slate-800/60 uppercase tracking-wider text-[10px]"
                      >
                        {CATEGORY_LABEL[cat] ?? cat}
                      </th>
                    );
                  })}
                </tr>
                {/* Technology name headers */}
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-900 border-b border-r border-slate-700/50" />
                  {CATEGORY_ORDER.flatMap((cat) =>
                    (grouped[cat] ?? [])
                      .filter((t) => usedTechIds.has(t.id))
                      .map((t) => (
                        <th
                          key={t.id}
                          className="py-2 px-2 text-center font-medium text-slate-300 border-b border-l border-slate-700/30 whitespace-nowrap max-w-[80px] truncate"
                          title={t.name}
                        >
                          {t.name}
                        </th>
                      )),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={99} className="text-center py-8 text-slate-500">
                      Sin personas que coincidan
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((person, i) => {
                    const personMatrix = matrixIndex.get(person.id);
                    return (
                      <tr
                        key={person.id}
                        className={i % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'}
                      >
                        {/* Person cell */}
                        <td className="sticky left-0 z-10 bg-inherit border-r border-slate-700/50 p-2">
                          <a
                            href={`/persona/${person.id}`}
                            className="flex items-center gap-2 group"
                          >
                            <Avatar name={person.fullName} image={person.image} size={28} />
                            <div className="min-w-0">
                              <p className="text-slate-200 font-medium truncate group-hover:text-blue-300 transition-colors">
                                {person.fullName}
                              </p>
                              {person.roleName && (
                                <p className="text-[10px] text-slate-500 truncate">{person.roleName}</p>
                              )}
                            </div>
                          </a>
                        </td>
                        {/* Technology cells */}
                        {CATEGORY_ORDER.flatMap((cat) =>
                          (grouped[cat] ?? [])
                            .filter((t) => usedTechIds.has(t.id))
                            .map((t) => {
                              const entry = personMatrix?.get(t.id);
                              return (
                                <td
                                  key={t.id}
                                  className="text-center p-1.5 border-l border-slate-700/20"
                                >
                                  {entry ? <LevelChip level={entry.level} /> : (
                                    <span className="text-slate-700">—</span>
                                  )}
                                </td>
                              );
                            }),
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Level legend */}
          <div className="flex items-center gap-3 flex-wrap mt-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Nivel:</span>
            {LEVEL_ORDER.map((level) => (
              <div key={level} className="flex items-center gap-1">
                <LevelChip level={level} />
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'by-tech' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-medium text-slate-300">Por tecnología</h3>
            <GlossaryTooltip id="equipo-tecnologias-by-tech" />
          </div>

          {/* Technology selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {CATEGORY_ORDER.map((cat) => {
              const techs = (grouped[cat] ?? []).filter((t) => usedTechIds.has(t.id));
              if (techs.length === 0) return null;
              return (
                <div key={cat} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {CATEGORY_LABEL[cat] ?? cat}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {techs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTech(t.id === selectedTech ? '' : t.id)}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          selectedTech === t.id
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selectedTech ? (
            <div className="space-y-4">
              {/* People with this tech */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Personas con{' '}
                  <span className="text-blue-300">
                    {catalog.find((t) => t.id === selectedTech)?.name ?? selectedTech}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">({byTechPeople.length})</span>
                </p>
                {byTechPeople.length === 0 ? (
                  <p className="text-sm text-slate-500">Nadie con esta tecnología registrada.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {byTechPeople.map(({ row, member }) => (
                      <a
                        key={row.equipoId}
                        href={`/persona/${row.equipoId}`}
                        className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/30 rounded-lg px-2.5 py-1.5 transition-colors group"
                      >
                        <Avatar name={member!.fullName} image={member!.image} size={24} />
                        <span className="text-sm text-slate-200 group-hover:text-blue-300 transition-colors">
                          {member!.fullName}
                        </span>
                        <LevelChip level={row.level} />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Inferred active projects (decision #3) */}
              {byTechProjects.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-sm font-medium text-slate-300 mb-3">
                    Proyectos activos con esta tecnología en el equipo
                    <span className="text-slate-500 text-xs ml-2">({byTechProjects.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {byTechProjects.map((p) => (
                      <a
                        key={p.id}
                        href={`/proyecto/${p.id}`}
                        className="text-xs bg-slate-700/50 hover:bg-slate-700 border border-slate-600/30 rounded-lg px-2.5 py-1.5 text-slate-300 hover:text-white transition-colors"
                      >
                        {p.actividad}
                      </a>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">
                    Inferido: proyectos cuyo equipo (PM / Arq / Dev) tiene esta tecnología registrada.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm">Selecciona una tecnología arriba para ver quién la domina.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
