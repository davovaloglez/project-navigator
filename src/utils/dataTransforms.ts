export interface ProjectRecord {
  /** Identidad canónica del proyecto (columna `id` de la hoja). Única — la
   *  ruta `/proyecto/[id]`, los snapshots y el enlace tarea→proyecto la usan.
   *  `folio` NO es único (p.ej. H/PROJECT-5 son dos proyectos distintos). */
  id: string;
  folio: string;
  /** Título del proyecto (columna `nombre` de la hoja; el campo se llama
   *  `actividad` por compatibilidad con consumidores existentes). */
  actividad: string;
  finEstimado: string;
  arquitecto: string;
  salud: string;
  requiereDe: string;
  accionRequerida: string;
  fechaAccion: string;
  /** Compat: alimentado de `producto`. Ver también `producto`/`aliado`. */
  cliente: string;
  progreso: number;
  tipo: string;
  prioridad: string;
  epica: string;
  /** Eje de roadmap. La hoja nueva no tiene "hito" a nivel proyecto, así que
   *  `hito` refleja el `cuatrimestre` (alias). Se mantiene el nombre del campo
   *  por compatibilidad con consumidores (Roadmap, forecast, cards). */
  hito: string;
  /** Horizonte de planeación (columna `cuatrimestre`, p.ej. "2026 Q2"). = `hito`. */
  cuatrimestre: string;
  /** Ya no existe en la hoja → ''. */
  cuenta: string;
  puntos: number;
  registro: string;
  /** Inicio estimado/planeado (columna `Inicio estimado`). Puede diferir de
   *  `fechaInicio` (inicio real) cuando hubo re-planeación. */
  inicioEstimado: string;
  fechaInicio: string;
  finReal: string;
  pm: string;
  devs: string[];
  estatus: string;
  url: string;
  // --- Campos nuevos de la hoja final ---
  /** Línea de producto / cliente externo (Academic, Atrevus, Togie, ...). */
  producto: string;
  /** Core / APP / "Core, App". */
  servicio: string;
  /** Aliado/partner (UNIMEL, Riviera, Defontana, ...; "Ninguno" si no aplica). */
  aliado: string;
  /** Sprint asociado (S17/S18; puede venir vacío). */
  sprint: string;
  /** Product Owner(s) (nombres/apodos, comma-joined como en la hoja). */
  po: string;
  /** QA responsable(s) (nombres/apodos, comma-joined como en la hoja). */
  sqa: string;
  // --- Ids resueltos (aditivo). Todos los roles son MULTI-persona: la hoja
  //     trae listas separadas por coma (p.ej. Arquitecto "Luis, George"). [] si
  //     no resuelve. ---
  pmIds: string[];
  arquitectoIds: string[];
  devIds: string[];
  poIds: string[];
  sqaIds: string[];
  /** Ids de los proyectos/personas bloqueadores (columna `Requiere_ID`). */
  requiereIds?: string[];
}

export interface CursoRecord {
  colaborador: string;
  emailColaborador: string;
  ou: string;
  rol: string;
  jefeDirecto: string;
  emailJefe: string;
  pidsCreados: number;
  progreso: number;
  /** Id canónico del colaborador (de `ColaboradorId` en la hoja; resolver como red de seguridad). */
  equipoId?: string;
  /** Id canónico del jefe directo (de `JefeID` en la hoja). */
  jefeId?: string;
}

/** Calendario de sprints (hoja `sprint`). */
export interface SprintRecord {
  sprint: string;        // S17
  mes: string;           // Junio
  dias: number;          // días hábiles
  inicioEstimado: string;
  inicioReal: string;
  finEstimado: string;
  finReal: string;
  desfase: string;       // texto/días de desfase
  capacidadHoras: number; // "Capacidad / HRS" total del sprint
  puntos: number;        // Pts comprometidos
}

/** Capacidad por persona por sprint (hoja `capacidades`). */
export interface CapacidadRecord {
  /** equipo.id resuelto (de `user_id`; resolver como red de seguridad). */
  equipoId: string;
  /** id numérico de la hoja (`id_team`); crudo. */
  teamNum: string;
  nombre: string;        // display (columna `Nombre`)
  sprint: string;        // id_sprint (S17)
  vacaciones: number;    // horas de vacaciones en el sprint
  capacidad: number;     // horas disponibles en el sprint
}

/** Hito (fase con fechas/estatus propios) ligado a un proyecto. Hoja `hitos`. */
export interface HitoRecord {
  /** id_hito — identidad del hito. */
  id: string;
  /** id_proyecto → liga con `ProjectRecord.id`. */
  proyectoId: string;
  nombre: string;
  cliente: string;
  prioridad: string;
  inicio: string;
  fin: string;
  estatus: string;
  /** Avance 0..1. */
  avance: number;
}

