import { useEffect, useRef, useState, useMemo } from 'react';
import type { EffectivePermissions, Resource } from '../lib/permissions/types';

const ENDPOINT = '/api/me/permissions';

const EMPTY: EffectivePermissions = {
  role: 'dev',
  pages: [],
  data: [],
  actions: [],
  blockDenies: [],
};

/** Permisos inyectados síncronos por Layout.astro (`window.__PN_PERMS__`). */
export function readInlinePermissions(): EffectivePermissions {
  if (typeof window === 'undefined') return EMPTY;
  const w = window as unknown as { __PN_PERMS__?: EffectivePermissions };
  return w.__PN_PERMS__ ?? EMPTY;
}

/** Evalúa un recurso contra el payload efectivo (mismo criterio que el server). */
export function canWith(perms: EffectivePermissions, resource: Resource): boolean {
  const i = resource.indexOf(':');
  const kind = resource.slice(0, i);
  const value = resource.slice(i + 1);
  switch (kind) {
    case 'page':
      return perms.pages.includes(value);
    case 'data':
      return perms.data.includes(value);
    case 'action':
      return perms.actions.includes(value);
    case 'block':
      // default-ALLOW: visible salvo deny explícito.
      return !perms.blockDenies.includes(value);
    default:
      return false;
  }
}

/**
 * Permisos del usuario actual para la UX (el server sigue siendo el gate real).
 *
 * Inicia con `EMPTY` en ambos lados (SSR y primer render cliente) para evitar
 * hydration mismatch — leer `window.__PN_PERMS__` en el `useState` inicial
 * devolvería distinto entre server (sin window) y cliente, y React abortaría
 * la hidratación. En el primer `useEffect` (post-mount) sincroniza desde
 * inline (inmediato, anti-flash más allá de un frame) y revalida vía
 * `GET /api/me/permissions`.
 */
export function usePermissions() {
  const [perms, setPerms] = useState<EffectivePermissions>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // 1) Sync inmediato desde inline (`window.__PN_PERMS__`) — no espera fetch.
    const inline = readInlinePermissions();
    if (inline !== EMPTY) setPerms(inline);
    // 2) Revalida desde el server por si los permisos cambiaron desde el SSR.
    const ac = new AbortController();
    fetch(ENDPOINT, { signal: ac.signal, credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<EffectivePermissions>;
      })
      .then((data) => {
        if (!mounted.current) return;
        setPerms(data);
        setHydrated(true);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Nos quedamos con los permisos inline; la UI sigue usable.
        if (mounted.current) setHydrated(true);
      });
    return () => {
      mounted.current = false;
      ac.abort();
    };
  }, []);

  const can = useMemo(() => (resource: Resource) => canWith(perms, resource), [perms]);

  return { can, perms, hydrated };
}
