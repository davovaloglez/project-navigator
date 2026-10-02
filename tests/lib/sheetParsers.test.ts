import { describe, it, expect } from 'vitest';
import {
  parseDate,
  parseProgress,
  cleanId,
  splitIds,
  parseNumber,
} from '@/lib/sheetParsers';

describe('parseDate', () => {
  it('parses valid DD/MM/YYYY', () => {
    expect(parseDate('15/03/2026')).toBe('2026-03-15');
  });
  it('rejects rollover date 32/01/2026', () => {
    expect(parseDate('32/01/2026')).toBe('');
  });
  it('rejects invalid month 15/13/2026', () => {
    expect(parseDate('15/13/2026')).toBe('');
  });
  it('returns empty string for empty input', () => {
    expect(parseDate('')).toBe('');
  });
  it('returns empty string for dash input', () => {
    expect(parseDate('-')).toBe('');
  });
  it('returns raw string on fail when rawOnFail is true', () => {
    expect(parseDate('nope', { rawOnFail: true })).toBe('nope');
  });
  it('parses DD-MM-YYYY with dashes', () => {
    expect(parseDate('01-01-2026')).toBe('2026-01-01');
  });
});

describe('parseProgress', () => {
  it('parses 50% to 0.5', () => {
    expect(parseProgress('50%')).toBe(0.5);
  });
  it('parses 0.5 (decimal already) to 0.5', () => {
    expect(parseProgress('0.5')).toBe(0.5);
  });
  it('returns 0 for empty string', () => {
    expect(parseProgress('')).toBe(0);
  });
  it('returns 0 for non-numeric', () => {
    expect(parseProgress('abc')).toBe(0);
  });
});

describe('cleanId', () => {
  it('returns empty for #N/A', () => {
    expect(cleanId('#N/A')).toBe('');
  });
  it('returns empty for dashes and spaces', () => {
    expect(cleanId('-  -')).toBe('');
  });
  it('returns empty for empty string', () => {
    expect(cleanId('')).toBe('');
  });
  it('returns the id for valid input', () => {
    expect(cleanId('emontano')).toBe('emontano');
  });
  it('returns empty for #REF!', () => {
    expect(cleanId('#REF!')).toBe('');
  });
});

describe('splitIds', () => {
  it('splits, deduplicates, and filters invalid ids', () => {
    expect(splitIds('a, b, a, -')).toEqual(['a', 'b']);
  });
  it('returns empty array for empty string', () => {
    expect(splitIds('')).toEqual([]);
  });
});

describe('parseNumber', () => {
  it('parses dollar amount with commas', () => {
    expect(parseNumber('$1,200.50')).toBe(1200.5);
  });
  it('returns 0 for empty string', () => {
    expect(parseNumber('')).toBe(0);
  });
  it('parses plain number', () => {
    expect(parseNumber('42.5')).toBe(42.5);
  });
});
