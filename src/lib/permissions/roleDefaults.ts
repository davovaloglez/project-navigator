import { roles, blockDenyByRole } from './roles';
import type { Resource } from './types';

/**
 * Evaluación PURA de permisos por rol (sin overrides, sin BD).
 *
 * Aislado aquí para que sea seguro importarlo desde el cliente (no toca Turso).
 * Lo usan tanto el resolver server-side (`../permissions.ts`) como la UI del
 * módulo Admin para mostrar a qué resuelve "Hereda" según el rol.
 */

export function splitResource(resource: Resource): { kind: string; value: string } {
  const i = resource.indexOf(':');
  return { kind: resource.slice(0, i), value: resource.slice(i + 1) };
}

/** ¿El rol (puro, sin overrides) concede el recurso? */
export function roleCan(role: string, resource: Resource): boolean {
  const { kind, value } = splitResource(resource);
  if (kind === 'block') {
    // Bloques: default-ALLOW; sólo se niega si está en blockDenyByRole.
    return !(blockDenyByRole[role] ?? []).includes(value);
  }
  type Authorizer = { authorize: (req: Record<string, string[]>) => { success: boolean } };
  const r = (roles as Record<string, Authorizer>)[role];
  if (!r) return false;
  return r.authorize({ [kind]: [value] }).success === true;
}
