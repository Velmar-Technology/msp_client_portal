-- Migration 041: Add Vaultwarden grace extension columns to tenants for BL-702

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS vault_grace_extension_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vault_grace_extensions_count INTEGER DEFAULT 0 NOT NULL;
