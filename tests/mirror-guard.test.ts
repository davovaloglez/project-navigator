/**
 * Behavioral drift guard: ensures the hand-synced mcp-server mirrors stay
 * in sync with their src/ originals.
 *
 * This test imports both copies and asserts identical outputs over a shared
 * sample set. It uses BEHAVIORAL checks (not textual diff) so comments and
 * import paths that legitimately differ do not cause false failures.
 *
 * Mirror pairs covered:
 *   src/utils/projectStatus.ts  ↔  mcp-server/src/data/projectStatus.ts
 *   src/lib/equipoMatch.ts       ↔  mcp-server/src/data/equipoMatch.ts
 */

import { describe, it, expect } from 'vitest';
import * as srcStatus from '@/utils/projectStatus';
import * as mcpStatus from '../mcp-server/src/data/projectStatus';
import * as srcMatch from '@/lib/equipoMatch';
import * as mcpMatch from '../mcp-server/src/data/equipoMatch';

// All known status values (including edge cases / unknowns)
const STATUSES = [
  'Done',
  'On Track',
  'Upcoming',
  'On Hold',
  'At Risk',
  'Blocked / Critical',
  'Hypercare',
  'LaunchPhase',
  'Cancelado',
  'Unknown',
  '',
  'random-garbage',
];

describe('mcp-server mirror: projectStatus', () => {
  it('ESTATUS_ORDER identical', () => {
    expect([...mcpStatus.ESTATUS_ORDER]).toEqual([...srcStatus.ESTATUS_ORDER]);
  });

  it('predicates agree on all sample statuses', () => {
    for (const s of STATUSES) {
      expect(mcpStatus.isActive(s)).toBe(srcStatus.isActive(s));
      expect(mcpStatus.isTerminal(s)).toBe(srcStatus.isTerminal(s));
      expect(mcpStatus.isCancelled(s)).toBe(srcStatus.isCancelled(s));
      expect(mcpStatus.countsForHealth(s)).toBe(srcStatus.countsForHealth(s));
    }
  });
});

describe('mcp-server mirror: equipoMatch', () => {
  it('ALIAS identical', () => {
    expect(mcpMatch.ALIAS).toEqual(srcMatch.ALIAS);
  });

  it('norm agrees on sample inputs', () => {
    const names = [
      'Lorena Raquel Olvera Rodríguez',
      'yorch',
      'Edgar Torres',
      'Ale',
      '',
      '-',
      'David',
      'UPPERCASE NAME',
      '  spaces  ',
    ];
    for (const n of names) {
      expect(mcpMatch.norm(n)).toBe(srcMatch.norm(n));
    }
  });

  it('tokenMatch agrees on sample pairs', () => {
    const pairs: [string, string][] = [
      ['edgar', 'edgar torres'],
      ['lore', 'lorena raquel olvera rodriguez'],
      ['', 'anything'],
      ['abc', 'abc'],
      ['ab', 'ab def'],   // token < 3 chars: should NOT match
      ['david', 'david alejandro gonzalez'],
    ];
    for (const [a, b] of pairs) {
      expect(mcpMatch.tokenMatch(a, b)).toBe(srcMatch.tokenMatch(a, b));
    }
  });

  it('buildMembers + resolveId agree on samples', () => {
    const rows = [
      { id: 'jenriquez', nickname: 'George', full_name: 'Jorge Alberto Enríquez Salazar' },
      { id: 'etorres', nickname: 'Edgar', full_name: 'Edgar Torres' },
      { id: 'avazquez', nickname: 'Dave', full_name: 'David Alejandro González' },
    ];
    const srcMembers = srcMatch.buildMembers(rows);
    const mcpMembers = mcpMatch.buildMembers(rows);

    // buildMembers should produce structurally identical results
    expect(mcpMembers).toEqual(srcMembers);

    // resolveId should return the same id (or null) for every sample name
    const names = [
      'Lorena Raquel Olvera Rodríguez',
      'yorch',
      'Edgar Torres',
      'Ale',
      '',
      '-',
      'David',
      'Edgar',
      'George',
      'Dave',
      'jorge',
    ];
    for (const n of names) {
      expect(mcpMatch.resolveId(n, mcpMembers)).toBe(srcMatch.resolveId(n, srcMembers));
    }
  });
});
