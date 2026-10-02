/**
 * Weekly snapshot persistence in localStorage.
 *
 * We capture the minimal state needed for backtesting and course velocity:
 * - Each active project: folio, progreso, finEstimado, estatus, finReal (if any)
 * - Each colaborador in cursos: nombre, progreso
 *
 * Snapshots are keyed by ISO week (Monday-based) and pruned beyond MAX_WEEKS.
 * Auto-capture runs on mount if >= 7 days since the last snapshot.
 */

import type { CursoRecord, ProjectRecord } from './dataTransforms';

const STORAGE_KEY = 'pn-weekly-snapshots';
const MAX_WEEKS = 52;
const MS_DAY = 86400000;

export interface ProjectSnapshotEntry {
  /** Identidad canónica del proyecto (ProjectRecord.id). Llave de matching. */
  id: string;
  /** Folio para display (NO es llave: puede repetirse entre proyectos). */
  folio: string;
  actividad: string;
  progreso: number;
  finEstimado: string;
  finReal: string;
  estatus: string;
}

export interface CursoSnapshotEntry {
  colaborador: string;
  progreso: number;
}

export interface WeeklySnapshot {
  weekKey: string;
  capturedAt: string;
  projects: ProjectSnapshotEntry[];
  cursos: CursoSnapshotEntry[];
}

function today0(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekKey(d: Date): string {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = t.getDay();
  const monday = new Date(t);
  monday.setDate(t.getDate() - ((day + 6) % 7));
  return monday.toISOString().split('T')[0];
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSnapshots(): WeeklySnapshot[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse<WeeklySnapshot[]>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((s) => s && typeof s.weekKey === 'string')
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

export function saveSnapshots(snapshots: WeeklySnapshot[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const pruned = snapshots.slice(-MAX_WEEKS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Quota exceeded or disabled — silently ignore
  }
}

export function captureSnapshot(
  projects: ProjectRecord[],
  cursos: CursoRecord[],
  opts: { force?: boolean } = {}
): { captured: boolean; snapshot: WeeklySnapshot | null } {
  if (typeof window === 'undefined') return { captured: false, snapshot: null };
  if (projects.length === 0 && cursos.length === 0) return { captured: false, snapshot: null };

  const existing = loadSnapshots();
  const today = today0();
  const currentWeek = weekKey(today);

  if (!opts.force && existing.length > 0) {
    const last = existing[existing.length - 1];
    if (last.weekKey === currentWeek) return { captured: false, snapshot: last };
    const lastDate = new Date(last.weekKey);
    if (!isNaN(lastDate.getTime())) {
      const daysSince = (today.getTime() - lastDate.getTime()) / MS_DAY;
      if (daysSince < 7) return { captured: false, snapshot: last };
    }
  }

  const snapshot: WeeklySnapshot = {
    weekKey: currentWeek,
    capturedAt: today.toISOString(),
    projects: projects.map((p) => ({
      id: p.id,
      folio: p.folio,
      actividad: p.actividad,
      progreso: p.progreso ?? 0,
      finEstimado: p.finEstimado || '',
      finReal: p.finReal || '',
      estatus: p.estatus || '',
    })),
    cursos: cursos.map((c) => ({
      colaborador: c.colaborador,
      progreso: c.progreso ?? 0,
    })),
  };

  // Replace same-week snapshot if forced; otherwise append
  const filtered = existing.filter((s) => s.weekKey !== currentWeek);
  filtered.push(snapshot);
  saveSnapshots(filtered);

  // Fire-and-forget remote sync (failure is non-fatal)
  pushRemoteSnapshot(snapshot).catch(() => {
    // Network/auth errors are OK — localStorage still has the data
  });

  return { captured: true, snapshot };
}

// --- Remote sync (Google Sheets) --------------------------------------------

export async function fetchRemoteSnapshots(): Promise<WeeklySnapshot[]> {
  try {
    const res = await fetch('/api/snapshots');
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json as WeeklySnapshot[];
  } catch {
    return [];
  }
}

export async function pushRemoteSnapshot(snapshot: WeeklySnapshot): Promise<boolean> {
  try {
    const res = await fetch('/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Merge remote snapshots into local storage. Remote entries win for the same
 * weekKey (shared state is source of truth). Local-only snapshots (not yet
 * pushed) are preserved.
 */
export async function syncSnapshots(): Promise<{
  synced: boolean;
  total: number;
  snapshots: WeeklySnapshot[];
}> {
  const local = loadSnapshots();
  const remote = await fetchRemoteSnapshots();
  if (remote.length === 0 && local.length === 0) {
    return { synced: false, total: 0, snapshots: [] };
  }

  const merged = new Map<string, WeeklySnapshot>();
  for (const s of local) merged.set(s.weekKey, s);
  for (const s of remote) merged.set(s.weekKey, s); // remote wins

  const result = [...merged.values()].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  saveSnapshots(result);

  // Push any local-only snapshots (existed locally but not remotely) back up
  const remoteKeys = new Set(remote.map((s) => s.weekKey));
  const toPush = local.filter((s) => !remoteKeys.has(s.weekKey));
  for (const s of toPush) {
    pushRemoteSnapshot(s).catch(() => {});
  }

  return { synced: remote.length > 0, total: result.length, snapshots: result };
}

export function clearSnapshots(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function snapshotStats(snapshots: WeeklySnapshot[]): {
  weeks: number;
  firstWeek: string | null;
  lastWeek: string | null;
  projectsTracked: number;
  cursosTracked: number;
} {
  if (snapshots.length === 0) {
    return { weeks: 0, firstWeek: null, lastWeek: null, projectsTracked: 0, cursosTracked: 0 };
  }
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const projectsTracked = new Set<string>();
  const cursosTracked = new Set<string>();
  for (const s of snapshots) {
    for (const p of s.projects) projectsTracked.add(p.id);
    for (const c of s.cursos) cursosTracked.add(c.colaborador);
  }
  return {
    weeks: snapshots.length,
    firstWeek: first.weekKey,
    lastWeek: last.weekKey,
    projectsTracked: projectsTracked.size,
    cursosTracked: cursosTracked.size,
  };
}
