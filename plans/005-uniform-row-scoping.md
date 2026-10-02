# Plan 005: Apply uniform row-level scoping to the remaining data endpoints

> **Executor instructions**: Follow step by step. Run every verification command and confirm the
> expected result before moving on. On any "STOP condition", stop and report. This plan has a
> required design decision in Step 1 — do not skip it. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/lib/requesterScope.ts src/pages/api/`
> Re-read `requesterScope.ts` and the target routes before editing.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 004 (shared module makes this a small, consistent edit), 001 (tests for predicates)
- **Category**: security
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

Row-level scoping ("Fase 5") is implemented and applied to `/api/proyectos` and `/api/tareas`: a
scoped role (`pm`, `dev`) only receives its own rows. But the other data endpoints —
`/api/cursos`, `/api/hitos`, `/api/sprints`, `/api/capacidades`, `/api/repositorios` — return the
**full dataset** to any authenticated user whose role can see one consumer page. So a `dev` who can
open `/cursos` can `curl /api/cursos` and read every person's course progress; the same gap exists
for hitos/sprints/capacidades. This is an inconsistent and likely unintended data-exposure surface
now that the scoping machinery exists. This plan closes the gap consistently — but which endpoints
*should* be scoped, and how, is a real decision (Step 1), not a mechanical one.

## Current state

Scoping is wired into exactly two routes (verified at `34cffdc`):
`grep -rln "getRequesterScope" src/pages/api` → `proyectos.ts`, `tareas.ts` only.

The pattern they use (`tareas.ts:59-69`):
```ts
export const GET: APIRoute = async ({ locals }) => {
  const scope = await getRequesterScope(locals.user);
  const scoped = (data: TareaRecord[]) =>
    new Response(JSON.stringify(data.filter((t) => taskVisible(t, scope))), {
      headers: { 'Content-Type': 'application/json' },
    });
  if (cache && /* fresh */) return scoped(cache.data as TareaRecord[]);
  /* ... build data ... */ cache.set(data); return scoped(data);
};
```

The scoping primitives (`src/lib/requesterScope.ts`):
```ts
export interface RequesterScope { kind: 'unscoped' | 'pm' | 'dev'; equipoId: string | null; }
export async function getRequesterScope(user): Promise<RequesterScope>  // looks up user.equipoId
export function projectVisible(p: ProjectRecord, s: RequesterScope): boolean
export function taskVisible(t: TareaRecord, s: RequesterScope): boolean
```
`UNSCOPED_ROLES = ['admin','directores','gerentes','ventas']` (`src/lib/scopeRoles.ts`) → those see
everything; `pm`/`dev`/unknown are scoped. Scoped + no `equipoId` → fail-closed (sees nothing).

The record shapes for the unscoped endpoints (from `src/utils/dataTransforms.ts` — READ them):
- `CursoRecord` — has a person field (course progress per person). Check exact id/name field.
- `HitoRecord` — tied to a project via `id_proyecto`/project id.
- `TareaRecord` already has `asignadoId`. `RepoRecord` has per-person GitHub role fields.
- `capacidades`/`sprints` — read the route to see what each row represents.

**Important nuance** (documented at `CLAUDE.md:179` and in `requesterScope.ts` comment): a PM does
NOT see "tasks of their projects", only tasks `asignadoId === equipoId`, because tasks have no
project link yet. The same limitation will shape how hitos/sprints can be scoped — you may only be
able to scope by direct person-id membership, not by project ownership.

## Commands you will need

| Purpose   | Command                | Expected |
|-----------|------------------------|----------|
| Confirm gap | `grep -rln "getRequesterScope" src/pages/api` | only proyectos.ts, tareas.ts (before) |
| Typecheck | `npx astro check`      | exit 0   |
| Tests     | `npm test`             | all pass |
| Build     | `npm run build`        | exit 0   |

## Scope

**In scope** (decided in Step 1, but the candidate set):
- `src/lib/requesterScope.ts` — add per-record `*Visible(record, scope)` predicates as needed
  (e.g. `cursoVisible`, `hitoVisible`, `repoVisible`).
- `src/pages/api/cursos.ts`, `hitos.ts`, `sprints.ts`, `capacidades.ts`, `repositorios.ts` — apply
  scoping to those that Step 1 decides should be scoped.
- `src/lib/requesterScope.test.ts` — extend with tests for the new predicates.
- `CLAUDE.md` and `documentation/dev/arquitectura/seguridad.md` — update the "remaining endpoints"
  qualifier left by plan 002.

**Out of scope** (do NOT touch):
- `/api/equipo` — it is the directory used for name resolution + avatars across the whole app
  (`CLAUDE.md` lists it as role-open by design). Scoping it would break unrelated features. Leave it
  unscoped unless Step 1 explicitly decides otherwise with the operator.
- `/api/snapshots` (GET) — snapshots are aggregate portfolio history; scoping per-row is a different
  design question. Out of scope here.
- `/api/proyectos`, `/api/tareas` — already scoped; don't change.
- `/api/costos*` — gated by `data:costos` (a sensitive-data gate), a different mechanism. Leave it.

## Git workflow

- Branch: `advisor/005-uniform-row-scoping`
- One commit per endpoint scoped. Message: `security(api): row-scope <endpoint> by requester identity`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Decide the scoping rule per endpoint (REQUIRED — do not skip)

Read each record type in `src/utils/dataTransforms.ts` and each route, and decide for EACH of
`cursos`, `hitos`, `sprints`, `capacidades`, `repositorios`:
- Does the row carry a person identity that maps to `equipo.id`? (cursos: the enrolled person;
  repositorios: per-person access; capacidades: the person whose capacity it is.) If yes → scope a
  scoped role to rows where that id === `scope.equipoId`.
- Is it project-derived (hitos)? Then a scoped role can only see hitos for projects it can see —
  but tasks/hitos may lack a usable project→person link (see the nuance above). If a row cannot be
  reliably attributed to the requester, **fail-closed for scoped roles is the safe default** (a `dev`
  seeing zero hitos is safer than seeing all), but this is a product call.

Write the decided matrix as a comment block at the top of the section you edit in
`requesterScope.ts`. If any endpoint's correct rule is genuinely ambiguous (e.g. capacidades should
arguably be visible to a PM for their team), STOP and ask the operator rather than guessing (see STOP
conditions). Unscoped roles always see everything — that part is not in question.

### Step 2: Add per-record predicates to `requesterScope.ts`

For each endpoint Step 1 decided to scope, add a pure predicate mirroring `taskVisible`'s shape:
`unscoped → true`; scoped with no `equipoId → false`; otherwise compare the row's person id to
`scope.equipoId`. Keep them pure (no DB).

**Verify**: `npx astro check` → 0 errors.

### Step 3: Apply the `scoped()` wrapper in each route

For each in-scope route, replicate the `proyectos.ts`/`tareas.ts` pattern: resolve
`getRequesterScope(locals.user)` once, wrap the cached and fresh responses in a `scoped()` closure
that filters with the new predicate. The RAW cache stays shared; only the per-request output is
filtered. Do this on top of plan 004's shared cache if 004 has landed.

**Verify after each route**: `npx astro check` → 0 errors; `npm run build` → exit 0.

### Step 4: Extend predicate tests

Add cases to `src/lib/requesterScope.test.ts` for each new predicate: unscoped sees all; scoped +
null equipoId sees none; scoped sees only its own rows.

**Verify**: `npm test` → all pass.

### Step 5: Update the docs qualifier from plan 002

In `CLAUDE.md:173/179` and `seguridad.md`, remove the "pendiente extenderla a los demás endpoints"
qualifier for the endpoints now scoped; list any deliberately-left-unscoped endpoints (`/api/equipo`,
`/api/snapshots`) and why.

**Verify**: `grep -rn "pendiente extenderla" CLAUDE.md documentation/` → only mentions the endpoints
genuinely still unscoped (or nothing).

### Step 6: Full verification

**Verify**: `grep -rln "getRequesterScope" src/pages/api` now lists the newly-scoped routes too;
`npm test` → all pass; `npx astro check` → 0; `npm run build` → 0.

## Test plan

- Extend `src/lib/requesterScope.test.ts` (Step 4) — pure predicate coverage per new record type.
- There is no HTTP harness; route-level correctness is verified by typecheck + build + the predicate
  tests + a careful read that each route filters before returning. Note this limitation in your report.

## Done criteria

ALL must hold:
- [ ] Each endpoint Step 1 decided to scope filters its response by requester identity
- [ ] `npm test` passes incl. new predicate tests
- [ ] `npx astro check` exits 0; `npm run build` exits 0
- [ ] Unscoped roles (admin/directores/gerentes/ventas) still receive full datasets (verify in tests)
- [ ] Docs no longer claim the now-scoped endpoints are unscoped
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` status row for 005 updated

## STOP conditions

Stop and report if:
- Any endpoint's correct scoping rule is genuinely ambiguous (e.g. should a PM see their whole team's
  capacidades or only their own?). This is a product decision — ask, don't guess.
- A record type has no field that maps to `equipo.id`, so scoped roles could only get all-or-nothing.
  Report which, and recommend fail-closed vs. leaving unscoped.
- Scoping a route would break a consumer that needs the full dataset for name resolution/aggregation
  (the way `/api/equipo` does). Report it and leave that route out.

## Maintenance notes

- When tasks/hitos gain a real project→owner link (the limitation noted in `requesterScope.ts`),
  revisit the hito/task rules so a PM sees rows for *their projects*, not just rows assigned to them.
- A reviewer should specifically check the fail-closed paths: a scoped user with no `equipoId` must
  receive `[]`, never the full set.
- Keep all visibility predicates in `requesterScope.ts` (one file) so the security surface is auditable
  in one place.
