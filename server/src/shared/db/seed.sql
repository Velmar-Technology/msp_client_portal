-- ========================================================
-- MSP Help Desk & Client Portal — Complete Seed Data (2026)
-- ========================================================
-- Passwords are bcrypt hash of 'password123'
-- Hash: $2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO

TRUNCATE TABLE 
  lead_activities,
  quotations,
  leads,
  rmm_alerts,
  rmm_patches,
  rmm_device_telemetry,
  device_maintenances,
  expenses,
  ticket_attachments,
  ticket_responses,
  ticket_events,
  tickets,
  subscription_equipment,
  subscriptions,
  invoices,
  notifications,
  notification_preferences,
  round_robin_state,
  users,
  tenants,
  plans
CASCADE;

-- ========================================================
-- 1. PLANS CATALOG (Aligned with FEATURE_CATALOG & ToS)
-- ========================================================
INSERT INTO plans (id, name, description, price, features, recommended, client_type, active) VALUES
  ('PL-001', 
   '{"en_US": "Basic", "es_DO": "Básico"}'::jsonb, 
   '{"en_US": "Reactive remote support and cloud synchronization.", "es_DO": "Soporte remoto reactivo y sincronización en la nube."}'::jsonb, 
   18, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "Chat & Remote Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Chat & Soporte Remoto (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "Chat & Remote Only", "limit": "Unlimited"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "25 GB Cloud Storage", "es_DO": "25 GB Almacenamiento en la Nube"}, "params": {"limit": 25, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Automated Backup Included", "es_DO": "Copia de Seguridad Incluida"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Bronze SLA (Response within 8 business hours)", "es_DO": "SLA Bronze (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "Remote RMM Monitoring & Security Patching", "es_DO": "Monitoreo Remoto RMM & Parches de Seguridad"}, "included": true}
   ]'::jsonb, 
   true, 
   'CLIENT',
   true),

  ('PL-002', 
   '{"en_US": "Standard", "es_DO": "Estándar"}'::jsonb, 
   '{"en_US": "Proactive support and regular system maintenance.", "es_DO": "Soporte proactivo y mantenimiento regular del sistema."}'::jsonb, 
   30, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "8x5 Helpdesk Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Soporte de Mesa de Ayuda 8x5 (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "8x5", "limit": "Unlimited"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "25 GB Cloud Storage", "es_DO": "25 GB Almacenamiento en la Nube"}, "params": {"limit": 25, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Automated Backup Included", "es_DO": "Copia de Seguridad Incluida"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Bronze SLA (Response within 8 business hours)", "es_DO": "SLA Bronze (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Monitoring & Security Patching", "es_DO": "Monitoreo RMM & Parches de Seguridad"}, "included": true}
   ]'::jsonb, 
   true, 
   'ENTERPRISE',
   true),

  ('PL-003', 
   '{"en_US": "Advanced", "es_DO": "Avanzado"}'::jsonb, 
   '{"en_US": "Comprehensive support, password manager, and store discounts.", "es_DO": "Soporte integral, administrador de contraseñas y descuentos en tienda."}'::jsonb, 
   55, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "8x5 Helpdesk Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Soporte de Mesa de Ayuda 8x5 (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "8x5", "limit": "Unlimited"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "50 GB Cloud Storage", "es_DO": "50 GB Almacenamiento en la Nube"}, "params": {"limit": 50, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Automated Backup Included", "es_DO": "Copia de Seguridad Incluida"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Silver SLA (4 business hours response ACK)", "es_DO": "SLA Silver (4 horas hábiles de respuesta ACK)"}, "params": {"level": "Silver", "response": "4 hours"}, "included": true},
     {"code": "ONSITE_SUPPORT", "text": {"en_US": "On-Site Support (Up to 2h/month)", "es_DO": "Soporte On-Site (Hasta 2h/mes)"}, "params": {"hours": "2"}, "included": true},
     {"code": "PASSWORD_MANAGER", "text": {"en_US": "Password Manager Service", "es_DO": "Administrador de Contraseñas"}, "included": true},
     {"code": "STORE_DISCOUNT", "text": {"en_US": "5% Non-Cumulative Discount in Velmar Store", "es_DO": "5% de descuento no acumulable en Tienda Velmar"}, "params": {"percent": "5%"}, "included": true}
   ]'::jsonb, 
   true, 
   'ENTERPRISE',
   true),

  ('PL-004', 
   '{"en_US": "Custom / Corporate", "es_DO": "Custom / Corporativo"}'::jsonb, 
   '{"en_US": "All-inclusive corporate plan with 1h SLA for critical P1 issues.", "es_DO": "Plan corporativo todo incluido con SLA de 1h para casos críticos P1."}'::jsonb, 
   85, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "Dedicated Engineer Remote Support (24/7/365)", "es_DO": "Soporte Remoto de Ingeniero Dedicado (24/7/365)"}, "params": {"type": "Dedicated Engineer", "limit": "Unlimited"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "100 GB Cloud Storage", "es_DO": "100 GB Almacenamiento en la Nube"}, "params": {"limit": 100, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Automated Continuous Backup Included", "es_DO": "Copia de Seguridad Automatizada Continua"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Gold SLA (1 hour response for P1 critical tickets)", "es_DO": "SLA Gold (1 hora de respuesta para casos críticos P1)"}, "params": {"level": "Gold", "response": "1 hour"}, "included": true},
     {"code": "ONSITE_SUPPORT", "text": {"en_US": "On-Site Support (Up to 2h/month)", "es_DO": "Soporte On-Site (Hasta 2h/mes)"}, "params": {"hours": "2"}, "included": true},
     {"code": "VULNERABILITY_SCANNING", "text": {"en_US": "Continuous Network Vulnerability Scanning", "es_DO": "Escaneo Continuo de Vulnerabilidades en Red"}, "params": {"frequency": "Continuous"}, "included": true},
     {"code": "ASSET_LIFECYCLE", "text": {"en_US": "Corporate Fleet Asset Lifecycle Tracking", "es_DO": "Seguimiento del Ciclo de Vida de los Activos Flota Corporativa"}, "params": {"tier": "Corporate Fleet"}, "included": true},
     {"code": "REPORTING_LEVEL", "text": {"en_US": "Executive Technical Escalation & On-Demand Reporting", "es_DO": "Escalación Jerárquica Ejecutiva e Informes On-Demand"}, "params": {"level": "Executive (On-Demand)"}, "included": true},
     {"code": "STORE_DISCOUNT", "text": {"en_US": "10% Discount in Velmar Store", "es_DO": "10% de descuento en Tienda Velmar"}, "params": {"percent": "10%"}, "included": true}
   ]'::jsonb, 
   false, 
   'ENTERPRISE',
   true),

  ('PL-005', 
   '{"en_US": "Student Starter Kit", "es_DO": "Kit de Inicio para Estudiantes"}'::jsonb, 
   '{"en_US": "Academic starter plan with RMM and password management.", "es_DO": "Plan académico con monitoreo RMM y administrador de contraseñas."}'::jsonb, 
   20, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "Chat & Remote Support (5 Tickets/mo)", "es_DO": "Chat & Soporte Remoto (5 Tickets/mes)"}, "params": {"type": "Chat & Remote Only", "limit": "5"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "50 GB Cloud Storage", "es_DO": "50 GB Almacenamiento en la Nube"}, "params": {"limit": 50, "unit": "GB"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Bronze SLA (Response within 8 business hours)", "es_DO": "SLA Bronze (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Security Patching & Monitoring", "es_DO": "Monitoreo RMM & Parches de Seguridad"}, "included": true},
     {"code": "PASSWORD_MANAGER", "text": {"en_US": "Password Manager Service", "es_DO": "Servicio de Administrador de Contraseñas"}, "included": true}
   ]'::jsonb, 
   false, 
   'STUDENT',
   true),

  ('PL-006', 
   '{"en_US": "Premium POS", "es_DO": "Premium POS"}'::jsonb, 
   '{"en_US": "High-availability point of sale plan with hardware loan.", "es_DO": "Plan especializado para puntos de venta con préstamo de equipos en comodato."}'::jsonb, 
   49, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "POS Technical Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Soporte Técnico POS (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "8x5", "limit": "Unlimited"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "Bronze SLA (Response within 8 business hours)", "es_DO": "SLA Bronze (8 horas hábiles de respuesta ACK)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
     {"code": "ONSITE_SUPPORT", "text": {"en_US": "On-Site Support (Up to 8h/month in SD/STI)", "es_DO": "Soporte On-Site Presencial (Hasta 8h/mes en SD/STI)"}, "params": {"hours": "8"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Automated POS Backups Included", "es_DO": "Copia de Seguridad POS Automatizada"}, "included": true},
     {"code": "RMM_PATCH_MANAGEMENT", "text": {"en_US": "RMM Patch Management & Monitoring", "es_DO": "Monitoreo y Parches RMM"}, "included": true},
     {"code": "CUSTOM_FEATURE", "text": {"en_US": "POS Hardware Loan (Comodato Bailment)", "es_DO": "Préstamo de Equipos POS en Comodato"}, "included": true}
   ]'::jsonb, 
   false, 
   'CLIENT',
   true),

  ('PL-007', 
   '{"en_US": "Custom / Project", "es_DO": "Personalizado"}'::jsonb, 
   '{"en_US": "Tailored enterprise project solutions with custom SLAs.", "es_DO": "Solución a la medida con términos y SLAs especializados por contrato."}'::jsonb, 
   0, 
   '[
     {"code": "CUSTOM_FEATURE", "text": {"en_US": "Tailored enterprise project solutions with custom SLAs", "es_DO": "Solución a la medida con términos y SLAs especializados por contrato"}, "included": true}
   ]'::jsonb, 
   false, 
   'OTHER',
   true);

