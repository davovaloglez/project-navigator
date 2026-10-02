# Plan 002: Fix Phase-5 row-scoping documentation drift

> **Executor instructions**: Follow this plan step by step. Run every verification command and
> confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and
> report. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- CLAUDE.md documentation/dev/arquitectura/seguridad.md src/lib/requesterScope.ts src/pages/api/proyectos.ts src/pages/api/tareas.ts`
> If the source files (`requesterScope.ts`, `proyectos.ts`, `tareas.ts`) changed, re-confirm that
> row-scoping is still implemented before editing the docs; if it was *removed*, this plan is moot
> (STOP and report).

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

The documentation says row-level data scoping ("Fase 5") is *deferred / not implemented*. The code
**implements it** and wires it into two endpoints. A maintainer or security reviewer reading the docs
will conclude an entire authorization layer is missing — leading them to mis-plan work, or to skip
reviewing scoping logic that is actually live and load-bearing. Wrong docs about a security control
are worse than missing docs. This is a pure documentation correction (no code change).

## Current state

**The code DOES implement row-scoping** (verified at `34cffdc`):
- `src/lib/requesterScope.ts` exports `getRequesterScope`, `projectVisible`, `taskVisible`,
  `invalidateRequesterScope`, and `RequesterScope`. Its header comment literally begins:
  *"Scoping fila-a-fila por identidad (Fase 5)."*
- `src/lib/scopeRoles.ts` defines `UNSCOPED_ROLES = new Set(['admin','directores','gerentes','ventas'])`
  and `isScopedRole()`.
- `src/pages/api/proyectos.ts:47-58` calls `getRequesterScope(locals.user)` and filters with
  `projectVisible(p, scope)` per request.
- `src/pages/api/tareas.ts:59-69` does the same with `taskVisible(t, scope)`.

**The docs that contradict this:**

1. `CLAUDE.md:173`:
   > `Estado: Fases 1-4 implementadas; Fase 5 (scoping por identidad fila-a-fila) diferida a post-migración del Sheet.`

2. `CLAUDE.md:179` — the "Límite aceptado (data scoping)" bullet says the gate is "grueso, no
   row-level", that a `dev` can `curl /api/proyectos` and read **all** projects, and that this is
   "intencional hasta la Fase 5 ... Pendiente de implementar". For `/api/proyectos` and `/api/tareas`
   this is now FALSE — they ARE row-scoped. (The other endpoints listed there — `cursos`, `equipo`,
   `snapshots`, `repositorios` — are still unscoped; plan 005 will address those, so keep that nuance.)

3. `documentation/dev/arquitectura/seguridad.md:45`:
   > `- **Filtrado de contenido a nivel fila** — ... El filtrado por identidad (row-scoping) está delineado como Fase 5 del sistema de permisos y no está implementado.`

Other docs that already describe it correctly (do NOT need changes, but read them to copy the right
wording): `documentation/dev/arquitectura/auth.md`, `documentation/dev/api/tareas.md`,
`documentation/dev/hooks/useSnapshotCapture.md`. Also check `documentation/dev/secciones/cronograma.md`
and `documentation/dev/arquitectura/db_diagrama.md` (they mention Fase 5 — verify they're accurate;
edit only if they assert it's unimplemented).

## Commands you will need

| Purpose   | Command                                          | Expected |
|-----------|--------------------------------------------------|----------|
| Re-confirm code | `grep -rn "getRequesterScope" src/pages/api`| shows proyectos.ts + tareas.ts |
| Find drift wording | `grep -rn "no está implementad\|diferida\|Fase 5" CLAUDE.md documentation/` | the sites above |
| Build (sanity) | `npm run build`                            | exit 0 (docs don't affect build) |

## Scope

**In scope** (documentation only):
- `CLAUDE.md` (lines ~173 and ~179)
- `documentation/dev/arquitectura/seguridad.md` (line ~45)
- `documentation/dev/secciones/cronograma.md` and `documentation/dev/arquitectura/db_diagrama.md`
  — ONLY if they assert Fase 5 is unimplemented.

**Out of scope** (do NOT touch):
- Any source code under `src/`. This is a docs-only change.
- The accepted-advisory table in `seguridad.md:333` (better-auth) — that is correct.

## Git workflow

- Branch: `advisor/002-phase5-doc-drift`
- Commit: `docs: correct Phase-5 row-scoping status (it is implemented for proyectos/tareas)`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Correct `CLAUDE.md:173`

Change the state sentence to reflect that Phase 5 is implemented for `proyectos`/`tareas`. Suggested:
> `Estado: Fases 1-4 implementadas; Fase 5 (scoping por identidad fila-a-fila) implementada para /api/proyectos y /api/tareas vía src/lib/requesterScope.ts; pendiente extenderla a los demás endpoints de datos (cursos, hitos, sprints, capacidades, repositorios).`

### Step 2: Correct `CLAUDE.md:179` ("Límite aceptado")

Rewrite so it no longer claims `/api/proyectos` and `/api/tareas` are unscoped. Keep the honest
remaining limit: the OTHER data endpoints (`cursos`, `equipo`, `snapshots`, `repositorios`, `hitos`,
`sprints`, `capacidades`) are still coarse-gated, not row-scoped. State that `proyectos`/`tareas`
now filter rows by `requesterScope` (cache RAW + filter per request), and that extending the same
pattern to the rest is tracked (plan 005).

### Step 3: Correct `documentation/dev/arquitectura/seguridad.md:45`

Replace "y no está implementado" with the accurate state: row-scoping IS implemented for
`/api/proyectos` and `/api/tareas` (`src/lib/requesterScope.ts`), scoped roles are `pm`/`dev`
(everything outside `UNSCOPED_ROLES`), and the remaining data endpoints are not yet scoped.
Cross-link to `auth.md` where the mechanism is documented.

### Step 4: Spot-check the other two docs

Run `grep -n "Fase 5\|implementad" documentation/dev/secciones/cronograma.md documentation/dev/arquitectura/db_diagrama.md`.
If either says Fase 5 is *not* implemented, fix that line to match Steps 1–3. If they're already
accurate, leave them.

### Step 5: Verify no contradictions remain

**Verify**: `grep -rn "row-scoping.*no está implementad\|Fase 5.*diferida\|Fase 5.*no está" CLAUDE.md documentation/`
→ returns nothing (no doc still claims it's unimplemented/deferred without the "for the remaining
endpoints" qualifier).

## Test plan

No code tests (docs only). Verification is the grep in Step 5 plus a human read for tone consistency
with the surrounding Spanish prose.

## Done criteria

ALL must hold:
- [ ] `CLAUDE.md:173` and `:179` no longer claim `/api/proyectos`/`/api/tareas` are unscoped
- [ ] `documentation/dev/arquitectura/seguridad.md:45` no longer says row-scoping "no está implementado"
- [ ] `grep -rn "Fase 5.*diferida\|row-scoping.*no está implementad" CLAUDE.md documentation/` returns nothing
- [ ] `npm run build` exits 0
- [ ] No files outside the in-scope doc list modified (`git status`)
- [ ] `plans/README.md` status row for 002 updated

## STOP conditions

Stop and report if:
- The drift check shows `requesterScope.ts` / `proyectos.ts` / `tareas.ts` no longer implement
  scoping (then the docs may be correct again — don't "fix" them backward).
- You find a doc that asserts something about scoping you cannot verify against the code.

## Maintenance notes

- When plan 005 extends scoping to the remaining endpoints, the "pendiente extenderla a los demás
  endpoints" qualifier added here must be removed again. Leave a note in 005's done criteria.
- The canonical mechanism description lives in `documentation/dev/arquitectura/auth.md` — keep
  `CLAUDE.md` and `seguridad.md` as pointers to it rather than duplicating the full explanation.
