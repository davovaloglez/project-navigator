import { ac, statement } from './statements';

/**
 * ÚNICA FUENTE DE VERDAD de roles y sus capacidades por defecto.
 *
 * Añadir un rol = una entrada nueva en `roles`. No requiere migración de BD ni
 * `auth:generate`. `ROLE_NAMES` alimenta automáticamente el dropdown del módulo
 * Admin y `getEffectivePermissions`.
 *
 * El rol `admin` incluye los statements `user`/`session` del admin plugin para
 * que los endpoints `/api/auth/admin/*` autoricen.
 */
const ALL_PAGES = statement.page;
// `comparativa` (NAV-78) es vista admin-only por default — Modo A: sólo el
// evaluado ve lo suyo (en /cuenta), admin ve la comparativa cross-persona.
// `cs360` (Health Score de clientes CS) también arranca admin-only; se abre a
// otros roles vía overrides cuando el área lo pida.
// `admin` se excluye del set "non admin" por convención del módulo Admin.
const NON_ADMIN_PAGES = ALL_PAGES.filter(
  (p) => p !== 'admin' && p !== 'comparativa' && p !== 'cs360',
);

export const roles = {
  admin: ac.newRole({
    page: [...ALL_PAGES],
    data: ['costos'],
    action: ['snapshot:create', 'user:manage', 'equipo:manage', 'evaluacion:view-all', 'evaluacion:manage', 'tecnologia:manage'],
    user: ['create', 'list', 'set-role', 'ban', 'impersonate', 'delete', 'set-password', 'get', 'update'],
    session: ['list', 'revoke', 'delete'],
  }),
  directores: ac.newRole({
    page: NON_ADMIN_PAGES,
    data: ['costos'],
    action: ['snapshot:create'],
  }),
  gerentes: ac.newRole({
    page: NON_ADMIN_PAGES,
    data: ['costos'],
  }),
  pm: ac.newRole({
    page: NON_ADMIN_PAGES.filter((p) => p !== 'costos'),
    action: ['snapshot:create'],
  }),
  dev: ac.newRole({
    page: ['dashboard', 'portafolio', 'roadmap', 'timeline', 'cronograma', 'metricas-dev', 'glosario'],
  }),
  ventas: ac.newRole({
    page: ['dashboard', 'resumen', 'portafolio', 'distribucion', 'glosario'],
  }),
} as const;

export type RoleName = keyof typeof roles;

export const ROLE_NAMES = Object.keys(roles) as RoleName[];

/** Rol asignado a usuarios sin rol (o con rol desconocido). Menor privilegio. */
export const DEFAULT_ROLE: RoleName = 'dev';

/** Roles considerados administradores por el admin plugin de Better-Auth. */
export const ADMIN_ROLES: string[] = ['admin'];

/**
 * Deny de bloques por rol (DISPERSO). Modelo default-ALLOW: un bloque se ve
 * salvo que esté listado aquí para el rol del usuario. Los IDs son los kebab
 * del glosario (`<section-slug>-<block>`), los mismos que `infoFor(id)`.
 */
export const blockDenyByRole: Record<string, string[]> = {
  pm: ['dashboard-cost-overview'],
  dev: [
    'dashboard-cost-overview',
    // Tabs sensibles del directorio si en algún momento abren /equipo a devs.
    // Hoy `dev` no tiene `page:equipo`, pero esto deja la red de seguridad
    // puesta para que un override per-user al alza no exponga estas tabs.
    'equipo-capacity-heatmap',
    'equipo-comparativa',
  ],
  ventas: [
    'dashboard-cost-overview',
    'equipo-capacity-heatmap',
    'equipo-comparativa',
  ],
};