-- ========================================================
-- 2. TENANTS
-- ========================================================
INSERT INTO tenants (id, name, subdomain) VALUES
  ('ef010203-0405-0607-0809-0a0b0c0d0e0f', 'MSP Provider HQ', 'admin'),
  ('bc111111-1111-1111-1111-111111111111', 'Acme Corporation', 'acme'),
  ('bc222222-2222-2222-2222-222222222222', 'Beta Industries', 'beta'),
  ('bc333333-3333-3333-3333-333333333333', 'Gamma Retail Group', 'gamma');

-- ========================================================
-- 3. USERS
-- ========================================================
INSERT INTO users (id, email, name, password_hash, role, specialty, is_active, email_verified, language, client_type, phone_number, tenant_id) VALUES
  -- Administrator
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@msp-services.com', 'System Administrator', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'ADMIN', NULL, true, true, 'en_US', 'CLIENT', '+18095550100', 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  
  -- Technicians (Provider Tenant)
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'sarah.tech@msp-services.com', 'Sarah Chen', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'TECHNICIAN', 'Networking', true, true, 'en_US', 'CLIENT', '+18095550103', 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'mike.tech@msp-services.com', 'Mike Rodriguez', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'TECHNICIAN', 'Hardware & POS', true, true, 'es_DO', 'CLIENT', '+18095550104', 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'alex.tech@msp-services.com', 'Alex Rivera', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'TECHNICIAN', 'Cloud & Security', true, true, 'en_US', 'CLIENT', '+18095550105', 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  
  -- Clients
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'john.client@example.com', 'John Mitchell', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'CLIENT', NULL, true, true, 'en_US', 'ENTERPRISE', '+18095550101', 'bc111111-1111-1111-1111-111111111111'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'lisa.client@example.com', 'Lisa Park', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'CLIENT', NULL, true, true, 'es_DO', 'ENTERPRISE', '+18095550102', 'bc222222-2222-2222-2222-222222222222'),
  ('fa112233-4455-6677-8899-aabbccddeeff', 'carlos.client@example.com', 'Carlos Gomez', '$2b$12$vYNizLsJireozMId6GOMuucvVnHVmJBHmTqAABUxLpI2OXB7lWLfO', 'CLIENT', NULL, true, true, 'es_DO', 'CLIENT', '+18095550106', 'bc333333-3333-3333-3333-333333333333');

