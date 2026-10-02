# Plan 013: Design spike — Tecnologías (skills) matrix

> **Executor instructions**: This is a DESIGN/SPIKE plan, not a build-everything plan. Your
> deliverable is a written design document plus (optionally) a throwaway prototype — NOT a shipped
> feature. Do NOT build the production feature from this plan; it ends with a design doc + open
> questions for the maintainer to approve before any build plan is written. When done, update
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 34cffdc..HEAD -- src/utils/dataTransforms.ts src/lib/equipoResolver.ts src/components/sections/EquipoSection.tsx`
> Confirm the equipo data model is still as described before designing on top of it.

## Status

- **Priority**: P3
- **Effort**: M (design + optional prototype; the eventual build is separate and larger)
- **Risk**: LOW (design only)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `34cffdc`, 2026-06-19

## Why this matters

A "tecnologías matrix" — a catalog of technologies cross-referenced with team members and projects —
is a deferred, repeatedly-mentioned idea (CLAUDE.md notes it as pending; it's tied to the NAV-74
close). The architecture makes it disproportionately cheap: the canonical `equipo` registry with
stable `equipo.id`, resolved person ids already attached to projects (`pmId`/`arquitectoId`/`devIds`),
and the existing capacity heatmap give most of the machinery. The product value is real: answering
"who knows Rust / who can staff this initiative / where is single-point-of-failure knowledge risk"
for capacity planning and hiring. But the **storage model and proficiency-level scheme are undecided**
— exactly what a spike should resolve before committing to a build. This plan produces that decision
input, grounded in the actual codebase, without prematurely building.

## Current state (the machinery this would build on)

- `equipo` is the canonical team registry in Turso, served by `GET /api/equipo` (`EquipoRecord[]` with
  `id`, `roleName`, `managerName`, `tag`, etc.). Read `src/pages/api/equipo.ts` and the `EquipoRecord`
  shape.
- Identity resolution: `src/lib/equipoMatch.ts` (`resolveId`) + `src/lib/equipoResolver.ts` map
  names/nicknames → `equipo.id`. Projects already carry resolved `pmIds`/`arquitectoIds`/`devIds`
  (see `src/pages/api/proyectos.ts`).
- The team UI lives in `src/components/sections/equipo/` with tabs (Organigrama, Capacity Heatmap,
  Comparativa, Costos) — a "Tecnologías" tab would slot in here. Read `EquipoSection.tsx` for the
  tab pattern.
- Two storage precedents exist and the spike must choose between them:
  - **Google Sheets** (most portfolio data: projects, cursos, costos, hitos) — easy for non-devs to
    edit, but no row-level write API in-app and parsing is by header.
  - **Turso** (auth, preferences, evaluations, mcp tokens, the `equipo` registry itself) — proper
    relational store with migrations under `src/db/migrations/`, editable in-app via admin endpoints.
- Permissions: any new page/data needs a `page:`/`block:` statement in `src/lib/permissions/` and a
  middleware gate (see `src/middleware.ts` `API_PAGE_GATES` / `PAGE_KEY_BY_SEGMENT`).

## Scope

**In scope** (deliverables):
- `plans/design/013-tecnologias-matrix.md` (create) — the design document (outline in Step 2).
- OPTIONAL: a throwaway prototype on a branch (clearly marked, NOT for merge) to de-risk one open
  question — e.g. a read-only `/api/team-technologies` over a hardcoded fixture to validate the
  cross-reference UX. If you prototype, it stays on the spike branch and is not part of "done".

**Out of scope** (do NOT do in this plan):
- Building the production feature: no Turso migration applied, no Sheets tab created, no real endpoint
  shipped, no permission statements added to the live system, no `EquipoSection` tab merged.
- Any change to existing source under `src/` on a branch intended for merge. The only mergeable
  artifact is the design doc under `plans/design/`.

## Git workflow

- Branch: `advisor/013-tecnologias-spike`
- Commit: `docs(design): tecnologías matrix spike + open questions`
- Any prototype code: separate commits clearly labeled `PROTOTYPE — do not merge`; do not include them
  in the design-doc PR.

## Steps

### Step 1: Investigate and ground the design

Read the files in "Current state". Establish, with file references:
- What `equipo.id` looks like and how a person↔technology link would key off it.
- How `EquipoSection` adds a tab (so the eventual UI cost is known).
- How a Turso table + migration is added (`src/db/migrations/`, `scripts/applyMigration.ts`,
  `auth-schema.sql` notes in CLAUDE.md) vs. how a Sheets tab + endpoint is added.
- Whether projects already expose enough to cross-reference tech↔project (they expose people; tech
  would attach to people, and project tech could be inferred from its team's tech or stored directly).

### Step 2: Write the design document

`plans/design/013-tecnologias-matrix.md` covering:
- **Data model**: entities (`technology` catalog: id, name, category; `equipo_technology` junction:
  equipoId, technologyId, level, optional yearStarted). Proficiency scheme — reuse the existing
  Tecnología rango (`Trainee/Jr/Mid/Sr/Arq` from `src/utils/roleCategory.ts roleRango`) or a separate
  1–5? Recommend one with rationale.
- **Storage decision**: Sheets vs Turso, with a clear recommendation and the tradeoffs (editability by
  non-devs, in-app write, migration cost, consistency with `equipo` which is already Turso). Note that
  since `equipo` is Turso, a Turso junction table is the consistent choice — argue it or against it.
- **API surface**: `GET /api/technologies` (catalog), `GET /api/team-technologies` (person×tech),
  optional filters; how it gets gated in middleware; permission statements needed.
- **UI**: a "Tecnologías" tab in `EquipoSection` (matrix/heatmap of person × tech), and optionally a
  filter on the team directory. Reference the existing tab + heatmap components to reuse.
- **Cross-reference with projects**: how "which projects use React" would be answered (stored on
  project vs inferred from team) — recommend the cheaper grounded option.
- **Maintenance burden**: who keeps the inventory current, and how stale data is surfaced.
- **Phasing**: an MVP (catalog + person×tech read-only) vs. later (editing UI, project cross-ref,
  skill-gap analytics).

### Step 3: List open questions for the maintainer

End the doc with a numbered list of decisions only the maintainer can make (proficiency scheme,
storage, who maintains it, whether project-tech is stored or inferred, MVP scope). These become the
inputs to a future build plan.

### Step 4: (Optional) De-risk one question with a throwaway prototype

If one design question is genuinely uncertain (e.g. "is the person×tech matrix UI legible at team
size N?"), build a minimal throwaway on the spike branch over a fixture to answer it. Capture a
screenshot/notes in the design doc. Do not wire it into the real app or merge it.

## Test plan

None (design deliverable). If a prototype is built, it needs no tests (throwaway).

## Done criteria

ALL must hold:
- [ ] `plans/design/013-tecnologias-matrix.md` exists with: data model, storage recommendation, API
      surface, UI plan, project cross-ref approach, maintenance plan, phasing, and a numbered
      open-questions list
- [ ] The doc cites specific existing files/patterns it builds on (equipo registry, EquipoSection tab,
      migration mechanism)
- [ ] No production source under `src/` modified on the mergeable branch (`git status` shows only the
      design doc, plus clearly-labeled prototype commits if any)
- [ ] `plans/README.md` status row for 013 updated

## STOP conditions

Stop and report if:
- The investigation reveals a prerequisite is missing (e.g. `equipo.id` isn't actually stable enough
  to key a junction table) — report it; the spike's value is surfacing that early.
- A maintainer decision is needed before the design can even be drafted coherently (e.g. Sheets vs
  Turso is a strategic call) — surface it as the first open question rather than guessing.

## Maintenance notes

- This spike intentionally produces a decision document, not a feature. The follow-up build plan
  should be written only after the maintainer answers the open questions.
- Keep the design consistent with the `equipo`-as-canonical-registry direction already in the codebase
  (memory + CLAUDE.md): tech should attach to `equipo.id`, not to free-text names.
