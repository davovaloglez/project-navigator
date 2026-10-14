-- =============================================================================
-- Migracion: Modelo Relacional Multi-Empresa para Turso
--
-- Incorpora:
--  1. Organizacion multi-empresa (vortex-it, bit-technologies)
--  2. Departamentos y Equipos de trabajo (squads)
--  3. Identidad ligada: user (Better-Auth) -> empresa_miembro (por empresa)
--  4. Puestos y tarifas por empresa (puesto_rol, puesto_tarifa, miembro_tarifa, modelo_financiero)
--  5. Clientes, Proyectos, Sprints y Tareas (App y Core)
--  6. Colaboracion cross-empresa: proyecto_equipo (squads de cualquier empresa en un proyecto)
--     y proyecto_miembro (asignacion individual con roles: pm, arquitecto, dev, qa, etc.)
--  7. Dependencias entre proyectos (proyecto_dependencia)
--  8. Repositorios de proyectos (proyecto_repositorio) y progreso de cursos (curso_progreso)
-- =============================================================================

-- 1. Empresas
create table if not exists "empresa" (
  "id" text not null primary key,
  "nombre" text not null,
  "logo_url" text,
  "moneda" text not null default 'MXN',
  "activa" integer not null default 1,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

insert or ignore into "empresa" ("id", "nombre", "moneda", "activa") values
  ('vortex-it', 'Vortex IT', 'MXN', 1),
  ('bit-technologies', 'Bit Technologies', 'MXN', 1);

-- 2. Departamentos
create table if not exists "departamento" (
  "id" text not null primary key,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "nombre" text not null,
  "descripcion" text,
  "lider_id" text,
  "activo" integer not null default 1,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index if not exists "departamento_empresa_idx" on "departamento" ("empresa_id");

-- 3. Equipos de trabajo (Squads)
create table if not exists "equipo_trabajo" (
  "id" text not null primary key,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "departamento_id" text references "departamento" ("id") on delete set null,
  "nombre" text not null,
  "descripcion" text,
  "lead_id" text,
  "activo" integer not null default 1,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index if not exists "equipo_trabajo_empresa_idx" on "equipo_trabajo" ("empresa_id");
create index if not exists "equipo_trabajo_departamento_idx" on "equipo_trabajo" ("departamento_id");

-- 4. Puestos por empresa
create table if not exists "puesto_rol" (
  "id" text not null,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "nombre" text not null,
  primary key ("empresa_id", "id")
);

create index if not exists "puesto_rol_empresa_idx" on "puesto_rol" ("empresa_id");

-- Sembrar puestos en vortex-it y bit-technologies desde la tabla roles si existe
insert or ignore into "puesto_rol" ("id", "empresa_id", "nombre")
select r."id", 'vortex-it', r."name" from "roles" r;

insert or ignore into "puesto_rol" ("id", "empresa_id", "nombre")
select r."id", 'bit-technologies', r."name" from "roles" r;

-- 5. Miembros de Empresa (Colaboradores)
create table if not exists "empresa_miembro" (
  "id" text not null primary key,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "user_id" text references "user" ("id") on delete set null,
  "full_name" text not null,
  "nickname" text,
  "email_corporativo" text,
  "puesto_id" text,
  "titulo_funcional" text,
  "departamento_id" text references "departamento" ("id") on delete set null,
  "manager_id" text references "empresa_miembro" ("id") on delete set null,
  "rol_permiso" text not null default 'dev',
  "activo" integer not null default 1,
  "fecha_ingreso" text,
  "fecha_salida" text,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index if not exists "empresa_miembro_empresa_idx" on "empresa_miembro" ("empresa_id");
create index if not exists "empresa_miembro_user_idx" on "empresa_miembro" ("user_id");
create index if not exists "empresa_miembro_puesto_idx" on "empresa_miembro" ("puesto_id");
create index if not exists "empresa_miembro_manager_idx" on "empresa_miembro" ("manager_id");
create index if not exists "empresa_miembro_email_idx" on "empresa_miembro" ("email_corporativo");

-- Migrar miembros existentes de la tabla equipo hacia vortex-it
insert or ignore into "empresa_miembro" (
  "id", "empresa_id", "user_id", "full_name", "nickname", "email_corporativo",
  "puesto_id", "titulo_funcional", "manager_id", "activo"
)
select
  e."id",
  'vortex-it',
  u."id",
  e."full_name",
  e."nickname",
  e."email",
  e."role_id",
  e."title",
  e."manager_id",
  e."active"
from "equipo" e
left join "user" u on u."equipoId" = e."id";

-- 6. Pertenencia de Miembro a Equipos de Trabajo (N:M)
create table if not exists "equipo_miembro" (
  "id" text not null primary key,
  "equipo_id" text not null references "equipo_trabajo" ("id") on delete cascade,
  "miembro_id" text not null references "empresa_miembro" ("id") on delete cascade,
  "rol_en_equipo" text not null default 'member',
  "fecha_incorporacion" text,
  unique ("equipo_id", "miembro_id")
);

create index if not exists "equipo_miembro_equipo_idx" on "equipo_miembro" ("equipo_id");
create index if not exists "equipo_miembro_miembro_idx" on "equipo_miembro" ("miembro_id");

-- 7. Tarifas estandar por puesto
create table if not exists "puesto_tarifa" (
  "id" text not null primary key,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "puesto_id" text not null,
  "costo_hora" real not null default 0,
  "costo_mensual" real not null default 0,
  "valid_from" text not null,
  "valid_to" text,
  foreign key ("empresa_id", "puesto_id") references "puesto_rol" ("empresa_id", "id") on delete cascade
);

create index if not exists "puesto_tarifa_puesto_idx" on "puesto_tarifa" ("empresa_id", "puesto_id");

-- 8. Tarifas reales por miembro
create table if not exists "miembro_tarifa" (
  "id" text not null primary key,
  "miembro_id" text not null references "empresa_miembro" ("id") on delete cascade,
  "costo_hora" real,
  "costo_mensual" real,
  "valid_from" text not null,
  "valid_to" text
);

create index if not exists "miembro_tarifa_miembro_idx" on "miembro_tarifa" ("miembro_id");

-- Migrar tarifas existentes de equipo_rates hacia miembro_tarifa
insert or ignore into "miembro_tarifa" ("id", "miembro_id", "costo_hora", "costo_mensual", "valid_from", "valid_to")
select er."id", er."equipo_id", er."hourly_cost", er."monthly_cost", er."valid_from", er."valid_to"
from "equipo_rates" er;

-- 9. Modelo financiero por empresa
create table if not exists "modelo_financiero" (
  "empresa_id" text not null primary key references "empresa" ("id") on delete cascade,
  "costo_operativo" real not null default 0,
  "valor_experiencia_rate" real not null default 0,
  "costo_admin_rate" real not null default 0,
  "margen_rate" real not null default 0,
  "iva_rate" real not null default 0.16,
  "updated_at" text not null default (datetime('now'))
);

insert or ignore into "modelo_financiero" ("empresa_id", "costo_operativo", "valor_experiencia_rate", "costo_admin_rate", "margen_rate", "iva_rate") values
  ('vortex-it', 0, 0, 0, 0, 0.16),
  ('bit-technologies', 0, 0, 0, 0, 0.16);

-- 10. Clientes
create table if not exists "cliente" (
  "id" text not null primary key,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "nombre" text not null,
  "cuenta" text,
  "contacto_email" text,
  "activo" integer not null default 1,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index if not exists "cliente_empresa_idx" on "cliente" ("empresa_id");
create index if not exists "cliente_nombre_idx" on "cliente" ("nombre");

-- 11. Proyectos
create table if not exists "proyecto" (
  "id" text not null primary key,
  "folio" text not null unique,
  "empresa_id" text not null references "empresa" ("id") on delete cascade,
  "cliente_id" text references "cliente" ("id") on delete set null,
  "numero" text,
  "actividad" text not null,
  "salud" text not null default 'saludable',
  "accion_requerida" text,
  "fecha_accion" text,
  "progreso" real not null default 0,
  "tipo" text,
  "prioridad" text,
  "epica" text,
  "hito" text,
  "cuenta" text,
  "puntos" integer not null default 0,
  "estatus" text not null default 'Activo',
  "fecha_registro" text,
  "fecha_inicio" text,
  "fin_estimado" text,
  "fin_real" text,
  "url" text,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index if not exists "proyecto_folio_idx" on "proyecto" ("folio");
create index if not exists "proyecto_empresa_idx" on "proyecto" ("empresa_id");
create index if not exists "proyecto_cliente_idx" on "proyecto" ("cliente_id");
create index if not exists "proyecto_estatus_idx" on "proyecto" ("estatus");

-- 12. Colaboracion de Equipos en Proyectos (Cross-Empresa)
create table if not exists "proyecto_equipo" (
  "id" text not null primary key,
  "proyecto_id" text not null references "proyecto" ("id") on delete cascade,
  "equipo_id" text not null references "equipo_trabajo" ("id") on delete cascade,
  "dedicacion_pct" real not null default 100,
  "fecha_inicio" text,
  "fecha_fin" text,
  unique ("proyecto_id", "equipo_id")
);

create index if not exists "proyecto_equipo_proyecto_idx" on "proyecto_equipo" ("proyecto_id");
create index if not exists "proyecto_equipo_equipo_idx" on "proyecto_equipo" ("equipo_id");

-- 13. Miembros asignados al Proyecto (PM, Arquitecto, Developers, etc.)
create table if not exists "proyecto_miembro" (
  "id" text not null primary key,
  "proyecto_id" text not null references "proyecto" ("id") on delete cascade,
  "miembro_id" text not null references "empresa_miembro" ("id") on delete cascade,
  "rol_proyecto" text not null,
  "dedicacion_pct" real default 100,
  "activo" integer not null default 1,
  unique ("proyecto_id", "miembro_id", "rol_proyecto")
);

create index if not exists "proyecto_miembro_proyecto_idx" on "proyecto_miembro" ("proyecto_id");
create index if not exists "proyecto_miembro_miembro_idx" on "proyecto_miembro" ("miembro_id");

-- 14. Dependencias entre Proyectos
create table if not exists "proyecto_dependencia" (
  "id" text not null primary key,
  "proyecto_id" text not null references "proyecto" ("id") on delete cascade,
  "depends_on_proyecto_id" text not null references "proyecto" ("id") on delete cascade,
  "tipo_bloqueo" text not null default 'bloqueante',
  unique ("proyecto_id", "depends_on_proyecto_id")
);

create index if not exists "proyecto_dep_proyecto_idx" on "proyecto_dependencia" ("proyecto_id");
create index if not exists "proyecto_dep_depends_idx" on "proyecto_dependencia" ("depends_on_proyecto_id");

-- 15. Sprints
create table if not exists "sprint" (
  "id" text not null primary key,
  "proyecto_id" text references "proyecto" ("id") on delete set null,
  "nombre" text not null,
  "anio" integer,
  "quarter" integer,
  "mes" integer,
  "fecha_inicio" text,
  "fecha_fin" text,
  "estatus" text not null default 'planeado',
  "created_at" text not null default (datetime('now'))
);

create index if not exists "sprint_proyecto_idx" on "sprint" ("proyecto_id");
create index if not exists "sprint_fechas_idx" on "sprint" ("fecha_inicio", "fecha_fin");

-- 16. Tareas (App y Core unificados)
create table if not exists "tarea" (
  "id" text not null primary key,
  "proyecto_id" text not null references "proyecto" ("id") on delete cascade,
  "sprint_id" text references "sprint" ("id") on delete set null,
  "producto" text not null check ("producto" in ('App', 'Core')),
  "orden" integer not null default 0,
  "funcionalidad" text,
  "nombre" text not null,
  "descripcion" text,
  "tipo" text,
  "asignado_miembro_id" text references "empresa_miembro" ("id") on delete set null,
  "estatus" text not null default 'Por hacer',
  "fecha_inicio" text,
  "fecha_fin" text,
  "tiempo_et" real default 0,
  "estimacion" real default 0,
  "puntos" real default 0,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index if not exists "tarea_proyecto_idx" on "tarea" ("proyecto_id");
create index if not exists "tarea_sprint_idx" on "tarea" ("sprint_id");
create index if not exists "tarea_asignado_idx" on "tarea" ("asignado_miembro_id");
create index if not exists "tarea_producto_idx" on "tarea" ("producto");
create index if not exists "tarea_estatus_idx" on "tarea" ("estatus");

-- 17. Progreso de Cursos
create table if not exists "curso_progreso" (
  "id" text not null primary key,
  "miembro_id" text not null references "empresa_miembro" ("id") on delete cascade,
  "curso_nombre" text not null,
  "pids_creados" integer not null default 0,
  "progreso" real not null default 0,
  "fecha_actualizacion" text not null default (datetime('now')),
  unique ("miembro_id", "curso_nombre")
);

create index if not exists "curso_progreso_miembro_idx" on "curso_progreso" ("miembro_id");

-- 18. Repositorios de Proyecto
create table if not exists "proyecto_repositorio" (
  "id" text not null primary key,
  "proyecto_id" text not null references "proyecto" ("id") on delete cascade,
  "url" text not null,
  "nombre" text,
  "tecnologia_principal" text,
  "created_at" text not null default (datetime('now')),
  unique ("proyecto_id", "url")
);

create index if not exists "proyecto_repositorio_proyecto_idx" on "proyecto_repositorio" ("proyecto_id");
