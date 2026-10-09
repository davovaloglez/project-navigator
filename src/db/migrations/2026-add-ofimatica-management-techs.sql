-- Migración: Agregar nuevas tecnologías en categorías Ofimática y Management.
-- Si la tecnología 'google-sheets' existía bajo 'tool', se actualiza a 'ofimatica' y 'Google Sheets'.

-- Ofimática
INSERT INTO "technology" ("id", "name", "category") VALUES
  ('google-drive', 'Google Drive', 'ofimatica'),
  ('google-docs', 'Google Docs', 'ofimatica'),
  ('google-sites', 'Google Sites', 'ofimatica'),
  ('google-apps-script', 'Google Apps Script', 'ofimatica'),
  ('ms-office', 'MS Office', 'ofimatica'),
  ('lucidchart', 'Lucidchart', 'ofimatica')
ON CONFLICT ("id") DO UPDATE SET "name" = excluded."name", "category" = excluded."category";

INSERT INTO "technology" ("id", "name", "category") VALUES
  ('google-sheets', 'Google Sheets', 'ofimatica')
ON CONFLICT ("id") DO UPDATE SET "name" = excluded."name", "category" = excluded."category";

-- Management
INSERT INTO "technology" ("id", "name", "category") VALUES
  ('ms-project', 'MS Project', 'management'),
  ('jira', 'Jira', 'management'),
  ('monday', 'Monday.com', 'management'),
  ('samva', 'Samva', 'management'),
  ('confluence', 'Confluence', 'management'),
  ('navigator', 'Navigator', 'management')
ON CONFLICT ("id") DO UPDATE SET "name" = excluded."name", "category" = excluded."category";
