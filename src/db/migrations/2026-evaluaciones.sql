-- Migración: evaluaciones trimestrales (auto-evaluación) de miembros del equipo.
-- HU NAV-78.
--
-- Modelo: una fila por (equipo_id, periodo). Periodo = "YYYY-Qn" (e.g. 2026-Q2).
-- 7 dimensiones enteras 1-10. La "Calificación" total es derivada (promedio
-- de las 7) y NO se persiste — se calcula en el cliente.
--
-- Privacidad (Modo A, NAV-78): cada usuario ve sólo sus filas (`equipo_id` =
-- su `user.equipoId`); admin ve todas. Enforcement vive en los endpoints
-- (`/api/me/evaluaciones`, `/api/evaluaciones`), no en la BD.
--
-- Cadencia: editable hasta el cierre del Q; tras eso queda inmutable. Esa
-- regla se aplica a nivel API (no SQL) para que admin pueda corregir.
--
-- Aplicar con: turso db shell <db-name> < src/db/migrations/2026-evaluaciones.sql

drop table if exists "evaluacion";

create table "evaluacion" (
  "id"           integer primary key autoincrement,
  "equipo_id"    text    not null references "equipo" ("id") on delete cascade,
  "periodo"      text    not null,                                       -- YYYY-Qn
  "actitud"      integer not null check ("actitud"      between 1 and 10),
  "aptitudes"    integer not null check ("aptitudes"    between 1 and 10),
  "comunicacion" integer not null check ("comunicacion" between 1 and 10),
  "velocidad"    integer not null check ("velocidad"    between 1 and 10),
  "analisis"     integer not null check ("analisis"     between 1 and 10),
  "calidad"      integer not null check ("calidad"      between 1 and 10),
  "autogestion"  integer not null check ("autogestion"  between 1 and 10),
  "notas"        text,
  "created_at"   text    not null,
  "updated_at"   text    not null,
  unique ("equipo_id", "periodo")
);

create index "evaluacion_equipo_idx"  on "evaluacion" ("equipo_id");
create index "evaluacion_periodo_idx" on "evaluacion" ("periodo");
