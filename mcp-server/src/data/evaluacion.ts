/**
 * Espejo de src/utils/evaluacion.ts del proyecto Astro (HU NAV-78).
 * Las 7 dimensiones canónicas + cálculo de calificación promedio + helpers de
 * período trimestral. Mantener sincronizado: si cambian las dimensiones o los
 * formatos en el proyecto principal, actualizar también aquí.
 */

import type { EvaluacionRecord } from './types.js';

export type Dimension =
  | 'actitud'
  | 'aptitudes'
  | 'comunicacion'
  | 'velocidad'
  | 'analisis'
  | 'calidad'
  | 'autogestion';

export const DIMENSION_KEYS: Dimension[] = [
  'actitud',
  'aptitudes',
  'comunicacion',
  'velocidad',
  'analisis',
  'calidad',
  'autogestion',
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  actitud: 'Actitud',
  aptitudes: 'Aptitudes',
  comunicacion: 'Comunicación',
  velocidad: 'Velocidad',
  analisis: 'Análisis',
  calidad: 'Calidad',
  autogestion: 'Autogestión',
};

export type DimensionScores = Record<Dimension, number>;

/** Calificación = promedio aritmético simple de las 7 dimensiones. */
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

/** Devuelve sólo las dimensiones de una EvaluacionRecord. */
export function scoresOf(rec: EvaluacionRecord): DimensionScores {
  return {
    actitud: rec.actitud,
    aptitudes: rec.aptitudes,
    comunicacion: rec.comunicacion,
    velocidad: rec.velocidad,
    analisis: rec.analisis,
    calidad: rec.calidad,
    autogestion: rec.autogestion,
  };
}
