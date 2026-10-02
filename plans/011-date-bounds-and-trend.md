# Plan 011: Fix date-bounds parsing and the courseForecast trend dead branch

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/pages/api/proyectos.ts src/pages/api/tareas.ts src/lib/sheetParsers.ts src/utils/courseForecast.ts`
> If plan 004 landed, `parseDate` now lives in `src/lib/sheetParsers.ts` — fix it there instead of in
> the routes (see Step 1).

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (tests). Coordinate with 004 (parser may have moved — see Step 1).
- **Category**: bug
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

Two small, real correctness bugs:
1. **`parseDate` accepts out-of-range day/month.** It parses `DD/MM/YYYY` then constructs
   `new Date(year, month-1, day)`, which JavaScript silently *rolls over*: `32/01/2026` becomes Feb 1,
   `15/13/2026` becomes Jan 2027. A typo'd Sheet cell produces a plausible-but-wrong date that flows
   into forecasts and timelines with no signal.
2. **`courseForecast` trend has a dead branch.** A regressing course (negative velocity) is folded into
   `'stalled'` instead of being flagged, so declining course progress is invisible.

Both are low-blast-radius, high-clarity fixes — good once the test runner (001) exists to lock them.

## Current state

**Bug 1** — `src/pages/api/proyectos.ts:10-24` (and the near-identical `src/pages/api/tareas.ts:11-23`):
```ts
function parseDate(value: string): string {
  if (!value || !value.trim()) return '';
  const trimmed = value.trim();
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) {
    const [, day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];  // <-- rollover not caught
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  return '';
}
```
The `!isNaN(getTime())` check does NOT catch rollover — `new Date(2026, 0, 32)` is a valid Date
(Feb 1). Need to verify the constructed date's parts equal the input parts.

**Bug 2** — `src/utils/courseForecast.ts:95-97`:
```ts
if (velocityPerWeek > 0.5) trend = 'advancing';
else if (velocityPerWeek > -0.5) trend = 'stalled';
else trend = 'stalled';   // <-- declining (velocity <= -0.5) folded into 'stalled'
```
Read the `CourseTrend` type (top of `courseForecast.ts` or its import) — it currently lacks a
`'declining'` member. Adding one means checking consumers that switch on the trend.

## Commands you will need

| Purpose   | Command            | Expected |
|-----------|--------------------|----------|
| Tests     | `npm test`         | all pass |
| Typecheck | `npx astro check`  | exit 0   |
| Build     | `npm run build`    | exit 0   |
| Find trend consumers | `grep -rn "advancing\|stalled\|CourseTrend" src/` | the switch/render sites |

## Scope

**In scope**:
- `parseDate` — in `src/lib/sheetParsers.ts` IF plan 004 landed, else in BOTH `proyectos.ts` and
  `tareas.ts`.
- `src/lib/sheetParsers.test.ts` (or new test) — add rollover cases.
- `src/utils/courseForecast.ts` — the trend branch + `CourseTrend` type.
- Any consumer that renders/branches on the trend (to handle the new `'declining'` value).
- `src/utils/courseForecast.test.ts` (create) — trend cases.

**Out of scope** (do NOT touch):
- The `tareas.ts` raw-string-on-failure nuance (its `parseDate` returns the raw string on failure
  while `proyectos.ts` returns `''`) — preserve whatever the current behavior is; this plan only adds
  *range validation*, it does not change the failure return value. If 004 unified them, follow 004.
- Other date helpers (`parseProgress`, Excel-serial handling) — unrelated.

## Git workflow

- Branch: `advisor/011-date-bounds-and-trend`
- Two commits: `fix(parse): reject out-of-range dates in parseDate` and
  `fix(courseForecast): flag declining course trend`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add range validation to `parseDate`

In the canonical `parseDate` (shared module if 004 landed, otherwise both routes), after constructing
the Date from the `DD/MM/YYYY` parts, verify the round-trip:
```ts
const d = new Date(y, m - 1, day);
if (!isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === day) {
  return d.toISOString().split('T')[0];
}
// fall through to the generic Date() attempt, then to the existing failure return value
```
Preserve the existing failure return value (`''` for proyectos / unified per 004).

**Verify**: add tests — `parseDate('32/01/2026')` → failure value (not `'2026-02-01'`);
`parseDate('15/13/2026')` → failure value; `parseDate('15/03/2026')` → `'2026-03-15'` (still works).
`npm test` → pass.

### Step 2: Fix the courseForecast trend

Add `'declining'` to the `CourseTrend` type. Change the branch:
```ts
if (velocityPerWeek > 0.5) trend = 'advancing';
else if (velocityPerWeek >= -0.5) trend = 'stalled';
else trend = 'declining';
```

### Step 3: Handle the new trend value in consumers

`grep -rn "stalled\|advancing\|CourseTrend" src/` to find where trend is rendered (color/label/icon).
Add a `'declining'` case wherever there's a switch or a label/color map — match the existing styling
convention (likely a red/down treatment, mirroring how other "bad" states are shown). Do NOT leave a
`'declining'` value that falls through to a default that looks like "advancing".

**Verify**: `npx astro check` → 0 errors (the type change surfaces any unhandled switch).

### Step 4: Test the trend logic

Create `src/utils/courseForecast.test.ts` (or extend). With small fixtures, assert:
- velocity > 0.5 → `'advancing'`; between -0.5 and 0.5 → `'stalled'`; < -0.5 → `'declining'`.
- progreso >= 100 → `'done'` (existing behavior, lock it).

**Verify**: `npm test` → pass.

### Step 5: Full verification

**Verify**: `npm test` → all pass; `npx astro check` → 0; `npm run build` → 0.

## Test plan

- `parseDate` rollover cases (Step 1) in the parser test file.
- `courseForecast` trend cases (Step 4) in `courseForecast.test.ts`.
- Model after plan 001's test files.

## Done criteria

ALL must hold:
- [ ] `parseDate('32/01/2026')` and `parseDate('15/13/2026')` no longer return a rolled-over date
- [ ] `parseDate('15/03/2026')` still returns `'2026-03-15'`
- [ ] `CourseTrend` includes `'declining'`; velocity < -0.5 yields `'declining'`
- [ ] All trend consumers handle `'declining'` (no fall-through to an "ok"-looking default)
- [ ] `npm test` passes; `npx astro check` exits 0; `npm run build` exits 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row for 011 updated

## STOP conditions

Stop and report if:
- A trend consumer cannot represent `'declining'` without a design decision (e.g. no red treatment
  exists) — implement the closest existing "negative" style and flag it for design review, or STOP
  and ask if it's non-obvious.
- Adding range validation changes the output of a date that real Sheet data relies on being lenient
  about (unlikely, but if a test on real-ish data breaks, report it).

## Maintenance notes

- If plan 004 unified `parseDate`, this fix is one place; otherwise keep `proyectos.ts` and
  `tareas.ts` in sync (another reason 004 should land first).
- A reviewer should confirm the `'declining'` styling is visually distinct from `'stalled'`.
