# Plan 015: Build the Tecnologías (skills) matrix — MVP

> **Executor instructions**: Follow step by step. Run every verification command before moving on. On
> any "STOP condition", stop and report. When done, update `plans/README.md`.
> This is the **build plan** for design spike 013 (`plans/design/013-tecnologias-matrix.md`). Read that
> spike first — it has the grounding (file references, precedents). The 5 open questions it ended on
> are now ANSWERED (see "Decisions locked in" below); this plan implements those decisions.
>
> **Drift check (run first)**:
> `git diff --stat 0b9c306..HEAD -- src/lib/permissions/ src/middleware.ts src/pages/api/equipo.ts src/components/sections/equipo/ src/db/`
> Re-read the spike and the files it cites before editing.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (additive: new tables, new read endpoints, a new read-only tab; touches no existing data path)
- **Depends on**: 013 (design spike, done)
- **Category**: feature
- **Planned at**: develop `d2ded8a`, 2026-06-23

## Decisions locked in (the maintainer answered 013's open questions)

1. **Proficiency scale** → **reuse `roleRango`**: `Trainee / Jr / Mid / Sr / Arq`. Store the **slug**
   (`trainee|jr|mid|sr|arq`) in `equipo_technology.level`. (`roleRango` lives in
   `src/utils/roleCategory.ts`.)
2. **Who edits** → **admin/lead-curated**, gated by a new **`action:tecnologia:manage`** statement
   (separate from `user:manage`, mirroring `equipo:manage`/`evaluacion:manage`), **admin-only by default**.
   ⚠️ Combined with decision #4, **the MVP ships with NO write UI** — define the permission statement now
   so the gate exists, but the admin editing modal is **Phase 2**.
3. **Project↔technology** → **inferred** (recommended): no stored project-tech field. "Which projects
   use React?" is answered by joining a project's resolved team (`pmIds`/`arquitectoIds`/`devIds` on
   `ProjectRecord`) against `equipo_technology`. Compute in the client/section, not the DB.
4. **Catalog & data entry** → ship a **complete curated `technology` catalog** (seed it in the
   migration). The team fills the **`equipo_technology` matrix directly in the DB** for now (no import
   tool, no write UI in MVP). → The read-only tab MUST render a clean **empty state** until rows exist.
5. **Read visibility** → **everyone** (any authenticated user), like `/equipo`. The Tecnologías tab
   inherits `page:equipo`; it is **NOT** added to the dev/ventas default-deny tab list (unlike the
   capacity-heatmap/comparativa tabs).

## What already exists (grounding — see 013 for detail)

- Canonical `equipo` table + `GET /api/equipo` (`src/pages/api/equipo.ts`), stable `equipo.id`.
- Junction-table precedent: `src/db/migrations/2026-evaluaciones.sql` (one row per `(equipo_id, …)`,
  `references "equipo"("id") on delete cascade`, `unique(...)`, indexes).
- Migration runner: `npm run apply-migration -- src/db/migrations/<name>.sql`
  (`scripts/applyMigration.ts`). Also re-append `create table` to `src/db/auth-schema.sql` (per CLAUDE.md,
  `auth:generate` rewrites that file and drops custom tables).
- Permission statements: `src/lib/permissions/statements.ts` (`statement.action` array, line ~42).
  Roles/defaults: `src/lib/permissions/roles.ts` + `roleDefaults.ts`.
- Endpoint gating: `API_PAGE_GATES` and the `/api/admin/*` gate logic in `src/middleware.ts`
  (the equipo-manage carve-out is the template for tecnologia-manage).
- Tabbed team UI: `src/components/sections/equipo/` wired from `EquipoSection.tsx`.
- Proficiency vocabulary: `roleRango()` / rank order in `src/utils/roleCategory.ts`.
- Glossary convention: `src/data/glossary.ts` (+ the cross-ref validator in CLAUDE.md).
- DB client: `src/db/client.ts` (`getDbClient`).

