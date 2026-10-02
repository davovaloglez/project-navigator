import { describe, it, expect } from 'vitest';
import { ALIAS, norm, tokenMatch, buildMembers, resolveId } from '@/lib/equipoMatch';

// Fixture members for all tests
const rawMembers = [
  // Aliased: yorch → jenriquez
  { id: 'jenriquez', nickname: 'George', full_name: 'Jorge Alberto Enriquez Salazar' },
  // Unique nickname
  { id: 'emontano', nickname: 'Lore', full_name: 'Eduardo Montano Torres' },
  // Unique full_name (unusual: same nick as nobody)
  { id: 'lolvera', nickname: 'Lorena', full_name: 'Lorena Raquel Olvera Rodriguez' },
  // Two members sharing the fuzzy token "garcia" (to force ambiguous → null)
  { id: 'agarcia', nickname: 'Ana', full_name: 'Ana Garcia Reyes' },
  { id: 'jgarcia', nickname: 'Juan', full_name: 'Juan Garcia Lopez' },
  // A member whose nick matches "dave"
  { id: 'dgonzalez', nickname: 'Dave', full_name: 'David Alejandro Gonzalez Ramos' },
];

const members = buildMembers(rawMembers);

describe('norm()', () => {
  it('strips accents from Spanish characters', () => {
    const result = norm('Lorena Raquel Olvera Rodríguez');
    // Should be lowercase, no accents, only letters/digits/spaces
    expect(result).toBe('lorena raquel olvera rodriguez');
  });

  it('lowercases and trims', () => {
    expect(norm('  Hola Mundo  ')).toBe('hola mundo');
  });

  it('handles empty string', () => {
    expect(norm('')).toBe('');
  });

  it('replaces special chars with space and trims', () => {
    expect(norm('José-María')).toBe('jose maria');
  });
});

describe('tokenMatch()', () => {
  it('returns false when the only shared token has length < 3 (different strings sharing short token)', () => {
    // "ab cd" and "ab xy" share only token "ab" (len 2 < 3) → skip → no match → false
    // Note: the exact-equality shortcut fires only when a === b, so we use different strings
    expect(tokenMatch('ab cd', 'ab xy')).toBe(false);
  });

  it('returns true for direct string equality (before token loop)', () => {
    expect(tokenMatch('garcia', 'garcia')).toBe(true);
  });

  it('returns true when a long token prefix matches', () => {
    expect(tokenMatch('jordi', 'jorge alberto')).toBe(false);
    expect(tokenMatch('jorge', 'jorge alberto')).toBe(true);
  });

  it('returns false when no tokens match', () => {
    expect(tokenMatch('pedro', 'maria reyes')).toBe(false);
  });

  it('returns false for empty strings', () => {
    expect(tokenMatch('', 'anything')).toBe(false);
    expect(tokenMatch('anything', '')).toBe(false);
  });
});

describe('buildMembers()', () => {
  it('normalizes full_name to .full property', () => {
    const m = buildMembers([{ id: 'test1', nickname: 'T', full_name: 'Test User' }]);
    expect(m[0].full).toBe('test user');
  });

  it('accepts fullName (camelCase) as fallback', () => {
    const m = buildMembers([{ id: 'test2', fullName: 'Another Person' } as any]);
    expect(m[0].full).toBe('another person');
  });

  it('normalizes nickname to .nick property', () => {
    const m = buildMembers([{ id: 'x', nickname: 'Álvaro', full_name: '' }]);
    expect(m[0].nick).toBe('alvaro');
  });
});

describe('resolveId()', () => {
  it('returns null for empty string', () => {
    expect(resolveId('', members)).toBeNull();
  });

  it('returns null for "-"', () => {
    expect(resolveId('-', members)).toBeNull();
  });

  it('resolves ALIAS "yorch" → "jenriquez"', () => {
    expect(resolveId('yorch', members)).toBe('jenriquez');
  });

  it('resolves unique nickname exactly', () => {
    // "Lore" is emontano's unique nick
    expect(resolveId('Lore', members)).toBe('emontano');
  });

  it('resolves "Dave" → dgonzalez by unique nickname', () => {
    expect(resolveId('Dave', members)).toBe('dgonzalez');
  });

  it('resolves unique full_name exactly (accent-insensitive)', () => {
    // Lorena Raquel Olvera Rodriguez — exact full_name match after norm
    expect(resolveId('Lorena Raquel Olvera Rodriguez', members)).toBe('lolvera');
  });

  it('returns null when fuzzy match is ambiguous (two "garcia" members)', () => {
    // "garcia" fuzzy matches both agarcia and jgarcia → null
    expect(resolveId('garcia', members)).toBeNull();
  });

  it('resolves unambiguous fuzzy match', () => {
    // "enriquez" only matches jenriquez (via full_name token)
    expect(resolveId('enriquez', members)).toBe('jenriquez');
  });

  it('ALIAS takes precedence even if full_name fuzzy could resolve', () => {
    // "yorch" is in ALIAS → jenriquez, regardless of fuzzy
    expect(resolveId('yorch', members)).toBe('jenriquez');
  });
});

describe('ALIAS', () => {
  it('contains the expected curated entries', () => {
    expect(ALIAS['yorch']).toBe('jenriquez');
    expect(ALIAS['eduardo']).toBe('emontano');
    expect(ALIAS['alejandro']).toBe('avazquez');
  });
});
