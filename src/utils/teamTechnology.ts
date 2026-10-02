/**
 * Helpers puros (sin red/BD) para la matriz de tecnologías del equipo.
 * Plan 015 / spike 013.
 *
 * Todos son funciones puras → unit-testables sin harness de DB.
 */
import type { Technology, TeamTechnology, ProjectRecord } from '@/utils/dataTransforms';
import { isActive } from '@/utils/projectStatus';

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/** Orden canónico de niveles de menor a mayor (igual que `roleRango`). */
export const LEVEL_ORDER: TeamTechnology['level'][] = ['trainee', 'jr', 'mid', 'sr', 'arq'];

/** Etiqueta display para cada nivel. */
export const LEVEL_LABEL: Record<TeamTechnology['level'], string> = {
  trainee: 'Trainee',
  jr: 'Jr',
  mid: 'Mid',
  sr: 'Sr',
  arq: 'Arq',
};

/** Compara dos niveles; retorna negativo si a < b, 0 si igual, positivo si a > b. */
export function compareLevel(a: TeamTechnology['level'], b: TeamTechnology['level']): number {
  return LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b);
}

// ---------------------------------------------------------------------------
// Matrix helpers
// ---------------------------------------------------------------------------

/** Personas que conocen una tecnología, ordenadas de mayor a menor nivel. */
export function peopleForTech(
  technologyId: string,
  matrix: TeamTechnology[],
): TeamTechnology[] {
  return matrix
    .filter((r) => r.technologyId === technologyId)
    .sort((a, b) => compareLevel(b.level, a.level));
}

/** Tecnologías de una persona, ordenadas por nivel desc. */
export function techsForPerson(
  equipoId: string,
  matrix: TeamTechnology[],
): TeamTechnology[] {
  return matrix
    .filter((r) => r.equipoId === equipoId)
    .sort((a, b) => compareLevel(b.level, a.level));
}

// ---------------------------------------------------------------------------
// Inferred project ↔ technology join (decision #3 from plan 015)
// ---------------------------------------------------------------------------

/**
 * Proyectos activos cuyo equipo resuelto (pmIds / arquitectoIds / devIds)
 * incluye al menos a una persona con la `technologyId` indicada.
 *
 * La inferencia es gratis y siempre actual: no requiere un campo adicional
 * por proyecto. Se usa sólo como contexto informativo en la vista by-technology.
 */
export function projectsForTech(
  technologyId: string,
  matrix: TeamTechnology[],
  projects: ProjectRecord[],
): ProjectRecord[] {
  const owners = new Set(
    matrix.filter((r) => r.technologyId === technologyId).map((r) => r.equipoId),
  );
  if (owners.size === 0) return [];
  return projects.filter(
    (p) =>
      isActive(p.estatus) &&
      ([...p.pmIds, ...p.arquitectoIds, ...p.devIds].some((id) => owners.has(id))),
  );
}

// ---------------------------------------------------------------------------
// Category grouping
// ---------------------------------------------------------------------------

/** Agrupa el catálogo por categoría, manteniendo el orden del arreglo. */
export function groupByCategory(
  catalog: Technology[],
): Record<string, Technology[]> {
  const groups: Record<string, Technology[]> = {};
  for (const t of catalog) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
}