## Commands you will need

| Purpose   | Command                                                              | Expected |
|-----------|---------------------------------------------------------------------|----------|
| Install   | `npm install`                                                       | exit 0   |
| Migrate   | `npm run apply-migration -- src/db/migrations/2026-tecnologias.sql` | applied  |
| Typecheck | `npx astro check`                                                   | exit 0   |
| Tests     | `npm test`                                                          | all pass |
| Build     | `npm run build`                                                     | exit 0   |
| Dev       | `npm run dev`                                                       | manual UI check |

## Scope

**In scope (MVP)**:
- `src/db/migrations/2026-tecnologias.sql` (create) — two tables (`technology`, `equipo_technology`) +
  indexes + a **complete seed** of the `technology` catalog.
- `src/db/auth-schema.sql` — re-append the two `create table` + index statements (do NOT regenerate).
- `src/utils/dataTransforms.ts` (or a focused new file) — `Technology` + `TeamTechnology` interfaces.
- `src/pages/api/technologies.ts` (create) — `GET` the catalog. Role-open like `/api/equipo`.
- `src/pages/api/team-technologies.ts` (create) — `GET` the matrix rows. Role-open (read).
- `src/lib/permissions/statements.ts` — add `'tecnologia:manage'` to `statement.action`.
- `src/lib/permissions/roleDefaults.ts` + `roles.ts` — `tecnologia:manage` defaults admin-only
  (match how `evaluacion:manage` is defaulted).
- `src/middleware.ts` — add both new endpoints to `API_PAGE_GATES` under `page:equipo`; reserve the
  `/api/admin/team-technologies` path → `action:tecnologia:manage` carve-out (mirror the
  `/api/admin/equipo` → `equipo:manage` exemption) so Phase 2 can drop the write endpoint in cleanly.
- `src/components/sections/equipo/Tecnologias.tsx` (create) — read-only tab: person × technology
  heatmap + "by technology" lookup + empty state.
- `EquipoSection.tsx` — register the new tab (visible to all roles).
- `src/data/glossary.ts` — entries for the new tab's blocks (+ run the cross-ref validator).
- Tests in `tests/` mirroring any pure helper added (e.g. the inferred project↔tech join, the
  level→rank ordering).

**Out of scope** (Phase 2+ — do NOT build now):
- The admin **write UI / modal** and `POST/DELETE /api/admin/team-technologies` endpoint. (Define the
  permission + reserve the route gate only.)
