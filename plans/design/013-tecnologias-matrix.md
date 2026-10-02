# Design Spike 013: Tecnologías (skills) matrix

> **This is a DESIGN document, not an implementation.** It investigates the codebase, proposes
> an architecture grounded in existing patterns, and ends with open questions the maintainer must
> answer before a build plan is written. No production code is shipped from this spike.
>
> **Written against** commit `1f318f4` (develop). Author: `/improve` advisor.

## Problem & value

Today the app can answer "who is the PM of project X?" and "what's the team's capacity?" but **not**
"who knows Rust?", "which people can staff a Go initiative?", or "where is single-point-of-failure
knowledge risk?". A technologies (skills) matrix — technologies × people, optionally × projects —
unlocks capacity planning by *skill supply*, hiring-gap analysis, and staffing decisions.

This was flagged as deferred (CLAUDE.md / prior audit, tied to the NAV-74 close). The architecture
makes it disproportionately cheap because the hard part — a canonical, stable person registry — already
exists.

## What the codebase already gives us (grounding)

- **Canonical team registry in Turso.** `equipo` table, served by `GET /api/equipo`
  ([src/pages/api/equipo.ts](../../src/pages/api/equipo.ts)). `EquipoRecord` has a **stable `id`**
  (e.g. `emontano`), `fullName`, `nickname`, `tag`, `roleId`, `roleName`, `managerId`, `active`,
  `hasLogin`, `image`. Role-open to any authenticated user; no cache (tiny ≈33-row table). This is the
  anchor a skills junction keys off — `equipo.id` is the join key, not a fragile name.
- **Turso is the store for everything team/identity-shaped** (auth, `equipo`, `roles`, `evaluacion`,
  `user_preferences`, `mcp_token`). Sheets holds portfolio data (projects, cursos, costos, hitos).
- **A clean junction-table precedent**: [src/db/migrations/2026-evaluaciones.sql](../../src/db/migrations/2026-evaluaciones.sql)
  — `evaluacion` is one row per `(equipo_id, periodo)`, `equipo_id text not null references "equipo"("id") on delete cascade`,
  `unique(equipo_id, periodo)`, `check` constraints on integer dimensions, plus indexes. A
  `equipo_technology` junction would mirror this shape exactly.
- **Migration mechanism**: write `src/db/migrations/<name>.sql`, apply with
  `npm run apply-migration -- src/db/migrations/<name>.sql` ([scripts/applyMigration.ts](../../scripts/applyMigration.ts)).
  Also re-append the `create table` to [src/db/auth-schema.sql](../../src/db/auth-schema.sql) (per
  CLAUDE.md, `auth:generate` rewrites that file and drops custom tables).
- **A proficiency vocabulary already exists**: `roleRango()` in
  [src/utils/roleCategory.ts](../../src/utils/roleCategory.ts) returns `Trainee / Jr / Mid / Sr / Arq`
  for tech roles. Reusing this scale keeps the product's language consistent.
- **Page gating is one line**: add a key to `statement.page` in
  [src/lib/permissions/statements.ts](../../src/lib/permissions/statements.ts) and a route→key entry in
  `PAGE_KEY_BY_SEGMENT` / `API_PAGE_GATES` in [src/middleware.ts](../../src/middleware.ts). But the
  matrix likely lives **inside `/equipo` as a tab**, so it can simply inherit `page:equipo` — no new
  page key needed (see UI below).
- **Tabbed team UI exists**: `src/components/sections/equipo/` already hosts tabs (Organigrama,
  Capacity Heatmap, Comparativa, Costos) wired from [EquipoSection.tsx](../../src/components/sections/EquipoSection.tsx).
  A "Tecnologías" tab slots in next to them.

## Recommended architecture

### Storage — **Turso** (recommended)
The matrix is identity-shaped and keys off `equipo.id`, which lives in Turso. Putting it in Turso (not
Sheets) gives FK integrity (`on delete cascade` when a person leaves), in-app editing via an admin
endpoint (the team already manages `equipo` via `/api/admin/equipo`), and consistency with `evaluacion`.
A Sheets tab would have no write API, no referential integrity, and would reintroduce name-matching.
**Trade-off**: non-devs can't edit a Turso table directly like a Sheet — but the team already edits
`equipo` through the in-app admin module, so the editing surface is a solved pattern, not a new burden.

### Data model
Two tables, mirroring the `evaluacion` migration style:

