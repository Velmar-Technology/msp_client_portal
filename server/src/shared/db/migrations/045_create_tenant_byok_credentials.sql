-- Migration 045: Create tenant_byok_credentials table

CREATE TABLE IF NOT EXISTS tenant_byok_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL DEFAULT 'openai',
  model VARCHAR(128),
  base_url VARCHAR(255),
  encrypted_api_key TEXT NOT NULL,
  key_iv VARCHAR(64) NOT NULL,
  key_auth_tag VARCHAR(64) NOT NULL,
  key_masked VARCHAR(32) NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_byok_tenant ON tenant_byok_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_byok_provider ON tenant_byok_credentials(provider);

ALTER TABLE tenant_byok_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_byok_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_byok_credentials;
CREATE POLICY tenant_isolation_policy ON tenant_byok_credentials FOR ALL USING (
  current_setting('app.is_system_admin', true) = 'true' OR
  tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.is_system_admin', true) = 'true' OR
  tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
