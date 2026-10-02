/**
 * Espejo intencional de `src/utils/projectStatus.ts`. Si cambias la semántica
 * de un estatus, actualiza ambos.
 *
 * NAV-90: `LaunchPhase` (activo, previo a Hypercare) y `Cancelado` (terminal,
 * NO cuenta para la SALUD general).
 */

export const ESTATUS_ORDER = [
  'Done',
  'On Track',
  'Upcoming',
  'On Hold',
  'At Risk',
  'Blocked / Critical',
  'Hypercare',
  'LaunchPhase',
  'Cancelado',
] as const;

export const isCancelled = (estatus: string): boolean => estatus === 'Cancelado';

export const isTerminal = (estatus: string): boolean =>
  estatus === 'Done' || estatus === 'Cancelado';

export const isActive = (estatus: string): boolean =>
  estatus !== 'Done' && estatus !== 'On Hold' && estatus !== 'Cancelado';

export const countsForHealth = (estatus: string): boolean => estatus !== 'Cancelado';
