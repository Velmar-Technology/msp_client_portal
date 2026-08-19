CREATE TABLE IF NOT EXISTS device_maintenances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES subscription_equipment(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_tech_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  title VARCHAR(255) NOT NULL,
  notes TEXT,
  maintenance_type VARCHAR(50) NOT NULL DEFAULT 'PREDEFINED_6M',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_maint_equip ON device_maintenances(equipment_id);
CREATE INDEX IF NOT EXISTS idx_device_maint_sub ON device_maintenances(subscription_id);
CREATE INDEX IF NOT EXISTS idx_device_maint_client ON device_maintenances(client_id);
CREATE INDEX IF NOT EXISTS idx_device_maint_tech ON device_maintenances(assigned_tech_id);
CREATE INDEX IF NOT EXISTS idx_device_maint_tenant ON device_maintenances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_maint_date ON device_maintenances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_device_maint_status ON device_maintenances(status);
