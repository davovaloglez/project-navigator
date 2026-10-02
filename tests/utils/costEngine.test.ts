import { describe, it, expect } from 'vitest';
import { applyFinancialModel, formatMoney, formatMoneyFull, estimateProjectCost } from '@/utils/costEngine';
import type { ProjectRecord, CostoRecord, FinancialModel } from '@/utils/dataTransforms';

// Helper to build a minimal ProjectRecord for testing
function makeProject(partial: Partial<ProjectRecord> & { id: string; estatus: string }): ProjectRecord {
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

// A realistic cost fixture: rol names that findCostRecord can resolve
const costoArqRecord: CostoRecord = {
  rol: 'Arquitecto',        // matches hint 'arquitecto' (case-insensitive partial match)
  recursos: 1,
  horasRecurso: 160,
  costoMensual: 1000,
  costoHora: 6.25,
  horas: 160,
  total: 1000,
};

const costoDevRecord: CostoRecord = {
  rol: 'Desarrollador Sr',  // matches hint 'developer' → alias 'desarrollador'
  recursos: 1,
  horasRecurso: 160,
  costoMensual: 800,
  costoHora: 5,
  horas: 160,
  total: 800,
};

const costoPmRecord: CostoRecord = {
  rol: 'Project Manager',   // matches hint 'project manager'
  recursos: 1,
  horasRecurso: 160,
  costoMensual: 900,
  costoHora: 5.625,
  horas: 160,
  total: 900,
};

describe('formatMoney()', () => {
  it('formats millions as $X.XM', () => {
    expect(formatMoney(1_500_000)).toBe('$1.5M');
  });

  it('formats thousands as $X.XK', () => {
    expect(formatMoney(2_300)).toBe('$2.3K');
  });

  it('formats small amounts rounded as $X', () => {
    expect(formatMoney(123)).toBe('$123');
  });

  it('formats exactly 1000 as $1.0K', () => {
    expect(formatMoney(1_000)).toBe('$1.0K');
  });

  it('formats exactly 1_000_000 as $1.0M', () => {
    expect(formatMoney(1_000_000)).toBe('$1.0M');
  });

  it('formats 999 as $999 (no K threshold)', () => {
    expect(formatMoney(999)).toBe('$999');
  });
});

describe('formatMoneyFull()', () => {
  it('formats with 2 decimal places in es-MX locale', () => {
    const result = formatMoneyFull(2337.5);
    // Should start with $ and include decimal separator
    expect(result).toContain('$');
    expect(result).toMatch(/2[,.]?337/); // locale may use commas as thousand sep
  });

  it('handles negative numbers', () => {
    const result = formatMoneyFull(-100);
    expect(result).toMatch(/^-\$/);
  });

  it('formats zero correctly', () => {
    expect(formatMoneyFull(0)).toContain('0');
  });
});

describe('applyFinancialModel()', () => {
  // Hand-computed model:
  // costoInterno = 1000
  // valorExperienciaRate = 0.1 → valorExperiencia = 100
  // costoAdminRate = 0.1 → costoAdministrativo = 10
  // subtotalConAdmin = 110
  // margenRate = 0.1 → margen = 11
  // subtotalConMargen = 121
  // ivaRate = 0.16 → iva = 19.36
  // precioCliente = 140.36
  // utilidad = 140.36 - 1000 = -859.64

  const model: FinancialModel = {
    steps: [],
    costoOperativo: 1000,
    valorExperienciaRate: 0.1,
    costoAdminRate: 0.1,
    margenRate: 0.1,
    ivaRate: 0.16,
    total: 0,
  };

  it('computes valorExperiencia correctly', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.valorExperiencia).toBeCloseTo(100, 5);
  });

  it('computes costoAdministrativo correctly', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.costoAdministrativo).toBeCloseTo(10, 5);
  });

  it('computes subtotalConAdmin correctly', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.subtotalConAdmin).toBeCloseTo(110, 5);
  });

  it('computes margen correctly', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.margen).toBeCloseTo(11, 5);
  });

  it('computes subtotalConMargen correctly', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.subtotalConMargen).toBeCloseTo(121, 5);
  });

  it('computes iva correctly', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.iva).toBeCloseTo(19.36, 5);
  });

  it('computes precioCliente correctly', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.precioCliente).toBeCloseTo(140.36, 5);
  });

  it('preserves costoInterno', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.costoInterno).toBe(1000);
  });

  it('computes utilidad = precioCliente - costoInterno', () => {
    const result = applyFinancialModel(1000, model);
    expect(result.utilidad).toBeCloseTo(result.precioCliente - result.costoInterno, 10);
  });

  it('scales linearly with a different costoInterno', () => {
    const r2000 = applyFinancialModel(2000, model);
    const r1000 = applyFinancialModel(1000, model);
    // Everything should be exactly 2x
    expect(r2000.valorExperiencia).toBeCloseTo(r1000.valorExperiencia * 2, 5);
    expect(r2000.precioCliente).toBeCloseTo(r1000.precioCliente * 2, 5);
  });
});

