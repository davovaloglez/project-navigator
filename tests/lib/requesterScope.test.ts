import { describe, it, expect } from 'vitest';
import { projectVisible, taskVisible, cursoVisible, capacidadVisible } from '@/lib/requesterScope';
import type { RequesterScope } from '@/lib/requesterScope';
import type { ProjectRecord, TareaRecord } from '@/utils/dataTransforms';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProject(partial: Partial<ProjectRecord> & { id: string }): ProjectRecord {
  return {
    folio: partial.id,
    actividad: `Project ${partial.id}`,
    finEstimado: '',
    arquitecto: '',
    salud: 'Verde',
    requiereDe: '',
    accionRequerida: '',
    fechaAccion: '',
    cliente: '',
    progreso: 0,
    tipo: 'App',
    prioridad: 'Media',
    epica: '',
    hito: '',
    cuatrimestre: '',
    cuenta: '',
    puntos: 0,
    registro: '',
    inicioEstimado: '',
    fechaInicio: '',
    finReal: '',
    pm: '',
    devs: [],
    estatus: 'On Track',
    url: '',
    producto: '',
    servicio: '',
    aliado: '',
    sprint: '',
    po: '',
    sqa: '',
    pmIds: [],
    arquitectoIds: [],
    devIds: [],
    poIds: [],
    sqaIds: [],
    ...partial,
  };
}

function makeTask(partial: Partial<TareaRecord> & { id: string }): TareaRecord {
  return {
    proyectoId: '',
    proyecto: '',
    producto: '',
    sprint: '',
    folio: '',
    url: '',
    nombre: `Task ${partial.id}`,
    asignado: '',
    estatus: 'On Track',
    salud: '',
    fase: '',
    tipo: '',
    prioridad: '',
    dificultad: '',
    epica: '',
    hito: '',
    hitoId: '',
    cuenta: '',
    puntos: 0,
    tracked: 0,
    avance: 0,
    registro: '',
    inicioEstimado: '',
    inicio: '',
    finEstimado: '',
    finReal: '',
    rol: '',
    asignadoId: undefined,
    ...partial,
  };
}

// ─── Scopes ─────────────────────────────────────────────────────────────────

const unscoped: RequesterScope = { kind: 'unscoped', equipoId: null };
const pmWithId: RequesterScope = { kind: 'pm', equipoId: 'emontano' };
const pmNoId: RequesterScope = { kind: 'pm', equipoId: null };
const devWithId: RequesterScope = { kind: 'dev', equipoId: 'dgonzalez' };
const devNoId: RequesterScope = { kind: 'dev', equipoId: null };

// ─── Projects ───────────────────────────────────────────────────────────────

// A project where emontano is PM
const projectPmOnly = makeProject({
  id: 'P1',
  pmIds: ['emontano'],
  arquitectoIds: [],
  devIds: [],
});

// A project where emontano is Arquitecto
const projectArqOnly = makeProject({
  id: 'P2',
  pmIds: [],
  arquitectoIds: ['emontano'],
  devIds: [],
});

// A project where dgonzalez is dev
const projectDevOnly = makeProject({
  id: 'P3',
  pmIds: [],
  arquitectoIds: [],
  devIds: ['dgonzalez'],
});

// A project where dgonzalez is arquitecto
const projectArqDev = makeProject({
  id: 'P4',
  pmIds: [],
  arquitectoIds: ['dgonzalez'],
  devIds: [],
});

// A project where emontano is PM and another person is dev
const projectPmOnlyEmontano = makeProject({
  id: 'P5',
  pmIds: ['emontano'],
  arquitectoIds: [],
  devIds: ['xvazquez'],
});

