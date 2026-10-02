# Plan 012: Apply `npm audit fix` for the dev-only advisories

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `npm audit` — the advisory set may have changed since `34cffdc`.
> Re-read the live output before acting.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but easier to trust after 001/003 give a verification gate)
- **Category**: deps
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

`npm audit` at `34cffdc` reports 7 advisories, but they are **dev/build-only and low real risk** for
this app (production runs on Linux/AWS Amplify; the high-severity ones are Windows-dev-server issues).
Most are auto-fixable with `npm audit fix` (no major bumps). Clearing them removes alert-fatigue noise
so a genuinely important future advisory isn't lost in the list. NOTE: there is no critical
production-runtime vulnerability here — do not over-escalate this.

## Current state

`npm audit` output at `34cffdc` (verified directly):
- **`vite` 7.0.0–7.3.3** (HIGH) — `launch-editor` NTLMv2 hash disclosure + `server.fs.deny` bypass,
  **both Windows dev-server only**. Fix available via `npm audit fix`. Transitive via Astro/@astrojs/react.
- **`esbuild` 0.27.3–0.28.0** (LOW) — dev-server arbitrary file read on Windows. Fix via `npm audit fix`.
- **`js-yaml` <=4.1.1** (MODERATE) — quadratic DoS via merge keys. Fix via `npm audit fix`.
- **`better-auth` <1.6.2** (MODERATE, x2) — OAuth state advisory, but **only the dev-only
  `@better-auth/cli` nested copy** is affected; the runtime uses `better-auth@1.6.11` (not vulnerable).
  **No fix available** (the CLI pins it exactly). This is ALREADY documented and accepted in
  `documentation/dev/arquitectura/seguridad.md:333` — leave it.

So: `npm audit fix` should resolve vite/esbuild/js-yaml; the better-auth advisory will remain and is
expected.

## Commands you will need

| Purpose   | Command                | Expected |
|-----------|------------------------|----------|
| Audit     | `npm audit`            | the advisory list |
| Fix       | `npm audit fix`        | resolves vite/esbuild/js-yaml; no major bumps |
| Typecheck | `npx astro check`      | exit 0   |
| Build     | `npm run build`        | exit 0   |
| Tests     | `npm test`             | all pass (if 001 landed) |
| Dev smoke | `npm run dev`          | server starts, app loads |

## Scope

**In scope**:
- `package-lock.json` (and `package.json` only if `npm audit fix` adjusts a range without a major bump)

**Out of scope** (do NOT touch):
- `npm audit fix --force` — forbidden. It performs major-version bumps (e.g. could try to bump Astro)
  that risk breaking the build. Only plain `npm audit fix`.
- The `better-auth`/`@better-auth/cli` advisory — no fix exists; it's documented/accepted. Do not try
  to force it or add overrides for it.
- The `overrides` block in `package.json` — do not add/remove pins here (a separate hygiene task).
- `mcp-server/` — its `npm audit` is clean.

## Git workflow

- Branch: `advisor/012-npm-audit-fix`
- Commit: `chore(deps): npm audit fix for dev-only vite/esbuild/js-yaml advisories`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Re-check the live advisory set

Run `npm audit`. Confirm the set matches the Current state (or note differences). If a NEW
production-runtime critical/high advisory appeared since `34cffdc`, STOP and report — that changes the
priority of this plan.

### Step 2: Apply the non-forced fix

Run `npm audit fix` (NOT `--force`). Review the diff to `package-lock.json` — confirm only patch/minor
bumps of vite/esbuild/js-yaml (and their parents) changed, no major version of astro/react/vite-major.

**Verify**: `git diff package.json` shows no major-version changes; `npm audit` now lists fewer
advisories (ideally only the better-auth dev-only pair remains).

### Step 3: Verify the app still builds and runs

**Verify**: `npx astro check` → 0 errors; `npm run build` → exit 0; `npm test` (if present) → all
pass; `npm run dev` starts and the app loads in the browser.

## Test plan

No new tests. The regression gate is `npx astro check` + `npm run build` + `npm test` (001) + a dev
smoke test, all after the lockfile change.

## Done criteria

ALL must hold:
- [ ] `npm audit fix` (non-forced) applied; vite/esbuild/js-yaml advisories resolved
- [ ] `npm audit` remaining findings are only the documented/accepted better-auth dev-only pair (or
      fewer)
- [ ] `npx astro check` exits 0; `npm run build` exits 0; `npm test` passes (if present)
- [ ] No major-version bumps in the diff
- [ ] Only lockfile (and possibly minor `package.json` ranges) changed (`git status`)
- [ ] `plans/README.md` status row for 012 updated

## STOP conditions

Stop and report if:
- `npm audit fix` wants to make a major-version change, or only `--force` would clear an advisory.
- The build or dev server breaks after the fix.
- A new production-runtime critical/high advisory has appeared since `34cffdc` (escalate it; it may
  deserve its own plan).

## Maintenance notes

- Recommend a standing monthly `npm audit && npm update` hygiene pass (within ranges) so patch lag
  doesn't accumulate.
- When `@better-auth/cli` ships a version depending on `better-auth >=1.6.2`, bump the devDependency
  and remove the accepted-advisory row in `seguridad.md:333`.
