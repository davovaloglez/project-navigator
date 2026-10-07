-- Peticiones al servicio de IA Nexus (ai.vortex-it.com), NAV-85. Patrón asíncrono:
-- el POST inicia la generación y guarda la webhook URL firmada; el GET de
-- polling consulta el webhook hasta que hay respuesta y la persiste aquí
-- (cache permanente + trazabilidad de costo/modelo por petición).
create table if not exists "nexus_request" (
  "ulid" text not null primary key,
  "template_id" text not null,
  "tenant_id" integer not null,
  "user_id" text references "user" ("id") on delete set null,
  "webhook_url" text not null,
  "status" text not null default 'pending' check ("status" in ('pending', 'completed', 'failed')),
  "cost" text,
  "model" text,
  "response_data" text,
  "created_at" text not null default (datetime('now')),
  "completed_at" text
);

create index if not exists "nexus_request_status_idx" on "nexus_request" ("status");
