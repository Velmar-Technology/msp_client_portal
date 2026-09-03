-- Migration 038: Add custom plan columns for CRM bespoke plans
ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS per_device_price INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ticket_quota INTEGER,
    ADD COLUMN IF NOT EXISTS sla_tier JSONB,
    ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_plans_tenant ON plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plans_lead ON plans(lead_id);
CREATE INDEX IF NOT EXISTS idx_plans_target_client ON plans(target_client_id);
CREATE INDEX IF NOT EXISTS idx_plans_is_custom ON plans(is_custom);
