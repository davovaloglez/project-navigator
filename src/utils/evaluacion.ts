/**
 * Helpers compartidos del módulo de evaluaciones (NAV-78).
 *
 * Las 7 dimensiones + período + cálculo de calificación promedio. Source of
 * truth: cliente y server-side validation deben referenciar este archivo
 * (server-side hardcoded por simplicidad — si cambian las dimensiones,
 * actualizar también `/api/me/evaluaciones.ts`).
 */

export type Dimension =
  | 'actitud'
  | 'aptitudes'
  | 'comunicacion'
  | 'velocidad'
  | 'analisis'
  | 'calidad'
  | 'autogestion';

export interface DimensionMeta {
  key: Dimension;
  label: string;
  hint: string;
}

export const DIMENSIONS: DimensionMeta[] = [
  { key: 'actitud',      label: 'Actitud',      hint: 'Disposición, energía, voluntad de colaborar' },
  { key: 'aptitudes',    label: 'Aptitudes',    hint: 'Habilidades técnicas y de oficio' },
  { key: 'comunicacion', label: 'Comunicación', hint: 'Claridad al escribir, hablar y reportar' },
  { key: 'velocidad',    label: 'Velocidad',    hint: 'Ritmo de entrega vs estimación' },
  { key: 'analisis',     label: 'Análisis',     hint: 'Profundidad para entender el problema antes de codificar' },
  { key: 'calidad',      label: 'Calidad',      hint: 'Solidez técnica, ausencia de regresiones, atención al detalle' },
  { key: 'autogestion',  label: 'Autogestión',  hint: 'Capacidad para avanzar sin supervisión cercana' },
];

export const DIMENSION_KEYS = DIMENSIONS.map((d) => d.key);

/** Subconjunto numérico — la forma que viaja por endpoint + DB. */
export type DimensionScores = Record<Dimension, number>;

/** Calificación general = promedio de las 7 dimensiones. */
export function calcCalificacion(scores: DimensionScores): number {
  const sum = DIMENSION_KEYS.reduce((acc, k) => acc + (scores[k] ?? 0), 0);
  return sum / DIMENSION_KEYS.length;
}

/** Periodo trimestral "YYYY-Qn" para una fecha. Default: ahora. */
export function quarterOf(date: Date = new Date()): string {
  const y = date.getFullYear();
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

/** Decompone un periodo "YYYY-Qn" → (year, q). null si inválido. */
export function parsePeriodo(periodo: string): { year: number; q: number } | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(periodo);
  if (!m) return null;
  return { year: Number(m[1]), q: Number(m[2]) };
}

/** Compara dos periodos para sort (asc por defecto). */
export function comparePeriodos(a: string, b: string): number {
  const pa = parsePeriodo(a);
  const pb = parsePeriodo(b);
  if (!pa || !pb) return a.localeCompare(b);
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.q - pb.q;
}

/** Genera los últimos N períodos hasta el actual (incluido). Orden desc. */
export function recentPeriodos(count = 8): string[] {
  const now = new Date();
  const out: string[] = [];
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  for (let i = 0; i < count; i++) {
    out.push(`${y}-Q${q}`);
    q -= 1;
    if (q < 1) { q = 4; y -= 1; }
  }
  return out;
}

/** Color por bucket de calificación (escala 1-10). */
export function calificacionColor(score: number): string {
  if (score >= 9)   return 'text-green-400';
  if (score >= 8)   return 'text-emerald-400';
  if (score >= 7)   return 'text-blue-400';
  if (score >= 6)   return 'text-yellow-400';
  if (score >= 5)   return 'text-orange-400';
  return 'text-red-400';
}

export function calificacionBg(score: number): string {
  if (score >= 9)   return 'bg-green-500/15 border-green-500/30';
  if (score >= 8)   return 'bg-emerald-500/15 border-emerald-500/30';
  if (score >= 7)   return 'bg-blue-500/15 border-blue-500/30';
  if (score >= 6)   return 'bg-yellow-500/15 border-yellow-500/30';
  if (score >= 5)   return 'bg-orange-500/15 border-orange-500/30';
  return 'bg-red-500/15 border-red-500/30';
}
