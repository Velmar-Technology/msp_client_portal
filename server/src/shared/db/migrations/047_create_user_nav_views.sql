-- Migration 047: Create user_nav_views table (seen markers for sidebar counters)
-- Stores per-user, per-destination "last seen" timestamps for cross-device "unread since last visit" signals.

CREATE TABLE IF NOT EXISTS user_nav_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nav_key VARCHAR(64) NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nav_views_user_nav_key ON user_nav_views(user_id, nav_key);
CREATE INDEX IF NOT EXISTS idx_nav_views_user ON user_nav_views(user_id);
CREATE INDEX IF NOT EXISTS idx_nav_views_tenant ON user_nav_views(tenant_id);

-- Enable fail-closed Row-Level Security (mirrors migration 029/039 pattern)
ALTER TABLE user_nav_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_nav_views FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON user_nav_views;
CREATE POLICY tenant_isolation_policy ON user_nav_views FOR ALL USING (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);
