-- ============================================
-- MSP Help Desk — Seed Data
-- ============================================
-- Passwords are bcrypt hash of 'password123'

TRUNCATE TABLE ticket_responses, ticket_events, ticket_attachments, tickets, subscriptions, invoices, round_robin_state, users, tenants, plans CASCADE;

-- Seed plansINSERT INTO plans (id, name, description, price, features, recommended, client_type) VALUES
  ('PL-001', 
   '{"en_US": "Basic", "es_DO": "Básico"}'::jsonb, 
   '{"en_US": "Reactive remote support and cloud synchronization.", "es_DO": "Soporte remoto reactivo y sincronización en la nube."}'::jsonb, 
   18, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "Chat & Remote Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Chat & Soporte Remoto (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "8x5"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "25 GB Cloud Storage (Nextcloud AGPLv3)", "es_DO": "25 GB Almacenamiento en la Nube (Nextcloud AGPLv3)"}, "params": {"limit": 25, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup included", "es_DO": "Copia de Seguridad Incluida"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "SLA Response within 8 business hours", "es_DO": "SLA (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "Remote RMM Monitoring & Security Patching", "es_DO": "Monitoreo Remoto RMM & Parches de Seguridad"}, "included": true}
   ]'::jsonb, 
   true, 
   'CLIENT'),

  ('PL-002', 
   '{"en_US": "Standard", "es_DO": "Estándar"}'::jsonb, 
   '{"en_US": "Proactive support and regular system maintenance.", "es_DO": "Soporte proactivo y mantenimiento regular del sistema."}'::jsonb, 
   30, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "8x5 Helpdesk Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Soporte de Mesa de Ayuda (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "8x5"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "25 GB Cloud Storage", "es_DO": "25 GB Almacenamiento en la Nube"}, "params": {"limit": 25, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup included", "es_DO": "Copia de Seguridad Incluida"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "SLA Response within 8 business hours", "es_DO": "SLA (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Monitoring & Security Patching", "es_DO": "Monitoreo RMM & Parches de Seguridad"}, "included": true}
   ]'::jsonb, 
   true, 
   'ENTERPRISE'),

  ('PL-003', 
   '{"en_US": "Advanced", "es_DO": "Avanzado"}'::jsonb, 
   '{"en_US": "Comprehensive support, password manager, and store discounts.", "es_DO": "Soporte integral, administrador de contraseñas y descuentos en tienda."}'::jsonb, 
   55, 
   '[
     {"text": {"en_US": "All Standard Plan Features", "es_DO": "Todos los beneficios del Plan Estándar"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "50 GB Cloud Storage", "es_DO": "50 GB Almacenamiento en la Nube"}, "params": {"limit": 50, "unit": "GB"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Silver SLA level (4 business hours response ACK)", "es_DO": "SLA (4 horas hábiles de respuesta ACK)"}, "params": {"level": "Silver", "response": "4 hours"}, "included": true},
     {"text": {"en_US": "On-Site Support (Up to 2h/month)", "es_DO": "Soporte On-Site (Hasta 2h/mes)"}, "included": true},
     {"code": "PASSWORD_MANAGER", "text": {"en_US": "Password Manager Service", "es_DO": "Administrador de Contraseñas"}, "included": true},
     {"text": {"en_US": "5% Non-Cumulative Discount in Velmar Store", "es_DO": "5% de descuento no acumulable en Tienda Velmar"}, "included": true}
   ]'::jsonb, 
   true, 
   'ENTERPRISE'),

  ('PL-004', 
   '{"en_US": "Custom / Corporate", "es_DO": "Custom / Corporativo"}'::jsonb, 
   '{"en_US": "All-inclusive corporate plan with 1h SLA for critical P1 issues.", "es_DO": "Plan corporativo todo incluido con SLA de 1h para casos críticos P1."}'::jsonb, 
   85, 
   '[
     {"text": {"en_US": "All Advanced Plan Features", "es_DO": "Todos los beneficios del Plan Avanzado"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "100 GB Cloud Storage", "es_DO": "100 GB Almacenamiento en la Nube"}, "params": {"limit": 100, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup included", "es_DO": "Copia de Seguridad Incluida"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Gold SLA level (1 hour response for P1 tickets)", "es_DO": "SLA (1 hora de respuesta para casos críticos P1)"}, "params": {"level": "Gold", "response": "1 hour"}, "included": true},
     {"text": {"en_US": "On-Site Support (Up to 2h/month)", "es_DO": "Soporte On-Site (Hasta 2h/mes)"}, "included": true},
     {"text": {"en_US": "Dedicated Engineer Remote Support", "es_DO": "Soporte Remoto de Ingeniero Dedicado"}, "included": true},
     {"text": {"en_US": "Continuous Network Vulnerability Scanning", "es_DO": "Escaneo Continuo de Vulnerabilidades en Red"}, "included": true},
     {"text": {"en_US": "Asset Lifecycle Tracking", "es_DO": "Seguimiento del Ciclo de Vida de los Activos"}, "included": true},
     {"text": {"en_US": "Executive Technical Escalation", "es_DO": "Escalación Jerárquica Ejecutiva"}, "included": true},
     {"text": {"en_US": "10% Discount in Velmar Store", "es_DO": "10% de descuento en Tienda Velmar"}, "included": true}
   ]'::jsonb, 
   false, 
   'ENTERPRISE'),

  ('PL-005', 
   '{"en_US": "Student Starter Kit", "es_DO": "Kit de Inicio para Estudiantes"}'::jsonb, 
   '{"en_US": "Academic starter plan with RMM and password management.", "es_DO": "Plan académico con monitoreo RMM y administrador de contraseñas."}'::jsonb, 
   20, 
   '[
     {"code": "CLOUD_STORAGE", "text": {"en_US": "50 GB Cloud Storage", "es_DO": "50 GB Almacenamiento en la Nube"}, "params": {"limit": 50, "unit": "GB"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "SLA Response within 8 business hours", "es_DO": "SLA (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Security Patching & Monitoring", "es_DO": "Monitoreo RMM & Parches de Seguridad"}, "included": true},
     {"code": "PASSWORD_MANAGER", "text": {"en_US": "Password Manager Service", "es_DO": "Servicio de Administrador de Contraseñas"}, "included": true}
   ]'::jsonb, 
   false, 
   'STUDENT'),

  ('PL-006', 
   '{"en_US": "Premium POS", "es_DO": "Premium POS"}'::jsonb, 
   '{"en_US": "High-availability point of sale plan with hardware loan.", "es_DO": "Plan especializado para puntos de venta con préstamo de equipos en comodato."}'::jsonb, 
   49, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "POS Technical Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Soporte Técnico POS (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "8x5"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "SLA Response within 8 business hours", "es_DO": "SLA (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"text": {"en_US": "On-Site Support (Up to 2h/week in SD/STI)", "es_DO": "Soporte On-Site Presencial (Hasta 2h/semanales en SD/STI)"}, "included": true},
     {"text": {"en_US": "POS Hardware Loan (Comodato Bailment)", "es_DO": "Préstamo de Equipos POS en Comodato"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Automated Backups Included", "es_DO": "Copia de Seguridad Automatizada"}, "included": true}
   ]'::jsonb, 
   false, 
   'CLIENT'),

  ('PL-007', 
   '{"en_US": "Custom / Project", "es_DO": "Personalizado"}'::jsonb, 
   '{"en_US": "Tailored enterprise project solutions with custom SLAs.", "es_DO": "Solución a la medida con términos y SLAs especializados por contrato."}'::jsonb, 
   0, 
   '[]'::jsonb, 
   false, 
   'OTHER');

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
