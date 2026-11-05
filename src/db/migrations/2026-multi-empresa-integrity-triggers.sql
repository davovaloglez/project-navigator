-- =============================================================================
-- Migracion: Triggers de Integridad Referencial y Aislamiento Multi-Empresa
-- 
-- Garantiza a nivel de motor de BBDD (Turso/SQLite) que:
--  1. El cliente asignado a un proyecto pertenezca a la misma empresa del proyecto.
--  2. Cualquier miembro/responsable asignado a un proyecto (proyecto_miembro)
--     pertenezca a la misma empresa del proyecto.
--  3. Cualquier colaborador asignado a una tarea (tarea.asignado_miembro_id)
--     pertenezca a la misma empresa del proyecto de dicha tarea.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Regla: proyecto.cliente_id debe pertenecer a proyecto.empresa_id
-- -----------------------------------------------------------------------------

create trigger if not exists "trg_proyecto_cliente_empresa_insert"
before insert on "proyecto"
for each row
when NEW."cliente_id" is not null
begin
  select raise(abort, 'Error de Integridad: El cliente no pertenece a la misma empresa del proyecto.')
  where not exists (
    select 1 from "cliente"
    where "id" = NEW."cliente_id" and "empresa_id" = NEW."empresa_id"
  );
end;

create trigger if not exists "trg_proyecto_cliente_empresa_update"
before update on "proyecto"
for each row
when NEW."cliente_id" is not null and (NEW."cliente_id" != ifnull(OLD."cliente_id", '') or NEW."empresa_id" != OLD."empresa_id")
begin
  select raise(abort, 'Error de Integridad: El cliente no pertenece a la misma empresa del proyecto.')
  where not exists (
    select 1 from "cliente"
    where "id" = NEW."cliente_id" and "empresa_id" = NEW."empresa_id"
  );
end;

-- -----------------------------------------------------------------------------
-- 2. Regla: proyecto_miembro.miembro_id debe pertenecer a proyecto.empresa_id
-- -----------------------------------------------------------------------------

create trigger if not exists "trg_proyecto_miembro_empresa_insert"
before insert on "proyecto_miembro"
for each row
begin
  select raise(abort, 'Error de Integridad: El miembro no pertenece a la misma empresa que posee el proyecto.')
  where not exists (
    select 1 from "proyecto" p
    join "empresa_miembro" m on m."id" = NEW."miembro_id"
    where p."id" = NEW."proyecto_id" and p."empresa_id" = m."empresa_id"
  );
end;

create trigger if not exists "trg_proyecto_miembro_empresa_update"
before update on "proyecto_miembro"
for each row
when NEW."miembro_id" != OLD."miembro_id" or NEW."proyecto_id" != OLD."proyecto_id"
begin
  select raise(abort, 'Error de Integridad: El miembro no pertenece a la misma empresa que posee el proyecto.')
  where not exists (
    select 1 from "proyecto" p
    join "empresa_miembro" m on m."id" = NEW."miembro_id"
    where p."id" = NEW."proyecto_id" and p."empresa_id" = m."empresa_id"
  );
end;

-- -----------------------------------------------------------------------------
-- 3. Regla: tarea.asignado_miembro_id debe pertenecer a la empresa del proyecto
-- -----------------------------------------------------------------------------

create trigger if not exists "trg_tarea_asignado_empresa_insert"
before insert on "tarea"
for each row
when NEW."asignado_miembro_id" is not null
begin
  select raise(abort, 'Error de Integridad: El miembro asignado a la tarea no pertenece a la empresa del proyecto.')
  where not exists (
    select 1 from "proyecto" p
    join "empresa_miembro" m on m."id" = NEW."asignado_miembro_id"
    where p."id" = NEW."proyecto_id" and p."empresa_id" = m."empresa_id"
  );
end;

create trigger if not exists "trg_tarea_asignado_empresa_update"
before update on "tarea"
for each row
when NEW."asignado_miembro_id" is not null and (
  NEW."asignado_miembro_id" != ifnull(OLD."asignado_miembro_id", '') or NEW."proyecto_id" != OLD."proyecto_id"
)
begin
  select raise(abort, 'Error de Integridad: El miembro asignado a la tarea no pertenece a la empresa del proyecto.')
  where not exists (
    select 1 from "proyecto" p
    join "empresa_miembro" m on m."id" = NEW."asignado_miembro_id"
    where p."id" = NEW."proyecto_id" and p."empresa_id" = m."empresa_id"
  );
end;

