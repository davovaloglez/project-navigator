import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Persist per-section UI state (filters + toggles) to a per-user server-side
 * store, with localStorage as anti-flash cache. Sync is one-way at mount —
 * tabs/devices do not propagate changes live; reload to see updates from
 * other sessions.
 *
 * Storage layout:
 *   - localStorage key: `pn-prefs-<sectionKey>` — JSON of last known state.
 *   - Server: `PUT /api/user-preferences` body `{ sectionKey, value }`.
 *   - Server: `GET /api/user-preferences` returns `{ [sectionKey]: value }`.
 *   - Server: `DELETE /api/user-preferences?section=<key>` clears it.
 *
 * Writes are debounced 500ms and the in-flight PUT is aborted when a newer
 * change arrives, so the last setState wins regardless of network ordering.
 */

const DEBOUNCE_MS = 500;
const ENDPOINT = '/api/user-preferences';

function storageKey(sectionKey: string): string {
  return `pn-prefs-${sectionKey}`;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function mergeDefaults<T extends object>(defaults: T, incoming: unknown): T {
  if (!isPlainObject(incoming)) return defaults;
  return { ...defaults, ...(incoming as Partial<T>) };
}

function loadFromLocal<T extends object>(sectionKey: string, defaults: T): T {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(storageKey(sectionKey));
    if (!raw) return defaults;
    return mergeDefaults(defaults, JSON.parse(raw));
  } catch {
    return defaults;
  }
}

function saveToLocal<T extends object>(sectionKey: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(sectionKey), JSON.stringify(value));
  } catch {
    // quota errors etc. — silent
  }
}

function clearLocal(sectionKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(sectionKey));
  } catch {
    // ignore
  }
}

export interface UsePersistedFiltersReturn<T> {
  state: T;
  setState: (updater: T | ((prev: T) => T)) => void;
  clear: () => void;
  hydrated: boolean;
}

export function usePersistedFilters<T extends object>(
  sectionKey: string,
  defaults: T
): UsePersistedFiltersReturn<T> {
  // defaults is captured by reference; freeze in a ref so callbacks stay stable
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  const [state, setStateRaw] = useState<T>(() => loadFromLocal(sectionKey, defaults));
  const [hydrated, setHydrated] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<AbortController | null>(null);
  const pendingValueRef = useRef<T | null>(null);

  // Hydrate from server on mount
  useEffect(() => {
    const ac = new AbortController();
    fetch(ENDPOINT, { signal: ac.signal, credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Record<string, unknown>) => {
        const remote = data?.[sectionKey];
        if (isPlainObject(remote)) {
          const merged = mergeDefaults(defaultsRef.current, remote);
          setStateRaw(merged);
          saveToLocal(sectionKey, merged);
        }
        setHydrated(true);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Stay with local cache / defaults; user can still use the page.
        setHydrated(true);
      });

    return () => ac.abort();
    // sectionKey is treated as stable per hook instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  const pushRemote = useCallback(
    (value: T, attempt = 0) => {
      inflightRef.current?.abort();
      const ac = new AbortController();
      inflightRef.current = ac;

      fetch(ENDPOINT, {
        method: 'PUT',
        signal: ac.signal,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionKey, value }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === 'AbortError') return;
          if (attempt === 0) {
            setTimeout(() => pushRemote(pendingValueRef.current ?? value, 1), 2000);
          } else {
            console.warn(`[usePersistedFilters:${sectionKey}] PUT failed`, err);
          }
        });
    },
    [sectionKey]
  );

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next =
          typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        saveToLocal(sectionKey, next);
        pendingValueRef.current = next;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          const value = pendingValueRef.current;
          if (value !== null) pushRemote(value);
        }, DEBOUNCE_MS);
        return next;
      });
    },
    [sectionKey, pushRemote]
  );

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    inflightRef.current?.abort();
    pendingValueRef.current = null;
    clearLocal(sectionKey);
    setStateRaw(defaultsRef.current);
    fetch(`${ENDPOINT}?section=${encodeURIComponent(sectionKey)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }).catch(() => {
      // fire-and-forget; next setState will re-sync
    });
  }, [sectionKey]);

  // Flush pending write on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        const value = pendingValueRef.current;
        if (value !== null) pushRemote(value);
      }
    };
  }, [pushRemote]);

  return useMemo(
    () => ({ state, setState, clear, hydrated }),
    [state, setState, clear, hydrated]
  );
}
