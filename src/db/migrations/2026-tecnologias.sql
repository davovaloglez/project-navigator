-- Migración: matriz de tecnologías (skills) del equipo. Build plan 015 (spike 013).
-- Modelo: catálogo curado `technology` + junction `equipo_technology` (1 fila por
-- (equipo_id, technology_id)). Nivel = slug de roleRango (trainee|jr|mid|sr|arq).
-- Visibilidad de lectura: cualquier autenticado (como /api/equipo). Escritura:
-- por ahora directo en BD; gate futuro `action:tecnologia:manage` (admin-only).
-- Aplicar con: npm run apply-migration -- src/db/migrations/2026-tecnologias.sql

drop table if exists "equipo_technology";
drop table if exists "technology";

create table "technology" (
  "id"       text primary key,            -- slug, e.g. 'react', 'aws-lambda'
  "name"     text not null,               -- display, e.g. 'React 19'
  "category" text not null,               -- 'language'|'framework'|'database'|'devops'|'cloud'|'tool'|'mobile'|'design'
  "active"   integer not null default 1
);

create table "equipo_technology" (
  "id"            integer primary key autoincrement,
  "equipo_id"     text not null references "equipo" ("id") on delete cascade,
  "technology_id" text not null references "technology" ("id") on delete cascade,
  "level"         text not null check ("level" in ('trainee','jr','mid','sr','arq')),
  "updated_at"    text not null,
  unique ("equipo_id", "technology_id")
);
create index "equipo_technology_equipo_idx"     on "equipo_technology" ("equipo_id");
create index "equipo_technology_technology_idx" on "equipo_technology" ("technology_id");

-- Catálogo completo (curado). Editable luego directo en BD.
insert into "technology" ("id","name","category") values
  -- languages
  ('typescript','TypeScript','language'),
  ('javascript','JavaScript','language'),
  ('python','Python','language'),
  ('java','Java','language'),
  ('kotlin','Kotlin','language'),
  ('swift','Swift','language'),
  ('go','Go','language'),
  ('rust','Rust','language'),
  ('csharp','C#','language'),
  ('php','PHP','language'),
  ('sql','SQL','language'),
  -- frameworks / web
  ('react','React','framework'),
  ('astro','Astro','framework'),
  ('nextjs','Next.js','framework'),
  ('nodejs','Node.js','framework'),
  ('express','Express','framework'),
  ('nestjs','NestJS','framework'),
  ('laravel','Laravel','framework'),
  ('spring','Spring','framework'),
  ('dotnet','.NET','framework'),
  ('tailwind','Tailwind CSS','framework'),
  -- mobile
  ('react-native','React Native','mobile'),
  ('flutter','Flutter','mobile'),
  ('android','Android','mobile'),
  ('ios','iOS','mobile'),
  -- databases
  ('postgresql','PostgreSQL','database'),
  ('mysql','MySQL','database'),
  ('sqlite','SQLite','database'),
  ('mongodb','MongoDB','database'),
  ('redis','Redis','database'),
  ('turso','Turso / libSQL','database'),
  -- cloud / devops
  ('aws','AWS','cloud'),
  ('aws-lambda','AWS Lambda','cloud'),
  ('aws-amplify','AWS Amplify','cloud'),
  ('aws-s3','Amazon S3','cloud'),
  ('gcp','Google Cloud','cloud'),
  ('azure','Azure','cloud'),
  ('docker','Docker','devops'),
  ('kubernetes','Kubernetes','devops'),
  ('terraform','Terraform','devops'),
  ('github-actions','GitHub Actions','devops'),
  ('ci-cd','CI/CD','devops'),
  -- tools / design / data
  ('git','Git','tool'),
  ('figma','Figma','design'),
  ('rest-api','REST APIs','tool'),
  ('graphql','GraphQL','tool'),
  ('openai','OpenAI / LLM APIs','tool'),
  ('power-bi','Power BI','tool'),
  -- ofimatica
  ('google-drive','Google Drive','ofimatica'),
  ('google-sheets','Google Sheets','ofimatica'),
  ('google-docs','Google Docs','ofimatica'),
  ('google-sites','Google Sites','ofimatica'),
  ('google-apps-script','Google Apps Script','ofimatica'),
  ('ms-office','MS Office','ofimatica'),
  ('lucidchart','Lucidchart','ofimatica'),
  -- management
  ('ms-project','MS Project','management'),
  ('jira','Jira','management'),
  ('monday','Monday.com','management'),
  ('samva','Samva','management'),
  ('confluence','Confluence','management'),
  ('navigator','Navigator','management');
