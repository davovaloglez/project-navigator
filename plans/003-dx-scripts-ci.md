# Plan 003: Add DX scripts, a CI workflow, and fix the stale README/.env docs

> **Executor instructions**: Follow step by step. Run every verification command and confirm the
> expected result before moving on. On any "STOP condition", stop and report. When done, update the
> status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- package.json README.md .env.example`
> If `package.json` changed, re-read its `scripts` block before editing.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but if plan 001 already added a `test` script, keep it — see Step 1)
- **Category**: dx
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

There is no `check` script (you must remember `npx astro check` by hand), no CI workflow
(`.github/` has no workflows), and no pre-commit gate — so a typecheck failure or broken build can
land on a branch unnoticed until someone runs the build manually. Separately, `README.md` is badly
stale: it documents only 2 of ~30 API endpoints, only 2 of ~15 env vars, and old route shapes
(`/proyecto/[folio]`, `/persona/[nombre]`) that no longer match the app. A new contributor following
the README cannot start the app (it never mentions `TURSO_*`, `BETTER_AUTH_*`, etc.). This plan makes
verification one command and CI-enforced, and points the README at the real source of truth.

## Current state

`package.json` (root) `scripts` (verified at `34cffdc`):
```json
"dev": "astro dev",
"build": "astro build",
"preview": "astro preview",
"astro": "astro",
"create-user": "tsx --env-file=.env scripts/createUser.ts",
"reconcile-equipo": "tsx --env-file=.env scripts/reconcileEquipo.ts",
"seed-equipo": "tsx --env-file=.env scripts/seedEquipo.ts",
"apply-migration": "tsx --env-file=.env scripts/applyMigration.ts",
"cs360:upload": "tsx --env-file=.env scripts/uploadCs360Export.ts",
"auth:generate": "better-auth generate --output ./src/db/auth-schema.sql --y"
```
No `check`, no `test` (unless plan 001 added it), no `lint`/`format`. `@astrojs/check` and
`typescript` ARE already dependencies (so `astro check` works without new installs).

`README.md` (verified): "Variables de entorno" section lists only `GOOGLE_CREDENTIALS` and `SHEET_ID`
(lines 30–33); "API Endpoints" table lists only `/api/proyectos` and `/api/cursos` (lines 85–88);
"Paginas" table uses `/proyecto/[folio]` and `/persona/[nombre]` (lines 55–56) — the real routes are
`/proyecto/[id]` and `/persona/[id]`. The deploy target is correctly AWS Amplify.

`.env.example` (verified) is actually **well-commented and complete** (Google, Turso, Better-Auth,
OAuth, CRON_SECRET, S3 avatars, CS360, AI). It does NOT need changes — it is the source of truth the
README should defer to.

`CLAUDE.md` has the authoritative, current env-var table and API/pages tables. README should not try
to duplicate CLAUDE.md — it should give a correct minimal quickstart and point to CLAUDE.md +
`.env.example`.

The repo has no `.github/workflows/` directory.

## Commands you will need

| Purpose   | Command            | Expected |
|-----------|--------------------|----------|
| Install   | `npm install`      | exit 0   |
| Typecheck | `npm run check`    | exit 0 (after Step 1) |
| Build     | `npm run build`    | exit 0   |

## Scope

**In scope**:
- `package.json` — add `check` (and `format` only if you also add Prettier; see Step 2 note)
- `.github/workflows/ci.yml` (create)
- `README.md` — fix env-var section, API/pages tables, point to `.env.example` + CLAUDE.md

**Out of scope** (do NOT touch):
- `.env.example` — already complete and correct.
- Adding ESLint or a formatter that would reformat the whole repo. Do NOT run a repo-wide format —
  that produces a massive noisy diff. (Prettier is optional and OFF by default here; see Step 2.)
- `CLAUDE.md` — it is current; don't duplicate it into README.
- Pre-commit hooks via Husky — optional, deferred (CI is the enforcement here).

## Git workflow

- Branch: `advisor/003-dx-scripts-ci`
- Commit: `chore: add check script + CI workflow; refresh stale README`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a `check` script

Add to `package.json` `scripts`: `"check": "astro check"`. If plan 001 already added a `test`
script, leave it. Do not remove any existing script.

**Verify**: `npm run check` → runs `astro check`, exit 0, 0 errors.

### Step 2: (Optional) Prettier — SKIP unless explicitly desired

Do NOT add Prettier in this plan unless the operator asks. Reason: a repo with no existing formatter
config means the first `prettier --write` reformats ~200 files into one giant diff that buries real
changes and risks merge conflicts across every open branch. If desired later, it should be its own
isolated PR. For now, only the `check` script is added.

### Step 3: Add a CI workflow

Create `.github/workflows/ci.yml` that runs on pull requests and pushes, installing deps and running
typecheck + build (and tests if a `test` script exists):
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [develop, master]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run check
      - run: npm test --if-present
      - run: npm run build
        env:
          # Build must not require real secrets. If `npm run build` fails without
          # env vars, set NODE_ENV and provide dummy values here, or STOP and report
          # (see STOP conditions) — do not commit real secrets.
          NODE_ENV: production
```