describe('projectVisible() — unscoped scope', () => {
  it('unscoped always returns true regardless of project ids', () => {
    expect(projectVisible(projectPmOnly, unscoped)).toBe(true);
    expect(projectVisible(projectArqOnly, unscoped)).toBe(true);
    expect(projectVisible(projectDevOnly, unscoped)).toBe(true);
  });

  it('unscoped with equipoId null still returns true', () => {
    expect(projectVisible(projectPmOnly, { kind: 'unscoped', equipoId: null })).toBe(true);
  });
});

describe('projectVisible() — scoped scope with equipoId null (fail-closed)', () => {
  it('pm scope with null equipoId returns false', () => {
    expect(projectVisible(projectPmOnly, pmNoId)).toBe(false);
  });

  it('dev scope with null equipoId returns false', () => {
    expect(projectVisible(projectDevOnly, devNoId)).toBe(false);
  });
});

describe('projectVisible() — pm scope', () => {
  it('pm sees a project where they are in pmIds', () => {
    expect(projectVisible(projectPmOnly, pmWithId)).toBe(true);
  });

  it('pm sees a project where they are in arquitectoIds', () => {
    expect(projectVisible(projectArqOnly, pmWithId)).toBe(true);
  });

  it('pm does NOT see a project where they are only in devIds', () => {
    // emontano is NOT in devIds of projectDevOnly
    expect(projectVisible(projectDevOnly, pmWithId)).toBe(false);
  });

  it('pm does NOT see a project where equipoId appears nowhere', () => {
    const unrelated = makeProject({
      id: 'POTHER',
      pmIds: ['xvazquez'],
      arquitectoIds: ['ylopez'],
      devIds: ['zmartinez'],
    });
    expect(projectVisible(unrelated, pmWithId)).toBe(false);
  });
});

describe('projectVisible() — dev scope', () => {
  it('dev sees a project where they are in devIds', () => {
    expect(projectVisible(projectDevOnly, devWithId)).toBe(true);
  });

  it('dev sees a project where they are in arquitectoIds', () => {
    expect(projectVisible(projectArqDev, devWithId)).toBe(true);
  });

  it('dev does NOT see a project where they are only in pmIds', () => {
    expect(projectVisible(projectPmOnlyEmontano, devWithId)).toBe(false);
  });

  it('dev does NOT see a project where equipoId appears nowhere', () => {
    const unrelated = makeProject({
      id: 'POTHER',
      pmIds: ['emontano'],
      arquitectoIds: ['ylopez'],
      devIds: ['zmartinez'],
    });
    expect(projectVisible(unrelated, devWithId)).toBe(false);
  });
});

// ─── Tasks ──────────────────────────────────────────────────────────────────

const taskAssignedToEmontano = makeTask({ id: 'T1', asignadoId: 'emontano' });
const taskAssignedToXvazquez = makeTask({ id: 'T2', asignadoId: 'xvazquez' });
const taskUnassigned = makeTask({ id: 'T3', asignadoId: undefined });

describe('taskVisible() — unscoped scope', () => {
  it('unscoped always returns true', () => {
    expect(taskVisible(taskAssignedToEmontano, unscoped)).toBe(true);
    expect(taskVisible(taskUnassigned, unscoped)).toBe(true);
  });
});

describe('taskVisible() — scoped with null equipoId (fail-closed)', () => {
  it('pm null equipoId returns false', () => {
    expect(taskVisible(taskAssignedToEmontano, pmNoId)).toBe(false);
  });

  it('dev null equipoId returns false', () => {
    expect(taskVisible(taskAssignedToEmontano, devNoId)).toBe(false);
  });
});

describe('taskVisible() — scoped with equipoId', () => {
  it('returns true when asignadoId matches equipoId', () => {
    expect(taskVisible(taskAssignedToEmontano, pmWithId)).toBe(true);
  });

  it('returns false when asignadoId is different from equipoId', () => {
    expect(taskVisible(taskAssignedToXvazquez, pmWithId)).toBe(false);
  });

  it('returns false when asignadoId is undefined', () => {
    expect(taskVisible(taskUnassigned, pmWithId)).toBe(false);
  });

  it('dev sees their own task', () => {
    const myTask = makeTask({ id: 'T4', asignadoId: 'dgonzalez' });
    expect(taskVisible(myTask, devWithId)).toBe(true);
  });

  it('dev does not see someone else task', () => {
    expect(taskVisible(taskAssignedToEmontano, devWithId)).toBe(false);
  });
});

