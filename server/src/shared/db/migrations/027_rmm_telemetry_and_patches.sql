-- Migration 027: Create rmm_patches and rmm_device_telemetry tables

CREATE TABLE IF NOT EXISTS rmm_patches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES subscription_equipment(id) ON DELETE CASCADE NOT NULL,
  patch_id VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  severity VARCHAR(50) DEFAULT 'MEDIUM' NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE,
  installed_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rmm_patches_equip ON rmm_patches (equipment_id);
CREATE INDEX IF NOT EXISTS idx_rmm_patches_tenant ON rmm_patches (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rmm_patches_status ON rmm_patches (status);

CREATE TABLE IF NOT EXISTS rmm_device_telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES subscription_equipment(id) ON DELETE CASCADE NOT NULL UNIQUE,
  zabbix_host_id VARCHAR(100),
  agent_status VARCHAR(50) DEFAULT 'ONLINE' NOT NULL,
  cpu_usage NUMERIC(5,2) DEFAULT 0,
  memory_usage NUMERIC(5,2) DEFAULT 0,
  disk_usage NUMERIC(5,2) DEFAULT 0,
  pending_patch_count INTEGER DEFAULT 0 NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rmm_telemetry_equip ON rmm_device_telemetry (equipment_id);
CREATE INDEX IF NOT EXISTS idx_rmm_telemetry_tenant ON rmm_device_telemetry (tenant_id);
