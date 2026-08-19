-- Migration 025: Add RESOLVED_AUTOMATED status, PREVENTATIVE_MAINTENANCE category,
-- and the rmm_alerts table for rolling flapping-detection windows.
-- Note: ALTER TYPE ... ADD VALUE requires PostgreSQL 12+ when run inside a transaction.

ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'RESOLVED_AUTOMATED';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'PREVENTATIVE_MAINTENANCE';

CREATE TABLE IF NOT EXISTS rmm_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(255) NOT NULL,
  asset_id VARCHAR(255) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rmm_alerts_lookup ON rmm_alerts (alert_type, asset_id, received_at);
CREATE INDEX IF NOT EXISTS idx_rmm_alerts_tenant ON rmm_alerts (tenant_id);
