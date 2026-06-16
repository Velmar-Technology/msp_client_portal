-- ============================================
-- MSP Help Desk — Seed Data
-- ============================================
-- Passwords are bcrypt hash of 'password123'

INSERT INTO users (id, email, name, password_hash, role, specialty, is_active, email_verified) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@msp-helpdesk.com', 'System Administrator', '$2b$12$LJ3IarGPvDHrFX5Zzv8yfuVPmVqEFsRCdOMJsAw9n5fWHIbQ1yLWO', 'ADMIN', NULL, true, true),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'john.client@example.com', 'John Mitchell', '$2b$12$LJ3IarGPvDHrFX5Zzv8yfuVPmVqEFsRCdOMJsAw9n5fWHIbQ1yLWO', 'CLIENT', NULL, true, true),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'sarah.tech@msp-helpdesk.com', 'Sarah Chen', '$2b$12$LJ3IarGPvDHrFX5Zzv8yfuVPmVqEFsRCdOMJsAw9n5fWHIbQ1yLWO', 'TECHNICIAN', 'Networking', true, true),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'mike.tech@msp-helpdesk.com', 'Mike Rodriguez', '$2b$12$LJ3IarGPvDHrFX5Zzv8yfuVPmVqEFsRCdOMJsAw9n5fWHIbQ1yLWO', 'TECHNICIAN', 'TV', true, true),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'lisa.client@example.com', 'Lisa Park', '$2b$12$LJ3IarGPvDHrFX5Zzv8yfuVPmVqEFsRCdOMJsAw9n5fWHIbQ1yLWO', 'CLIENT', NULL, true, true);

INSERT INTO tickets (id, title, description, category, status, priority, client_id, assigned_tech_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Network connectivity issues in office', 'Our office network drops every 30 minutes. All workstations affected. Router model: Cisco ISR 4321.', 'SERVICE_OUTAGE', 'IN_PROGRESS', 'HIGH', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('22222222-2222-2222-2222-222222222222', 'TV display warranty claim', 'Samsung 65" commercial display purchased 3 months ago showing dead pixels. Warranty claim.', 'WARRANTY', 'OPEN', 'MEDIUM', 'e5f6a7b8-c9d0-1234-efab-345678901234', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Laptop screen replacement', 'Dell Latitude 5520 — cracked display panel needs replacement.', 'REPAIR', 'AWAITING_PAYMENT', 'LOW', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'd4e5f6a7-b8c9-0123-defa-234567890123');

INSERT INTO ticket_events (ticket_id, old_status, new_status, changed_by, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, 'OPEN', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ticket created by client'),
  ('11111111-1111-1111-1111-111111111111', 'OPEN', 'IN_PROGRESS', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Assigned to network specialist. Investigating router configuration.'),
  ('33333333-3333-3333-3333-333333333333', NULL, 'OPEN', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ticket created by client'),
  ('33333333-3333-3333-3333-333333333333', 'OPEN', 'IN_PROGRESS', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Diagnosis complete — screen panel ordered.'),
  ('33333333-3333-3333-3333-333333333333', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Parts ordered. Awaiting payment before proceeding with repair. Cost: $350');

INSERT INTO subscriptions (client_id, service_name, plan, status, renewal_date, equipment_count) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Cloud Storage', 'STANDARD', 'ACTIVE', '2025-11-15', 5),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Managed Security', 'PREMIUM', 'ACTIVE', '2025-12-01', 1),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Network Monitoring', 'BASIC', 'EXPIRING', '2025-10-20', 3),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Microsoft 365', 'STANDARD', 'ACTIVE', '2026-01-05', 10);

INSERT INTO invoices (invoice_number, client_id, amount, tax_amount, total, status, invoice_date, due_date) VALUES
  ('INV-2024-1001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 1077.59, 172.41, 1250.00, 'PENDING', '2024-10-01', '2024-10-31'),
  ('INV-2024-0901', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 1077.59, 172.41, 1250.00, 'PAID', '2024-09-01', '2024-09-30'),
  ('INV-2024-0801', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 1077.59, 172.41, 1250.00, 'PAID', '2024-08-01', '2024-08-31'),
  ('INV-2024-1002', 'e5f6a7b8-c9d0-1234-efab-345678901234', 515.52, 84.48, 600.00, 'PAID', '2024-10-01', '2024-10-31');

INSERT INTO round_robin_state (category, last_assigned_tech_id) VALUES
  ('REPAIR', 'd4e5f6a7-b8c9-0123-defa-234567890123'),
  ('WARRANTY', NULL),
  ('SERVICE_OUTAGE', 'c3d4e5f6-a7b8-9012-cdef-123456789012');
