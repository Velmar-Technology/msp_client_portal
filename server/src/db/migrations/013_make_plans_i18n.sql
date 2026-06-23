-- Migration 013: Convert plans.name and plans.description to JSONB for i18n
ALTER TABLE plans ALTER COLUMN name TYPE JSONB USING jsonb_build_object('en_US', name);
ALTER TABLE plans ALTER COLUMN description TYPE JSONB USING CASE WHEN description IS NULL THEN NULL ELSE jsonb_build_object('en_US', description) END;
