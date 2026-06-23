-- ============================================
-- MSP Help Desk — Seed Data
-- ============================================
-- Passwords are bcrypt hash of 'password123'

TRUNCATE TABLE ticket_responses, ticket_events, ticket_attachments, tickets, subscriptions, invoices, round_robin_state, users, tenants, plans CASCADE;

-- Seed plans
INSERT INTO plans (id, name, description, price, features, recommended, client_type) VALUES
  ('PL-001', '{"en_US": "Basic", "es_DO": "Básico"}'::jsonb, '{"en_US": "Reactive remote support for non-critical infrastructure.", "es_DO": "Soporte remoto reactivo para infraestructura no crítica."}'::jsonb, 18, '[
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

  ('PL-002', '{"en_US": "Standard", "es_DO": "Estándar"}'::jsonb, '{"en_US": "Proactive support and regular system maintenance.", "es_DO": "Soporte proactivo y mantenimiento regular del sistema."}'::jsonb, 30, '[
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

  ('PL-003', '{"en_US": "Advanced", "es_DO": "Avanzado"}'::jsonb, '{"en_US": "Comprehensive support, security, and vCIO reviews.", "es_DO": "Soporte integral, seguridad y revisiones de vCIO."}'::jsonb, 55, '[
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

  ('PL-004', '{"en_US": "Premium", "es_DO": "Premium"}'::jsonb, '{"en_US": "Premium service with a dedicated engineer.", "es_DO": "Servicio premium con un ingeniero dedicado."}'::jsonb, 85, '[
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

  ('PL-005', '{"en_US": "Enterprise", "es_DO": "Empresarial"}'::jsonb, '{"en_US": "Top-tier VIP Concierge support and custom frameworks.", "es_DO": "Soporte VIP Concierge de primer nivel y marcos personalizados."}'::jsonb, 120, '[
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

  ('PL-006', '{"en_US": "Student Starter Kit", "es_DO": "Kit de Inicio para Estudiantes"}'::jsonb, '{"en_US": "Essentials for students, including RMM and password management.", "es_DO": "Esenciales para estudiantes, incluyendo RMM y gestión de contraseñas."}'::jsonb, 20, '[
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

  ('PL-007', '{"en_US": "Custom", "es_DO": "Personalizado"}'::jsonb, '{"en_US": "Tailored solution with specialized terms and SLAs.", "es_DO": "Solución a la medida con términos y SLAs especializados."}'::jsonb, 0, '[
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
  ]'::jsonb, false, 'OTHER');

-- Seed tenants
INSERT INTO tenants (id, name, subdomain) VALUES
  ('ef010203-0405-0607-0809-0a0b0c0d0e0f', 'MSP Provider', 'admin'),
  ('bc111111-1111-1111-1111-111111111111', 'Acme Corporation', 'acme'),
  ('bc222222-2222-2222-2222-222222222222', 'Beta Industries', 'beta');

-- Seed users linked to tenants
INSERT INTO users (id, email, name, password_hash, role, specialty, is_active, email_verified, tenant_id) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@msp-helpdesk.com', 'System Administrator', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'ADMIN', NULL, true, true, 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'john.client@example.com', 'John Mitchell', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'CLIENT', NULL, true, true, 'bc111111-1111-1111-1111-111111111111'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'sarah.tech@msp-helpdesk.com', 'Sarah Chen', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'TECHNICIAN', 'Networking', true, true, 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'mike.tech@msp-helpdesk.com', 'Mike Rodriguez', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'TECHNICIAN', 'TV', true, true, 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'lisa.client@example.com', 'Lisa Park', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'CLIENT', NULL, true, true, 'bc222222-2222-2222-2222-222222222222');

-- Seed tickets linked to tenants
INSERT INTO tickets (id, title, description, category, status, priority, client_id, assigned_tech_id, tenant_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Network connectivity issues in office', 'Our office network drops every 30 minutes. All workstations affected. Router model: Cisco ISR 4321.', 'SERVICE_OUTAGE', 'IN_PROGRESS', 'HIGH', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'bc111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222', 'TV display warranty claim', 'Samsung 65" commercial display purchased 3 months ago showing dead pixels. Warranty claim.', 'WARRANTY', 'OPEN', 'MEDIUM', 'e5f6a7b8-c9d0-1234-efab-345678901234', NULL, 'bc222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333', 'Laptop screen replacement', 'Dell Latitude 5520 — cracked display panel needs replacement.', 'REPAIR', 'AWAITING_PAYMENT', 'LOW', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'bc111111-1111-1111-1111-111111111111');

-- Seed ticket events linked to tenants
INSERT INTO ticket_events (ticket_id, old_status, new_status, changed_by, notes, tenant_id) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, 'OPEN', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ticket created by client', 'bc111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111', 'OPEN', 'IN_PROGRESS', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Assigned to network specialist. Investigating router configuration.', 'bc111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', NULL, 'OPEN', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ticket created by client', 'bc111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'OPEN', 'IN_PROGRESS', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Diagnosis complete — screen panel ordered.', 'bc111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Parts ordered. Awaiting payment before proceeding with repair. Cost: $350', 'bc111111-1111-1111-1111-111111111111');

-- Seed ticket responses linked to tenants
INSERT INTO ticket_responses (ticket_id, user_id, message, tenant_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Hi Sarah, the drops are occurring every time we start our bulk backup jobs. Could it be a bottleneck on the Cisco switch?', 'bc111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Thanks for the detail, John. I am checking the port bandwidth allocation on the Cisco ISR 4321. I will apply a QoS profile to prioritize standard business traffic over backups.', 'bc111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Hello John, we have diagnosed the panel issue and ordered the replacement screen. The payment link has been generated. Once payment is received, we will finalize the installation.', 'bc111111-1111-1111-1111-111111111111');

-- Seed subscriptions linked to tenants
INSERT INTO subscriptions (client_id, service_name, plan, status, renewal_date, equipment_count, tenant_id) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Cloud Storage', 'PL-002', 'ACTIVE', '2025-11-15', 5, 'bc111111-1111-1111-1111-111111111111'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Managed Security', 'PL-004', 'ACTIVE', '2025-12-01', 1, 'bc111111-1111-1111-1111-111111111111'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Network Monitoring', 'PL-001', 'EXPIRING', '2025-10-20', 3, 'bc111111-1111-1111-1111-111111111111'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Microsoft 365', 'PL-002', 'ACTIVE', '2026-01-05', 10, 'bc222222-2222-2222-2222-222222222222');

-- Seed invoices linked to tenants
INSERT INTO invoices (invoice_number, client_id, amount, tax_amount, total, status, invoice_date, due_date, tenant_id) VALUES
  ('INV-2024-1001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 1077.59, 172.41, 1250.00, 'PENDING', '2024-10-01', '2024-10-31', 'bc111111-1111-1111-1111-111111111111'),
  ('INV-2024-0901', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 1077.59, 172.41, 1250.00, 'PAID', '2024-09-01', '2024-09-30', 'bc111111-1111-1111-1111-111111111111'),
  ('INV-2024-0801', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 1077.59, 172.41, 1250.00, 'PAID', '2024-08-01', '2024-08-31', 'bc111111-1111-1111-1111-111111111111'),
  ('INV-2024-1002', 'e5f6a7b8-c9d0-1234-efab-345678901234', 515.52, 84.48, 600.00, 'PAID', '2024-10-01', '2024-10-31', 'bc222222-2222-2222-2222-222222222222');

INSERT INTO round_robin_state (category, last_assigned_tech_id) VALUES
  ('REPAIR', 'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('WARRANTY', NULL),
  ('SERVICE_OUTAGE', 'c3d4e5f6-a7b8-9012-cdef-123456789012');