-- ========================================================
-- 4. NOTIFICATION PREFERENCES
-- ========================================================
INSERT INTO notification_preferences (user_id, tenant_id, preferences) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', '{"TICKET_CREATED": {"in_app": true, "email": true, "whatsapp": false}, "TICKET_ASSIGNED": {"in_app": true, "email": true, "whatsapp": false}, "TICKET_STATUS_CHANGED": {"in_app": true, "email": true, "whatsapp": true}, "TICKET_CANCELLED": {"in_app": true, "email": true, "whatsapp": false}, "NEW_REPLY": {"in_app": true, "email": true, "whatsapp": false}}'::jsonb),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', '{"TICKET_CREATED": {"in_app": true, "email": true, "whatsapp": false}, "TICKET_ASSIGNED": {"in_app": true, "email": true, "whatsapp": true}, "TICKET_STATUS_CHANGED": {"in_app": true, "email": true, "whatsapp": true}, "TICKET_CANCELLED": {"in_app": true, "email": true, "whatsapp": false}, "NEW_REPLY": {"in_app": true, "email": true, "whatsapp": true}}'::jsonb),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'bc111111-1111-1111-1111-111111111111', '{"TICKET_CREATED": {"in_app": true, "email": true, "whatsapp": false}, "TICKET_ASSIGNED": {"in_app": true, "email": true, "whatsapp": false}, "TICKET_STATUS_CHANGED": {"in_app": true, "email": true, "whatsapp": true}, "TICKET_CANCELLED": {"in_app": true, "email": true, "whatsapp": false}, "NEW_REPLY": {"in_app": true, "email": true, "whatsapp": true}}'::jsonb);