- Self-service editing from `/cuenta`.
- Skill-gap analytics / SPOF flags / capacity-heatmap enrichment.
- A stored project↔technology table (decision #3: inferred only).
- A new `page:` key — the tab lives under `page:equipo`.

## Git workflow

- Branch: `advisor/015-tecnologias-matrix` cut from `origin/develop` (NOT master).
  `git checkout -b advisor/015-tecnologias-matrix origin/develop`
- Suggested commits: (1) migration + schema + types; (2) read endpoints + permission statement +
  middleware gates; (3) UI tab + glossary; (4) tests.
- Open a PR against **develop** when done.

## Steps

### Step 1: Migration + schema + seed catalog

Create `src/db/migrations/2026-tecnologias.sql`, mirroring the `evaluacion` migration style:

```sql
-- Migración: matriz de tecnologías (skills) del equipo. Build plan 015 (spike 013).
-- Modelo: catálogo curado `technology` + junction `equipo_technology` (1 fila por
-- (equipo_id, technology_id)). Nivel = slug de roleRango (trainee|jr|mid|sr|arq).
-- Visibilidad de lectura: cualquier autenticado (como /api/equipo). Escritura:
-- por ahora directo en BD; gate futuro `action:tecnologia:manage` (admin-only).
-- Aplicar con: npm run apply-migration -- src/db/migrations/2026-tecnologias.sql

drop table if exists "equipo_technology";
drop table if exists "technology";

create table "technology" (
  "id"       text primary key,            -- slug, e.g. 'react', 'aws-lambda'
  "name"     text not null,               -- display, e.g. 'React 19'
  "category" text not null,               -- 'language'|'framework'|'database'|'devops'|'cloud'|'tool'|'mobile'|'design'
  "active"   integer not null default 1
);

create table "equipo_technology" (
  "id"            integer primary key autoincrement,
  "equipo_id"     text not null references "equipo" ("id") on delete cascade,
  "technology_id" text not null references "technology" ("id") on delete cascade,
  "level"         text not null check ("level" in ('trainee','jr','mid','sr','arq')),
  "updated_at"    text not null,
  unique ("equipo_id", "technology_id")
);
create index "equipo_technology_equipo_idx"     on "equipo_technology" ("equipo_id");
create index "equipo_technology_technology_idx" on "equipo_technology" ("technology_id");

-- Catálogo completo (curado). Editable luego directo en BD.
insert into "technology" ("id","name","category") values
  -- languages
  ('typescript','TypeScript','language'),
  ('javascript','JavaScript','language'),
  ('python','Python','language'),
  ('java','Java','language'),
  ('kotlin','Kotlin','language'),
  ('swift','Swift','language'),
  ('go','Go','language'),
  ('rust','Rust','language'),
  ('csharp','C#','language'),
  ('php','PHP','language'),
  ('sql','SQL','language'),
  -- frameworks / web
  ('react','React','framework'),
  ('astro','Astro','framework'),
  ('nextjs','Next.js','framework'),
  ('nodejs','Node.js','framework'),
  ('express','Express','framework'),
  ('nestjs','NestJS','framework'),
  ('laravel','Laravel','framework'),
  ('spring','Spring','framework'),
  ('dotnet','.NET','framework'),
  ('tailwind','Tailwind CSS','framework'),
  -- mobile
  ('react-native','React Native','mobile'),
  ('flutter','Flutter','mobile'),
  ('android','Android','mobile'),
  ('ios','iOS','mobile'),
  -- databases
  ('postgresql','PostgreSQL','database'),
  ('mysql','MySQL','database'),
  ('sqlite','SQLite','database'),
  ('mongodb','MongoDB','database'),
  ('redis','Redis','database'),
  ('turso','Turso / libSQL','database'),
  -- cloud / devops
  ('aws','AWS','cloud'),
  ('aws-lambda','AWS Lambda','cloud'),
  ('aws-amplify','AWS Amplify','cloud'),
  ('aws-s3','Amazon S3','cloud'),
  ('gcp','Google Cloud','cloud'),
  ('azure','Azure','cloud'),
  ('docker','Docker','devops'),
  ('kubernetes','Kubernetes','devops'),
  ('terraform','Terraform','devops'),
  ('github-actions','GitHub Actions','devops'),
  ('ci-cd','CI/CD','devops'),
  -- tools / design / data
  ('git','Git','tool'),
  ('figma','Figma','design'),
  ('rest-api','REST APIs','tool'),
  ('graphql','GraphQL','tool'),
  ('openai','OpenAI / LLM APIs','tool'),
  ('power-bi','Power BI','tool'),
  ('google-sheets','Google Sheets API','tool');
```

> The catalog above is a strong default grounded in this codebase's actual stack (Astro/React/TS/Turso/
> AWS/Sheets) plus common adjacencies. The maintainer said they'll curate it directly in the DB — treat
> this list as the seed, not the final word. Use `updated_at` = an ISO string at insert time only for
> `equipo_technology` rows (the catalog has no `updated_at`).

Apply it: `npm run apply-migration -- src/db/migrations/2026-tecnologias.sql`. Then **re-append** the two
`create table` + 2 `create index` statements to `src/db/auth-schema.sql` (so a future `auth:generate`
re-merge keeps them — see CLAUDE.md note).

