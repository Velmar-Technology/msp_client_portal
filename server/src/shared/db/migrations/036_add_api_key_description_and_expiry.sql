-- Migration: 036_add_api_key_description_and_expiry.sql
-- Description: Add description and expiry policy columns to api_keys.
--              Migration 035 (released with v1.8.3) created api_keys without
--              these columns; this ALTER keeps already-applied databases in
--              sync with the code that persists key descriptions and durations.

ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS description VARCHAR(255);

ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS expires_in VARCHAR(10) NOT NULL DEFAULT '30d'; -- '30d' or 'forever'