-- Migration 010: Create plans table and seed default plans
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  features JSONB NOT NULL,
  recommended BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (id, name, description, price, features, recommended) VALUES
  ('BASIC', 'Basic', 'Reactive remote support for non-critical infrastructure.', 299, '[{"text": "Remote Support 8×5", "included": true}, {"text": "Basic Monitoring (Ping/Port)", "included": true}, {"text": "Standard Ticket Management", "included": true}, {"text": "Preventive Maintenance", "included": false}]'::jsonb, false),
  ('STANDARD', 'Standard', 'Proactive support and regular system maintenance.', 599, '[{"text": "Everything in Basic", "included": true}, {"text": "Monthly Preventive Maintenance", "included": true}, {"text": "Advanced Performance Monitoring", "included": true}, {"text": "OS Patch Management", "included": true}]'::jsonb, true),
  ('PREMIUM', 'Premium', 'Full coverage, risk mitigation, and business continuity.', 1299, '[{"text": "Everything in Standard", "included": true}, {"text": "Managed Backups & Recovery", "included": true}, {"text": "24/7 Critical Support", "included": true}, {"text": "Quarterly Security Audit", "included": true}]'::jsonb, false)
ON CONFLICT (id) DO NOTHING;
