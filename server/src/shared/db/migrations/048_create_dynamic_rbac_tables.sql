-- Migration 048: Create dynamic RBAC tables (roles, permissions, role_permissions, user_roles)
-- Eliminates hardcoded user types and roles by delegating to relational database RBAC with fine-grained capability codes.

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_tenant_name ON roles(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles(tenant_id);

-- Enable fail-closed Row-Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON roles;
CREATE POLICY tenant_isolation_policy ON roles FOR ALL USING (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id IS NULL OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON user_roles;
CREATE POLICY tenant_isolation_policy ON user_roles FOR ALL USING (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
) WITH CHECK (
    current_setting('app.is_system_admin', true) = 'true' OR
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
);

-- Seed Baseline Permissions Catalog
INSERT INTO permissions (code, module, description) VALUES
    ('users:read', 'auth', 'View user accounts and profiles'),
    ('users:manage', 'auth', 'Create, update, invite, and delete user accounts'),
    ('roles:manage', 'auth', 'Configure custom roles and permission mappings'),
    ('crm:leads:read', 'crm', 'View CRM sales pipeline and leads'),
    ('crm:leads:write', 'crm', 'Create and modify CRM leads and opportunities'),
    ('crm:quotes:write', 'crm', 'Generate and send commercial quotations'),
    ('invoices:read', 'billing', 'View billing history and invoices'),
    ('invoices:write', 'billing', 'Generate, update, and void invoices'),
    ('invoices:mark_paid', 'billing', 'Capture payments and mark invoices as paid'),
    ('devices:read', 'equipment', 'Inspect provisioned workstations and telemetry'),
    ('devices:manage', 'equipment', 'Provision, deploy, and lock physical devices'),
    ('tickets:read', 'tickets', 'Read tickets and communication threads'),
    ('tickets:create', 'tickets', 'Submit helpdesk tickets'),
    ('tickets:manage', 'tickets', 'Assign, escalate, and resolve tickets'),
    ('plans:read', 'subscriptions', 'View subscription plan catalog'),
    ('plans:manage', 'subscriptions', 'Create, edit, and retire subscription plans'),
    ('system:read', 'system', 'Inspect system health and service telemetry'),
    ('system:audit', 'system', 'Run Sentinel audits and autonomous repairs')
ON CONFLICT (code) DO NOTHING;

-- Seed Global System Template Roles (tenant_id = NULL, is_system = true)
INSERT INTO roles (id, tenant_id, name, description, is_system) VALUES
    ('10000000-0000-0000-0000-000000000001', NULL, 'ADMIN', 'System Administrator with full organizational capabilities', true),
    ('10000000-0000-0000-0000-000000000002', NULL, 'TECHNICIAN', 'Field Support Technician with ticket and endpoint management capabilities', true),
    ('10000000-0000-0000-0000-000000000003', NULL, 'CLIENT', 'Standard client user with support and subscription access', true)
ON CONFLICT DO NOTHING;

-- Map Permissions to System Roles
-- ADMIN gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000001', p.id
FROM permissions p
ON CONFLICT DO NOTHING;

-- TECHNICIAN permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000002', p.id
FROM permissions p
WHERE p.code IN (
    'tickets:read', 'tickets:manage', 'devices:read', 'devices:manage',
    'users:read', 'invoices:read', 'plans:read', 'system:read'
)
ON CONFLICT DO NOTHING;

-- CLIENT permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000003', p.id
FROM permissions p
WHERE p.code IN (
    'tickets:read', 'tickets:create', 'devices:read',
    'invoices:read', 'plans:read'
)
ON CONFLICT DO NOTHING;

-- Backfill existing users in users table into user_roles
INSERT INTO user_roles (user_id, role_id, tenant_id)
SELECT u.id, r.id, u.tenant_id
FROM users u
JOIN roles r ON r.name = u.role::text AND r.tenant_id IS NULL
ON CONFLICT (user_id, role_id) DO NOTHING;
