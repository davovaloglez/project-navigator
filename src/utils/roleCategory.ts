/**
 * Mapea el `rol` (slug del registro `equipo`, p.ej. "desarrollador-jr") a la
 * taxonomía de categorías de la HU NAV-74: Tecnología / Management / UX-UI /
 * Servicio / Dirección. La taxonomía se deriva del rol, NO del `departamento`
 * (que son unidades de negocio: "Tech Ambition", "Allies Networking", etc.).
 */
export type TeamCategory = 'Tecnología' | 'Management' | 'UX/UI' | 'Servicio' | 'Dirección' | 'Otros';

const ROLE_TO_CATEGORY: Record<string, TeamCategory> = {
  'arquitecto-tecnico': 'Tecnología',
  'desarrollador-trainee': 'Tecnología',
  'desarrollador-jr': 'Tecnología',
  'desarrollador-mid': 'Tecnología',
  'desarrollador-sr': 'Tecnología',
  'product-manager': 'Management',
  'project-manager': 'Management',
  'ux-ui': 'UX/UI',
  'service-manager': 'Servicio',
  'ed-tech': 'Servicio',
  'qa': 'Servicio',
  'ceo': 'Dirección',
  'cio': 'Dirección',
};

export const CATEGORY_ORDER: TeamCategory[] = ['Dirección', 'Management', 'Tecnología', 'UX/UI', 'Servicio', 'Otros'];

export function roleCategory(roleId: string): TeamCategory {
  return ROLE_TO_CATEGORY[(roleId || '').toLowerCase().trim()] || 'Otros';
}

/** Rango corto para roles de Tecnología (Trainee/Jr/Mid/Sr/Arq); '' si no aplica. */
export function roleRango(roleId: string): string {
  const r = (roleId || '').toLowerCase();
  if (r === 'arquitecto-tecnico') return 'Arq';
  if (r === 'desarrollador-trainee') return 'Trainee';
  if (r === 'desarrollador-jr') return 'Jr';
  if (r === 'desarrollador-mid') return 'Mid';
  if (r === 'desarrollador-sr') return 'Sr';
  return '';
}
