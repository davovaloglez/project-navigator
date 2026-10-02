import type { CostoRecord, FinancialModel, ProjectRecord } from './dataTransforms';
import { isActive } from './projectStatus';

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

/**
 * Applies the financial pricing formula to an internal cost.
 * Mirrors the Excel model: experience value → admin overhead → profit margin → IVA.
 */
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

export function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatMoneyFull(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


function findCostRecord(costos: CostoRecord[], roleHint: string): CostoRecord | null {
  const lower = roleHint.toLowerCase();

  // Keyword aliases: roleHint → words to search in cost table
  const aliases: Record<string, string[]> = {
    'arquitecto': ['arquitecto'],
    'developer': ['desarrollador'],
    'pm': ['project manager'],
    'project manager': ['project manager'],
  };

  const searchTerms = aliases[lower] || [lower];

  // Direct match first
  for (const c of costos) {
    const key = c.rol.toLowerCase();
    if (key === lower) return c;
  }

  // Alias / partial match
  for (const term of searchTerms) {
    for (const c of costos) {
      const key = c.rol.toLowerCase();
      if (key.includes(term) || term.includes(key)) return c;
    }
  }

  return null;
}

/**
 * Estimate the monthly cost of a single project based on its team and the cost table.
 * Cost is prorated: if a person works on N active projects, their cost is split N ways.
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

  const splitNames = (v: string) => (v || '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-');

  // Pre-build count maps: O(active × team) once instead of O(active) per role-person pair.
  const arqCounts = new Map<string, number>();
  const pmCounts = new Map<string, number>();
  const devCounts = new Map<string, number>();
  for (const p of active) {
    for (const name of new Set(splitNames(p.arquitecto))) {
      arqCounts.set(name, (arqCounts.get(name) ?? 0) + 1);
    }
    for (const name of new Set(splitNames(p.pm))) {
      pmCounts.set(name, (pmCounts.get(name) ?? 0) + 1);
    }
    for (const dev of new Set(p.devs)) {
      devCounts.set(dev, (devCounts.get(dev) ?? 0) + 1);
    }
  }

  // Arquitecto(s) — multi-persona: prorratea cada uno por sus proyectos activos.
  const arqCost = findCostRecord(costos, 'arquitecto');
  if (arqCost) {
    for (const arq of splitNames(project.arquitecto)) {
      const count = arqCounts.get(arq) || 1;
      const share = arqCost.costoMensual / count;
      total += share;
      breakdown.push({ role: 'Arquitecto', person: arq, cost: share });
    }
  }

  // PM(s)
  const pmCost = findCostRecord(costos, 'project manager');
  if (pmCost) {
    for (const pm of splitNames(project.pm)) {
      const count = pmCounts.get(pm) || 1;
      const share = pmCost.costoMensual / count;
      total += share;
      breakdown.push({ role: 'PM', person: pm, cost: share });
    }
  }

  // DEVs
  const devCost = findCostRecord(costos, 'developer');
  if (devCost) {
    for (const dev of project.devs) {
      const count = devCounts.get(dev) || 1;
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

/**
 * Estimate the monthly cost associated with a specific person across all their active projects.
 */
export function estimatePersonCost(
  personId: string,
  allProjects: ProjectRecord[],
  costos: CostoRecord[],
): { monthlyCost: number; role: string; costoHora: number; projectsCost: { id: string; folio: string; actividad: string; cost: number }[] } {
  if (!costos.length || !personId) return { monthlyCost: 0, role: '', costoHora: 0, projectsCost: [] };

  const active = allProjects.filter((p) => isActive(p.estatus));

  // Detect primary role por identidad resuelta (equipo.id), no por nombre.
  let costRecord: CostoRecord | null = null;
  let role = '';
  if (allProjects.some((p) => p.arquitectoIds.includes(personId))) {
    costRecord = findCostRecord(costos, 'arquitecto');
    role = 'Arquitecto';
  } else if (allProjects.some((p) => p.pmIds.includes(personId))) {
    costRecord = findCostRecord(costos, 'project manager');
    role = 'PM';
  } else if (allProjects.some((p) => p.devIds.includes(personId))) {
    costRecord = findCostRecord(costos, 'developer');
    role = 'Developer';
  }

  if (!costRecord) return { monthlyCost: 0, role, costoHora: 0, projectsCost: [] };

  const monthlyCost = costRecord.costoMensual;
  const costoHora = costRecord.costoHora;

  // How that cost splits across active projects
  const personActive = active.filter((p) =>
    p.arquitectoIds.includes(personId) || p.pmIds.includes(personId) || p.devIds.includes(personId)
  );
  const projectsCost = personActive.map((p) => ({
    id: p.id,
    folio: p.folio,
    actividad: p.actividad,
    cost: Math.round(monthlyCost / Math.max(1, personActive.length)),
  }));

  return { monthlyCost, role, costoHora, projectsCost };
}
