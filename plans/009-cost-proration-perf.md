# Plan 009: Remove O(n²) cost proration in costEngine

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/utils/costEngine.ts src/utils/forecastEngine.ts`
> Re-read `estimateProjectCost` before editing.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (costEngine tests lock the behavior this refactor must preserve)
- **Category**: perf
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

`estimateProjectCost` prorates each person's monthly cost by how many active projects they're on. To
count that, for every architect/PM/dev on a project it **re-filters the entire active-project list**
(`active.filter(p => splitNames(p.arquitecto).includes(arq))`). When this runs per project across the
portfolio (e.g. in `computeSlippageCostImpact` in `forecastEngine.ts`, which loops projects), the work
is roughly O(projects² × team-size) — thousands of list scans on the `/pronosticos` and `/costos`
pages. Pre-indexing each person's active-project count once turns the inner scans into O(1) map
lookups. **Behavior must not change** — only the cost of computing it.

## Current state

`src/utils/costEngine.ts:101-138` (verified at `34cffdc`):
```ts
const active = allProjects.filter((p) => isActive(p.estatus));
// ...
const arqCost = findCostRecord(costos, 'arquitecto');
if (arqCost) {
  for (const arq of splitNames(project.arquitecto)) {
    const count = active.filter((p) => splitNames(p.arquitecto).includes(arq)).length || 1;  // O(n) inside loop
    const share = arqCost.costoMensual / count;
    total += share;
    breakdown.push({ role: 'Arquitecto', person: arq, cost: share });
  }
}
// identical pattern for PM (p.pm) and DEV (p.devs, no splitNames — devs is already string[])
```
`splitNames(v)` = `v.split(',').map(trim).filter(s => s && s !== '-')`. `isActive` from
`projectStatus.ts`. Note the dev branch iterates `project.devs` (already an array) and counts via
`active.filter((p) => p.devs.includes(dev))`.

The `|| 1` guard means a person found on zero active projects still divides by 1 — preserve that.

## Commands you will need

| Purpose   | Command            | Expected |
|-----------|--------------------|----------|
| Typecheck | `npx astro check`  | exit 0   |
| Tests     | `npm test`         | all pass |
| Build     | `npm run build`    | exit 0   |

## Scope

**In scope**:
- `src/utils/costEngine.ts` — `estimateProjectCost` only (build per-role count maps once, look up O(1)).
- `src/utils/costEngine.test.ts` — extend with a case that pins the proration math (from plan 001).

**Out of scope** (do NOT touch):
- `estimatePersonCost` — it already computes `personActive.length` once; leave it.
- `applyFinancialModel`, `formatMoney`, `findCostRecord` — unrelated.
- `forecastEngine.ts` callers — the function signature stays identical; callers don't change.
- The rounding (`Math.round(total)`) and `teamSize` computation — preserve exactly.

## Git workflow

- Branch: `advisor/009-cost-proration-perf`
- Commit: `perf(cost): precompute per-person active-project counts in estimateProjectCost`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Lock current behavior with a test (if not already from 001)

Ensure `src/utils/costEngine.test.ts` has a case asserting exact prorated shares for a fixture where
one architect is on 2 active projects and one dev is on 3 — capture the exact `estimatedMonthlyCost`
and `breakdown` values BEFORE refactoring. This is your regression oracle.

**Verify**: `npm test` → passes (records the baseline numbers).

### Step 2: Build count maps once

At the top of `estimateProjectCost`, after computing `active`, build three `Map<string, number>`:
- `arqCounts`: for each active project, for each name in `splitNames(p.arquitecto)`, increment.
- `pmCounts`: same over `splitNames(p.pm)`.
- `devCounts`: for each active project, for each `dev` in `p.devs`, increment.

Then in each role loop, replace `active.filter(...).length || 1` with `counts.get(name) || 1`.

This preserves the exact `|| 1` semantics (a name absent from the map → `undefined` → `1`).

**Verify**: `npm test` → the Step 1 case still produces identical numbers; `npx astro check` → 0.

### Step 3: Confirm no remaining inner scans

**Verify**: `grep -n "active.filter" src/utils/costEngine.ts` → only the line that creates `active`
itself remains (no `.filter` inside the role loops).

### Step 4: Full verification

**Verify**: `npm test` → all pass; `npx astro check` → 0; `npm run build` → 0.

## Test plan

- Extend `src/utils/costEngine.test.ts` (Step 1) — the proration-math case is both the perf-refactor's
  oracle and a permanent regression test. Add an edge case: a person on zero active projects (divisor
  falls back to 1).
- Model after the test files from plan 001.

## Done criteria

ALL must hold:
- [ ] `estimateProjectCost` has no `.filter()` inside its role loops (uses precomputed maps)
- [ ] `npm test` passes; the proration numbers are identical to pre-refactor
- [ ] `npx astro check` exits 0; `npm run build` exits 0
- [ ] Only `costEngine.ts` + its test modified (`git status`)
- [ ] `plans/README.md` status row for 009 updated

## STOP conditions

Stop and report if:
- The refactor changes any prorated number vs. the Step 1 baseline (means the map semantics differ
  from the filter — fix or report).
- `splitNames`/`p.devs` handling has edge cases (e.g. duplicate names within one project's field) that
  make the count map differ from the filter count. Match the filter's behavior exactly, including any
  duplicate handling, or STOP and report the discrepancy.

## Maintenance notes

- If proration ever needs to count across ALL projects (not just active), the maps move accordingly —
  keep them derived from the same `active`/`allProjects` source the loops use.
- A reviewer should diff the prorated `breakdown` for a representative fixture pre/post to confirm
  identical output.
