import { useMemo } from 'react';
import { readInlinePermissions } from './usePermissions';
import { isScopedRole } from '../lib/scopeRoles';

/**
 * Vista según el scoping por identidad (Fase 5). Lee el rol inyectado
 * SÍNCRONO por Layout.astro (`window.__PN_PERMS__`) — sin fetch, anti-flash.
 *
 * `isScoped` = el usuario solo ve sus propias filas (pm/dev), porque
 * `/api/proyectos|tareas` ya vienen filtrados por identidad. Para esos
 * roles el filtro de PM/devs es redundante (se llenaría con su propio
 * nombre) → se oculta; y conviene mostrar el PM en la card.
 */
export function useScopeView() {
  return useMemo(() => {
    const role = readInlinePermissions().role;
    return { role, isScoped: isScopedRole(role) };
  }, []);
}
