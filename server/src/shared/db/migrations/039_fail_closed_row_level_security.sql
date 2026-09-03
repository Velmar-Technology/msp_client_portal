-- Migration 039: Fail-Closed Row-Level Security (RLS) across Multi-Tenant Tables

DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'tickets',
        'subscription_equipment',
        'subscriptions',
        'invoices',
        'users',
        'expenses',
        'device_maintenances',
        'notification_preferences',
        'rmm_alerts',
        'rmm_patches',
        'rmm_device_telemetry',
        'ticket_attachments',
        'ticket_events',
        'ticket_responses',
        'notifications',
        'technician_earnings',
        'leads',
        'deals',
        'contacts',
        'opportunities',
        'quotations',
        'quotation_items',
        'api_keys'
    ];
BEGIN
    -- 1. Standard tenant_id tables (fail-closed isolation with FORCE RLS)
    FOREACH tbl IN ARRAY tenant_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
            
            EXECUTE format(
                'CREATE POLICY tenant_isolation_policy ON %I FOR ALL USING (
                    current_setting(''app.is_system_admin'', true) = ''true'' OR
                    tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
                ) WITH CHECK (
                    current_setting(''app.is_system_admin'', true) = ''true'' OR
                    tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
                );',
                tbl
            );
        END IF;
    END LOOP;

    -- 2. Tenants table (isolated by its own id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
        EXECUTE 'ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'ALTER TABLE tenants FORCE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;';
        EXECUTE 'CREATE POLICY tenant_isolation_policy ON tenants FOR ALL USING (
            current_setting(''app.is_system_admin'', true) = ''true'' OR
            id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
        ) WITH CHECK (
            current_setting(''app.is_system_admin'', true) = ''true'' OR
            id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
        );';
    END IF;

    -- 3. Plans table (catalog plans visible to all; custom plans isolated by tenant)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
        EXECUTE 'ALTER TABLE plans ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'ALTER TABLE plans FORCE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON plans;';
        EXECUTE 'CREATE POLICY tenant_isolation_policy ON plans FOR ALL USING (
            current_setting(''app.is_system_admin'', true) = ''true'' OR
            is_custom = false OR
            tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid
        ) WITH CHECK (
            current_setting(''app.is_system_admin'', true) = ''true'' OR
            (is_custom = true AND tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')::uuid)
        );';
    END IF;

    -- 4. Round Robin State
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'round_robin_state') THEN
        EXECUTE 'ALTER TABLE round_robin_state ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'ALTER TABLE round_robin_state FORCE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON round_robin_state;';
        EXECUTE 'CREATE POLICY tenant_isolation_policy ON round_robin_state FOR ALL USING (
            current_setting(''app.is_system_admin'', true) = ''true'' OR
            NULLIF(current_setting(''app.current_tenant_id'', true), '''') IS NOT NULL
        );';
    END IF;
END $$;
