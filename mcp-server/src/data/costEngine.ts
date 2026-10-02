import type { CostoRecord, FinancialModel, ProjectRecord } from './types.js';
import { splitNames } from './parsers.js';
import { isActive } from './projectStatus.js';

export interface ProjectCostEstimate {
  estimatedMonthlyCost: number;
  breakdown: { role: string; person: string; cost: number }[];
  teamSize: number;
}

export interface ClientPricing {
  costoInterno: number;
  valorExperiencia: number;
  costoAdministrativo: number;
  subtotalConAdmin: number;
  margen: number;
  subtotalConMargen: number;
  iva: number;
  precioCliente: number;
  utilidad: number;
}

export function applyFinancialModel(costoInterno: number, model: FinancialModel): ClientPricing {
  const valorExperiencia = costoInterno * model.valorExperienciaRate;
  const costoAdministrativo = valorExperiencia * model.costoAdminRate;
  const subtotalConAdmin = valorExperiencia + costoAdministrativo;
  const margen = subtotalConAdmin * model.margenRate;
  const subtotalConMargen = subtotalConAdmin + margen;
  const iva = subtotalConMargen * model.ivaRate;
  const precioCliente = subtotalConMargen + iva;
  return {
    costoInterno,
    valorExperiencia,
    costoAdministrativo,
    subtotalConAdmin,
    margen,
    subtotalConMargen,
    iva,
    precioCliente,
    utilidad: precioCliente - costoInterno,
  };
}

function findCostRecord(costos: CostoRecord[], roleHint: string): CostoRecord | null {
  const lower = roleHint.toLowerCase();
  const aliases: Record<string, string[]> = {
    arquitecto: ['arquitecto'],
    developer: ['desarrollador'],
    pm: ['project manager'],
    'project manager': ['project manager'],
  };
  const searchTerms = aliases[lower] || [lower];

  for (const c of costos) {
    if (c.rol.toLowerCase() === lower) return c;
  }
  for (const term of searchTerms) {
    for (const c of costos) {
      const key = c.rol.toLowerCase();
      if (key.includes(term) || term.includes(key)) return c;
    }
  }
  return null;
}

/**
 * Estima el costo mensual interno prorrateando el costo del equipo entre los
 * proyectos activos. Soporta roles multi-persona (arquitecto/PM/devs comma-joined).
 */
export function estimateProjectCost(
  project: ProjectRecord,
  allProjects: ProjectRecord[],
  costos: CostoRecord[],
): ProjectCostEstimate {
  if (!costos.length) return { estimatedMonthlyCost: 0, breakdown: [], teamSize: 0 };

  const active = allProjects.filter((p) => isActive(p.estatus));
  let total = 0;
  const breakdown: { role: string; person: string; cost: number }[] = [];

  const arqCost = findCostRecord(costos, 'arquitecto');
  if (arqCost) {
    for (const arq of splitNames(project.arquitecto)) {
      const count = active.filter((p) => splitNames(p.arquitecto).includes(arq)).length || 1;
      const share = arqCost.costoMensual / count;
      total += share;
      breakdown.push({ role: 'Arquitecto', person: arq, cost: share });
    }
  }

  const pmCost = findCostRecord(costos, 'project manager');
  if (pmCost) {
    for (const pm of splitNames(project.pm)) {
      const count = active.filter((p) => splitNames(p.pm).includes(pm)).length || 1;
      const share = pmCost.costoMensual / count;
      total += share;
      breakdown.push({ role: 'PM', person: pm, cost: share });
    }
  }

  const devCost = findCostRecord(costos, 'developer');
  if (devCost) {
    for (const dev of project.devs) {
      const count = active.filter((p) => p.devs.includes(dev)).length || 1;
      const share = devCost.costoMensual / count;
      total += share;
      breakdown.push({ role: 'Developer', person: dev, cost: share });
    }
  }

  return {
    estimatedMonthlyCost: Math.round(total),
    breakdown,
    teamSize: splitNames(project.arquitecto).length + splitNames(project.pm).length + project.devs.length,
  };
}

export interface PersonCostEstimate {
  monthlyCost: number;
  role: string;
  costoHora: number;
  projectsCost: { id: string; folio: string; actividad: string; cost: number }[];
}

/**
 * Estima el costo mensual asociado a una persona. Resuelve la identidad por
 * `personId` (equipo.id) cuando viene set; si no, hace match por nombre contra
 * los nombres crudos de la hoja (modo legacy).
 */
export function estimatePersonCost(
  identifier: { personId?: string; nombre?: string },
  allProjects: ProjectRecord[],
  costos: CostoRecord[],
): PersonCostEstimate {
  if (!costos.length) return { monthlyCost: 0, role: '', costoHora: 0, projectsCost: [] };

  const personId = identifier.personId || '';
  const nombre = (identifier.nombre || '').toLowerCase().trim();
  const matchProject = (p: ProjectRecord): { isArq: boolean; isPm: boolean; isDev: boolean } => {
    if (personId) {
      return {
        isArq: p.arquitectoIds.includes(personId),
        isPm: p.pmIds.includes(personId),
        isDev: p.devIds.includes(personId),
      };
    }
    const inField = (field: string) =>
      splitNames(field).some((n) => n.toLowerCase() === nombre || n.toLowerCase().includes(nombre));
    return {
      isArq: inField(p.arquitecto),
      isPm: inField(p.pm),
      isDev: p.devs.some((d) => d.toLowerCase() === nombre || d.toLowerCase().includes(nombre)),
    };
  };

  const active = allProjects.filter((p) => isActive(p.estatus));

  let costRecord: CostoRecord | null = null;
  let role = '';
  if (allProjects.some((p) => matchProject(p).isArq)) {
    costRecord = findCostRecord(costos, 'arquitecto');
    role = 'Arquitecto';
  } else if (allProjects.some((p) => matchProject(p).isPm)) {
    costRecord = findCostRecord(costos, 'project manager');
    role = 'PM';
  } else if (allProjects.some((p) => matchProject(p).isDev)) {
    costRecord = findCostRecord(costos, 'developer');
    role = 'Developer';
  }

  if (!costRecord) return { monthlyCost: 0, role, costoHora: 0, projectsCost: [] };

  const personActive = active.filter((p) => {
    const m = matchProject(p);
    return m.isArq || m.isPm || m.isDev;
  });

  const projectsCost = personActive.map((p) => ({
    id: p.id,
    folio: p.folio,
    actividad: p.actividad,
    cost: Math.round(costRecord.costoMensual / Math.max(1, personActive.length)),
  }));

  return {
    monthlyCost: costRecord.costoMensual,
    role,
    costoHora: costRecord.costoHora,
    projectsCost,
  };
}
