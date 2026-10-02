-- Migración: equipo.tag (nombre display "First Last" para cruces externos)
-- Aplicar UNA vez a una BD Turso existente, DESPUÉS de 2026-equipo.sql:
--   turso db shell <db-name> < src/db/migrations/2026-equipo-tag.sql
--
-- Para BD nueva NO usar esto: aplicar src/db/auth-schema.sql completo.
--
-- POR QUÉ: `equipo.full_name` es el nombre legal completo
-- ("Lorena Raquel Olvera Rodriguez"), pero las hojas externas
-- (e.g. `repositorios`) usan un display corto "First Last"
-- ("Lorena Olvera"). El cruce por substring contra full_name es
-- frágil; tener un `tag` curado garantiza el match.
--
-- Aditivo y reversible: la columna nace NULL. La app cae a un match
-- por tokens del full_name mientras tag esté vacío. Para poblar los
-- valores, aplicar a continuación:
--   turso db shell <db> < src/db/seeds/equipo-tag-2026-05-29.sql

alter table "equipo" add column "tag" text;