**Verify locally** (CI itself runs on GitHub): `npm ci && npm run check && npm test --if-present && npm run build`
all exit 0. If `npm run build` fails purely due to missing env vars at build time, see STOP conditions.

### Step 4: Fix the README env-var section

In `README.md` "Variables de entorno": keep the minimal quickstart but replace the 2-row table with a
sentence that the full set of required/optional vars (Turso, Better-Auth, OAuth, S3, CS360, AI) is
documented in `.env.example` and in `CLAUDE.md` under "Environment Variables", and that all are
required to run locally except the explicitly-optional ones. Do not paste secret values.

### Step 5: Fix the README API & Pages tables

- API Endpoints table: it lists only 2 endpoints and a wrong range (`Hoja 1!A1:W200`). Either expand
  it to match the current endpoints or (preferred, lower-maintenance) replace it with a pointer:
  "See CLAUDE.md → 'API Endpoints' for the full, current list." Pick the pointer approach to avoid a
  second source of truth that will drift again.
- Pages table: fix `/proyecto/[folio]` → `/proyecto/[id]` and `/persona/[nombre]` → `/persona/[id]`,
  or replace with a pointer to CLAUDE.md → "Pages".
- Update the "Comandos" block to include `npm run check` and `npm test` (if present).

**Verify**: `grep -n "\[folio\]\|\[nombre\]\|Hoja 1" README.md` → returns nothing.

### Step 6: Full verification

**Verify**: `npm run check` → exit 0; `npm run build` → exit 0; `git status` shows only in-scope files.

## Test plan

No unit tests (tooling/docs). Verification is the command gates above plus the greps in Steps 5/6.
If plan 001 landed, `npm test` in CI is the regression gate this plan wires up.

## Done criteria

ALL must hold:
- [ ] `npm run check` exists and exits 0
- [ ] `.github/workflows/ci.yml` exists and runs check + build (+ test if present)
- [ ] README no longer contains `[folio]`, `[nombre]`, or `Hoja 1` references
- [ ] README env section points to `.env.example` / CLAUDE.md and no longer implies only 2 vars
- [ ] `npm run build` exits 0
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row for 003 updated

## STOP conditions

Stop and report if:
- `npm run build` cannot succeed in CI without real secret values (i.e. the build reads required env
  vars at build time). Report what it needs — do NOT commit real secrets or weaken the build to make
  CI pass.
- The repo already has a CI workflow under a different path you discover during the drift check
  (then extend it instead of creating a duplicate).

## Maintenance notes

- The README intentionally defers to CLAUDE.md / `.env.example` to avoid a third source of truth.
  Keep it that way — when endpoints/pages change, only CLAUDE.md needs updating.
- If Vitest from plan 001 is present, `npm test --if-present` in CI already covers it; no CI edit
  needed when more tests are added.
- A reviewer should confirm the CI `build` step does not bake in any secret.
