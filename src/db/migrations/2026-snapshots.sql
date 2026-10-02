-- Migración: Snapshots semanales a Turso.
--
-- La tab "Snapshots" del Sheet queda como historial de auditoría; las
-- escrituras nuevas y lecturas las hace Turso. Identifier de curso ahora
-- canónico (equipo.id; fallback a fullName si no resuelve).
--
-- Aplicar con: turso db shell <db-name> < src/db/migrations/2026-snapshots.sql
-- Seed inicial (separado): src/db/seeds/snapshots-2026-05-18.sql

create table if not exists "snapshot" (
  "weekKey"    text not null,
  "capturedAt" text not null,
  "kind"       text not null check ("kind" in ('project','curso')),
  "identifier" text not null,
  "payload"    text not null,
  primary key ("weekKey", "kind", "identifier")
);

create index if not exists "snapshot_week_idx"       on "snapshot" ("weekKey");
create index if not exists "snapshot_kind_ident_idx" on "snapshot" ("kind", "identifier");
