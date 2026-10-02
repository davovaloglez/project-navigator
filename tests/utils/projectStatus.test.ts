import { describe, it, expect } from 'vitest';
import { ESTATUS_ORDER, isActive, isTerminal, isCancelled, countsForHealth } from '@/utils/projectStatus';

// Full truth-table over ESTATUS_ORDER + an unknown status
const ALL_STATUSES = [...ESTATUS_ORDER, 'UnknownStatus'] as const;

describe('ESTATUS_ORDER', () => {
  it('contains all expected statuses in the canonical order', () => {
    expect(ESTATUS_ORDER).toEqual([
      'Done',
      'On Track',
      'Upcoming',
      'On Hold',
      'At Risk',
      'Blocked / Critical',
      'Hypercare',
      'LaunchPhase',
      'Cancelado',
    ]);
  });
});

describe('isActive()', () => {
  it('returns false for "Done"', () => expect(isActive('Done')).toBe(false));
  it('returns false for "On Hold"', () => expect(isActive('On Hold')).toBe(false));
  it('returns false for "Cancelado"', () => expect(isActive('Cancelado')).toBe(false));

  it('returns true for "On Track"', () => expect(isActive('On Track')).toBe(true));
  it('returns true for "Upcoming"', () => expect(isActive('Upcoming')).toBe(true));
  it('returns true for "At Risk"', () => expect(isActive('At Risk')).toBe(true));
  it('returns true for "Blocked / Critical"', () => expect(isActive('Blocked / Critical')).toBe(true));
  it('returns true for "Hypercare"', () => expect(isActive('Hypercare')).toBe(true));
  it('returns true for "LaunchPhase"', () => expect(isActive('LaunchPhase')).toBe(true));
  it('returns true for unknown status (not explicitly excluded)', () => expect(isActive('UnknownStatus')).toBe(true));

  it('active + inactive partition covers all ESTATUS_ORDER', () => {
    const inactive = ['Done', 'On Hold', 'Cancelado'];
    for (const s of ESTATUS_ORDER) {
      if (inactive.includes(s)) {
        expect(isActive(s), `${s} should be inactive`).toBe(false);
      } else {
        expect(isActive(s), `${s} should be active`).toBe(true);
      }
    }
  });
});

describe('isTerminal()', () => {
  it('returns true only for "Done"', () => expect(isTerminal('Done')).toBe(true));
  it('returns true only for "Cancelado"', () => expect(isTerminal('Cancelado')).toBe(true));

  it('returns false for "On Track"', () => expect(isTerminal('On Track')).toBe(false));
  it('returns false for "Upcoming"', () => expect(isTerminal('Upcoming')).toBe(false));
  it('returns false for "On Hold"', () => expect(isTerminal('On Hold')).toBe(false));
  it('returns false for "At Risk"', () => expect(isTerminal('At Risk')).toBe(false));
  it('returns false for "Blocked / Critical"', () => expect(isTerminal('Blocked / Critical')).toBe(false));
  it('returns false for "Hypercare"', () => expect(isTerminal('Hypercare')).toBe(false));
  it('returns false for "LaunchPhase"', () => expect(isTerminal('LaunchPhase')).toBe(false));
  it('returns false for unknown status', () => expect(isTerminal('UnknownStatus')).toBe(false));

  it('full truth table over ESTATUS_ORDER', () => {
    const terminals = new Set(['Done', 'Cancelado']);
    for (const s of ESTATUS_ORDER) {
      expect(isTerminal(s), `isTerminal(${s})`).toBe(terminals.has(s));
    }
  });
});

describe('isCancelled()', () => {
  it('returns true only for "Cancelado"', () => expect(isCancelled('Cancelado')).toBe(true));
  it('returns false for "Done"', () => expect(isCancelled('Done')).toBe(false));
  it('returns false for "On Track"', () => expect(isCancelled('On Track')).toBe(false));
  it('returns false for "On Hold"', () => expect(isCancelled('On Hold')).toBe(false));
  it('returns false for unknown status', () => expect(isCancelled('UnknownStatus')).toBe(false));

  it('full truth table over ESTATUS_ORDER: only Cancelado is true', () => {
    for (const s of ESTATUS_ORDER) {
      expect(isCancelled(s), `isCancelled(${s})`).toBe(s === 'Cancelado');
    }
  });
});

describe('countsForHealth()', () => {
  it('returns false only for "Cancelado"', () => expect(countsForHealth('Cancelado')).toBe(false));
  it('returns true for "Done"', () => expect(countsForHealth('Done')).toBe(true));
  it('returns true for "On Track"', () => expect(countsForHealth('On Track')).toBe(true));
  it('returns true for "On Hold"', () => expect(countsForHealth('On Hold')).toBe(true));
  it('returns true for "LaunchPhase"', () => expect(countsForHealth('LaunchPhase')).toBe(true));
  it('returns true for unknown status', () => expect(countsForHealth('UnknownStatus')).toBe(true));

  it('full truth table: all statuses except Cancelado count for health', () => {
    for (const s of ALL_STATUSES) {
      expect(countsForHealth(s), `countsForHealth(${s})`).toBe(s !== 'Cancelado');
    }
  });
});
