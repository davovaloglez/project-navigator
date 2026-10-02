import type { ReactNode, CSSProperties } from 'react';
import { canWith, readInlinePermissions } from '../../hooks/usePermissions';

interface PageLinkProps {
  /** page-key destino (slug del sidebar, p.ej. 'equipo', 'pronosticos'). */
  pageKey: string;
  href: string;
  children: ReactNode;
  className?: string;
  /** className cuando NO hay permiso (render como texto plano). */
  deniedClassName?: string;
  style?: CSSProperties;
  title?: string;
  /** Si no hay permiso, no renderizar nada (en vez de texto plano). */
  hideWhenDenied?: boolean;
}

/**
 * Enlace consciente de permisos. Si el usuario puede abrir la página destino
 * (`page:<pageKey>`), renderiza un `<a>` normal; si no, renderiza el contenido
 * como texto plano (sin enlace) para evitar dead-links que el middleware
 * redigiría a `/`. SÓLO UX — el server sigue siendo el gate real.
 */
export default function PageLink({
  pageKey,
  href,
  children,
  className,
  deniedClassName,
  style,
  title,
  hideWhenDenied,
}: PageLinkProps) {
  const allowed = canWith(readInlinePermissions(), `page:${pageKey}`);
  if (!allowed) {
    if (hideWhenDenied) return null;
    return (
      <span className={deniedClassName ?? className} style={style} title={title}>
        {children}
      </span>
    );
  }
  return (
    <a href={href} className={className} style={style} title={title}>
      {children}
    </a>
  );
}