/** Repositorio (hoja `repositorios`) con sus roles de acceso GitHub por persona. */
export interface RepoRecord {
  nombre: string;        // Nombre común
  ambientes: string;
  estatus: string;
  dpto: string;
  producto: string;
  github: string;        // GITHub Repositorio
  /** Cada uno puede traer varios nombres (display "First Last") concatenados. */
  administrador: string;
  arquitecto: string;
  colaborador: string;
  visualizador: string;
  deploy: string;
}

export interface CostoRecord {
  rol: string;
  recursos: number;
  horasRecurso: number;
  costoMensual: number;
  costoHora: number;
  horas: number;
  total: number;
}

export interface TareaRecord {
  /** Id sintético estable (hash de campos) generado en `/api/tareas` — la hoja
   *  `actividades` no trae un id propio. Usado para la vista de detalle `/tarea/[id]`. */
  id: string;
  /** Proyecto al que pertenece: `ProyectoId` = `ProjectRecord.id`.
   *  '' = "Sin proyecto" (actividad no ligada a un proyecto del portafolio). */
  proyectoId: string;
  /** Nombre del proyecto (columna `Proyecto`; suele venir vacío). */
  proyecto: string;
  /** OU / línea de producto (columna `Producto`, p.ej. "Academic").
   *  Ya NO es el discriminador App|Core (la hoja app+Core se unificó). */
  producto: string;
  /** Sprint (S16/S17). */
  sprint: string;
  /** Folio de la tarea (p.ej. "AM-I-560 | Historia de usuario"); '' si no aplica. */
  folio: string;
  url: string;
  /** Título de la actividad (columna `Actividad`). */
  nombre: string;
  asignado: string;
  estatus: string;
  salud: string;
  /** Fase del trabajo (Desarrollo, SQA, Soporte, Análisis, ...). */
  fase: string;
  tipo: string;
  prioridad: string;
  dificultad: string;
  epica: string;
  hito: string;
  /** Id del hito (columna `HitoId`) → liga con `HitoRecord.id`. '' si no aplica. */
  hitoId: string;
  cuenta: string;
  /** Puntos estimados para la actividad. */
  puntos: number;
  /** Tiempo real traqueado por los asignados (en puntos, comparable a `puntos`). */
  tracked: number;
  /** % de avance reportado (0..1). */
  avance: number;
  registro: string;
  /** Inicio estimado/planeado de la actividad (columna `inicio estimado`). */
  inicioEstimado: string;
  inicio: string;
  finEstimado: string;
  finReal: string;
  /** Rol del asignado en la actividad (Dev Jr, ARQ, SQA, PO, ...). */
  rol: string;
  asignadoId?: string; // resuelto por equipoResolver (aditivo)
}

/** Estatus de tarea que cuenta como completada (la hoja usa "Done"). */
export function isTareaDone(estatus: string | undefined): boolean {
  const s = (estatus || '').toLowerCase();
  return s.includes('done') || s.includes('completad');
}

export type FinancialStepKind = 'base' | 'markup' | 'subtotal' | 'tax' | 'total';

export interface FinancialStep {
  label: string;
  factor: number | null;
  value: number;
  kind: FinancialStepKind;
}

export interface FinancialModel {
  steps: FinancialStep[];
  costoOperativo: number;
  valorExperienciaRate: number;
  costoAdminRate: number;
  margenRate: number;
  ivaRate: number;
  total: number;
}

export function countByField<T>(data: T[], field: keyof T): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of data) {
    const value = String(item[field] || 'Sin dato');
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

export function groupByField<T>(data: T[], field: keyof T): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of data) {
    const value = String(item[field] || 'Sin dato');
    if (!groups[value]) groups[value] = [];
    groups[value].push(item);
  }
  return groups;
}

/**
 * Separa un campo multi-persona ("Luis, George") en nombres individuales,
 * descartando vacíos y el placeholder '-'. Roles como `pm` y `arquitecto`
 * pueden traer varias personas en una sola celda; usar SIEMPRE este helper
 * al derivar opciones de filtro, agrupar o cruzar por esos campos, en vez de
 * tratar el string crudo como un único valor.
 */
export function splitMulti(value: string | undefined | null): string[] {
  return (value || '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-');
}

// ---------------------------------------------------------------------------
// Tecnologías (skills) matrix — Plan 015
// ---------------------------------------------------------------------------

/** Tecnología del catálogo curado (tabla `technology` en Turso). */
export interface Technology {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

/** Entrada de la matriz persona × tecnología (tabla `equipo_technology` en Turso). */
export interface TeamTechnology {
  equipoId: string;
  technologyId: string;
  level: 'trainee' | 'jr' | 'mid' | 'sr' | 'arq';
  updatedAt: string;
}
