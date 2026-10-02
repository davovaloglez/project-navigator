/**
 * Dependency analysis based on the `requiereDe` free-text field in projects.
 *
 * Each chunk of `requiereDe` is matched against other projects via:
 *   1. Exact folio match
 *   2. Folio substring (e.g., requiereDe contains "PROJECT-34")
 *   3. Actividad substring (case-insensitive, min 6 chars)
 *   4. NEW (NAV-76): persona del registro `equipo` por apodo/nombre. Cuando
 *      `requiereDe` apunta a una persona ("Fabian", "Edin") en vez de un
 *      proyecto, resolvemos contra `equipo` vía `resolveId` y exponemos
 *      `person` para que la UI muestre avatar + link a /persona/[id].
 *
 * If a blocker is still active (not Done), its forecast date constrains when
 * the dependent project can realistically close.
 */

import type { ProjectRecord } from './dataTransforms';
import type { ProjectForecast } from './forecastEngine';
import { resolveId, type MatchMember } from '../lib/equipoMatch';
import { isTerminal } from './projectStatus';

const MS_DAY = 86400000;
const CHUNK_SEPARATORS = /[,;/]|\s+y\s+|\n+|\s{2,}/gi;
const MIN_MATCH_LEN = 6;

export type BlockerStatus = 'resolved' | 'active' | 'at-risk' | 'unknown' | 'person';

/** Persona resuelta vía registro `equipo` cuando el chunk no es proyecto. */
export interface BlockerPerson {
  id: string;
  name: string; // tag o fullName
  image: string | null;
}

export interface Blocker {
  rawText: string;
  target: ProjectRecord | null;
  forecast: ProjectForecast | null;
  status: BlockerStatus;
  /** Set cuando el chunk resolvió a una persona del registro `equipo`. */
  person: BlockerPerson | null;
}