**Verify**: query the DB (via the same client used by `applyMigration`, or
`turso db shell <db> "select count(*) from technology;"`) → returns the seeded count (~49).

### Step 2: Types

Add to `src/utils/dataTransforms.ts` (and mirror in `mcp-server/src/data/types.ts` IF you expose an MCP
tool — you are NOT in MVP, so skip the mirror; just the app type):
```ts
export interface Technology { id: string; name: string; category: string; active: boolean; }
export interface TeamTechnology { equipoId: string; technologyId: string; level: 'trainee'|'jr'|'mid'|'sr'|'arq'; updatedAt: string; }
```

### Step 3: Read endpoints

`src/pages/api/technologies.ts` — `GET` → `{ technologies: Technology[] }` from the catalog
(`active = 1`), ordered by category then name. Role-open (no extra gate beyond the page gate added in
Step 4). Use `getDbClient` from `src/db/client.ts`. Follow `equipo.ts` for the response shape/style; a
small in-memory 5-min cache is optional (catalog is tiny — fine to skip, like `/api/equipo`).

`src/pages/api/team-technologies.ts` — `GET` → `{ rows: TeamTechnology[] }`, optional `?technology=` /
`?level=` filters. Role-open (read). **Do NOT apply row-scoping** — decision #5 makes the matrix
readable by everyone (the skills directory is not personal-sensitive in the way costs are).

**Verify**: `npx astro check` → 0. `npm run dev`, hit both endpoints while logged in → 200 with JSON.

### Step 4: Permission statement + middleware gates

- `statements.ts`: add `'tecnologia:manage'` to the `action` array (line ~42).
- `roleDefaults.ts` / `roles.ts`: default `action:tecnologia:manage` to **admin-only** (copy exactly
  how `evaluacion:manage` is wired — grep for `evaluacion:manage` and replicate every site).
- `middleware.ts`:
  - Add `/api/technologies` and `/api/team-technologies` to `API_PAGE_GATES` mapped to `page:equipo`
    (so a role with no access to `/equipo` gets 403, consistent with the other data endpoints).
  - Reserve the admin carve-out: where `/api/admin/equipo` is exempted from the generic `user:manage`
    gate and routed to `equipo:manage`, add the analogous `/api/admin/team-technologies` →
    `tecnologia:manage`. (The write endpoint itself is Phase 2; reserving the gate now means Phase 2 is
    a pure addition.)

**Verify**: `npx astro check` → 0. As a `dev` user (or via a quick role flip in a scratch DB), `curl`
`/api/technologies` while denied `page:equipo` → 403; while allowed → 200.

### Step 5: Read-only "Tecnologías" tab

Create `src/components/sections/equipo/Tecnologias.tsx`. It is the ONLY component allowed to fetch
(`useSheetData` or the project's fetch hook against `/api/technologies` + `/api/team-technologies` +
the already-loaded `equipo`). Render:
- **Person × technology heatmap/grid**: people (rows) × technologies (columns), cell = a level chip
  colored by rank. Reuse `Avatar` (`src/components/ui/Avatar.tsx`) and the chip patterns from the
  sibling tabs. Order levels via `roleRango`'s rank order (Trainee < Jr < Mid < Sr < Arq).
