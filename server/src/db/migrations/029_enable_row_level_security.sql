-- Migration 029: Enable Row-Level Security (RLS) across Multi-Tenant Tables

DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'tickets',
        'equipment',
        'subscriptions',
        'invoices',
        'users',
        'expenses',
        'device_maintenances',
        'notification_preferences',
        'rmm_alerts'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        -- Enable Row-Level Security on table
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- Drop existing policy if present
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
        
        -- Create tenant isolation policy using session setting app.current_tenant_id
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
