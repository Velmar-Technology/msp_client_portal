-- Migration 052: Add GUEST to user_role enum and seed GUEST system role (ADR-017 / BL-302)

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GUEST';

INSERT INTO roles (name, description, is_system, tenant_id)
SELECT 'GUEST', 'Guest user with restricted author-scoped access and cross-tenant invitation scoping', true, NULL
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE UPPER(name) = 'GUEST' AND tenant_id IS NULL
);
