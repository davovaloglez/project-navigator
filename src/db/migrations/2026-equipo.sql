-- Migración: Núcleo de identidad/costo en Turso (Fase 1 del rediseño de datos)
-- Aplicar UNA vez a una BD Turso existente (Better-Auth + roles ya aplicados):
--   turso db shell <db-name> < src/db/migrations/2026-equipo.sql
--
-- Aplicar DESPUÉS de 2026-roles.sql. Para BD nueva NO usar esto:
-- aplicar src/db/auth-schema.sql completo.
--
-- PASO ADITIVO Y REVERSIBLE: nada en el app lee estas tablas todavía.
-- El seed/reconciliación (apodos de Projects + nombres de Cursos +
-- match con `user` por email) es un paso posterior y manual.
--
-- NOTA: si re-corres `npm run auth:generate`, ni `user.equipoId` ni
-- las tablas `roles`/`equipo`/`equipo_rates` se regeneran (no vienen de
-- un plugin) — re-anexarlas a mano en auth-schema.sql (ver CLAUDE.md).
--
-- Alcance: equipo + roles + equipo_rates (el núcleo que vive en Turso).
-- COURSE_PROGRESS, CLIENTS, PROJECTS, TASKS, etc. viven en Sheets por
-- diseño (modelo híbrido v3) y NO se crean aquí.

-- Catálogo de PUESTOS/trabajo (Developer, PM, Arquitecto...). OJO: es
-- distinto de `user.role` (rol de PERMISOS: admin/pm/dev/ventas).
-- ids slug-style legibles porque es un catálogo chico y estable.
create table "roles" (
  "id"   text not null primary key,
  "name" text not null unique
);
-- Semilla = los 12 puestos reales de la hoja Costos. `name` idéntico
-- al texto de esa hoja para que ROLE_COSTS (Sheets) mapee por nombre.
-- NO confundir con roles de relación de proyecto (PM/arquitecto/dev),
-- que se capturan vía PROJECTS.pm_id/arquitecto_id y PROJECT_DEVELOPERS.
insert into "roles" ("id", "name") values ('tech-manager', 'Tech Manager');
insert into "roles" ("id", "name") values ('product-manager', 'Product Manager');
insert into "roles" ("id", "name") values ('project-manager-officer', 'Project Manager Officer');
insert into "roles" ("id", "name") values ('arquitecto-tecnico', 'Arquitecto técnico');
insert into "roles" ("id", "name") values ('project-manager', 'Project Manager');
insert into "roles" ("id", "name") values ('product-owner', 'Product Owner');
insert into "roles" ("id", "name") values ('desarrollador-sr', 'Desarrollador Sr');
insert into "roles" ("id", "name") values ('desarrollador-semi-sr', 'Desarrollador Semi Sr');
insert into "roles" ("id", "name") values ('desarrollador-jr', 'Desarrollador Jr');
insert into "roles" ("id", "name") values ('qa', 'QA');
insert into "roles" ("id", "name") values ('ux-ui', 'UX/UI');
insert into "roles" ("id", "name") values ('consultoria-diseno', 'Consultoría/Diseño');

-- Registro canónico del equipo. Fuente de verdad de personas.
-- `active` = sigue en el equipo (tracking), NO = tiene acceso al dashboard.
create table "equipo" (
  "id"         text not null primary key,
  "full_name"  text not null,
  "nickname"   text,
  "role_id"    text references "roles" ("id") on delete set null,
  "department" text,
  "manager_id" text references "equipo" ("id") on delete set null,
  "email"      text,
  "active"     integer not null default 1
);
create index "equipo_email_idx" on "equipo" ("email");
create index "equipo_manager_id_idx" on "equipo" ("manager_id");
create index "equipo_role_id_idx" on "equipo" ("role_id");

-- Costo por persona con vigencia temporal. Confidencial (salarios) →
-- por eso vive en Turso, no en Sheets. valid_to vacío = vigente.
create table "equipo_rates" (
  "id"           text not null primary key,
  "equipo_id"    text not null references "equipo" ("id") on delete cascade,
  "hourly_cost"  real,
  "monthly_cost" real,
  "valid_from"   date not null,
  "valid_to"     date
);
create index "equipo_rates_equipo_id_idx" on "equipo_rates" ("equipo_id");

-- El PUENTE: una fila `user` (login) apunta a su persona en `equipo`.
-- Nullable: la mayoría del equipo no tiene acceso. Login = existe
-- fila `user` ligada a un `equipo` existente (no se recaptura).
alter table "user" add column "equipoId" text references "equipo" ("id") on delete set null;
create index "user_equipoId_idx" on "user" ("equipoId");
