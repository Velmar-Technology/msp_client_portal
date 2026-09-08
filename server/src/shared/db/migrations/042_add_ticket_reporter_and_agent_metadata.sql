-- Migration 042: Add ticket reporter details, source attribution, and device snapshot for endpoint ticketing

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS reporter_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reporter_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'WEB' NOT NULL,
  ADD COLUMN IF NOT EXISTS device_snapshot JSONB;

ALTER TABLE ticket_responses
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_sub_equip_agent_token ON subscription_equipment(agent_token);

