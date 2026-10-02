-- Migración: equipo.title (Paso A del rediseño — dos ejes de "puesto")
-- Aplicar UNA vez a una BD Turso existente, DESPUÉS de 2026-equipo.sql:
--   turso db shell <db-name> < src/db/migrations/2026-equipo-title.sql
--
-- Para BD nueva NO usar esto: aplicar src/db/auth-schema.sql completo.
--
-- POR QUÉ: el título funcional de Cursos (Full-Stack Developer, Mobile
-- Engineer, Tech Lead...) NO es la banda de costo (los 12 de la hoja
-- Costos). Son ejes ortogonales:
--   equipo.role_id -> ROLES = banda de costo (drives role_rates). NULL
--                     si la banda aún no la asignó RH (honesto, no fake).
--   equipo.title   = título funcional real (display/directorio). Texto
--                     libre tomado de Cursos.Rol; NO referencia ROLES.
--
-- Aditivo y reversible: la columna nace NULL, nada se rompe.

alter table "equipo" add column "title" text;