- **"By technology" lookup**: pick a technology → list people who have it + their level (the staffing
  question). This is also where the **inferred project↔tech** (decision #3) can surface: for a chosen
  tech, optionally list active projects whose resolved team (`pmIds`/`arquitectoIds`/`devIds`) includes
  someone with that tech. Keep the join in a small **pure helper** (e.g.
  `src/utils/teamTechnology.ts`) so it's unit-testable; the section just calls it.
- **Empty state** (decision #4): when `team-technologies` returns zero rows, show a clear "Aún no hay
  tecnologías registradas" message (the catalog exists but the matrix is unpopulated until the team
  fills the DB). Do NOT render a broken/empty grid.

Register the tab in `EquipoSection.tsx` next to the existing tabs. **Visible to all roles** — do NOT
add its tab key to whatever default-deny list gates `equipo-capacity-heatmap`/`equipo-comparativa`
(decision #5). Confirm by grepping for those keys and NOT adding the new one.

**Verify**: `npm run dev` → `/equipo` → Tecnologías tab renders. With an empty matrix → empty state.
Insert 2-3 `equipo_technology` rows by hand → grid + by-tech lookup populate correctly.

### Step 6: Glossary

Add `src/data/glossary.ts` entries for the new tab's visible blocks (the heatmap, the by-tech lookup),
under the `equipo` section, following the convention in CLAUDE.md ("Glosario y Tooltips"). Wire
`info={infoFor('equipo-tecnologias-…')}` / `<GlossaryTooltip>` as appropriate. **Run the cross-ref
validator** from CLAUDE.md before committing.

**Verify**: validator prints `Broken related refs: NONE | Orphan entries: NONE`.

### Step 7: Tests + full verification

- `tests/utils/teamTechnology.test.ts` — the inferred project↔tech join (decision #3) and the
  level→rank ordering: given fixtures, the right people/projects surface for a tech; ordering is
  Trainee→Arq.
- Keep tests pure (no DB/network), per the testing baseline (CLAUDE.md "Testing").

**Verify**: `npm test` → all pass; `npx astro check` → 0; `npm run build` → 0.

## Done criteria

ALL must hold:
- [ ] Migration applied; `technology` seeded; `equipo_technology` created with FK cascade + unique + indexes
- [ ] `src/db/auth-schema.sql` re-appended with the two tables (so `auth:generate` re-merge survives)
- [ ] `GET /api/technologies` + `GET /api/team-technologies` return JSON; gated under `page:equipo`
- [ ] `action:tecnologia:manage` statement added, admin-only default; `/api/admin/team-technologies`
      route gate reserved (endpoint itself NOT built)
- [ ] Read-only Tecnologías tab in `/equipo`, visible to all roles, with a working empty state
- [ ] Level chips ordered by `roleRango` rank; by-tech lookup works; inferred project↔tech via a pure helper
- [ ] Glossary entries added; cross-ref validator clean
- [ ] `npm test`, `npx astro check`, `npm run build` all green
- [ ] Only in-scope files modified (`git status`) — NO write UI, NO write endpoint, NO new page key
- [ ] `plans/README.md` row for 015 updated; the 013 follow-up note marked DONE
- [ ] CLAUDE.md updated: `/equipo` row mentions the Tecnologías tab; new endpoints in the API table;
      `tecnologia:manage` in the permissions section

## STOP conditions

Stop and report if:
- The `equipo` table id format or `EquipoRecord` shape has drifted from the spike's assumptions.
- Adding `page:equipo` to the new endpoints would change behavior for an existing endpoint (it should
  only add new keys — never edit existing `API_PAGE_GATES` entries).
- Wiring `tecnologia:manage` requires touching more than the `evaluacion:manage` sites (means the
  permission plumbing changed since the spike — re-read it).

## Maintenance notes

- The matrix is only useful if kept current. MVP = direct-DB entry; Phase 2 = the admin write UI behind
  `action:tecnologia:manage` (modal like `EquipoEditModal`) + `POST/DELETE /api/admin/team-technologies`.
  A periodic "review your skills" nudge avoids staleness.
- Expanding the catalog is an `insert into "technology" ...`; deactivating one is `set active=0` (don't
  delete — `equipo_technology` cascades).
- If an MCP tool is later added to expose the matrix, mirror the types in `mcp-server/src/data/types.ts`
  (per CLAUDE.md sync rule) and it inherits the `page:equipo` gate automatically.
- Phase 3 (only if inference proves insufficient): a stored project↔technology table.
