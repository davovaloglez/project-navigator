-- =============================================================================
-- Migración: Agregar columnas faltantes a tabla proyecto
--
-- Bug: Los campos producto, servicio, aliado y sprint se guardaban en
-- Google Sheets pero no existían en la tabla proyecto de Turso. Se perdían
-- silenciosamente al crear o editar desde el modal.
-- =============================================================================

ALTER TABLE proyecto ADD COLUMN producto TEXT;
ALTER TABLE proyecto ADD COLUMN servicio TEXT;
ALTER TABLE proyecto ADD COLUMN aliado TEXT DEFAULT 'Ninguno';
ALTER TABLE proyecto ADD COLUMN sprint TEXT;

