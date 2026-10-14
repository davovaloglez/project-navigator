-- =============================================================================
-- Migracion: Tablas normalizadas para Repositorios y Colaboradores por Rol
-- =============================================================================

create table if not exists "repositorio" (
  "id" text not null primary key,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "proyecto_id" text references "proyecto" ("id") on delete set null,
  "nombre" text not null,
  "url" text not null,
  "ambientes" text default 'Prod',
  "estatus" text not null default 'Activo',
  "dpto" text,
  "producto" text,
  "tecnologia_principal" text,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index if not exists "repositorio_empresa_idx" on "repositorio" ("empresa_id");
create index if not exists "repositorio_proyecto_idx" on "repositorio" ("proyecto_id");

create table if not exists "repositorio_colaborador" (
  "id" text not null primary key,
  "repositorio_id" text not null references "repositorio" ("id") on delete cascade,
  "miembro_id" text not null references "empresa_miembro" ("id") on delete cascade,
  "rol_acceso" text not null check ("rol_acceso" in ('administrador', 'arquitecto', 'colaborador', 'visualizador', 'deploy')),
  "created_at" text not null default (datetime('now')),
  unique ("repositorio_id", "miembro_id", "rol_acceso")
);

create index if not exists "repo_colab_repo_idx" on "repositorio_colaborador" ("repositorio_id");
create index if not exists "repo_colab_miembro_idx" on "repositorio_colaborador" ("miembro_id");
create index if not exists "repo_colab_rol_idx" on "repositorio_colaborador" ("rol_acceso");
