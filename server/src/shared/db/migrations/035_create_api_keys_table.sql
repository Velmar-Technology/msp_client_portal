-- Migration: 035_create_api_keys_table.sql
-- Description: Create persistent, multi-tenanted API keys table with hashed token storage.

-- 1. Create API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);

-- 2. Enable Row-Level Security (tenant isolation) on api_keys
--    Mirrors the policy pattern established in migrations 029 and 030.
DO $$
DECLARE
    tbl text := 'api_keys';
BEGIN
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
END $$;