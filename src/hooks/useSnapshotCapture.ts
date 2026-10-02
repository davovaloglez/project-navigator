import { useEffect } from 'react';
import type { ProjectRecord, CursoRecord } from '../utils/dataTransforms';
import { captureSnapshot, syncSnapshots } from '../utils/snapshots';
import { isScopedRole } from '../lib/scopeRoles';

/** Rol del usuario actual desde los permisos inyectados por Layout.astro. */
function currentRole(): string | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __PN_PERMS__?: { role?: string } };
  return w.__PN_PERMS__?.role ?? null;
}

/**
 * Passive snapshot capture. Drop into any page that already has project data
 * loaded; it will:
 *   1. Sync with Google Sheets on mount (pulls shared history).
 *   2. Try to capture the current week's snapshot if not already stored.
 *
 * The 7-day guard in `captureSnapshot` prevents duplicates, so this is safe
 * to call from many pages — they all no-op after the first capture of the week.
 *
 * Cursos are optional; if omitted, the snapshot only tracks projects.
 */
export function useSnapshotCapture(projects: ProjectRecord[], cursos: CursoRecord[] = []) {
  // Sync with remote on mount (non-blocking)
  useEffect(() => {
    syncSnapshots().catch(() => {
      // Remote unavailable — local-only still works
    });
  }, []);

  // Try to capture when data is available.
  // Fase 5: si el rol es SCOPEADO, `projects`/`cursos` vienen filtrados por
  // identidad (parciales) → NO capturar (corrompería el histórico). El cron
  // server-side /api/snapshots/auto-capture (lee el Sheet completo) es la
  // fuente autoritativa. El syncSnapshots (lectura) sí corre para todos.
  useEffect(() => {
    if (projects.length === 0 && cursos.length === 0) return;
    if (isScopedRole(currentRole())) return;
    captureSnapshot(projects, cursos);
  }, [projects, cursos]);
}
