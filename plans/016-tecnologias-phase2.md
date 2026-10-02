# Plan 016: Tecnologías matrix — Phase 2 (persona detail tab + admin write)

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
> This is **Phase 2** of the Tecnologías (skills) matrix. **Phase 1** (plan 015, PR #33) shipped the
> read MVP: the `technology` + `equipo_technology` Turso tables (migration applied, catalog seeded), the
> read endpoints `GET /api/technologies` + `GET /api/team-technologies` (supports `?equipo=<id>`), the
> read-only `/equipo` Tecnologías tab, the `action:tecnologia:manage` statement (admin-only default), and
> the middleware carve-out routing `/api/admin/team-technologies` → `action:tecnologia:manage`.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (additive: a new persona tab, a new write endpoint that only writes the existing
  `equipo_technology` table; the only existing-file change is a no-behavior-change shared extraction)
- **Depends on**: 015 (Phase 1 read MVP, DONE — PR #33)
- **Category**: feature
- **Planned at**: develop `4de64c6`, 2026-06-23

## The design (maintainer's decided split)

- **`/equipo` Tecnologías tab = read-only AGGREGATE only** (matrix heatmap + by-technology lookup,
  group + sort). NO editing there. The only change allowed is extracting the shared presentational bits
  (`LevelChip`, `LEVEL_COLORS`, `CATEGORY_LABEL`, `CATEGORY_ORDER`) so the persona tab can reuse them —
  a pure refactor, no behavior change.
- **`/persona/[id]` gets a new "Tecnologías" tab** = that ONE person's skills in detail. **Read for
  everyone** (inherits `page:equipo`, same as the rest of `/persona`). **Admin edit surface lives HERE**,
  per-person — NOT in the equipo aggregate. Gated by `action:tecnologia:manage` (admin-only default).

## What already exists (Phase 1 grounding)

- `technology` + `equipo_technology` Turso tables (migration applied, catalog seeded, matrix filled in DB).
- `GET /api/technologies` (`src/pages/api/technologies.ts`) — catalog, role-open, gated under `page:equipo`.
- `GET /api/team-technologies` (`src/pages/api/team-technologies.ts`) — matrix rows; `?technology=` /
  `?level=` / `?equipo=` filters; role-open, gated under `page:equipo`.
- `src/utils/teamTechnology.ts` — pure helpers: `LEVEL_ORDER`, `LEVEL_LABEL`, `compareLevel`,
  `peopleForTech`, `techsForPerson`, `groupByCategory`, `projectsForTech` (all unit-tested in
  `tests/utils/teamTechnology.test.ts`).
- `src/components/sections/equipo/Tecnologias.tsx` — read-only equipo tab (defines `LevelChip`,
  `LEVEL_COLORS`, `CATEGORY_LABEL`, `CATEGORY_ORDER` locally — Phase 2 extracts these).
- `src/lib/permissions/statements.ts` — `action:tecnologia:manage` already declared.
- `src/lib/permissions/roles.ts` — `admin` role has `tecnologia:manage`; no other role does.
- `src/middleware.ts` — `/api/admin/team-technologies` already routed to `action:tecnologia:manage`
  (reserved in Phase 1 for this exact write endpoint). `/persona/*` inherits page-key `equipo`. The
  tech read endpoints are in `API_PAGE_GATES` under `page:equipo`.
- Write endpoint patterns: `src/pages/api/admin/evaluaciones.ts` (POST upsert + DELETE, `jsonError`,
  parameterized SQL, FK existence checks). Edit modal pattern: `EvaluacionEditModal.tsx`.

## Scope

**In scope (Phase 2)**:
- `src/components/sections/equipo/tecnologiasShared.tsx` (create) — extract `LevelChip`, `LEVEL_COLORS`,
  `CATEGORY_LABEL`, `CATEGORY_ORDER`. Verbatim values from `Tecnologias.tsx`.
- `src/components/sections/equipo/Tecnologias.tsx` (edit) — import the extracted bits (no behavior change).
- `src/components/sections/persona-detalle/TecnologiasTab.tsx` (create) — read view (everyone) + admin
  edit affordances (gated client-side by `<Gate resource="action:tecnologia:manage">`).
- `src/components/sections/persona-detalle/TecnologiaEditModal.tsx` (create) — admin modal (mirror
  `EvaluacionEditModal`): add a tech (catalog not-yet-assigned + level), edit level, remove a tech.
- `src/pages/api/admin/team-technologies.ts` (create) — `POST` upsert + `DELETE`, mirroring
  `admin/evaluaciones.ts`. Validates `level ∈ trainee|jr|mid|sr|arq`, `equipoId` exists, `technologyId`
  exists. Parameterized SQL only. Middleware gates it; no DB migration (writes existing table).
- `src/components/sections/PersonaDetailSection.tsx` (edit) — wire the new tab: `TabKey` union, `tabDefs`
  entry (Cpu icon), data fetch (catalog via `useSheetData`; person matrix via a manual `fetch` keyed on
  the async-resolved `personId`), tab render.
- `src/data/glossary.ts` (edit) — entry `persona-detalle-tecnologias`; cross-ref validator clean.
- CLAUDE.md (edit) — `/persona/[id]` row, API table row for the write endpoint, permissions note.

**Out of scope** (do NOT build now):
- Any DB migration (Phase 2 adds NO tables).
- A write affordance in the `/equipo` tab.
- A stored project↔technology table (still inferred, Phase 3 if ever).
- Skill-gap analytics / SPOF flags / capacity-heatmap enrichment.
- An MCP tool for the matrix.

## Steps

1. **Plan + shared extraction.** Write this plan. Create `tecnologiasShared.tsx`; repoint
   `Tecnologias.tsx` imports. `npx astro check` → 0; the `/equipo` tab renders identically.
2. **Persona read tab.** `TecnologiasTab.tsx` (read path) + wire into `PersonaDetailSection.tsx`
   (`TabKey`, `tabDefs`, data fetch, render). Handle loading / empty / 403 gracefully.
3. **Write endpoint + edit modal.** `api/admin/team-technologies.ts` (POST/DELETE). `TecnologiaEditModal.tsx`.
   Wire the admin affordances into the tab behind `<Gate resource="action:tecnologia:manage">`.
4. **Glossary + docs + tests.** Glossary entry + cross-ref validator. CLAUDE.md updates. (No new pure
   helper → no new test file; `techsForPerson`/`groupByCategory`/`compareLevel` already tested.)

## Done criteria

ALL must hold:
- [ ] Shared presentational bits extracted; `/equipo` Tecnologías tab behavior unchanged
- [ ] `/persona/[id]` has a Tecnologías tab, read-visible to everyone with `page:equipo`
- [ ] Tab groups the person's techs by category, level chip per tech, sorted level desc; clean empty state
- [ ] `POST/DELETE /api/admin/team-technologies` implemented; validates level + FK existence; parameterized SQL
- [ ] Endpoint gated server-side (middleware → `action:tecnologia:manage`); client edit affordances gated
      by `<Gate resource="action:tecnologia:manage">`; non-admins never see edit
- [ ] Editing lives ONLY in the persona tab (NOT in `/equipo`)
- [ ] Glossary entry added; cross-ref validator clean
- [ ] `npm test`, `npx astro check`, `npm run build` all green
- [ ] NO DB migration run
- [ ] `plans/README.md` row for 016 added; CLAUDE.md updated

## STOP conditions

Stop and report if:
- The `equipo_technology` schema (columns / unique key) differs from Phase 1's
  `(equipo_id, technology_id, level, updated_at)` + `unique(equipo_id, technology_id)`.
- The middleware no longer routes `/api/admin/team-technologies` → `action:tecnologia:manage` (means the
  Phase 1 carve-out drifted — re-read `src/middleware.ts`).
- Wiring the tab requires changing an existing `API_PAGE_GATES` entry (it should require NO middleware edit
  at all — the endpoint path + gate already exist).

## Maintenance notes

- The write endpoint trusts the middleware gate (same as `admin/evaluaciones.ts`); the client `<Gate>` is
  UX-only. Both layers reference the single `action:tecnologia:manage` statement.
- Adding/deactivating catalog technologies is still a direct-DB op (`technology` table); the write
  endpoint only manages `equipo_technology` rows.
- The persona tab fetches the person's matrix with `?equipo=<id>`; after a save/delete it refetches that
  one slice (no full-matrix reload).
