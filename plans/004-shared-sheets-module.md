# Plan 004: Extract a shared Sheets-API module (cache + fetch + parsers)

> **Executor instructions**: Follow step by step. Run every verification command and confirm the
> expected result before moving on. On any "STOP condition", stop and report. When done, update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/pages/api/ src/lib/sheets.ts`
> If any API route changed, re-read it and compare against the excerpts below before refactoring it.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001 (tests give a safety net; the new parsers must be unit-tested)
- **Category**: tech-debt
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

Nine read-only API routes each re-implement the same scaffolding: a module-level `let cache`, a
`CACHE_TTL = 5 * 60 * 1000`, the `getSheets()`/`getSheetId()` calls, a header-indexed `col()` lookup,
and near-identical `parseDate` / `cleanId` / `parseProgress` / `parseNumber` helpers. A fix to date
parsing (plan 011) or the cache strategy, or adding row-scoping to every endpoint (plan 005), today
means editing up to nine files in lockstep — and the copies have already drifted slightly (e.g.
`proyectos.ts` calls it `cleanId`, `tareas.ts` calls it `clean`; `tareas.ts` `parseDate` returns the
raw string on failure while `proyectos.ts` returns `''`). Extracting one shared module makes those
fixes single-point and removes the drift. **This plan is a pure refactor: no behavior change.**

## Current state

Routes sharing the pattern (verified at `34cffdc`):
`src/pages/api/proyectos.ts`, `tareas.ts`, `cursos.ts`, `hitos.ts`, `costos.ts`,
`costos-modelo.ts`, `repositorios.ts`, `sprints.ts`, `capacidades.ts`.

The shared infra already exists in `src/lib/sheets.ts` (do NOT duplicate it):
```ts
export function getSheets() { /* GoogleAuth + sheets v4, memoized in _sheets */ }
export function getSheetId(): string { return envVar('SHEET_ID') ?? ''; }
```

The repeated cache shape (two variants — with and without `epoch`):
```ts
// proyectos.ts / tareas.ts / cursos.ts / hitos.ts / repositorios.ts (with epoch):
let cache: { data: unknown; timestamp: number; epoch: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;
if (cache && Date.now() - cache.timestamp < CACHE_TTL && cache.epoch === equipoEpoch()) { ... }

// costos.ts / costos-modelo.ts / sprints.ts / capacidades.ts (no epoch):
let cache: { data: unknown; timestamp: number } | null = null;
```
`equipoEpoch()` comes from `src/lib/equipoResolver.ts`; it changes when the `equipo` table cache is
invalidated, forcing a re-resolve. Endpoints that resolve names use it; pure ones don't.

The repeated header lookup (identical across routes):
```ts
const headers = rows[0].map((h: string) => h.trim().toLowerCase());
const col = (row: string[], name: string): string => {
  const idx = headers.indexOf(name.toLowerCase());
  return idx >= 0 ? (row[idx] || '').trim() : '';
};
```

The repeated parsers (slightly drifted — UNIFY to the `proyectos.ts` semantics, which return `''` on
failure; note `tareas.ts:parseDate` currently returns the raw `trimmed` string on failure — see STOP
conditions, this is a behavior nuance):
```ts
// proyectos.ts
function parseDate(value: string): string { /* dd/mm/yyyy or Date(); '' on fail */ }
function parseProgress(value: string): number { /* "%"→fraction; >1 → /100 */ }
function cleanId(value: string): string { /* '#N/A','#REF!','-','' → '' */ }
function splitIds(value: string): string[] { /* csv → cleaned, unique, ordered */ }
// costos.ts / costos-modelo.ts
function parseNumber(value: string): number { /* strip $,space; parseFloat||0 */ }
```

## Commands you will need

| Purpose   | Command                | Expected |
|-----------|------------------------|----------|
| Install   | `npm install`          | exit 0   |
| Typecheck | `npx astro check`      | exit 0, 0 errors |
| Tests     | `npm test`             | all pass (incl. new parser tests) |
| Build     | `npm run build`        | exit 0   |

## Scope

**In scope**:
- `src/lib/sheetParsers.ts` (create) — `parseDate`, `parseProgress`, `cleanId`, `splitIds`,
  `parseNumber`, and a `makeColAccessor(headerRow)` returning the `col` function.
- `src/lib/sheetCache.ts` (create) — a small helper that encapsulates the 5-min TTL (+ optional
  epoch) cache and the fetch. See Step 2 for the exact contract.
- `src/lib/sheetParsers.test.ts` (create) — unit tests for the parsers.
- The 9 API routes listed above — refactor each to import from the new modules. **One route per
  commit/step** so a regression is bisectable.

**Out of scope** (do NOT touch):
- `src/lib/sheets.ts` — already the shared auth/client layer; leave it.
- Response shapes — every endpoint must return byte-identical JSON to before. This is a refactor.
- Row-scoping logic in `proyectos.ts`/`tareas.ts` — leave the `getRequesterScope`/`scoped()` calls
  exactly as they are; plan 005 generalizes scoping. Here you only swap the parsers/cache internals.
- `parseDate` month/day bounds validation — that is plan 011. Do NOT add validation here; preserve
  current behavior exactly (so a route's output doesn't change). Pick ONE failure semantics for the
  shared `parseDate` and see STOP conditions about the `tareas.ts` raw-string nuance.

## Git workflow

- Branch: `advisor/004-shared-sheets-module`
- One commit per route migrated, plus one for the new modules + tests. Message style:
  `refactor(api): use shared sheetParsers in <route>`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create `src/lib/sheetParsers.ts`

Move the parser functions here, unified. Use the `proyectos.ts` semantics as canonical
(`parseDate` returns `''` on failure). Export: `parseDate`, `parseProgress`, `cleanId`, `splitIds`,
`parseNumber`, and:
```ts
export function makeColAccessor(headerRow: string[]) {
  const headers = headerRow.map((h) => (h || '').trim().toLowerCase());
  return (row: string[], name: string): string => {
    const idx = headers.indexOf(name.toLowerCase());
    return idx >= 0 ? (row[idx] || '').trim() : '';
  };
}
```

**Verify**: `npx astro check` → 0 errors.

### Step 2: Create `src/lib/sheetCache.ts`

Encapsulate the TTL cache. Keep it tiny and per-endpoint (each route owns its own instance — this
preserves the current "module-level cache holding RAW data, filtered per request" design). Suggested
contract:
```ts
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
```
This must reproduce BOTH variants: epoch routes pass `{ withEpoch: equipoEpoch }`; non-epoch routes
pass nothing.

**Verify**: `npx astro check` → 0 errors.

### Step 3: Unit-test the parsers

Create `src/lib/sheetParsers.test.ts` (Vitest, from plan 001). Cover, matching CURRENT behavior:
- `parseDate('15/03/2026')` → `'2026-03-15'`; `parseDate('')` → `''`; `parseDate('-')` → `''`;
  `parseDate('not a date')` → `''`.
- `parseProgress('50%')` → `0.5`; `parseProgress('0.5')` → `0.5`; `parseProgress('')` → `0`.
- `cleanId('#N/A')`/`cleanId('-  -  -')`/`cleanId('')` → `''`; `cleanId('emontano')` → `'emontano'`.
- `splitIds('a, b, a, -')` → `['a','b']` (unique, cleaned, ordered).
- `parseNumber('$1,200.50')` → `1200.5`; `parseNumber('')` → `0`.

**Verify**: `npm test` → these pass.

### Step 4: Migrate routes one at a time

For each route (start with the simplest — `sprints.ts`, `capacidades.ts`, `repositorios.ts` — then
`cursos.ts`, `hitos.ts`, `costos.ts`, `costos-modelo.ts`, then last `proyectos.ts`, `tareas.ts`):
1. Replace the inline cache with `createSheetCache` (pass `equipoEpoch` only where the route used it).
2. Replace the inline `headers`/`col` with `makeColAccessor(rows[0])`.
3. Replace inline parsers with imports from `sheetParsers.ts`. Delete the now-dead local copies.
4. Keep everything else — especially the `scoped()`/`getRequesterScope` calls in `proyectos.ts` and
   `tareas.ts`, and the role-resolution logic — unchanged.

After EACH route: `npx astro check` → 0 errors, and `npm run build` → exit 0. Commit.

### Step 5: Confirm no inline copies remain

**Verify**:
- `grep -rn "const CACHE_TTL = 5 \* 60 \* 1000" src/pages/api/` → returns nothing (all use the shared cache).
- `grep -rn "function parseDate\|function parseProgress\|function cleanId\|function parseNumber" src/pages/api/`
  → returns nothing (all moved to `sheetParsers.ts`).

### Step 6: Full verification

**Verify**: `npm test` → all pass; `npx astro check` → 0 errors; `npm run build` → exit 0.

## Test plan

- New: `src/lib/sheetParsers.test.ts` (Step 3).
- Regression safety for the routes themselves is by `npx astro check` + `npm run build` (there is no
  HTTP-level test harness yet). Because the refactor must be behavior-preserving, the strongest check
  is a manual diff review: the JSON each route builds must be structurally identical to before.
- Structural pattern for the test file: model after the test files added in plan 001.

## Done criteria

ALL must hold:
- [ ] `src/lib/sheetParsers.ts` and `src/lib/sheetCache.ts` exist and are used by all 9 routes
- [ ] `grep -rn "const CACHE_TTL" src/pages/api/` returns nothing
- [ ] `grep -rn "function parseDate\|function parseProgress\|function cleanId" src/pages/api/` returns nothing
- [ ] `npm test` exits 0 (incl. new parser tests)
- [ ] `npx astro check` exits 0; `npm run build` exits 0
- [ ] `proyectos.ts`/`tareas.ts` still call `getRequesterScope` + filter (unchanged)
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row for 004 updated

## STOP conditions

Stop and report if:
- The `tareas.ts` `parseDate` raw-string-on-failure nuance turns out to matter: `tareas.ts:22`
  returns `trimmed` (the raw input) on parse failure, while `proyectos.ts` returns `''`. The shared
  parser returns `''`. Before changing `tareas.ts` to the shared parser, grep its consumers for
  reliance on the raw passthrough. If unclear whether downstream code depends on the raw value,
  STOP and report rather than silently changing `tareas.ts` output. (Safe fallback: give the shared
  `parseDate` an optional `{ rawOnFail?: boolean }` and pass it for `tareas.ts` to preserve behavior.)
- Any route's output JSON would change shape/values after migration.
- `astro check` reports new type errors you can't resolve in one attempt.

## Maintenance notes

- After this lands, plan 005 (uniform scoping) and plan 011 (date-bounds validation) become
  single-file edits in `sheetParsers.ts` / a shared scoping wrapper instead of nine-file edits.
- A reviewer should diff each route's pre/post JSON-construction carefully — the risk in this plan is
  a subtle parser semantics change, not a crash.
- The cache stays per-endpoint and module-level (RAW data, filtered per request). Do NOT centralize
  into one global cache — that would break the per-request scoping model.
