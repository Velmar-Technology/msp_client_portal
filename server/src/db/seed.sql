-- ============================================
-- MSP Help Desk — Seed Data
-- ============================================
-- Passwords are bcrypt hash of 'password123'

TRUNCATE TABLE ticket_responses, ticket_events, ticket_attachments, tickets, subscriptions, invoices, round_robin_state, users, tenants, plans CASCADE;

-- Seed plans
INSERT INTO plans (id, name, description, price, features, recommended, client_type) VALUES
  ('PL-001', '{"en_US": "Basic", "es_DO": "Básico"}'::jsonb, '{"en_US": "Reactive remote support for non-critical infrastructure.", "es_DO": "Soporte remoto reactivo para clientes fieles."}'::jsonb, 18, '[
    {"code": "HELPDESK_SUPPORT", "text": {"en_US": "Chat & Remote Only support", "es_DO": "Chat & Soporte Remoto"}, "params": {"type": "8x5"}, "included": true},
    {"code": "CLOUD_STORAGE", "text": {"en_US": "25 GB Cloud Storage", "es_DO": "25 GB Almacenamiento en la Nube"}, "params": {"limit": 25, "unit": "GB"}, "included": true},
    {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup included", "es_DO": "Backup Incluido"}, "included": true},
    {"code": "SLA_LEVEL", "text": {"en_US": "Bronze SLA level (8 hours response)", "es_DO": "SLA (8 horas de respuesta)"}, "params": {"level": "Bronze", "response": "4 hours"}, "included": true},
    {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Monitoring & Patch Management", "es_DO": "Monitorio Remoto & Parches de Seguridad"}, "included": true}
  ]'::jsonb, true, 'CLIENT'),

  ('PL-002', '{"en_US": "Standard", "es_DO": "Estándar"}'::jsonb, '{"en_US": "Proactive support and regular system maintenance.", "es_DO": "Soporte proactivo y mantenimiento regular del sistema."}'::jsonb, 30, '[
    {"code": "HELPDESK_SUPPORT", "text": {"en_US": "8x5 Helpdesk support", "es_DO": "Soporte de Mesa de Ayuda (8x5)"}, "params": {"type": "8x5"}, "included": true},
    {"code": "CLOUD_STORAGE", "text": {"en_US": "25 GB Cloud Storage", "es_DO": "25 GB Almacenamiento en la Nube"}, "params": {"limit": 25, "unit": "GB"}, "included": true},
    {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup included", "es_DO": "Backup incluido"}, "included": true},
    {"code": "SLA_LEVEL", "text": {"en_US": "Bronze SLA level (4 hours response)", "es_DO": "SLA (8 horas de respuesta)"}, "params": {"level": "Bronze", "response": "4 hours"}, "included": true},
    {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Monitoring & Patch Management", "es_DO": "Monitoreo & Parches de Seguridad"}, "included": true}
  ]'::jsonb, true, 'ENTERPRISE'),

  ('PL-003', '{"en_US": "Advanced", "es_DO": "Avanzado"}'::jsonb, '{"en_US": "Comprehensive support, security, reviews.", "es_DO": "Soporte integral, seguridad y revisiones."}'::jsonb, 55, '[
    {"text": {"en_US": "All Standard Features", "es_DO": "Todo incluido en Estandar"}, "included": true},
    {"code": "CLOUD_STORAGE", "text": {"en_US": "50 GB Cloud Storage", "es_DO": "50 GB Almacenamiento en la Nube"}, "params": {"unit": "GB", "limit": 50}, "included": true},
    {"code": "SLA_LEVEL", "text": {"en_US": "Silver SLA level (2 hours response)", "es_DO": "SLA (4 horas de respuesta)"}, "params": {"level": "Silver", "response": "2 hours"}, "included": true},
    {"text": {"en_US": "On-Site Support (2h/month)", "es_DO": "Soporte On-Site (2h/mes)"}, "included": true},
    {"code": "PASSWORD_MANAGER", "text": {"en_US": "Password Manager", "es_DO": "Administrador de Contraseñas"}, "included": true},
    {"text": {"en_US": "5% Discount in Velmar Store*", "es_DO": "5% de descuento en la tienda Velmar*"}, "included": true}
  ]'::jsonb, true, 'ENTERPRISE'),

  ('PL-004', '{"en_US": "Premium", "es_DO": "Premium"}'::jsonb, '{"en_US": "Premium service with a dedicated assistance.", "es_DO": "Servicio premium con asistencia personalizada."}'::jsonb, 85, '[
    {"text": {"en_US": "All Advanced Features", "es_DO": "Todo Incluido en Avanzado"}, "included": true},
    {"text": {"en_US": "Equipment Lending*", "es_DO": "Prestamo de equipo*"}, "included": true},
    {"text": {"en_US": "Dedicated Engineer support", "es_DO": "Soporte de Ingeniero Dedicado"}, "included": true},
    {"code": "CLOUD_STORAGE", "text": {"en_US": "100 GB Cloud Storage", "es_DO": "100 GB Almacenamiento en la Nube"}, "params": {"unit": "GB", "limit": 100}, "included": true},
    {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup included", "es_DO": "Copia de seguridad incluida"}, "included": true},
    {"code": "SLA_LEVEL", "text": {"en_US": "Gold SLA level (1 hour response)", "es_DO": "SLA (1 hora de respuesta)"}, "params": {"level": "Gold", "response": "1 hour"}, "included": true},
    {"text": {"en_US": "On-Site Support (4h/month)", "es_DO": "Soporte On-Site (2h/mes)"}, "included": true},
    {"text": {"en_US": "Vulnerability Scanning: Continuous", "es_DO": "Escaneo de Vulnerabilidad: Continuo"}, "included": true},
    {"text": {"en_US": "Asset Lifecycle Tracking: Comprehensive", "es_DO": "Seguimiento del ciclo de vida de los activos: Exhaustivo"}, "included": true},
    {"text": {"en_US": "Reporting Level: Executive (On-Demand)", "es_DO": "Nivel jerárquico: Ejecutivo (Bajo demanda)"}, "included": true},
    {"text": {"en_US": "10% Discount in Velmar store*", "es_DO": "10% de descuento en la tienda Velmar*"}, "included": true}
  ]'::jsonb, false, 'ENTERPRISE'),

  ('PL-006', '{"en_US": "Student Starter Kit", "es_DO": "Kit de Inicio para Estudiantes"}'::jsonb, '{"en_US": "Essentials for students, including RMM and password management.", "es_DO": "Esenciales para estudiantes, incluyendo Monitoreo y gestión de contraseñas."}'::jsonb, 20, '[
    {"code": "CLOUD_STORAGE", "text": {"en_US": "50 GB Cloud Storage", "es_DO": "50 GB de Almacenamiento en la Nube"}, "params": {"unit": "GB", "limit": 25}, "included": true},
    {"code": "SLA_LEVEL", "text": {"en_US": "Silver SLA level (8 hours response)", "es_DO": "SLA (8 horas de respuesta)"}, "params": {"level": "Silver", "response": "4 hours"}, "included": true},
    {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Monitoring & Patch Management", "es_DO": "Monitoreo & Parches de Seguridad"}, "included": true},
    {"code": "PASSWORD_MANAGER", "text": {"en_US": "Password Manager", "es_DO": "Administrador de Contraseña"}, "included": true}
  ]'::jsonb, false, 'STUDENT'),

  ('PL-007', '{"en_US": "Custom", "es_DO": "Personalizado"}'::jsonb, '{"en_US": "Tailored solution with specialized terms and SLAs.", "es_DO": "Solución a la medida con términos y SLAs especializados."}'::jsonb, 0, '[]'::jsonb, false, 'OTHER'),

  ('PL-008', '{"en_US": "Premium POS", "es_DO": "Premium POS"}'::jsonb, '{"en_US": "A premium, high-availability service designed to ensure your point of sale never stops.", "es_DO": "Servicio premium de alta disponibilidad diseñado para que tu punto de venta nunca se detenga."}'::jsonb, 49, '[
    {"code": "HELPDESK_SUPPORT", "text": {"en_US": "Technical Support", "es_DO": "Soporte Técnico"}, "params": {"type": "24/7/365"}, "included": true},
    {"code": "SLA_LEVEL", "text": {"en_US": "SLA (Response within 8 hours)", "es_DO": "SLA (Respuesta en menos de 8 hora)"}, "params": {"level": "Silver", "response": "2 hours"}, "included": true},
    {"text": {"en_US": "On-Site Support (2 hours/month)", "es_DO": "Soporte On-Site (2h/semanales)"}, "included": true},
    {"text": {"en_US": "Equipment Loan*", "es_DO": "Prestamo de Equipo*"}, "included": true},
    {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup Included", "es_DO": "Copia de seguridad"}, "included": true}
  ]'::jsonb, false, 'CLIENT');

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
