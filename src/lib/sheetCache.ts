/**
 * Generic in-memory cache helper for Google Sheets API routes.
 * Two variants: with epoch (for routes that bust cache on equipo changes)
 * and without (static data routes).
 */

const CACHE_TTL = 5 * 60 * 1000;

export function createSheetCache<T>(opts?: { withEpoch?: () => number }) {
  let cache: { data: T; timestamp: number; epoch: number } | null = null;
  return {
    get(): T | null {
      if (!cache) return null;
      if (Date.now() - cache.timestamp >= CACHE_TTL) return null;
      if (opts?.withEpoch && cache.epoch !== opts.withEpoch()) return null;
      return cache.data;
    },
    set(data: T): T {
      cache = { data, timestamp: Date.now(), epoch: opts?.withEpoch ? opts.withEpoch() : 0 };
      return data;
    },
  };
}
