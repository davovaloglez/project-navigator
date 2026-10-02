/**
 * Roles que NO se scopean fila-a-fila (ven todo el portafolio) — Fase 5.
 * Puro y client-safe (sin Turso): lo usan el server (requesterScope) y el
 * cliente (useSnapshotCapture, para no capturar snapshots parciales).
 *
 * Cualquier rol fuera de este set (pm, dev, desconocido) es SCOPEADO.
 */
export const UNSCOPED_ROLES = new Set(['admin', 'directores', 'gerentes', 'ventas']);

export function isScopedRole(role?: string | null): boolean {
  return !UNSCOPED_ROLES.has(role ?? 'dev');
}