export interface ProjectDependency {
  dependent: ProjectRecord;
  dependentForecast: ProjectForecast | null;
  blockers: Blocker[];
  worstBlockerDate: string | null;
  effectiveStartDate: string | null;
  additionalSlippageDays: number | null;
  unresolvedBlockerCount: number;
}

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function splitChunks(text: string): string[] {
  if (!text) return [];
  return text
    .split(CHUNK_SEPARATORS)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function matchBlocker(chunk: string, projects: ProjectRecord[], selfFolio: string): ProjectRecord | null {
  const normalized = normalize(chunk);
  if (normalized.length < 3) return null;

  // 1. Exact folio match
  for (const p of projects) {
    if (p.folio === selfFolio) continue;
    if (normalize(p.folio) === normalized) return p;
  }

  // 2. Folio substring (e.g., "PROJECT-34" inside text)
  for (const p of projects) {
    if (p.folio === selfFolio) continue;
    const folioNorm = normalize(p.folio);
    if (folioNorm.length >= 4 && normalized.includes(folioNorm)) return p;
    if (normalized.length >= 4 && folioNorm.includes(normalized)) return p;
  }

  // 3. Actividad substring (min 6 chars to avoid false positives)
  if (normalized.length < MIN_MATCH_LEN) return null;
  let best: { project: ProjectRecord; score: number } | null = null;
  for (const p of projects) {
    if (p.folio === selfFolio) continue;
    const actNorm = normalize(p.actividad || '');
    if (actNorm.length < MIN_MATCH_LEN) continue;
    if (actNorm.includes(normalized) || normalized.includes(actNorm)) {
      const score = Math.min(actNorm.length, normalized.length);
      if (!best || score > best.score) best = { project: p, score };
    }
  }
  return best?.project || null;
}

function blockerStatusOf(target: ProjectRecord | null, forecast: ProjectForecast | null): BlockerStatus {
  if (!target) return 'unknown';
  if (isTerminal(target.estatus)) return 'resolved';
  if (!forecast) return 'active';
  if (forecast.risk === 'at-risk' || forecast.risk === 'stalled') return 'at-risk';
  return 'active';
}

/** Lookup auxiliar: id → {nombre display, image}. */
export interface EquipoLookup {
  members: MatchMember[];
  byId: Map<string, { name: string; image: string | null }>;
}

export function analyzeDependencies(
  projects: ProjectRecord[],
  forecastById: Map<string, ProjectForecast>,
  equipo?: EquipoLookup | null,
): ProjectDependency[] {
  const today = today0();
  const result: ProjectDependency[] = [];

  for (const project of projects) {
    const raw = (project.requiereDe || '').trim();
    if (!raw) continue;
    const chunks = splitChunks(raw);
    if (chunks.length === 0) continue;

    const blockers: Blocker[] = [];
    for (const chunk of chunks) {
      const target = matchBlocker(chunk, projects, project.folio);
      const targetForecast = target ? forecastById.get(target.id) || null : null;
      // Si el chunk no resolvió a proyecto, intentamos persona del equipo.
      let person: BlockerPerson | null = null;
      if (!target && equipo) {
        const id = resolveId(chunk, equipo.members);
        const meta = id ? equipo.byId.get(id) : null;
        if (id && meta) {
          person = { id, name: meta.name, image: meta.image };
        }
      }
      blockers.push({
        rawText: chunk,
        target,
        forecast: targetForecast,
        status: person ? 'person' : blockerStatusOf(target, targetForecast),
        person,
      });
    }

    // Compute worst blocker date (max forecastDate among active blockers)
    let worstDate: Date | null = null;
    for (const b of blockers) {
      if (b.status === 'resolved' || !b.forecast?.forecastDate) continue;
      const d = new Date(b.forecast.forecastDate);
      if (isNaN(d.getTime())) continue;
      if (!worstDate || d.getTime() > worstDate.getTime()) worstDate = d;
    }

    // Effective start = max(dependent.fechaInicio, worstBlockerDate)
    const dependentStart = project.fechaInicio ? new Date(project.fechaInicio) : null;
    let effectiveStart: Date | null = dependentStart && !isNaN(dependentStart.getTime()) ? dependentStart : null;
    if (worstDate && (!effectiveStart || worstDate.getTime() > effectiveStart.getTime())) {
      effectiveStart = worstDate;
    }

    // Additional slippage from blockers: how much later the effective start is vs today/original
    let additionalSlippage: number | null = null;
    if (worstDate && dependentStart && !isNaN(dependentStart.getTime())) {
      const plannedStart = dependentStart.getTime();
      const forcedStart = Math.max(plannedStart, worstDate.getTime(), today.getTime());
      additionalSlippage = Math.round((forcedStart - plannedStart) / MS_DAY);
    } else if (worstDate) {
      additionalSlippage = Math.round((worstDate.getTime() - today.getTime()) / MS_DAY);
    }

    const unresolved = blockers.filter((b) => b.status !== 'resolved').length;

    result.push({
      dependent: project,
      dependentForecast: forecastById.get(project.id) || null,
      blockers,
      worstBlockerDate: worstDate ? worstDate.toISOString().split('T')[0] : null,
      effectiveStartDate: effectiveStart ? effectiveStart.toISOString().split('T')[0] : null,
      additionalSlippageDays: additionalSlippage,
      unresolvedBlockerCount: unresolved,
    });
  }

  // Sort by unresolved count desc, then by additional slippage desc
  return result.sort((a, b) => {
    if (a.unresolvedBlockerCount !== b.unresolvedBlockerCount) {
      return b.unresolvedBlockerCount - a.unresolvedBlockerCount;
    }
    return (b.additionalSlippageDays ?? 0) - (a.additionalSlippageDays ?? 0);
  });
}

export function blockerStatusMeta(status: BlockerStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case 'resolved':
      return { label: 'Resuelto', color: 'text-green-400', bg: 'bg-green-500/15' };
    case 'active':
      return { label: 'Activo', color: 'text-amber-400', bg: 'bg-amber-500/15' };
    case 'at-risk':
      return { label: 'En riesgo', color: 'text-red-400', bg: 'bg-red-500/15' };
    case 'person':
      return { label: 'Responsable', color: 'text-blue-300', bg: 'bg-blue-500/15' };
    case 'unknown':
      return { label: 'No identificado', color: 'text-slate-400', bg: 'bg-slate-500/15' };
  }
}