describe('estimateProjectCost()', () => {
  it('returns zero cost when costos array is empty', () => {
    const project = makeProject({ id: 'P1', estatus: 'On Track', arquitecto: 'Luis' });
    const result = estimateProjectCost(project, [project], []);
    expect(result).toEqual({ estimatedMonthlyCost: 0, breakdown: [], teamSize: 0 });
  });

  it('computes architect cost prorated across 2 active projects', () => {
    // One architect "Luis" on 2 active projects → share = 1000 / 2 = 500
    const p1 = makeProject({ id: 'P1', estatus: 'On Track', arquitecto: 'Luis' });
    const p2 = makeProject({ id: 'P2', estatus: 'At Risk', arquitecto: 'Luis' });

    const result = estimateProjectCost(p1, [p1, p2], [costoArqRecord]);

    expect(result.estimatedMonthlyCost).toBe(500);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].role).toBe('Arquitecto');
    expect(result.breakdown[0].person).toBe('Luis');
    expect(result.breakdown[0].cost).toBeCloseTo(500, 5);
    expect(result.teamSize).toBe(1); // only the architect
  });

  it('Does NOT count Done project toward proration divisor', () => {
    // "Luis" on 1 active (On Track) + 1 done → only 1 active → share = 1000 / 1 = 1000
    const active = makeProject({ id: 'P1', estatus: 'On Track', arquitecto: 'Luis' });
    const done = makeProject({ id: 'P2', estatus: 'Done', arquitecto: 'Luis' });

    const result = estimateProjectCost(active, [active, done], [costoArqRecord]);

    expect(result.estimatedMonthlyCost).toBe(1000); // not split with Done project
    expect(result.breakdown[0].cost).toBeCloseTo(1000, 5);
  });

  it('Does NOT count Cancelado project toward proration divisor', () => {
    // "Luis" on 1 active + 1 cancelado → only 1 active → share = 1000
    const active = makeProject({ id: 'P1', estatus: 'On Track', arquitecto: 'Luis' });
    const cancelled = makeProject({ id: 'P2', estatus: 'Cancelado', arquitecto: 'Luis' });

    const result = estimateProjectCost(active, [active, cancelled], [costoArqRecord]);

    expect(result.estimatedMonthlyCost).toBe(1000);
  });

  it('computes dev cost prorated across active projects', () => {
    // Dev "Maria" on 2 active projects → share = 800 / 2 = 400
    const p1 = makeProject({ id: 'P1', estatus: 'On Track', devs: ['Maria'] });
    const p2 = makeProject({ id: 'P2', estatus: 'Upcoming', devs: ['Maria'] });

    const result = estimateProjectCost(p1, [p1, p2], [costoDevRecord]);

    expect(result.estimatedMonthlyCost).toBe(400);
    expect(result.breakdown[0].role).toBe('Developer');
    expect(result.breakdown[0].person).toBe('Maria');
    expect(result.teamSize).toBe(1);
  });

  it('accumulates architect + dev costs correctly', () => {
    // "Luis" as architect (1000, only on p1), "Maria" as dev (800, only on p1)
    const p1 = makeProject({
      id: 'P1',
      estatus: 'On Track',
      arquitecto: 'Luis',
      devs: ['Maria'],
    });
    const allProjects = [p1];

    const result = estimateProjectCost(p1, allProjects, [costoArqRecord, costoDevRecord]);

    expect(result.estimatedMonthlyCost).toBe(1000 + 800);
    expect(result.breakdown).toHaveLength(2);
    expect(result.teamSize).toBe(2); // 1 arq + 1 dev
  });

  it('computes teamSize as sum of arquitecto + pm + devs', () => {
    const p1 = makeProject({
      id: 'P1',
      estatus: 'On Track',
      arquitecto: 'Luis',
      pm: 'Ana',
      devs: ['Maria', 'Pedro'],
    });
    const result = estimateProjectCost(p1, [p1], [costoArqRecord, costoPmRecord, costoDevRecord]);
    expect(result.teamSize).toBe(4); // 1 arq + 1 pm + 2 devs
  });

  it('falls back to divisor 1 when architect appears on ZERO active projects (|| 1 guard)', () => {
    // The project itself is Done (not active). The architect "Luis" therefore appears on
    // 0 active projects. The || 1 guard must kick in → share = full costoMensual (1000).
    const doneProject = makeProject({ id: 'P1', estatus: 'Done', arquitecto: 'Luis' });

    const result = estimateProjectCost(doneProject, [doneProject], [costoArqRecord]);

    expect(result.estimatedMonthlyCost).toBe(1000); // divisor falls back to 1
    expect(result.breakdown[0].cost).toBeCloseTo(1000, 5);
  });

  it('falls back to divisor 1 when dev appears on ZERO active projects (|| 1 guard)', () => {
    // Done project: dev "Maria" on 0 active projects → divisor 1 → share = 800.
    const doneProject = makeProject({ id: 'P1', estatus: 'Done', devs: ['Maria'] });

    const result = estimateProjectCost(doneProject, [doneProject], [costoDevRecord]);

    expect(result.estimatedMonthlyCost).toBe(800);
    expect(result.breakdown[0].cost).toBeCloseTo(800, 5);
  });

  it('counts a project once even if it lists the same name twice in one role field', () => {
    // projectA being estimated: architect "Luis" (single).
    // projectB (also active) lists the SAME architect twice in its field: "Luis, Luis".
    // Luis is therefore on 2 ACTIVE PROJECTS (A and B) — B must count ONCE, not twice.
    // Expected divisor = 2 → share = 1000 / 2 = 500 (matches old filter().includes semantics).
    const projectA = makeProject({ id: 'A', estatus: 'On Track', arquitecto: 'Luis' });
    const projectB = makeProject({ id: 'B', estatus: 'On Track', arquitecto: 'Luis, Luis' });

    const result = estimateProjectCost(projectA, [projectA, projectB], [costoArqRecord]);

    expect(result.estimatedMonthlyCost).toBe(500); // divisor 2, NOT 3
    expect(result.breakdown[0].cost).toBeCloseTo(500, 5);
  });
});
