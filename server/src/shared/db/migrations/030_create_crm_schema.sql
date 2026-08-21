-- Migration: 030_create_crm_schema.sql
-- Description: Create CRM leads, lead activities, and quotations schema with multi-tenancy and audit tracking

-- 1. Create Enums if not exist
DO $$ BEGIN
    CREATE TYPE lead_stage AS ENUM ('NEW', 'QUALIFIED', 'PROPOSITION', 'WON', 'LOST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quotation_status AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    company_name VARCHAR(255),
    stage lead_stage NOT NULL DEFAULT 'NEW',
    plan_id VARCHAR(50) REFERENCES plans(id) ON DELETE SET NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    equipment_count INTEGER NOT NULL DEFAULT 1,
    expected_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    probability INTEGER NOT NULL DEFAULT 10,
    priority lead_priority NOT NULL DEFAULT 'MEDIUM',
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    lost_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- 3. Create Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    equipment_count INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status quotation_status NOT NULL DEFAULT 'SENT',
    valid_until TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    last_reminder_sent_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_lead ON quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- 4. Create Lead Activities Table
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'EMAIL_SENT', 'QUOTE_SENT', 'QUOTE_REMINDER', 'CALL', 'MEETING', 'NOTE', 'STAGE_CHANGE', 'PLAN_ASSIGNED', 'SUB_MODIFIED'
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON lead_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_due ON lead_activities(due_date);
CREATE INDEX IF NOT EXISTS idx_lead_activities_status ON lead_activities(status);

-- 5. Enable Row-Level Security (tenant isolation) on CRM tables
--    Mirrors the policy pattern established in migration 029.
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'leads',
        'quotations',
        'lead_activities'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);

        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);

        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I FOR ALL USING (
                current_setting(''app.current_tenant_id'', true) IS NULL OR
                current_setting(''app.current_tenant_id'', true) = '''' OR
                current_setting(''app.current_tenant_id'', true) = ''ALL'' OR
                tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
            ) WITH CHECK (
                current_setting(''app.current_tenant_id'', true) IS NULL OR
                current_setting(''app.current_tenant_id'', true) = '''' OR
                current_setting(''app.current_tenant_id'', true) = ''ALL'' OR
                tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
            );',
            tbl
        );
    END LOOP;
END $$;
