-- ============================================
-- MSP Help Desk — Add Ticket Responses Migration
-- ============================================

-- Create ticket_responses table
CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_responses_ticket ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_responses_user ON ticket_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_tenant ON ticket_responses(tenant_id);
