-- Migration 011: Add client_type to users and plans, update subscriptions schema, and insert new plans

-- 1. Add client_type to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'CLIENT' NOT NULL;

-- 2. Add client_type to plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'CLIENT' NOT NULL;

-- 3. Alter subscriptions plan column from enum to varchar(50)
ALTER TABLE subscriptions ALTER COLUMN plan TYPE VARCHAR(50);
ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'PL-001';

-- 4. Map existing subscriptions to new plans
UPDATE subscriptions SET plan = 'PL-001' WHERE plan = 'BASIC';
UPDATE subscriptions SET plan = 'PL-002' WHERE plan = 'STANDARD';
UPDATE subscriptions SET plan = 'PL-004' WHERE plan = 'PREMIUM';

-- 5. Delete legacy plans
DELETE FROM plans WHERE id IN ('BASIC', 'STANDARD', 'PREMIUM');

-- 6. Insert new plans from data.csv
INSERT INTO plans (id, name, description, price, features, recommended, client_type) VALUES
  ('PL-001', 'Basic', 'Reactive remote support for non-critical infrastructure.', 18, '[
    {"text": "Chat & Remote Only support", "included": true},
    {"text": "Security monitoring", "included": true},
    {"text": "25 GB Cloud Storage", "included": true},
    {"text": "Backup included", "included": true},
    {"text": "Bronze SLA level (8 hours response)", "included": true},
    {"text": "RMM Monitoring & Patch Management", "included": true},
    {"text": "Content Filtering", "included": true},
    {"text": "Asset Lifecycle Tracking: Basic", "included": true},
    {"text": "Reporting Level: Monthly Basic", "included": true}
  ]'::jsonb, false, 'CLIENT'),

  ('PL-002', 'Standard', 'Proactive support and regular system maintenance.', 30, '[
    {"text": "8x5 Helpdesk support", "included": true},
    {"text": "Security monitoring", "included": true},
    {"text": "50 GB Cloud Storage", "included": true},
    {"text": "Backup included", "included": true},
    {"text": "Bronze SLA level (4 hours response)", "included": true},
    {"text": "RMM Monitoring & Patch Management", "included": true},
    {"text": "Optional / Premium Content Filtering", "included": true},
    {"text": "EDR Security", "included": true},
    {"text": "M365 Backup", "included": true},
    {"text": "Vulnerability Scanning: Quarterly", "included": true},
    {"text": "Identity/MFA Management", "included": true},
    {"text": "Asset Lifecycle Tracking: Standard", "included": true},
    {"text": "vCIO Strategic Review: Annual", "included": true},
    {"text": "Reporting Level: Monthly Standard", "included": true}
  ]'::jsonb, true, 'ENTERPRISE'),

  ('PL-003', 'Advanced', 'Comprehensive support, security, and vCIO reviews.', 55, '[
    {"text": "24/7/365 Helpdesk support", "included": true},
    {"text": "Security monitoring", "included": true},
    {"text": "250 GB Cloud Storage", "included": true},
    {"text": "Backup included", "included": true},
    {"text": "Silver SLA level (2 hours response)", "included": true},
    {"text": "RMM Monitoring & Patch Management", "included": true},
    {"text": "On-Site Support (2h/month)", "included": true},
    {"text": "Optional / Premium Content Filtering", "included": true},
    {"text": "EDR Security & M365 Backup", "included": true},
    {"text": "Password Manager", "included": true},
    {"text": "Dark Web Monitoring", "included": true},
    {"text": "Phishing Awareness Training", "included": true},
    {"text": "Vulnerability Scanning: Monthly", "included": true},
    {"text": "Identity/MFA Management", "included": true},
    {"text": "Asset Lifecycle Tracking: Comprehensive", "included": true},
    {"text": "vCIO Strategic Review: Semi-Annual", "included": true},
    {"text": "Compliance Audit Mapping: Basic", "included": true},
    {"text": "Reporting Level: Weekly Detailed", "included": true}
  ]'::jsonb, false, 'ENTERPRISE'),

  ('PL-004', 'Premium', 'Premium service with a dedicated engineer.', 85, '[
    {"text": "Dedicated Engineer support", "included": true},
    {"text": "Security monitoring", "included": true},
    {"text": "1000 GB Cloud Storage", "included": true},
    {"text": "Backup included", "included": true},
    {"text": "Gold SLA level (1 hour response)", "included": true},
    {"text": "RMM Monitoring & Patch Management", "included": true},
    {"text": "On-Site Support (4h/month)", "included": true},
    {"text": "Optional / Premium Content Filtering", "included": true},
    {"text": "EDR Security & M365 Backup", "included": true},
    {"text": "Password Manager & Dark Web Monitoring", "included": true},
    {"text": "Phishing Awareness Training", "included": true},
    {"text": "Vulnerability Scanning: Continuous", "included": true},
    {"text": "Identity/MFA Management", "included": true},
    {"text": "Asset Lifecycle Tracking: Comprehensive", "included": true},
    {"text": "vCIO Strategic Review: Quarterly", "included": true},
    {"text": "Compliance Audit Mapping: Standard", "included": true},
    {"text": "Reporting Level: Executive (On-Demand)", "included": true}
  ]'::jsonb, false, 'ENTERPRISE'),

  ('PL-005', 'Enterprise', 'Top-tier VIP Concierge support and custom frameworks.', 120, '[
    {"text": "VIP Concierge support", "included": true},
    {"text": "Security monitoring", "included": true},
    {"text": "5000 GB Cloud Storage", "included": true},
    {"text": "Backup included", "included": true},
    {"text": "Platinum SLA level (30 minutes response)", "included": true},
    {"text": "RMM Monitoring & Patch Management", "included": true},
    {"text": "Unlimited On-Site Support", "included": true},
    {"text": "Optional / Premium Content Filtering", "included": true},
    {"text": "EDR Security & M365 Backup", "included": true},
    {"text": "Password Manager & Dark Web Monitoring", "included": true},
    {"text": "Phishing Awareness Training", "included": true},
    {"text": "Vulnerability Scanning: Continuous + Remediation", "included": true},
    {"text": "Identity/MFA Management", "included": true},
    {"text": "Asset Lifecycle Tracking: Corporate Fleet", "included": true},
    {"text": "vCIO Strategic Review: Monthly Strategic", "included": true},
    {"text": "Compliance Audit Mapping: Full Framework", "included": true},
    {"text": "Reporting Level: Custom / SOC", "included": true}
  ]'::jsonb, false, 'ENTERPRISE'),

  ('PL-006', 'Student Starter Kit', 'Essentials for students, including RMM and password management.', 20, '[
    {"text": "Self-Serve / Community Support", "included": false},
    {"text": "Security monitoring", "included": true},
    {"text": "50 GB Cloud Storage", "included": true},
    {"text": "Backup included", "included": true},
    {"text": "Silver SLA level (8 hours response)", "included": true},
    {"text": "RMM Monitoring & Patch Management", "included": true},
    {"text": "Optional / Premium Content Filtering", "included": true},
    {"text": "Password Manager", "included": true},
    {"text": "Asset Lifecycle Tracking: Basic", "included": true},
    {"text": "Reporting Level: Monthly Basic", "included": true}
  ]'::jsonb, false, 'STUDENT'),

  ('PL-007', 'Custom', 'Tailored solution with specialized terms and SLAs.', 0, '[
    {"text": "Support: As per contract", "included": true},
    {"text": "Security monitoring", "included": true},
    {"text": "Cloud Storage: Custom", "included": true},
    {"text": "Backup included", "included": true},
    {"text": "Custom SLA & Response Time", "included": true},
    {"text": "RMM Monitoring & Patch Management", "included": true},
    {"text": "Onsite Support: As per contract", "included": true},
    {"text": "Optional / Premium Content Filtering", "included": true},
    {"text": "EDR Security & M365 Backup: As per contract", "included": true},
    {"text": "Password Manager & Dark Web: As per contract", "included": true},
    {"text": "Phishing Training: As per contract", "included": true},
    {"text": "Vulnerability Scanning: As per contract", "included": true},
    {"text": "Identity/MFA Management: As per contract", "included": true},
    {"text": "Asset Lifecycle: As per contract", "included": true},
    {"text": "vCIO Review: As per contract", "included": true},
    {"text": "Compliance Mapping: As per contract", "included": true},
    {"text": "Reporting Level: Tailored", "included": true}
  ]'::jsonb, false, 'OTHER')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  recommended = EXCLUDED.recommended,
  client_type = EXCLUDED.client_type,
  updated_at = NOW();
