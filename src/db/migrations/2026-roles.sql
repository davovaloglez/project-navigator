-- Migración: Sistema de Roles y Permisos (Fase 1 + estructura Fase 4)
-- Aplicar UNA vez a una BD Turso existente (que ya tiene las tablas de Better-Auth):
--   turso db shell <db-name> < src/db/migrations/2026-roles.sql
--
-- Para BD nueva NO usar esto: aplicar src/db/auth-schema.sql completo.
-- NOTA: si re-corres `npm run auth:generate`, las columnas admin-plugin del
-- `user`/`session` se regeneran solas (el plugin ya está en src/lib/auth.ts),
-- pero las tablas `user_preferences` y `user_permission_override` hay que
-- re-anexarlas a mano (ver CLAUDE.md).

-- Columnas del admin plugin de Better-Auth (rol + ban + impersonation).
alter table "user" add column "role" text;
alter table "user" add column "banned" integer;
alter table "user" add column "banReason" text;
alter table "user" add column "banExpires" date;
alter table "session" add column "impersonatedBy" text;

-- Overrides de permiso por usuario (consumido en Fase 4).
create table "user_permission_override" (
  "userId"    text not null references "user" ("id") on delete cascade,
  "resource"  text not null,
  "effect"    text not null,
  "createdAt" date not null,
  primary key ("userId", "resource")
);
create index "user_permission_override_userId_idx" on "user_permission_override" ("userId");

-- Usuarios existentes sin rol → menor privilegio (resolver ya trata NULL como
-- DEFAULT_ROLE='dev', este UPDATE lo hace explícito y opcional).
update "user" set "role" = 'dev' where "role" is null;
