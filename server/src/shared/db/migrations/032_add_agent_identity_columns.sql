-- Migration 032: Add agent-discovered identity columns to subscription_equipment
-- so the remote endpoint agent can reconcile real hostname/serial with customer input.
ALTER TABLE subscription_equipment ADD COLUMN IF NOT EXISTS agent_hostname VARCHAR(255);
ALTER TABLE subscription_equipment ADD COLUMN IF NOT EXISTS agent_serial VARCHAR(255);
ALTER TABLE subscription_equipment ADD COLUMN IF NOT EXISTS agent_last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscription_equipment ADD COLUMN IF NOT EXISTS agent_token VARCHAR(255);