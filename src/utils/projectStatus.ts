/**
 * Fuente única de verdad para la semántica de los estatus de proyecto
 * (columna `estatus` de `ProjectRecord`). Centraliza los predicados que antes
 * estaban duplicados como `estatus !== 'Done' && estatus !== 'On Hold'` por
 * toda la app, para que agregar/cambiar un estatus terminal sea un solo punto.
 *
 * NAV-90: se agregan `LaunchPhase` (activo, previo a Hypercare) y `Cancelado`
 * (terminal, NO cuenta para la SALUD general aunque siga visible en listas).
 *
 * Espejo intencional en `mcp-server/src/data/projectStatus.ts`.
 */

/** Orden canónico para leyendas, chips y agrupaciones (igual que la leyenda del Timeline). */
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

/** Proyecto cancelado: terminal y excluido de toda métrica de SALUD/actividad. */
export const isCancelled = (estatus: string): boolean => estatus === 'Cancelado';

/** Estados terminales (cerrados): completado o cancelado. */
export const isTerminal = (estatus: string): boolean =>
  estatus === 'Done' || estatus === 'Cancelado';

/**
 * Proyecto "activo" para conteos, costos, burndown y agregados.
 * Reemplaza el patrón `estatus !== 'Done' && estatus !== 'On Hold'`; ahora
 * además excluye `Cancelado`.
 */
export const isActive = (estatus: string): boolean =>
  estatus !== 'Done' && estatus !== 'On Hold' && estatus !== 'Cancelado';

/** Un proyecto cancelado nunca pesa en la SALUD general. */
export const countsForHealth = (estatus: string): boolean => estatus !== 'Cancelado';
