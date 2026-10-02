/**
 * Tests for src/utils/teamTechnology.ts — Plan 015.
 * Pure unit tests: no DB, no network, no Turso.
 */
import { describe, it, expect } from 'vitest';
import {
  LEVEL_ORDER,
  LEVEL_LABEL,
  compareLevel,
  peopleForTech,
  techsForPerson,
  projectsForTech,
  groupByCategory,
} from '@/utils/teamTechnology';
import type { TeamTechnology, Technology, ProjectRecord } from '@/utils/dataTransforms';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mkRow = (
  equipoId: string,
  technologyId: string,
  level: TeamTechnology['level'],
): TeamTechnology => ({ equipoId, technologyId, level, updatedAt: '2026-06-01T00:00:00Z' });

const matrix: TeamTechnology[] = [
  mkRow('emontano', 'react', 'sr'),
  mkRow('emontano', 'typescript', 'arq'),
  mkRow('lore', 'react', 'mid'),
  mkRow('lore', 'python', 'jr'),
  mkRow('dave', 'react', 'trainee'),
  mkRow('dave', 'go', 'mid'),
];

const catalog: Technology[] = [
  { id: 'react', name: 'React', category: 'framework', active: true },
  { id: 'typescript', name: 'TypeScript', category: 'language', active: true },
  { id: 'python', name: 'Python', category: 'language', active: true },
  { id: 'go', name: 'Go', category: 'language', active: true },
];

function mkProject(
  id: string,
  estatus: string,
  pmIds: string[] = [],
  arquitectoIds: string[] = [],
  devIds: string[] = [],
): ProjectRecord {
  return {
    id,
    folio: id,
    actividad: `Project ${id}`,
    finEstimado: '',
    arquitecto: '',
    salud: '',
    requiereDe: '',
    accionRequerida: '',
    fechaAccion: '',
    cliente: '',
    progreso: 0.5,
    tipo: '',
    prioridad: '',
    epica: '',
    hito: '',
    cuatrimestre: '',
    cuenta: '',
    puntos: 10,
    registro: '',
    inicioEstimado: '',
    fechaInicio: '',
    finReal: '',
    pm: '',
    devs: [],
    estatus,
    url: '',
    producto: '',
    servicio: '',
    aliado: '',
    sprint: '',
    po: '',
    sqa: '',
    pmIds,
    poIds: [],
    sqaIds: [],
    arquitectoIds,
    devIds,
  } as unknown as ProjectRecord;
}

// ---------------------------------------------------------------------------
// LEVEL_ORDER
// ---------------------------------------------------------------------------

describe('LEVEL_ORDER', () => {
  it('has exactly 5 levels', () => {
    expect(LEVEL_ORDER).toHaveLength(5);
  });

  it('is ordered from least to most senior', () => {
    expect(LEVEL_ORDER).toEqual(['trainee', 'jr', 'mid', 'sr', 'arq']);
  });

  it('LEVEL_LABEL covers every level', () => {
    for (const level of LEVEL_ORDER) {
      expect(LEVEL_LABEL[level]).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// compareLevel
// ---------------------------------------------------------------------------

describe('compareLevel', () => {
  it('returns negative when first level is lower', () => {
    expect(compareLevel('trainee', 'arq')).toBeLessThan(0);
    expect(compareLevel('jr', 'sr')).toBeLessThan(0);
  });

  it('returns positive when first level is higher', () => {
    expect(compareLevel('arq', 'trainee')).toBeGreaterThan(0);
    expect(compareLevel('sr', 'mid')).toBeGreaterThan(0);
  });

  it('returns 0 for equal levels', () => {
    expect(compareLevel('mid', 'mid')).toBe(0);
    expect(compareLevel('arq', 'arq')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// peopleForTech
// ---------------------------------------------------------------------------

describe('peopleForTech', () => {
  it('returns only rows for that technology', () => {
    const result = peopleForTech('react', matrix);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.technologyId === 'react')).toBe(true);
  });

  it('sorts descending by level (Arq → Trainee)', () => {
    const result = peopleForTech('react', matrix);
    const levels = result.map((r) => r.level);
    expect(levels).toEqual(['sr', 'mid', 'trainee']);
  });

  it('returns empty array for unknown technology', () => {
    expect(peopleForTech('rust', matrix)).toHaveLength(0);
  });

  it('returns only the person for a single-person technology', () => {
    const result = peopleForTech('go', matrix);
    expect(result).toHaveLength(1);
    expect(result[0].equipoId).toBe('dave');
  });
});

// ---------------------------------------------------------------------------
// techsForPerson
// ---------------------------------------------------------------------------

describe('techsForPerson', () => {
  it('returns only rows for that person', () => {
    const result = techsForPerson('emontano', matrix);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.equipoId === 'emontano')).toBe(true);
  });

  it('sorts descending by level', () => {
    const result = techsForPerson('emontano', matrix);
    // emontano: arq (typescript), sr (react)
    expect(result[0].level).toBe('arq');
    expect(result[1].level).toBe('sr');
  });

  it('returns empty for unknown person', () => {
    expect(techsForPerson('unknown', matrix)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// projectsForTech
// ---------------------------------------------------------------------------

describe('projectsForTech', () => {
  const projects: ProjectRecord[] = [
    mkProject('p1', 'In Progress', ['emontano'], [], ['lore']), // emontano+lore → react
    mkProject('p2', 'In Progress', [], ['dave'], []),           // dave → react (Trainee)
    mkProject('p3', 'Done', ['emontano'], [], []),              // Done → not active
    mkProject('p4', 'In Progress', [], [], ['unknown']),        // no react skill
  ];

  it('returns active projects where at least one team member has the tech', () => {
    const result = projectsForTech('react', matrix, projects);
    const ids = result.map((p) => p.id).sort();
    // p1 (emontano has react:sr, lore has react:mid), p2 (dave has react:trainee)
    expect(ids).toEqual(['p1', 'p2']);
  });

  it('excludes Done projects', () => {
    const result = projectsForTech('react', matrix, projects);
    expect(result.find((p) => p.id === 'p3')).toBeUndefined();
  });

  it('excludes projects whose team has no one with the tech', () => {
    const result = projectsForTech('react', matrix, projects);
    expect(result.find((p) => p.id === 'p4')).toBeUndefined();
  });

  it('returns empty for a tech with no matrix rows', () => {
    const result = projectsForTech('rust', matrix, projects);
    expect(result).toHaveLength(0);
  });

  it('handles empty project list', () => {
    expect(projectsForTech('react', matrix, [])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// groupByCategory
// ---------------------------------------------------------------------------

describe('groupByCategory', () => {
  it('groups technologies by category', () => {
    const groups = groupByCategory(catalog);
    expect(groups['language']).toHaveLength(3); // typescript, python, go
    expect(groups['framework']).toHaveLength(1); // react
  });

  it('preserves order within each category', () => {
    const groups = groupByCategory(catalog);
    const langIds = groups['language'].map((t) => t.id);
    expect(langIds).toEqual(['typescript', 'python', 'go']);
  });

  it('returns empty object for empty catalog', () => {
    expect(groupByCategory([])).toEqual({});
  });
});
