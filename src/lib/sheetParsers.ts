/**
 * Shared parser helpers for Google Sheets API routes.
 * Single source of truth — do NOT duplicate in individual routes.
 */

/** Parse a date string in DD/MM/YYYY or DD-MM-YYYY format to ISO YYYY-MM-DD.
 *  Uses round-trip validation to reject rollover dates (e.g. 32/01/2026 → '').
 *  @param opts.rawOnFail  return the trimmed raw string instead of '' on failure (used by tareas.ts)
 */
export function parseDate(value: string, opts?: { rawOnFail?: boolean }): string {
  if (!value || !value.trim()) return '';
  const trimmed = value.trim();
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) {
    const [, dayS, monthS, yearS] = parts;
    const day = parseInt(dayS), month = parseInt(monthS), year = parseInt(yearS);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      return d.toISOString().split('T')[0];
    }
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return opts?.rawOnFail ? trimmed : '';
}

export function parseProgress(value: string): number {
  if (!value || !value.trim()) return 0;
  const num = parseFloat(value.replace('%', '').trim());
  if (isNaN(num)) return 0;
  return num > 1 ? num / 100 : num;
}

export function cleanId(value: string): string {
  const v = (value || '').trim();
  if (!v || /^[-\s]+$/.test(v) || v.toUpperCase() === '#N/A' || v.toUpperCase() === '#REF!') return '';
  return v;
}

export function splitIds(value: string): string[] {
  return [...new Set((value || '').split(',').map((s) => cleanId(s)).filter(Boolean))];
}

export function parseNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

export function makeColAccessor(headerRow: string[]) {
  const headers = headerRow.map((h) => (h || '').trim().toLowerCase());
  return (row: string[], name: string): string => {
    const idx = headers.indexOf(name.toLowerCase());
    return idx >= 0 ? (row[idx] || '').trim() : '';
  };
}
