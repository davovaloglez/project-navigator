# Plan 010: Guard the hand-synced mcp-server mirror against drift

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/utils/projectStatus.ts src/lib/equipoMatch.ts mcp-server/src/data/`
> If the mirror files already diverged, that itself is the finding — report current divergences.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (uses the Vitest runner)
- **Category**: tech-debt
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

`mcp-server/src/data/` keeps hand-maintained **mirrors** of several `src/` modules
(`projectStatus.ts`, `equipoMatch.ts`, `types.ts`, `costEngine.ts`, `healthScore.ts`, `parsers.ts`,
`equipoResolver.ts`). CLAUDE.md flags these as intentional duplicates kept in sync by hand — but there
is no automated check, so a change to `src/utils/projectStatus.ts` (e.g. NAV-90 added `LaunchPhase`/
`Cancelado`) can silently leave the MCP copy stale, and MCP clients would then compute different
results than the web app. This plan adds a behavioral drift-guard test that fails CI when the pure
mirrors diverge — cheap insurance for a documented-but-unenforced invariant.

## Current state

Mirror pairs (verified at `34cffdc`):
| `src/` source | `mcp-server/` mirror |
|---|---|
| `src/utils/projectStatus.ts` | `mcp-server/src/data/projectStatus.ts` |
| `src/lib/equipoMatch.ts` | `mcp-server/src/data/equipoMatch.ts` |
| `src/utils/dataTransforms.ts` (types) | `mcp-server/src/data/types.ts` |
| `src/utils/costEngine.ts` | `mcp-server/src/data/costEngine.ts` |
| `src/utils/healthScore.ts` | `mcp-server/src/data/healthScore.ts` |

`mcp-server/package.json` has NO test runner (only `build`/`dev`/`start`/`inspect`). The root project
gets Vitest in plan 001 and can `import` from both trees (no path restriction in the root
`vitest.config.ts`). The mirrors differ in comments/import paths but the *pure logic* (e.g.
`isActive`, `isTerminal`, `ESTATUS_ORDER`, `resolveId`, `norm`, `tokenMatch`) must behave identically.

The most robust guard is **behavioral**, not textual (textual diff is noisy because comments/imports
legitimately differ): import the pure functions from both copies and assert identical outputs over a
shared sample set.

## Commands you will need

| Purpose   | Command            | Expected |
|-----------|--------------------|----------|
| Tests     | `npm test`         | all pass |
| Typecheck | `npx astro check`  | exit 0   |

## Scope

**In scope**:
- `src/__mirror_guard__/mirror.test.ts` (create — or co-locate as `src/lib/mirror-guard.test.ts`).
  A Vitest test importing the pure functions from both `src/` and `mcp-server/src/data/` and asserting
  equality of behavior + key constants.

**Out of scope** (do NOT touch):
- The mirror files themselves — this plan adds a guard, it does not refactor away the duplication.
  (Eliminating the duplication via a shared package is a larger, separate decision; note it in
  maintenance notes, don't do it here.)
- `mcp-server/`'s build/tsconfig — the test runs from the root runner.

## Git workflow

- Branch: `advisor/010-mirror-drift-guard`
- Commit: `test: guard mcp-server mirror against drift from src`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Write the behavioral guard

Create the test. For `projectStatus`:
```ts
import * as src from '../utils/projectStatus';
import * as mcp from '../../mcp-server/src/data/projectStatus';

const SAMPLE = ['Done','On Track','Upcoming','On Hold','At Risk','Blocked / Critical','Hypercare','LaunchPhase','Cancelado','Unknown'];

it('projectStatus mirror: ESTATUS_ORDER identical', () => {
  expect([...mcp.ESTATUS_ORDER]).toEqual([...src.ESTATUS_ORDER]);
});
it('projectStatus mirror: predicates agree on all sample statuses', () => {
  for (const s of SAMPLE) {
    expect(mcp.isActive(s)).toBe(src.isActive(s));
    expect(mcp.isTerminal(s)).toBe(src.isTerminal(s));
    expect(mcp.isCancelled(s)).toBe(src.isCancelled(s));
    expect(mcp.countsForHealth(s)).toBe(src.countsForHealth(s));
  }
});
```
For `equipoMatch`: import `norm`, `tokenMatch`, `resolveId`, `ALIAS` from both; assert `ALIAS` deep-equal,
and `norm`/`tokenMatch`/`resolveId` agree over a shared sample of names + a small `members` fixture.

If a mirror export does not exist or the import fails, that's a drift the test should surface (let it
fail loudly, then report).

**Verify**: `npm test` → the guard passes IF the mirrors are currently in sync. If it FAILS, you've
found a real existing drift — see STOP conditions.

### Step 2: Handle the type mirror (`types.ts`) lightly

Pure runtime behavior can't be compared for type-only files. For `types.ts` vs `dataTransforms.ts`,
add a lightweight check only if feasible without overreach: e.g. a test that reads both files and
asserts that the set of exported `interface`/`type` names matches (regex over file text). Keep this
optional — if it's brittle, skip it and note that types drift is not behaviorally guarded.

### Step 3: Verify CI wiring

The guard runs via `npm test`, which plan 003's CI executes. Confirm `npm test` includes the new file
(it matches `src/**/*.test.ts`).

**Verify**: `npm test` → the mirror guard is in the run output.

## Test plan

This plan *is* a test. Coverage: `projectStatus` (predicates + order), `equipoMatch` (norm/tokenMatch/
resolveId/ALIAS), optionally `types` name-set. Model after plan 001's test style.

## Done criteria

ALL must hold:
- [ ] A mirror-guard test exists and runs under `npm test`
- [ ] It compares `projectStatus` and `equipoMatch` behavior across `src/` and `mcp-server/src/data/`
- [ ] `npm test` exits 0 (mirrors in sync) OR you reported a real divergence it caught
- [ ] `npx astro check` exits 0
- [ ] Only the new test file modified (`git status`)
- [ ] `plans/README.md` status row for 010 updated

## STOP conditions

Stop and report if:
- The guard FAILS on first run because the mirrors have ALREADY drifted. Do NOT edit the mirror files
  to make it pass (that's a separate behavior change). Report exactly which function/constant differs
  so a maintainer can decide which copy is correct.
- Importing from `mcp-server/src/data/` fails because of TS config/path issues from the root runner
  that you can't resolve in one attempt (report the error; the guard may need a `vitest` alias).

## Maintenance notes

- The real long-term fix is to extract the pure shared logic into one package both trees import,
  deleting the mirrors. That's a larger refactor (mcp-server is a separate npm project) — track it as
  future work; this guard is the interim safety net.
- When a mirror gains a new export, add it to the guard so future drift is caught.
