# Plan 001: Establish a test baseline (Vitest) + high-value unit tests for pure logic

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving to the next step. If anything
> in the "STOP conditions" section occurs, stop and report — do not improvise. When
> done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- package.json src/lib/equipoMatch.ts src/utils/projectStatus.ts src/utils/costEngine.ts src/lib/permissions/roleDefaults.ts src/lib/requesterScope.ts`
> If any of those changed since this plan was written, compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

This project has **zero automated tests**. The only verification gate is `npx astro check`
(typecheck) and `npm run build`. Pure, business-critical logic — identity resolution that
decides who maps to which `equipo.id`, cost proration that drives invoicing numbers, the
row-level security predicates that decide which projects a `dev` may see — is entirely
unverified. Every refactor in plans 004/005/009/010/011 would ship blind without a safety net.

This plan adds **Vitest** (the standard test runner for Vite/Astro projects) and writes a
first suite of unit tests for the highest-value *pure* functions. Pure functions are chosen
deliberately: they need no database, no network, no Astro runtime — so the first tests are
cheap, fast, and high-signal. This is the prerequisite for every other refactor plan.

## Current state

The repo has no test runner and no test files:

- `package.json` (root) `scripts` block contains: `dev`, `build`, `preview`, `astro`,
  `create-user`, `reconcile-equipo`, `seed-equipo`, `apply-migration`, `cs360:upload`,
  `auth:generate`. There is **no** `test` script. `devDependencies` are only
  `@better-auth/cli` and `tsx`.
- `find src -name "*.test.*"` returns nothing.
- `tsconfig.json` extends `astro/tsconfigs/strict`, `jsx: react-jsx`, excludes `dist` and
  `mcp-server`.

The functions to test, with their exact current signatures (verified at `34cffdc`):

**`src/lib/equipoMatch.ts`** — pure identity matcher, no imports of Turso:
```ts
export const ALIAS: Record<string, string> = {
  yorch: 'jenriquez', eduardo: 'emontano', alejandro: 'avazquez',
};
export function norm(s: string): string { /* lowercase, strip accents, non-alnum→space */ }
export function tokenMatch(a: string, b: string): boolean { /* token prefix match, len≥3 */ }
export interface MatchMember { id: string; nick: string; full: string; }
export function buildMembers(rows: ...): MatchMember[] { /* normalizes rows */ }
export function resolveId(name: string, members: MatchMember[]): string | null {
  // priority: ALIAS → unique nickname → unique full_name → unique fuzzy; ambiguous → null
}
```

**`src/utils/projectStatus.ts`** — status semantics (all pure, one-liners):
```ts
export const ESTATUS_ORDER = ['Done','On Track','Upcoming','On Hold','At Risk','Blocked / Critical','Hypercare','LaunchPhase','Cancelado'] as const;
export const isCancelled = (estatus: string): boolean => estatus === 'Cancelado';
export const isTerminal = (estatus: string): boolean => estatus === 'Done' || estatus === 'Cancelado';
export const isActive = (estatus: string): boolean => estatus !== 'Done' && estatus !== 'On Hold' && estatus !== 'Cancelado';
export const countsForHealth = (estatus: string): boolean => estatus !== 'Cancelado';
```

**`src/utils/costEngine.ts`** — pure functions over plain data:
```ts
export function applyFinancialModel(costoInterno: number, model: FinancialModel): ClientPricing
// chains: valorExperiencia = costoInterno*rate → admin → margen → iva → precioCliente
export function formatMoney(n: number): string  // $2.3K / $1.2M / $123
export function formatMoneyFull(n: number): string  // es-MX, 2 decimals
export function estimateProjectCost(project, allProjects, costos): ProjectCostEstimate
// prorates each person's monthly cost across their active projects
```

**`src/lib/permissions/roleDefaults.ts`** — client-safe pure permission evaluation
(`roleCan`, `splitResource`). Read this file before testing it; it is the pure core reused
by the server resolver and the Admin UI.

**`src/lib/requesterScope.ts`** — the two PURE predicates (the async lookup is NOT pure, skip it):
```ts
export function projectVisible(p: ProjectRecord, s: RequesterScope): boolean {
  if (s.kind === 'unscoped') return true;
  if (!s.equipoId) return false; // fail-closed
  if (s.kind === 'pm') return p.pmIds.includes(s.equipoId) || p.arquitectoIds.includes(s.equipoId);
  return p.arquitectoIds.includes(s.equipoId) || p.devIds.includes(s.equipoId);
}
export function taskVisible(t: TareaRecord, s: RequesterScope): boolean {
  if (s.kind === 'unscoped') return true;
  if (!s.equipoId) return false;
  return t.asignadoId === s.equipoId;
}
```

Type shapes you'll need for fixtures live in `src/utils/dataTransforms.ts` (`ProjectRecord`,
`TareaRecord`, `CostoRecord`, `FinancialModel`) and `src/lib/requesterScope.ts` (`RequesterScope`).

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm install`                 | exit 0              |
| Typecheck | `npx astro check`             | exit 0, 0 errors    |
| Tests     | `npm test`                    | all pass            |
| Tests (watch, optional) | `npx vitest`    | runs                |
| Build     | `npm run build`               | exit 0              |

