-- Migration: 031_create_technician_earnings_schema.sql
-- Description: Create technician rates and earnings ledger tables with SLA bonus and OpEx linkage

-- 1. Create Enums if not exist
DO $$ BEGIN
    CREATE TYPE earning_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'VOIDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Technician Rates Table
CREATE TABLE IF NOT EXISTS technician_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID REFERENCES users(id) ON DELETE CASCADE,
    base_closed_rate DECIMAL(10, 2) NOT NULL DEFAULT 8.00,
    sla_bonus_rate DECIMAL(10, 2) NOT NULL DEFAULT 4.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    multiplier_critical DECIMAL(4, 2) NOT NULL DEFAULT 2.50,
    multiplier_high DECIMAL(4, 2) NOT NULL DEFAULT 1.75,
    multiplier_medium DECIMAL(4, 2) NOT NULL DEFAULT 1.25,
    multiplier_low DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tech_rates_tech ON technician_rates(technician_id);
CREATE INDEX IF NOT EXISTS idx_tech_rates_tenant ON technician_rates(tenant_id);

-- 3. Create Technician Earnings Ledger Table
CREATE TABLE IF NOT EXISTS technician_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_amount DECIMAL(10, 2) NOT NULL,
    sla_bonus_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    final_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status earning_status NOT NULL DEFAULT 'PENDING',
    breakdown JSONB NOT NULL,
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_tech ON technician_earnings(technician_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ticket ON technician_earnings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON technician_earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_tenant ON technician_earnings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_earnings_earned_at ON technician_earnings(earned_at);
