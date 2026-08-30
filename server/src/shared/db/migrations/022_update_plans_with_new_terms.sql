-- Migration 022: Update plans features, descriptions, and SLAs to match updated ToS Contract (August 2026)

INSERT INTO plans (id, name, description, price, features, recommended, client_type) VALUES
  ('PL-001', 
   '{"en_US": "Basic", "es_DO": "Básico"}'::jsonb, 
   '{"en_US": "Reactive remote support and cloud synchronization.", "es_DO": "Soporte remoto reactivo y sincronización en la nube."}'::jsonb, 
   18, 
   '[
     {"code": "HELPDESK_SUPPORT", "text": {"en_US": "Chat & Remote Support (Mon-Fri 9:00 AM - 4:00 PM AST)", "es_DO": "Chat & Soporte Remoto (Lun-Vie 9:00 AM - 4:00 PM)"}, "params": {"type": "8x5"}, "included": true},
     {"code": "CLOUD_STORAGE", "text": {"en_US": "25 GB Cloud Storage", "es_DO": "25 GB Almacenamiento en la Nube"}, "params": {"limit": 25, "unit": "GB"}, "included": true},
     {"code": "BACKUP_INCLUDED", "text": {"en_US": "Backup included", "es_DO": "Copia de Seguridad Incluida"}, "included": true},
     {"code": "SLA_LEVEL", "text": {"en_US": "SLA Response within 8 business hours", "es_DO": "SLA (8 horas hábiles)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
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
     {"code": "SLA_LEVEL", "text": {"en_US": "SLA Response within 8 business hours", "es_DO": "SLA (8 horas hábiles)"}, "params": {"level": "Bronze", "response": "8 hours"}, "included": true},
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
     {"code": "SLA_LEVEL", "text": {"en_US": "Silver SLA level (4 business hours response ACK)", "es_DO": "SLA (4 horas hábiles)"}, "params": {"level": "Silver", "response": "4 hours"}, "included": true},
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
     {"text": {"en_US": "Executive Technical Escalation", "es_DO": "Escalación Jerárquica Ejecutiva"}, "included": true}
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
   '{"en_US": "Custom", "es_DO": "Personalizado"}'::jsonb, 
   '{"en_US": "Tailored enterprise project solutions with custom SLAs.", "es_DO": "Solución a la medida con términos y SLAs especializados por contrato."}'::jsonb, 
   0, 
   '[]'::jsonb, 
   false, 
   'OTHER')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  recommended = EXCLUDED.recommended,
  client_type = EXCLUDED.client_type,
  updated_at = NOW();