## Suggested executor toolkit

- Vitest docs: https://vitest.dev/guide/ — for config and `expect` API.

## Scope

**In scope** (the only files you should create/modify):
- `package.json` — add `vitest` devDep + `test` / `test:run` scripts
- `vitest.config.ts` (create)
- `src/lib/equipoMatch.test.ts` (create)
- `src/utils/projectStatus.test.ts` (create)
- `src/utils/costEngine.test.ts` (create)
- `src/lib/permissions/roleDefaults.test.ts` (create)
- `src/lib/requesterScope.test.ts` (create — predicates only)

**Out of scope** (do NOT touch):
- Any source file under `src/` other than adding the `.test.ts` files above. This plan adds
  tests; it does NOT change behavior. If a test reveals a bug, record it in your report and
  leave the fix to plan 009/011 — do not fix source here.
- `mcp-server/` — it has its own package; `tsconfig.json` already excludes it.
- Integration/E2E tests for middleware, API routes, or React components — out of scope here
  (they need a DB/runtime harness; future work).

## Git workflow

- Branch: `advisor/001-test-baseline`
- Commit message style matches the repo (descriptive, e.g. recent commits like
  "Feature/na vs 90 nuevos estatus"). A simple `test: add Vitest baseline and unit tests`
  is fine.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add Vitest and test scripts

