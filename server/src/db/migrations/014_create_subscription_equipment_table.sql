CREATE TABLE IF NOT EXISTS subscription_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  slot_index INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_ACTIVATION',
  device_name VARCHAR(255),
  device_serial VARCHAR(255),
  otp VARCHAR(10),
  otp_expires_at TIMESTAMPTZ,
  nextcloud_username VARCHAR(255),
  nextcloud_password VARCHAR(255),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subscription_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_sub_equip_sub ON subscription_equipment(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_equip_tenant ON subscription_equipment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sub_equip_otp ON subscription_equipment(otp);
