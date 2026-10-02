create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null, "role" text, "banned" integer, "banReason" text, "banExpires" date, "equipoId" text);

create table "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade, "impersonatedBy" text);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");

create table "user_preferences" ("userId" text not null references "user" ("id") on delete cascade, "sectionKey" text not null, "value" text not null default '{}', "updatedAt" date not null, primary key ("userId", "sectionKey"));

create index "user_preferences_userId_idx" on "user_preferences" ("userId");

create table "user_permission_override" ("userId" text not null references "user" ("id") on delete cascade, "resource" text not null, "effect" text not null, "createdAt" date not null, primary key ("userId", "resource"));

create index "user_permission_override_userId_idx" on "user_permission_override" ("userId");

create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" integer not null);

create index "rateLimit_key_idx" on "rateLimit" ("key");

-- ---------------------------------------------------------------------------
-- Núcleo de identidad/costo en Turso (custom — re-anexar a mano si se regenera
-- con `npm run auth:generate`, igual que user_preferences/user_permission_override).
-- `user.equipoId` (arriba) es FK lógica -> equipo(id); la restricción real se
-- aplica vía ALTER en src/db/migrations/2026-equipo.sql para BD existente.
-- `roles` aquí = catálogo de PUESTOS (distinto de `user.role` = permisos).
-- ---------------------------------------------------------------------------
create table "roles" ("id" text not null primary key, "name" text not null unique);

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
insert into "roles" ("id", "name") values ('cio','CIO');
insert into "roles" ("id", "name") values ('desarrollador-mid','Desarrollador Mid');
insert into "roles" ("id", "name") values ('desarrollador-trainee','Desarrollador Trainee');
insert into "roles" ("id", "name") values ('ed-tech','Ed-Tech');
insert into "roles" ("id", "name") values ('service-manager','Service Manager');
insert into "roles" ("id", "name") values ('ceo','CEO');

-- `title` = título funcional real (Cursos.Rol, display). `role_id` = banda
-- de costo (los 12, NULL si RH aún no la asigna). Ejes ortogonales.
create table "equipo" ("id" text not null primary key, "full_name" text not null, "nickname" text, "role_id" text references "roles" ("id") on delete set null, "title" text, "department" text, "manager_id" text references "equipo" ("id") on delete set null, "email" text, "active" integer not null default 1);

create index "equipo_email_idx" on "equipo" ("email");

create index "equipo_manager_id_idx" on "equipo" ("manager_id");

create index "equipo_role_id_idx" on "equipo" ("role_id");

create table "equipo_rates" ("id" text not null primary key, "equipo_id" text not null references "equipo" ("id") on delete cascade, "hourly_cost" real, "monthly_cost" real, "valid_from" date not null, "valid_to" date);

create index "equipo_rates_equipo_id_idx" on "equipo_rates" ("equipo_id");

create index "user_equipoId_idx" on "user" ("equipoId");

-- Snapshots semanales (antes en la tab `Snapshots` del Sheet). Identifier de
-- curso es `equipo.id` cuando resuelve; fallback a fullName si no.
create table "snapshot" ("weekKey" text not null, "capturedAt" text not null, "kind" text not null check ("kind" in ('project','curso')), "identifier" text not null, "payload" text not null, primary key ("weekKey", "kind", "identifier"));

create index "snapshot_week_idx" on "snapshot" ("weekKey");

create index "snapshot_kind_ident_idx" on "snapshot" ("kind", "identifier");

-- Tokens MCP (custom, ver src/db/migrations/2026-mcp-tokens.sql). Separados de
-- `session` a propósito: vidas largas sin afectar la duración de sesiones de
-- browser y no aparecen en la lista de "Sesiones activas" del /cuenta. `id` =
-- sha256 hex del token; `tokenPrefix` = primeros 14 chars del plain (display).
create table "mcp_token" ("id" text not null primary key, "tokenPrefix" text not null, "userId" text not null references "user" ("id") on delete cascade, "name" text not null, "createdAt" integer not null, "lastUsedAt" integer, "expiresAt" integer not null);

create index "mcp_token_userId_idx" on "mcp_token" ("userId");

-- Evaluaciones trimestrales (auto-evaluación, NAV-78). 7 dimensiones enteras
-- 1-10; Calificación = promedio derivado (no se persiste). Una fila por
-- (equipo_id, periodo). Privacidad Modo A: cada quien ve sólo lo suyo, admin
-- ve todo. Enforcement en endpoints, no en BD.
create table "evaluacion" ("id" integer primary key autoincrement, "equipo_id" text not null references "equipo" ("id") on delete cascade, "periodo" text not null, "actitud" integer not null check ("actitud" between 1 and 10), "aptitudes" integer not null check ("aptitudes" between 1 and 10), "comunicacion" integer not null check ("comunicacion" between 1 and 10), "velocidad" integer not null check ("velocidad" between 1 and 10), "analisis" integer not null check ("analisis" between 1 and 10), "calidad" integer not null check ("calidad" between 1 and 10), "autogestion" integer not null check ("autogestion" between 1 and 10), "notas" text, "created_at" text not null, "updated_at" text not null, unique ("equipo_id", "periodo"));

create index "evaluacion_equipo_idx" on "evaluacion" ("equipo_id");

create index "evaluacion_periodo_idx" on "evaluacion" ("periodo");

-- Peticiones al servicio de IA Nexus (custom, ver
-- src/db/migrations/2026-nexus-requests.sql). Patrón asíncrono: POST inicia y
-- guarda la webhook URL firmada; GET de polling persiste respuesta + costo.
create table "nexus_request" ("ulid" text not null primary key, "template_id" text not null, "tenant_id" integer not null, "user_id" text references "user" ("id") on delete set null, "webhook_url" text not null, "status" text not null default 'pending' check ("status" in ('pending', 'completed', 'failed')), "cost" text, "model" text, "response_data" text, "created_at" text not null default (datetime('now')), "completed_at" text);

create index "nexus_request_status_idx" on "nexus_request" ("status");

-- Matriz de tecnologías (skills) del equipo (custom, ver
-- src/db/migrations/2026-tecnologias.sql). Catálogo curado `technology` +
-- junction `equipo_technology` (1 fila por persona × tecnología). Nivel =
-- slug de roleRango (trainee|jr|mid|sr|arq). Lectura role-open; escritura
-- gateada por `action:tecnologia:manage` (admin-only). Fase 2 = write UI.
create table "technology" ("id" text not null primary key, "name" text not null, "category" text not null, "active" integer not null default 1);

create table "equipo_technology" ("id" integer primary key autoincrement, "equipo_id" text not null references "equipo" ("id") on delete cascade, "technology_id" text not null references "technology" ("id") on delete cascade, "level" text not null check ("level" in ('trainee','jr','mid','sr','arq')), "updated_at" text not null, unique ("equipo_id", "technology_id"));

create index "equipo_technology_equipo_idx" on "equipo_technology" ("equipo_id");

create index "equipo_technology_technology_idx" on "equipo_technology" ("technology_id");
