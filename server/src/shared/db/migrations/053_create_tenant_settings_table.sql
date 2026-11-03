-- Migration 053: Create tenant_settings key-value configuration table (ADR-019 / Odoo-style ir.config_parameter)

CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    module VARCHAR(100) NOT NULL DEFAULT 'core',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compound unique index preventing duplicate keys per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_unique_key ON tenant_settings(tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_module ON tenant_settings(module);

-- Enable fail-closed Row-Level Security (BL-302)
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_settings;
CREATE POLICY tenant_isolation_policy ON tenant_settings FOR ALL USING (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

-- Seed Settings capabilities into Dynamic Permissions
INSERT INTO permissions (code, module, description) VALUES
    ('settings:read', 'base.settings', 'View tenant configuration and personal preferences'),
    ('settings:manage', 'base.settings', 'Update workspace settings and system parameters')
ON CONFLICT (code) DO NOTHING;

-- Grant settings:manage to ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000001', p.id
FROM permissions p
WHERE p.code = 'settings:manage'
ON CONFLICT DO NOTHING;

-- Grant settings:read to ADMIN, TECHNICIAN, CLIENT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM permissions p
CROSS JOIN roles r
WHERE p.code = 'settings:read'
  AND r.name IN ('ADMIN', 'TECHNICIAN', 'CLIENT')
ON CONFLICT DO NOTHING;