-- ========================================================
-- 5. SUBSCRIPTIONS
-- ========================================================
INSERT INTO subscriptions (id, client_id, service_name, plan, status, renewal_date, equipment_count, tenant_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Managed IT Infrastructure', 'PL-002', 'ACTIVE', NOW() + INTERVAL '45 days', 3, 'bc111111-1111-1111-1111-111111111111'),
  ('550e8400-e29b-41d4-a716-446655440002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Enterprise Cloud & Security', 'PL-004', 'ACTIVE', NOW() + INTERVAL '60 days', 1, 'bc111111-1111-1111-1111-111111111111'),
  ('550e8400-e29b-41d4-a716-446655440003', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'Workstation Care Advanced', 'PL-003', 'ACTIVE', NOW() + INTERVAL '30 days', 2, 'bc222222-2222-2222-2222-222222222222'),
  ('550e8400-e29b-41d4-a716-446655440004', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'Legacy Endpoint Monitoring', 'PL-001', 'EXPIRING', NOW() + INTERVAL '5 days', 1, 'bc222222-2222-2222-2222-222222222222'),
  ('550e8400-e29b-41d4-a716-446655440005', 'fa112233-4455-6677-8899-aabbccddeeff', 'Retail POS Support & Loan', 'PL-006', 'ACTIVE', NOW() + INTERVAL '90 days', 2, 'bc333333-3333-3333-3333-333333333333');

-- ========================================================
-- 6. SUBSCRIPTION EQUIPMENT (Device Slots & RMM Agents)
-- ========================================================
INSERT INTO subscription_equipment (id, subscription_id, slot_index, status, device_name, device_serial, agent_instance_id, agent_hostname, agent_serial, agent_last_seen_at, agent_token, nextcloud_username, nextcloud_password, tenant_id) VALUES
  -- Acme Corp Devices
  ('e0000001-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440001', 0, 'ACTIVE', 'HQ-FINANCE-PC01', 'DL-LAT-7420-001', '01955000-0000-7000-8000-000000000001', 'HQ-FINANCE-PC01', 'DL-LAT-7420-001', NOW() - INTERVAL '2 minutes', 'tok_acme_fin_01', 'acme_fin01', 'cloud_pass_123', 'bc111111-1111-1111-1111-111111111111'),
  ('e0000001-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440001', 1, 'ACTIVE', 'HQ-EXEC-MACBOOK', 'AP-MBP-16-002', '01955000-0000-7000-8000-000000000002', 'HQ-EXEC-MACBOOK', 'AP-MBP-16-002', NOW() - INTERVAL '5 minutes', 'tok_acme_exec_02', 'acme_exec02', 'cloud_pass_123', 'bc111111-1111-1111-1111-111111111111'),
  ('e0000001-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440001', 2, 'ACTIVE', 'HQ-OPS-DESKTOP', 'TC-M70Q-003', '01955000-0000-7000-8000-000000000003', 'HQ-OPS-DESKTOP', 'TC-M70Q-003', NOW() - INTERVAL '1 minute', 'tok_acme_ops_03', 'acme_ops03', 'cloud_pass_123', 'bc111111-1111-1111-1111-111111111111'),
  ('e0000001-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440002', 0, 'ACTIVE', 'ACME-PROD-SRV01', 'HP-DL380-SRV-01', '01955000-0000-7000-8000-000000000004', 'ACME-PROD-SRV01', 'HP-DL380-SRV-01', NOW() - INTERVAL '30 seconds', 'tok_acme_srv_01', NULL, NULL, 'bc111111-1111-1111-1111-111111111111'),
  
  -- Beta Industries Devices
  ('e0000001-0000-0000-0000-000000000005', '550e8400-e29b-41d4-a716-446655440003', 0, 'ACTIVE', 'BETA-ENG-WS01', 'DL-PREC-5820-01', '01955000-0000-7000-8000-000000000005', 'BETA-ENG-WS01', 'DL-PREC-5820-01', NOW() - INTERVAL '4 minutes', 'tok_beta_eng_01', 'beta_eng01', 'cloud_pass_123', 'bc222222-2222-2222-2222-222222222222'),
  ('e0000001-0000-0000-0000-000000000006', '550e8400-e29b-41d4-a716-446655440003', 1, 'ACTIVE', 'BETA-DESIGN-MAC', 'AP-STUDIO-M2-02', '01955000-0000-7000-8000-000000000006', 'BETA-DESIGN-MAC', 'AP-STUDIO-M2-02', NOW() - INTERVAL '12 minutes', 'tok_beta_dsgn_02', 'beta_dsgn02', 'cloud_pass_123', 'bc222222-2222-2222-2222-222222222222'),
  ('e0000001-0000-0000-0000-000000000007', '550e8400-e29b-41d4-a716-446655440004', 0, 'ACTIVE', 'BETA-LEGACY-LAPTOP', 'LN-T490-003', '01955000-0000-7000-8000-000000000007', 'BETA-LEGACY-LAPTOP', 'LN-T490-003', NOW() - INTERVAL '25 minutes', 'tok_beta_leg_03', NULL, NULL, 'bc222222-2222-2222-2222-222222222222'),
  
  -- Gamma Retail Devices
  ('e0000001-0000-0000-0000-000000000008', '550e8400-e29b-41d4-a716-446655440005', 0, 'ACTIVE', 'GAMMA-POS-TERM01', 'NCR-XR7-POS-01', '01955000-0000-7000-8000-000000000008', 'GAMMA-POS-TERM01', 'NCR-XR7-POS-01', NOW() - INTERVAL '1 minute', 'tok_gamma_pos_01', NULL, NULL, 'bc333333-3333-3333-3333-333333333333'),
  ('e0000001-0000-0000-0000-000000000009', '550e8400-e29b-41d4-a716-446655440005', 1, 'ACTIVE', 'GAMMA-POS-TERM02', 'NCR-XR7-POS-02', '01955000-0000-7000-8000-000000000009', 'GAMMA-POS-TERM02', 'NCR-XR7-POS-02', NOW() - INTERVAL '3 minutes', 'tok_gamma_pos_02', NULL, NULL, 'bc333333-3333-3333-3333-333333333333');

-- ========================================================
-- 7. RMM DEVICE TELEMETRY
-- ========================================================
INSERT INTO rmm_device_telemetry (id, equipment_id, zabbix_host_id, agent_status, cpu_usage, memory_usage, disk_usage, disk_used_gb, disk_total_gb, pending_patch_count, last_sync_at, tenant_id) VALUES
  ('00000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', '10101', 'ONLINE', 18.50, 45.20, 62.10, 310.50, 500.00, 2, NOW() - INTERVAL '2 minutes', 'bc111111-1111-1111-1111-111111111111'),
  ('00000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000002', '10102', 'ONLINE', 12.30, 58.70, 48.00, 480.00, 1000.00, 0, NOW() - INTERVAL '5 minutes', 'bc111111-1111-1111-1111-111111111111'),
  ('00000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000003', '10103', 'ONLINE', 8.40, 32.10, 35.50, 88.75, 250.00, 1, NOW() - INTERVAL '1 minute', 'bc111111-1111-1111-1111-111111111111'),
  ('00000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000004', '10104', 'ONLINE', 34.80, 72.40, 78.90, 1578.00, 2000.00, 3, NOW() - INTERVAL '30 seconds', 'bc111111-1111-1111-1111-111111111111'),
  ('00000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000005', '10201', 'ONLINE', 24.10, 64.00, 55.40, 554.00, 1000.00, 1, NOW() - INTERVAL '4 minutes', 'bc222222-2222-2222-2222-222222222222'),
  ('00000001-0000-0000-0000-000000000006', 'e0000001-0000-0000-0000-000000000006', '10202', 'ONLINE', 14.60, 41.50, 42.00, 840.00, 2000.00, 0, NOW() - INTERVAL '12 minutes', 'bc222222-2222-2222-2222-222222222222'),
  ('00000001-0000-0000-0000-000000000007', 'e0000001-0000-0000-0000-000000000007', '10203', 'WARNING', 68.20, 85.00, 89.40, 223.50, 250.00, 4, NOW() - INTERVAL '25 minutes', 'bc222222-2222-2222-2222-222222222222'),
  ('00000001-0000-0000-0000-000000000008', 'e0000001-0000-0000-0000-000000000008', '10301', 'ONLINE', 15.00, 38.00, 28.50, 34.20, 120.00, 0, NOW() - INTERVAL '1 minute', 'bc333333-3333-3333-3333-333333333333'),
  ('00000001-0000-0000-0000-000000000009', 'e0000001-0000-0000-0000-000000000009', '10302', 'ONLINE', 16.20, 40.20, 31.00, 37.20, 120.00, 0, NOW() - INTERVAL '3 minutes', 'bc333333-3333-3333-3333-333333333333');

-- ========================================================
-- 8. RMM PATCHES
-- ========================================================
INSERT INTO rmm_patches (id, equipment_id, patch_id, title, severity, status, release_date, installed_at, tenant_id) VALUES
  ('fa000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'KB5034441', 'Windows 11 23H2 Cumulative Security Update', 'HIGH', 'PENDING', NOW() - INTERVAL '10 days', NULL, 'bc111111-1111-1111-1111-111111111111'),
  ('fa000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'KB5034123', '.NET Framework 4.8.1 Security Quality Rollup', 'MEDIUM', 'PENDING', NOW() - INTERVAL '15 days', NULL, 'bc111111-1111-1111-1111-111111111111'),
  ('fa000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000004', 'CVE-2024-21626', 'Linux Kernel RunC Container Escape Vulnerability Fix', 'CRITICAL', 'APPROVED', NOW() - INTERVAL '4 days', NULL, 'bc111111-1111-1111-1111-111111111111'),
  ('fa000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000007', 'KB5033920', 'Windows 10 22H2 Memory Integrity Vulnerability Patch', 'HIGH', 'PENDING', NOW() - INTERVAL '20 days', NULL, 'bc222222-2222-2222-2222-222222222222'),
  ('fa000001-0000-0000-0000-000000000005', 'e0000001-0000-0000-0000-000000000005', 'NVD-2024-001', 'NVIDIA Quadro Driver Studio Security Patch 551.76', 'MEDIUM', 'INSTALLED', NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days', 'bc222222-2222-2222-2222-222222222222');

-- ========================================================
-- 9. RMM ALERTS
-- ========================================================
INSERT INTO rmm_alerts (id, alert_type, asset_id, received_at, tenant_id) VALUES
  ('ca000001-0000-0000-0000-000000000001', 'HIGH_CPU_LOAD', 'ACME-PROD-SRV01', NOW() - INTERVAL '15 minutes', 'bc111111-1111-1111-1111-111111111111'),
  ('ca000001-0000-0000-0000-000000000002', 'LOW_DISK_SPACE', 'BETA-LEGACY-LAPTOP', NOW() - INTERVAL '1 hour', 'bc222222-2222-2222-2222-222222222222'),
  ('ca000001-0000-0000-0000-000000000003', 'DEVICE_OFFLINE_WARNING', 'GAMMA-POS-TERM02', NOW() - INTERVAL '2 hours', 'bc333333-3333-3333-3333-333333333333');

-- ========================================================
-- 10. DEVICE MAINTENANCES
-- ========================================================
INSERT INTO device_maintenances (id, equipment_id, subscription_id, client_id, tenant_id, assigned_tech_id, scheduled_date, status, title, notes, maintenance_type, created_by) VALUES
  ('da000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'bc111111-1111-1111-1111-111111111111', 'd4e5f6a7-b8c9-0123-defa-234567890123', NOW() + INTERVAL '10 days', 'SCHEDULED', 'Semiannual Hardware Cleaning & OS Audit', 'Perform internal thermal cleaning, fan inspection, and driver updates.', 'PREDEFINED_6M', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('da000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000004', '550e8400-e29b-41d4-a716-446655440002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'bc111111-1111-1111-1111-111111111111', 'c3d4e5f6-a7b8-9012-cdef-123456789012', NOW() + INTERVAL '3 days', 'IN_PROGRESS', 'Server Storage Pool & RAID Consistency Check', 'Monthly disk health verification and firmware integrity check.', 'ON_DEMAND', 'c3d4e5f6-a7b8-9012-cdef-123456789012'),
  ('da000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000008', '550e8400-e29b-41d4-a716-446655440005', 'fa112233-4455-6677-8899-aabbccddeeff', 'bc333333-3333-3333-3333-333333333333', 'd4e5f6a7-b8c9-0123-defa-234567890123', NOW() - INTERVAL '15 days', 'COMPLETED', 'POS Peripheral Calibration & Firmware Sync', 'Calibrated capacitive touchscreen and thermal receipt cutter head.', 'PREDEFINED_6M', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- ========================================================
-- 11. TICKETS
-- ========================================================
INSERT INTO tickets (id, title, description, category, status, priority, client_id, assigned_tech_id, equipment_id, tenant_id, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Network connectivity drops during bulk backup jobs', 'Our office network drops every 30 minutes when backup jobs execute. Cisco ISR 4321 logs indicate buffer overflow.', 'SERVICE_OUTAGE', 'IN_PROGRESS', 'HIGH', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'e0000001-0000-0000-0000-000000000004', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days'),
  ('22222222-2222-2222-2222-222222222222', 'Commercial TV display dead pixel warranty replacement', 'Samsung 65" commercial display purchased 3 months ago showing dead pixel lines in conference room A.', 'WARRANTY', 'OPEN', 'MEDIUM', 'e5f6a7b8-c9d0-1234-efab-345678901234', NULL, NULL, 'bc222222-2222-2222-2222-222222222222', NOW() - INTERVAL '4 hours'),
  ('33333333-3333-3333-3333-333333333333', 'Laptop screen and hinge replacement', 'Dell Latitude 7420 cracked screen panel and loose left hinge from accidental drop.', 'REPAIR', 'AWAITING_PAYMENT', 'LOW', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'e0000001-0000-0000-0000-000000000001', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day'),
  ('44444444-4444-4444-4444-444444444444', 'Scheduled workstation thermal optimization and disk cleanup', 'Routine preventative maintenance cycle completed for engineering workstation.', 'PREVENTATIVE_MAINTENANCE', 'RESOLVED', 'LOW', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'f6a7b8c9-d0e1-2345-fabc-456789012345', 'e0000001-0000-0000-0000-000000000005', 'bc222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 days'),
  ('55555555-5555-5555-5555-555555555555', 'POS barcode scanner intermittent disconnects', 'Barcode scanner USB connection reset automated script triggered and resolved.', 'REPAIR', 'RESOLVED_AUTOMATED', 'HIGH', 'fa112233-4455-6677-8899-aabbccddeeff', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'e0000001-0000-0000-0000-000000000008', 'bc333333-3333-3333-3333-333333333333', NOW() - INTERVAL '5 hours');

-- ========================================================
-- 12. TICKET EVENTS
-- ========================================================
INSERT INTO ticket_events (ticket_id, old_status, new_status, changed_by, notes, tenant_id, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, 'OPEN', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ticket created by client via portal', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days'),
  ('11111111-1111-1111-1111-111111111111', 'OPEN', 'IN_PROGRESS', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Assigned to Sarah Chen (Networking Specialist). Applying QoS bandwidth throttling.', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day 20 hours'),
  ('33333333-3333-3333-3333-333333333333', NULL, 'OPEN', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Ticket created by client', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day'),
  ('33333333-3333-3333-3333-333333333333', 'OPEN', 'IN_PROGRESS', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Diagnosis complete — OEM FHD IPS panel and left hinge bracket ordered.', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 hours'),
  ('33333333-3333-3333-3333-333333333333', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Quotation generated: $280.00. Awaiting client authorization.', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 hours'),
  ('44444444-4444-4444-4444-444444444444', 'OPEN', 'RESOLVED', 'f6a7b8c9-d0e1-2345-fabc-456789012345', 'Cleaned dust filters, updated thermal paste, verified disk trim.', 'bc222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 days'),
  ('55555555-5555-5555-5555-555555555555', 'OPEN', 'RESOLVED_AUTOMATED', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Auto-remediation playbook restarted USB Host Controller. Telemetry healthy.', 'bc333333-3333-3333-3333-333333333333', NOW() - INTERVAL '5 hours');

-- ========================================================
-- 13. TICKET RESPONSES
-- ========================================================
INSERT INTO ticket_responses (id, ticket_id, user_id, message, tenant_id, created_at) VALUES
  ('ba000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Hi Sarah, the drops happen around 11:30 PM and 2:00 AM when the SQL backup syncs to offsite storage. Could it be bandwidth starvation?', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day 22 hours'),
  ('ba000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Thanks for the exact timestamps, John. I found the router QoS policy was missing rate-limiting on port 443 offsite sync. I applied an 80 Mbps traffic shaping policy to guarantee LAN workstation bandwidth.', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day 18 hours'),
  ('ba000001-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'Hello John, we inspected the Dell Latitude 7420. The panel and left hinge require replacement. We have created invoice INV-2026-0003 for $280.00. Once approved, parts will be installed.', 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 hours');

-- ========================================================
-- 14. INVOICES
-- ========================================================
INSERT INTO invoices (id, invoice_number, client_id, amount, tax_amount, total, status, invoice_date, due_date, tenant_id) VALUES
  ('0a000001-0000-0000-0000-000000000001', 'INV-2026-0001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 175.00, 31.50, 206.50, 'PAID', '2026-01-01', '2026-01-31', 'bc111111-1111-1111-1111-111111111111'),
  ('0a000001-0000-0000-0000-000000000002', 'INV-2026-0002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 175.00, 31.50, 206.50, 'PAID', '2026-02-01', '2026-02-28', 'bc111111-1111-1111-1111-111111111111'),
  ('0a000001-0000-0000-0000-000000000003', 'INV-2026-0003', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 280.00, 50.40, 330.40, 'PENDING', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'bc111111-1111-1111-1111-111111111111'),
  ('0a000001-0000-0000-0000-000000000004', 'INV-2026-0004', 'e5f6a7b8-c9d0-1234-efab-345678901234', 128.00, 23.04, 151.04, 'PAID', '2026-02-01', '2026-02-28', 'bc222222-2222-2222-2222-222222222222'),
  ('0a000001-0000-0000-0000-000000000005', 'INV-2026-0005', 'fa112233-4455-6677-8899-aabbccddeeff', 98.00, 17.64, 115.64, 'PAID', '2026-02-01', '2026-02-28', 'bc333333-3333-3333-3333-333333333333');

-- ========================================================
-- 15. EXPENSES
-- ========================================================
INSERT INTO expenses (id, amount, description, category, expense_date, expense_identifier, tenant_id) VALUES
  ('0e000001-0000-0000-0000-000000000001', 450.00, 'Zabbix Enterprise Cloud Monitoring License (Q1 2026)', 'Software & SaaS', '2026-01-15', 'EXP-2026-001', 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  ('0e000001-0000-0000-0000-000000000002', 220.00, 'Spare Dell Laptop OEM Screens & Hinges stock inventory', 'Hardware Inventory', '2026-02-02', 'EXP-2026-002', 'ef010203-0405-0607-0809-0a0b0c0d0e0f'),
  ('0e000001-0000-0000-0000-000000000003', 180.00, 'Field Technician Transport and Fuel Reimbursements', 'Travel & Operations', '2026-02-18', 'EXP-2026-003', 'ef010203-0405-0607-0809-0a0b0c0d0e0f');

-- ========================================================
-- 16. NOTIFICATIONS
-- ========================================================
INSERT INTO notifications (id, user_id, title, message, link, ticket_id, type, read, tenant_id, created_at) VALUES
  ('0f000001-0000-0000-0000-000000000001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Technician Assigned', 'Sarah Chen has been assigned to your ticket "Network connectivity drops during bulk backup jobs".', '/tickets/11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'TICKET_ASSIGNED', true, 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day 20 hours'),
  ('0f000001-0000-0000-0000-000000000002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Payment Required for Repair', 'Invoice INV-2026-0003 has been generated for ticket #33333333.', '/billing', '33333333-3333-3333-3333-333333333333', 'INVOICE_GENERATED', false, 'bc111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 hours'),
  ('0f000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Critical Security Patch Available', 'RunC Container Escape Vulnerability (CVE-2024-21626) requires patch approval for server ACME-PROD-SRV01.', '/rmm', NULL, 'SECURITY_ALERT', false, 'ef010203-0405-0607-0809-0a0b0c0d0e0f', NOW() - INTERVAL '4 hours');

-- ========================================================
-- 17. ROUND ROBIN STATE
-- ========================================================
INSERT INTO round_robin_state (category, last_assigned_tech_id, updated_at) VALUES
  ('REPAIR', 'd4e5f6a7-b8c9-0123-defa-234567890123', NOW()),
  ('WARRANTY', 'c3d4e5f6-a7b8-9012-cdef-123456789012', NOW()),
  ('SERVICE_OUTAGE', 'c3d4e5f6-a7b8-9012-cdef-123456789012', NOW()),
  ('PREVENTATIVE_MAINTENANCE', 'f6a7b8c9-d0e1-2345-fabc-456789012345', NOW());

-- ========================================================
-- 18. CRM MODULE (Leads, Quotations, Lead Activities)
-- ========================================================
INSERT INTO leads (id, tenant_id, client_id, contact_name, contact_email, contact_phone, company_name, stage, plan_id, billing_cycle, equipment_count, expected_revenue, probability, priority, assigned_user_id, notes) VALUES
  ('de000001-0000-0000-0000-000000000001', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', NULL, 'Roberto Jimenez', 'rjimenez@nexuslogistics.do', '+18095550201', 'Nexus Logistics Corp', 'PROPOSITION', 'PL-004', 'monthly', 15, 1275.00, 75, 'HIGH', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Corporate fleet looking for 1h SLA guarantee across 15 dispatch laptops.'),
  ('de000001-0000-0000-0000-000000000002', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', NULL, 'Dr. Patricia Alvarez', 'patricia@santiagodental.do', '+18095550202', 'Santiago Dental Care', 'QUALIFIED', 'PL-002', 'monthly', 6, 180.00, 50, 'MEDIUM', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Clinic seeking cloud backup and automated patching for X-ray workstations.'),
  ('de000001-0000-0000-0000-000000000003', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'John Mitchell', 'john.client@example.com', '+18095550101', 'Acme Corporation', 'WON', 'PL-004', 'monthly', 1, 85.00, 100, 'HIGH', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Upsell to Corporate Plan for primary database server.'),
  ('de000001-0000-0000-0000-000000000004', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', NULL, 'Marcos Peña', 'marcos@caribbeanfresh.do', '+18095550204', 'Caribbean Fresh Markets', 'NEW', 'PL-006', 'monthly', 8, 392.00, 25, 'HIGH', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Supermarket chain inquiring about 8 POS terminal loan units.');

INSERT INTO quotations (id, quotation_number, tenant_id, lead_id, client_id, recipient_name, recipient_email, plan_id, billing_cycle, equipment_count, subtotal, tax, total, status, valid_until, sent_at, created_by) VALUES
  ('0c000001-0000-0000-0000-000000000001', 'QT-2026-0001', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', 'de000001-0000-0000-0000-000000000001', NULL, 'Roberto Jimenez', 'rjimenez@nexuslogistics.do', 'PL-004', 'monthly', 15, 1275.00, 229.50, 1504.50, 'SENT', NOW() + INTERVAL '30 days', NOW() - INTERVAL '2 days', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
  ('0c000001-0000-0000-0000-000000000002', 'QT-2026-0002', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', 'de000001-0000-0000-0000-000000000002', NULL, 'Dr. Patricia Alvarez', 'patricia@santiagodental.do', 'PL-002', 'monthly', 6, 180.00, 32.40, 212.40, 'DRAFT', NOW() + INTERVAL '14 days', NULL, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

INSERT INTO lead_activities (id, lead_id, tenant_id, user_id, activity_type, title, summary, due_date, completed_at, status) VALUES
  ('0b000001-0000-0000-0000-000000000001', 'de000001-0000-0000-0000-000000000001', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CALL', 'Discovery Call with CIO', 'Discussed 15-seat endpoint management and 1h P1 SLA coverage requirements.', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'COMPLETED'),
  ('0b000001-0000-0000-0000-000000000002', 'de000001-0000-0000-0000-000000000001', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'MEETING', 'Proposal & Terms Presentation', 'Sent formal proposal QT-2026-0001. Scheduled executive review.', NOW() + INTERVAL '2 days', NULL, 'PENDING'),
  ('0b000001-0000-0000-0000-000000000003', 'de000001-0000-0000-0000-000000000002', 'ef010203-0405-0607-0809-0a0b0c0d0e0f', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'NOTE', 'HIPAA & Data Privacy Requirements', 'Client requires encrypted offsite backup copies and daily integrity verification.', NULL, NOW() - INTERVAL '1 day', 'COMPLETED');
