-- ============================================
-- MSP Help Desk — Add Multi-Tenancy Migration
-- ============================================

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tenants to match existing mock data
INSERT INTO tenants (id, name, subdomain) VALUES
  ('ef010203-0405-0607-0809-0a0b0c0d0e0f', 'MSP Provider', 'admin'),
  ('bc111111-1111-1111-1111-111111111111', 'Acme Corporation', 'acme'),
  ('bc222222-2222-2222-2222-222222222222', 'Beta Industries', 'beta')
ON CONFLICT (id) DO NOTHING;

-- 1. Alter Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Map existing users to their corresponding tenants
UPDATE users SET tenant_id = 'ef010203-0405-0607-0809-0a0b0c0d0e0f' WHERE role IN ('ADMIN', 'TECHNICIAN');
UPDATE users SET tenant_id = 'bc111111-1111-1111-1111-111111111111' WHERE email = 'john.client@example.com';
UPDATE users SET tenant_id = 'bc222222-2222-2222-2222-222222222222' WHERE email = 'lisa.client@example.com';
UPDATE users SET tenant_id = 'ef010203-0405-0607-0809-0a0b0c0d0e0f' WHERE tenant_id IS NULL; -- fallback

ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;

-- 2. Alter Tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Map tickets based on client's tenant
UPDATE tickets t SET tenant_id = u.tenant_id FROM users u WHERE t.client_id = u.id;
UPDATE tickets SET tenant_id = 'bc111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL; -- fallback

ALTER TABLE tickets ALTER COLUMN tenant_id SET NOT NULL;

-- 3. Alter Subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Map subscriptions based on client's tenant
UPDATE subscriptions s SET tenant_id = u.tenant_id FROM users u WHERE s.client_id = u.id;
UPDATE subscriptions SET tenant_id = 'bc111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL; -- fallback

ALTER TABLE subscriptions ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Alter Invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Map invoices based on client's tenant
UPDATE invoices i SET tenant_id = u.tenant_id FROM users u WHERE i.client_id = u.id;
UPDATE invoices SET tenant_id = 'bc111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL; -- fallback

ALTER TABLE invoices ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Alter Ticket Attachments
ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Map attachments based on ticket's tenant
UPDATE ticket_attachments ta SET tenant_id = t.tenant_id FROM tickets t WHERE ta.ticket_id = t.id;
UPDATE ticket_attachments SET tenant_id = 'bc111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL; -- fallback

ALTER TABLE ticket_attachments ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Alter Ticket Events (Audit Trail)
ALTER TABLE ticket_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Map events based on ticket's tenant
UPDATE ticket_events te SET tenant_id = t.tenant_id FROM tickets t WHERE te.ticket_id = t.id;
UPDATE ticket_events SET tenant_id = 'bc111111-1111-1111-1111-111111111111' WHERE tenant_id IS NULL; -- fallback

ALTER TABLE ticket_events ALTER COLUMN tenant_id SET NOT NULL;

-- Triggers for auto-updating updated_at on tenants table
CREATE OR REPLACE FUNCTION update_tenants_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_tenants_updated_at_column();

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attachments_tenant ON ticket_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant ON ticket_events(tenant_id);
