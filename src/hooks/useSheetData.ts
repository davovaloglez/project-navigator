import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSheetDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  /** true si el endpoint respondió 403 (sin permiso). NO es un error fatal:
   *  el consumidor debe ocultar la sección/dato, no romper la página. */
  forbidden: boolean;
  refetch: () => void;
}

export function useSheetData<T>(endpoint: string): UseSheetDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const retriedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRetry = false) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(endpoint, { signal: controller.signal });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          const redirect = window.location.pathname + window.location.search;
          window.location.href = '/login?redirect=' + encodeURIComponent(redirect);
        }
        return;
      }
      if (res.status === 403) {
        // Permiso denegado: NO es transitorio → sin retry, sin error fatal.
        // El consumidor debe ocultar el dato vía `forbidden`.
        setForbidden(true);
        setData([]);
        retriedRef.current = false;
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const json = await res.json();
      setForbidden(false);
      setData(json);
      retriedRef.current = false;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Error desconocido';
      if (!isRetry && !retriedRef.current) {
        retriedRef.current = true;
        fetchData(true);
        return;
      }
      setError(message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    retriedRef.current = false;
    fetchData();
  }, [fetchData]);

  return { data, loading, error, forbidden, refetch };
}
