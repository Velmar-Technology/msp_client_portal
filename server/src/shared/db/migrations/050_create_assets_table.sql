-- Migration 050: Create assets table with multi-tenant RLS and RBAC permissions

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL DEFAULT 'HARDWARE',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    model VARCHAR(255),
    serial_number VARCHAR(255),
    manufacturer VARCHAR(255),
    assigned_client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_equipment_id UUID REFERENCES subscription_equipment(id) ON DELETE SET NULL,
    purchase_date TIMESTAMPTZ,
    warranty_expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(assigned_client_id);
CREATE INDEX IF NOT EXISTS idx_assets_equipment ON assets(assigned_equipment_id);

-- Enable fail-closed Row-Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON assets;
CREATE POLICY tenant_isolation_policy ON assets FOR ALL USING (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

-- Seed Asset Capabilities into Dynamic Permissions
INSERT INTO permissions (code, module, description) VALUES
    ('assets:read', 'assets', 'View IT asset inventory and hardware mappings'),
    ('assets:manage', 'assets', 'Create, update, and decommission IT assets')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions to ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000001', p.id
FROM permissions p
WHERE p.code IN ('assets:read', 'assets:manage')
ON CONFLICT DO NOTHING;

-- Grant permissions to TECHNICIAN
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000002', p.id
FROM permissions p
WHERE p.code IN ('assets:read', 'assets:manage')
ON CONFLICT DO NOTHING;

-- Grant read permission to CLIENT
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000003', p.id
FROM permissions p
WHERE p.code = 'assets:read'
ON CONFLICT DO NOTHING;
