import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements } from 'better-auth/plugins/admin/access';

/**
 * Espacio de recursos gruesos del sistema de permisos.
 *
 * - `page`   — una clave por página del sidebar (slug del href) + `admin`.
 *              Las páginas de detalle heredan la page-key de su sección padre
 *              (ver `pageKeyForPath` en src/middleware.ts).
 * - `data`   — datos sensibles tratados all-or-nothing (Costos).
 * - `action` — acciones de escritura gateadas.
 * - `user` / `session` — provienen del admin plugin de Better-Auth
 *              (`defaultStatements`); se mezclan aquí para que los endpoints
 *              `/api/auth/admin/*` sigan autorizando con nuestros roles custom.
 *
 * Los bloques (≈149 IDs del glosario) NO se enumeran aquí a propósito: usan un
 * modelo default-allow con deny disperso (ver `blockDenyByRole` en roles.ts).
 */
export const statement = {
  ...defaultStatements,
  page: [
    'dashboard',
    'resumen',
    'alertas',
    'portafolio',
    'roadmap',
    'timeline',
    'cronograma',
    'pronosticos',
    'costos',
    'distribucion',
    'equipo',
    'comparativa',
    'cursos',
    'novedades',
    'glosario',
    'metricas-dev',
    'cs360',
    'admin',
  ],
  data: ['costos'],
  action: ['snapshot:create', 'user:manage', 'equipo:manage', 'evaluacion:view-all', 'evaluacion:manage', 'tecnologia:manage'],
} as const;

export const ac = createAccessControl(statement);

export const PAGE_KEYS = statement.page;
export const DATA_KEYS = statement.data;
export const ACTION_KEYS = statement.action;

export type PageKey = (typeof PAGE_KEYS)[number];