Add to `package.json` `devDependencies`: `"vitest": "^3.2.0"`. Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```
Then run `npm install`.

**Verify**: `npm install` → exit 0. `npx vitest --version` → prints a 3.x version.

### Step 2: Create `vitest.config.ts`

Minimal config (node environment is fine — all targets are pure functions, no DOM):
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

**Verify**: `npm test` → runs Vitest, reports "no test files found" or runs 0 tests without error.

### Step 3: Test `src/lib/equipoMatch.ts`

Create `src/lib/equipoMatch.test.ts`. Build a small `members` fixture with `buildMembers([...])`
including: a unique nickname, two people sharing a fuzzy token (to force the ambiguous→null
path), and an aliased name. Cover:
- `resolveId('yorch', members)` → `'jenriquez'` (ALIAS wins).
- exact unique nickname resolves to its id.
- exact unique full_name resolves to its id.
- a name whose fuzzy match is **ambiguous** (matches 2 members) → `null`.
- `resolveId('-', members)` and `resolveId('', members)` → `null`.
- `norm('Lorena Raquel Olvera Rodríguez')` strips accents and collapses to spaced lowercase.
- `tokenMatch` returns false when the only shared token has length < 3.

**Verify**: `npm test` → these tests pass.

### Step 4: Test `src/utils/projectStatus.ts`

Create `src/utils/projectStatus.test.ts`. For each predicate, assert the full truth table over
`ESTATUS_ORDER` plus an unknown status string:
- `isActive`: false for `Done`, `On Hold`, `Cancelado`; true for the rest (incl. `LaunchPhase`).
- `isTerminal`: true only for `Done` and `Cancelado`.
- `isCancelled`: true only for `Cancelado`.
- `countsForHealth`: false only for `Cancelado`.

**Verify**: `npm test` → these tests pass.

### Step 5: Test `src/utils/costEngine.ts`

Create `src/utils/costEngine.test.ts`.
- `formatMoney`: `1_500_000 → "$1.5M"`, `2_300 → "$2.3K"`, `123 → "$123"`.
- `applyFinancialModel`: with a hand-computed `FinancialModel` (e.g. all rates 0.1, IVA 0.16),
  assert each field of `ClientPricing` equals the by-hand value, and `utilidad = precioCliente - costoInterno`.
- `estimateProjectCost`:
  - empty `costos` → `{ estimatedMonthlyCost: 0, breakdown: [], teamSize: 0 }`.
  - one architect on 2 active projects with `costoMensual: 1000` → that architect's share is
    `500` (prorated by 2). Build `allProjects` with two `isActive`-true projects sharing the arquitecto.
  - a `Done`/`Cancelado` project does NOT count toward the proration divisor (it's filtered by `isActive`).

Note for fixtures: `ProjectRecord` has many fields; build a helper `makeProject(partial)` that
spreads sane defaults so each test sets only what it asserts.

**Verify**: `npm test` → these tests pass.

### Step 6: Test `src/lib/permissions/roleDefaults.ts`

Read the file first. Create `src/lib/permissions/roleDefaults.test.ts` covering `roleCan` for at
least: `admin` allowed on a `page:admin`-style resource; `dev` (least privilege) denied on an
admin-only resource but allowed on a base page it should see; and `splitResource` parsing a
`block:<id>` / `page:<key>` / `action:<x>` string into its parts. Match assertions to the actual
return shape in the file — do not invent resource names; use ones present in
`src/lib/permissions/statements.ts`.

**Verify**: `npm test` → these tests pass.

### Step 7: Test `src/lib/requesterScope.ts` predicates

Create `src/lib/requesterScope.test.ts`. Import only `projectVisible` and `taskVisible` (do NOT
call `getRequesterScope` — it hits Turso). Cover:
- `unscoped` scope → always visible regardless of ids.
- scoped scope with `equipoId: null` → always false (fail-closed).
- `pm` scope sees a project where its `equipoId` ∈ `pmIds` OR `arquitectoIds`, not one where it's
  only in `devIds`.
- `dev` scope sees a project where its id ∈ `arquitectoIds` OR `devIds`, not a pm-only project.
- `taskVisible`: scoped sees only tasks where `asignadoId === equipoId`.

**Verify**: `npm test` → all suites pass; report the total test count.

### Step 8: Final verification

**Verify**:
- `npm test` → all pass (expect ~30–45 tests across 5 files).
- `npx astro check` → exit 0, 0 errors (the new test files must typecheck).
- `npm run build` → exit 0 (tests must not break the build).

## Test plan

This plan *is* the test plan. New files: the five `.test.ts` above. Structural pattern: standard
Vitest `describe`/`it`/`expect`. There is no existing test to model after — establish the
convention: one `describe` per exported function, `it` names that state the business rule
(e.g. `it('returns null when the fuzzy match is ambiguous')`).

## Done criteria

ALL must hold:
- [ ] `npm test` exits 0; ≥ 5 test files exist under `src/`, all passing
- [ ] `npx astro check` exits 0
- [ ] `npm run build` exits 0
- [ ] `package.json` has a `test` script and `vitest` in `devDependencies`
- [ ] No source file outside the test files + `package.json` + `vitest.config.ts` is modified
      (`git status` shows only those)
- [ ] `plans/README.md` status row for 001 updated

## STOP conditions

Stop and report (do not improvise) if:
- Any "Current state" excerpt does not match the live code (drift since `34cffdc`).
- A test reveals what looks like a real bug in source (e.g. `estimateProjectCost` proration is
  wrong, or `resolveId` resolves an ambiguous name). Report it — do NOT fix source in this plan.
- Vitest cannot run because of an Astro/Vite version conflict you can't resolve in one attempt.
- Adding `vitest` forces a major bump of `astro`, `vite`, or `react` in the lockfile.

## Maintenance notes

- These tests lock the *current* behavior of pure functions. Plans 005/009/011 will extend them.
- When `ProjectRecord`/`TareaRecord` shapes change (`src/utils/dataTransforms.ts`), the fixture
  helpers here need updating — keep a single `makeProject`/`makeTarea` helper per file to limit blast radius.
- A reviewer should check that no test asserts on private/implementation detail — only on the
  documented contract of each function.