// ─── Cursos ─────────────────────────────────────────────────────────────────

describe('cursoVisible() — unscoped scope', () => {
  it('unscoped always returns true', () => {
    expect(cursoVisible({ equipoId: 'emontano' }, unscoped)).toBe(true);
    expect(cursoVisible({ equipoId: undefined }, unscoped)).toBe(true);
    expect(cursoVisible({}, unscoped)).toBe(true);
  });
});

describe('cursoVisible() — scoped with null equipoId (fail-closed)', () => {
  it('pm null equipoId returns false', () => {
    expect(cursoVisible({ equipoId: 'emontano' }, pmNoId)).toBe(false);
  });

  it('dev null equipoId returns false', () => {
    expect(cursoVisible({ equipoId: 'dgonzalez' }, devNoId)).toBe(false);
  });
});

describe('cursoVisible() — scoped with equipoId', () => {
  it('returns true when equipoId matches scope', () => {
    expect(cursoVisible({ equipoId: 'emontano' }, pmWithId)).toBe(true);
  });

  it('returns false when equipoId does not match scope', () => {
    expect(cursoVisible({ equipoId: 'dgonzalez' }, pmWithId)).toBe(false);
  });

  it('returns false when equipoId is undefined', () => {
    expect(cursoVisible({ equipoId: undefined }, pmWithId)).toBe(false);
    expect(cursoVisible({}, pmWithId)).toBe(false);
  });

  it('dev sees their own curso', () => {
    expect(cursoVisible({ equipoId: 'dgonzalez' }, devWithId)).toBe(true);
  });

  it('dev does not see someone else curso', () => {
    expect(cursoVisible({ equipoId: 'emontano' }, devWithId)).toBe(false);
  });
});

// ─── Capacidades ────────────────────────────────────────────────────────────

describe('capacidadVisible() — unscoped scope', () => {
  it('unscoped always returns true', () => {
    expect(capacidadVisible({ equipoId: 'emontano' }, unscoped)).toBe(true);
    expect(capacidadVisible({ equipoId: undefined }, unscoped)).toBe(true);
    expect(capacidadVisible({}, unscoped)).toBe(true);
  });
});

describe('capacidadVisible() — scoped with null equipoId (fail-closed)', () => {
  it('pm null equipoId returns false', () => {
    expect(capacidadVisible({ equipoId: 'emontano' }, pmNoId)).toBe(false);
  });

  it('dev null equipoId returns false', () => {
    expect(capacidadVisible({ equipoId: 'dgonzalez' }, devNoId)).toBe(false);
  });
});

describe('capacidadVisible() — scoped with equipoId', () => {
  it('returns true when equipoId matches scope', () => {
    expect(capacidadVisible({ equipoId: 'emontano' }, pmWithId)).toBe(true);
  });

  it('returns false when equipoId does not match scope', () => {
    expect(capacidadVisible({ equipoId: 'dgonzalez' }, pmWithId)).toBe(false);
  });

  it('returns false when equipoId is undefined', () => {
    expect(capacidadVisible({ equipoId: undefined }, pmWithId)).toBe(false);
    expect(capacidadVisible({}, pmWithId)).toBe(false);
  });

  it('dev sees their own capacidad row', () => {
    expect(capacidadVisible({ equipoId: 'dgonzalez' }, devWithId)).toBe(true);
  });

  it('dev does not see someone else capacidad row', () => {
    expect(capacidadVisible({ equipoId: 'emontano' }, devWithId)).toBe(false);
  });
});

