-- Migration 051: Create consumables and consumable_checkouts tables with multi-tenant RLS

CREATE TABLE IF NOT EXISTS consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    model_number VARCHAR(100),
    item_number VARCHAR(100),
    manufacturer VARCHAR(100),
    total_quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 5,
    location VARCHAR(255),
    purchase_cost DECIMAL(10, 2),
    alert_state VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consumables_tenant ON consumables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consumables_category ON consumables(category);
CREATE INDEX IF NOT EXISTS idx_consumables_alert ON consumables(alert_state);

CREATE TABLE IF NOT EXISTS consumable_checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    consumable_id UUID NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_equipment_id UUID REFERENCES subscription_equipment(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    dispensed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumable_checkouts_tenant ON consumable_checkouts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consumable_checkouts_item ON consumable_checkouts(consumable_id);
CREATE INDEX IF NOT EXISTS idx_consumable_checkouts_user ON consumable_checkouts(assigned_user_id);

-- Enable fail-closed Row-Level Security
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON consumables;
CREATE POLICY tenant_isolation_policy ON consumables FOR ALL USING (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

ALTER TABLE consumable_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumable_checkouts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON consumable_checkouts;
CREATE POLICY tenant_isolation_policy ON consumable_checkouts FOR ALL USING (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
