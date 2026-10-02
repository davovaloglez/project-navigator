/**
 * Helpers de string/array reutilizables por los tools. El parsing de fechas y
 * números pasó al servidor Astro (los endpoints devuelven datos ya
 * normalizados), así que aquí sólo queda lo que las herramientas siguen
 * necesitando para operar sobre los datos JSON recibidos.
 */

/** Split CSV en celda → nombres, descartando vacíos y placeholders. */
export function splitNames(value: string): string[] {
  return (value || '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-');
}
