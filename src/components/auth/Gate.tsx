import type { ReactNode } from 'react';
import type { Resource } from '../../lib/permissions/types';
import { canWith, readInlinePermissions } from '../../hooks/usePermissions';

interface GateProps {
  resource: Resource;
  children: ReactNode;
  /** Qué renderizar si el recurso está denegado. Default: nada. */
  fallback?: ReactNode;
}

/**
 * Oculta `children` si el usuario no tiene el recurso. SÓLO UX — el server
 * (middleware/API) es el gate real.
 *
 * Lee los permisos inyectados síncronos por Layout.astro (`window.__PN_PERMS__`),
 * recalculados server-side en cada navegación, así que no hay flash ni un fetch
 * por cada `<Gate>`. Default-ALLOW para `block:*` no listados en `blockDenies`.
 */
export default function Gate({ resource, children, fallback = null }: GateProps) {
  return canWith(readInlinePermissions(), resource) ? <>{children}</> : <>{fallback}</>;
}
