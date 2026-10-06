-- Migration 049: Add client_type to leads table for CRM prospect classification
-- Allows explicit segmentation of leads by client type ('CLIENT', 'ENTERPRISE', 'STUDENT', 'OTHER')
-- and automatically flows into provisioned users upon deal conversion.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'CLIENT' NOT NULL;

-- Backfill client_type from the associated plan if present
UPDATE leads l
SET client_type = p.client_type
FROM plans p
WHERE l.plan_id = p.id AND p.client_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_client_type ON leads(client_type);
