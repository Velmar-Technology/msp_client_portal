-- Migration 040: Add Vaultwarden device-bound vault columns to subscription_equipment

ALTER TABLE subscription_equipment
  ADD COLUMN IF NOT EXISTS vaultwarden_org_id UUID,
  ADD COLUMN IF NOT EXISTS vaultwarden_collection_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vaultwarden_device_user_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vaultwarden_status VARCHAR(50) DEFAULT 'UNPROVISIONED' NOT NULL,
  ADD COLUMN IF NOT EXISTS vaultwarden_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sub_equip_vaultwarden_status ON subscription_equipment(vaultwarden_status);
