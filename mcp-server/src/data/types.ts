/**
 * Espejo de src/utils/dataTransforms.ts del proyecto Astro. Mantener sincronizado
 * cuando cambien shapes/headers en las hojas o se agreguen campos resueltos.
 */

export interface ProjectRecord {
  /** Identidad canónica (columna `id` de la hoja `proyectos`). Única; `folio`
   *  no es único (p.ej. H/PROJECT-5 puede aparecer dos veces). */
  id: string;
  folio: string;
  /** Título del proyecto (columna `nombre`); se llama `actividad` por compat. */
  actividad: string;
  finEstimado: string;
  arquitecto: string;
  salud: string;
  requiereDe: string;
  accionRequerida: string;
  fechaAccion: string;
  /** Compat: alimentado del campo `producto` de la hoja. */
  cliente: string;
  progreso: number;
  tipo: string;
  prioridad: string;
  epica: string;
  /** Eje de roadmap (alias de `cuatrimestre`). */
  hito: string;
  /** Horizonte de planeación ("2026 Q2"). */
  cuatrimestre: string;
  cuenta: string;
  puntos: number;
  registro: string;
  inicioEstimado: string;
  fechaInicio: string;
  finReal: string;
  pm: string;
  devs: string[];
  estatus: string;
  url: string;
  // Campos del nuevo modelo
  producto: string;
  servicio: string;
  aliado: string;
  sprint: string;
  po: string;
  sqa: string;
  // Ids resueltos (aditivo). Roles son multi-persona — vienen del Sheet
  // (columnas `*_ID`) o del resolver por nombre como fallback. [] si no resuelve.
  pmIds: string[];
  arquitectoIds: string[];
  devIds: string[];
  poIds: string[];
  sqaIds: string[];
  /** Ids de bloqueadores (columna `Requiere_ID`). Opcional: la API puede no
   *  enriquecerlo en todos los endpoints. */
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
  /** equipo.id del colaborador (de `id` de la hoja). Opcional: red de seguridad
   *  si el resolver no logra mapear el nombre/email. */
  equipoId?: string;
  /** equipo.id del jefe directo (de `id_jefe`). Opcional. */
  jefeId?: string;
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

/**
 * Tarea unificada (hoja `actividades`). La hoja se consolidó: ya no existe el
 * discriminador `producto: 'App' | 'Core'` — `producto` ahora es la línea de
 * producto / OU (Academic, Atrevus, Togie, …).
 */
export interface TareaRecord {
  /** Id sintético (hash de campos identitarios); estable mientras no cambien. */
  id: string;
  /** Proyecto al que pertenece (= ProjectRecord.id); '' si no aplica. */
  proyectoId: string;
  proyecto: string;
  /** OU / línea de producto. */
  producto: string;
  sprint: string;
  folio: string;
  url: string;
  /** Título de la actividad (columna `Actividad`). */
  nombre: string;
  asignado: string;
  estatus: string;
  salud: string;
  /** Fase del trabajo (Desarrollo, SQA, Soporte, Análisis, …). */
  fase: string;
  tipo: string;
  prioridad: string;
  dificultad: string;
  epica: string;
  hito: string;
  hitoId: string;
  cuenta: string;
  puntos: number;
  /** Tiempo real traqueado (en puntos, comparable a `puntos`). */
  tracked: number;
  /** % de avance (0..1). */
  avance: number;
  registro: string;
  inicioEstimado: string;
  inicio: string;
  finEstimado: string;
  finReal: string;
  /** Rol del asignado en la actividad (Dev Jr, ARQ, SQA, PO, …). */
  rol: string;
  /** equipo.id del asignado (passthrough de `AsignadoId` + fallback resolver).
   *  Opcional: '' si no resuelve. */
  asignadoId?: string;
}

/** Calendario de sprints (hoja `sprint`). Expuesto por `GET /api/sprints`. */
export interface SprintRecord {
  sprint: string;        // S17
  mes: string;
  dias: number;          // días hábiles
  inicioEstimado: string;
  inicioReal: string;
  finEstimado: string;
  finReal: string;
  desfase: string;
  capacidadHoras: number;
  puntos: number;
}

/** Capacidad por persona por sprint (hoja `capacidades`). `GET /api/capacidades`. */
export interface CapacidadRecord {
  /** equipo.id resuelto (de `user_id`); '' si no resuelve. */
  equipoId: string;
  /** id numérico crudo de la hoja (`id_team`). */
  teamNum: string;
  nombre: string;
  sprint: string;        // id_sprint (S17)
  vacaciones: number;    // horas
  capacidad: number;     // horas disponibles
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

/** Repositorio + roles de acceso GitHub por persona (hoja `repositorios`). */
export interface RepoRecord {
  nombre: string;
  ambientes: string;
  estatus: string;
  dpto: string;
  producto: string;
  github: string;
  /** Cada uno puede traer varios nombres concatenados ("Lorena Olvera, Edgar Torres"). */
  administrador: string;
  arquitecto: string;
  colaborador: string;
  visualizador: string;
  deploy: string;
}

export function isTareaDone(estatus: string | undefined): boolean {
  const s = (estatus || '').toLowerCase();
  return s.includes('done') || s.includes('completad');
}

/** Registro canónico del equipo (espejo de `EquipoRecord` en src/pages/api/equipo.ts).
 *  Lo expone `GET /api/equipo` desde la tabla Turso `equipo`. */
export interface EquipoRecord {
  id: string;
  fullName: string;
  nickname: string;
  /** Nombre display "First Last" (columna `tag`); usado para cruzar con
   *  fuentes externas (e.g. `repositorios`). Puede venir '' mientras la
   *  migración 2026-equipo-tag.sql no se haya aplicado o seedeado. */
  tag: string;
  email: string;
  title: string;
  department: string;
  roleId: string;
  /** Nombre del rol (join con tabla `roles`). '' si el rol no existe. */
  roleName: string;
  managerId: string;
  /** Full name del manager (self-join). '' si no tiene manager. */
  managerName: string;
  active: boolean;
  /** True si hay un `user` vinculado a este miembro (puede entrar a la app). */
  hasLogin: boolean;
  /** Foto del user vinculado (si tiene login + subió avatar). null si no. */
  image: string | null;
}

// --- Evaluaciones trimestrales (HU NAV-78) --------------------------------

/** Una evaluación por (equipo_id, periodo). Dimensiones enteras 1..10.
 *  La "Calificación" total NO se persiste — es el promedio derivado. */
export interface EvaluacionRecord {
  id: number;
  equipoId: string;
  /** "YYYY-Qn" (e.g. "2026-Q2"). */
  periodo: string;
  actitud: number;
  aptitudes: number;
  comunicacion: number;
  velocidad: number;
  analisis: number;
  calidad: number;
  autogestion: number;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
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

// --- Glosario (espejo de src/data/glossary.ts) ----------------------------

export interface GlossarySource {
  label: string;
  href: string;
}

export interface GlossaryEntry {
  id: string;
  section: string;
  sectionSlug: string;
  title: string;
  summary: string;
  whatIs: string;
  howCalculated: string;
  whyMatters: string;
  sources?: GlossarySource[];
}

export interface GlossarySectionRelation {
  slug: string;
  label: string;
  difference: string;
}

export interface GlossarySectionIntro {
  whatIs: string;
  whenToUse: string;
  related?: GlossarySectionRelation[];
}

export interface GlossarySection {
  slug: string;
  title: string;
  description?: string;
  intro?: GlossarySectionIntro;
}