```sql
-- Catalog of technologies (curated; small).
create table "technology" (
  "id"        text primary key,           -- slug, e.g. 'react', 'aws-lambda', 'postgresql'
  "name"      text not null,              -- display, e.g. 'React 19'
  "category"  text not null,              -- 'language' | 'framework' | 'database' | 'devops' | 'tool'
  "active"    integer not null default 1
);

-- Person × technology proficiency (the matrix).
create table "equipo_technology" (
  "id"            integer primary key autoincrement,
  "equipo_id"     text not null references "equipo"("id") on delete cascade,
  "technology_id" text not null references "technology"("id") on delete cascade,
  "level"         text not null,          -- see proficiency scheme below
  "updated_at"    text not null,
  unique ("equipo_id", "technology_id")
);
create index "equipo_technology_equipo_idx"     on "equipo_technology" ("equipo_id");
create index "equipo_technology_technology_idx" on "equipo_technology" ("technology_id");
```

### Proficiency scheme — **reuse `roleRango` (`Trainee/Jr/Mid/Sr/Arq`)** (recommended)
Keeps one vocabulary across the product (the team directory already shows these). Store the slug
(`trainee|jr|mid|sr|arq`) in `level`. A numeric 1–5 is the main alternative (easier to average/heatmap),
but it introduces a second skill-scale the rest of the app doesn't use. *Open question #1.*

### API surface
- `GET /api/technologies` → the catalog (`Technology[]`). Role-open like `/api/equipo`.
- `GET /api/team-technologies` → the matrix (`{ equipoId, technologyId, level }[]`), optionally
  filtered (`?technology=react`, `?level=sr`). Role-open (read), or gated to `page:equipo`.
- `POST/DELETE /api/admin/team-technologies` → manage entries, gated by a new
  `action:tecnologia:manage` statement (separate from `user:manage`, mirroring how `equipo:manage`
  and `evaluacion:manage` are separated). *Open question #2 (who may edit).*
- All gated under `page:equipo` (the matrix is a tab there) — no new page key.

### UI
A **"Tecnologías" tab in `/equipo`** (`src/components/sections/equipo/Tecnologias.tsx`), rendering a
**person × technology heatmap/grid** (people as rows, technologies as columns, cell = level chip).
Reuse the avatar + chip patterns already in the team tabs. With `action:tecnologia:manage`, an edit
affordance per person (a modal like `EquipoEditModal`). A secondary view: "by technology" (pick a tech →
who has it, at what level) for staffing questions. Glossary entries added per the in-product docs
convention.

### Cross-reference with projects — **infer, don't store (MVP)** (recommended)
"Which projects use React?" can be answered without a new field by joining a project's resolved team
(`pmIds`/`arquitectoIds`/`devIds` already on `ProjectRecord`) against `equipo_technology`. That's free
and always current. Storing per-project tech explicitly is more precise but adds another field to keep
in sync — defer it. *Open question #3.*

### Maintenance
The matrix is only valuable if kept current. Lowest-friction options: (a) self-service — each person
edits their own technologies from `/cuenta` (like the self-evaluation block); (b) admin/lead-curated.
A periodic "review your skills" nudge avoids staleness. *Open question #4.*

## Phasing
- **MVP**: `technology` + `equipo_technology` tables; `GET /api/technologies` + `GET /api/team-technologies`;
  read-only "Tecnologías" tab (person × tech heatmap + by-technology lookup); seed the catalog with
  ~30 common techs. Project cross-ref via inference.
- **Phase 2**: editing UI (self-service in `/cuenta` and/or admin-curated), `action:tecnologia:manage`,
  skill-gap analytics (coverage per tech, SPOF flags), capacity heatmap enrichment.
- **Phase 3**: explicit project↔technology if inference proves insufficient.

## Open questions for the maintainer (decide before a build plan)
1. **Proficiency scale**: reuse `roleRango` (`Trainee/Jr/Mid/Sr/Arq`) or a numeric 1–5? (Recommend `roleRango`.)
2. **Who edits the matrix**: self-service per person (`/cuenta`), admin/lead-curated, or both? Drives the
   editing UI + the `action:tecnologia:manage` permission default.
3. **Project↔technology**: inferred from each project's team (cheap, MVP) or stored explicitly (precise,
   more upkeep)? (Recommend inferred for MVP.)
4. **Catalog ownership & cadence**: who curates the `technology` list and how is staleness prevented
   (self-review nudge? quarterly?).
5. **Read visibility**: matrix readable by everyone (like `/equipo`) or gated to leads/PMs/admin?

## Why this is low-risk to build later
Every prerequisite exists: stable `equipo.id`, the `evaluacion` junction precedent, the migration
runner, the tabbed team UI, the permission-statement pattern, and a proficiency vocabulary. The MVP is
~2 tables + 2 read endpoints + 1 tab. The only blockers are the product decisions above, not technical
unknowns.
