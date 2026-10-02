-- Migración: tokens largos para el servidor MCP.
--
-- Decisión: tabla custom separada de `session` (Better-Auth) para que los
-- tokens MCP NO contaminen la lista de sesiones del usuario en /cuenta y
-- puedan tener vidas largas sin alterar la duración de las sesiones de
-- browser. El middleware corta el bearer `pn_mcp_*` antes de llamar a
-- Better-Auth, así no requiere instalar el plugin `bearer`.
--
-- Seguridad: `id` guarda el sha256 del token en plano. El token sólo se ve
-- UNA vez en la respuesta del POST. `tokenPrefix` (primeros 14 chars del
-- plaintext) permite que el usuario identifique sus tokens en la UI sin
-- exponer el secreto completo.
--
-- Aplicar con: turso db shell <db-name> < src/db/migrations/2026-mcp-tokens.sql

drop table if exists "mcp_token";

create table "mcp_token" (
  "id"          text not null primary key,             -- sha256 hex del token plain
  "tokenPrefix" text not null,                          -- `pn_mcp_xxxxxxx` (14 chars, display)
  "userId"      text not null references "user" ("id") on delete cascade,
  "name"        text not null,                          -- label visible al usuario
  "createdAt"   integer not null,                       -- unix ms
  "lastUsedAt"  integer,                                -- unix ms (touched en cada uso)
  "expiresAt"   integer not null                        -- unix ms (obligatorio, max 1 año)
);

create index "mcp_token_userId_idx" on "mcp_token" ("userId");
