import { pool } from '@shared/db';
import { BaseRepository } from '@shared/repositories/BaseRepository';
import { roles, type Role, type Permission } from '@shared/db/schema';

/**
 * Data repository encapsulating relational RBAC queries for roles, permissions, and user role assignments.
 */
export class PermissionRepository extends BaseRepository<Role> {
  constructor() {
    super(roles, 'roles');
  }

  /**
   * Retrieves all active permission codes granted to a user in a tenant.
   *
   * @param userId - Unique user ID
   * @param tenantId - Unique tenant ID
   * @returns Array of unique permission code strings (e.g. ['crm:leads:read', 'tickets:create'])
   */
  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT p.code
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = $1 AND ur.tenant_id = $2
      ORDER BY p.code ASC
    `;
    const res = await pool.query(query, [userId, tenantId]);
    return res.rows.map((r: { code: string }) => r.code);
  }

  /**
   * Retrieves all roles assigned to a user in a tenant.
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns Array of assigned Role records
   */
  async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    const query = `
      SELECT r.*
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.tenant_id = $2
      ORDER BY r.name ASC
    `;
    const res = await pool.query(query, [userId, tenantId]);
    return res.rows;
  }

  /**
   * Retrieves all available roles for a tenant, including global system template roles.
   *
   * @param tenantId - Tenant ID
   * @returns Array of Role records
   */
  async getRolesForTenant(tenantId: string): Promise<Role[]> {
    const query = `
      SELECT *
      FROM roles
      WHERE tenant_id IS NULL OR tenant_id = $1
      ORDER BY is_system DESC, name ASC
    `;
    const res = await pool.query(query, [tenantId]);
    return res.rows;
  }

  /**
   * Retrieves all registered permissions cataloged in the system.
   *
   * @returns Array of Permission records
   */
  async getAllPermissions(): Promise<Permission[]> {
    const query = `
      SELECT *
      FROM permissions
      ORDER BY module ASC, code ASC
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  /**
   * Idempotently upserts discovered module permission codes into the PostgreSQL `permissions` table.
   * Ensures newly scaffolded module capabilities (`ADR-017`) are immediately available in Dynamic RBAC (`BL-302`).
   *
   * @param entries - Array of permission catalog definitions (`code`, `module`, `description`)
   * @see BL-302
   */
  async upsertPermissions(
    entries: Array<{ code: string; module: string; description: string }>
  ): Promise<void> {
    if (entries.length === 0) return;

    const values: string[] = [];
    const params: string[] = [];
    entries.forEach((entry, idx) => {
      const base = idx * 3;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      params.push(entry.code, entry.module, entry.description);
    });

    const query = `
      INSERT INTO permissions (code, module, description)
      VALUES ${values.join(', ')}
      ON CONFLICT (code) DO NOTHING
    `;
    await pool.query(query, params);
  }

  /**
   * Idempotently seeds `role_permissions` bindings declared in module `security.csv` files
   * for global/system roles (`WHERE tenant_id IS NULL`). Uses `ON CONFLICT DO NOTHING` so
   * custom Admin modifications in PostgreSQL are never overwritten.
   *
   * @param bindings - Array of `{ roleName, permissionCode }` pairs
   * @see BL-302
   */
  async seedRolePermissions(
    bindings: Array<{ roleName: string; permissionCode: string }>
  ): Promise<void> {
    if (bindings.length === 0) return;

    const roleNames = Array.from(new Set(bindings.map((b) => b.roleName)));
    for (const roleName of roleNames) {
      await pool.query(
        `
        INSERT INTO roles (name, description, is_system, tenant_id)
        SELECT $1::varchar(100), $2::text, true, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM roles WHERE UPPER(name) = UPPER($1::varchar(100)) AND tenant_id IS NULL
        )
        `,
        [roleName, `System default role: ${roleName}`]
      );
    }

    for (const binding of bindings) {
      await pool.query(
        `
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.code = $2
        WHERE UPPER(r.name) = UPPER($1) AND r.tenant_id IS NULL
        ON CONFLICT (role_id, permission_id) DO NOTHING
        `,
        [binding.roleName, binding.permissionCode]
      );
    }
  }

  /**
   * Assigns a role to a user within a tenant idempotently.
   *
   * @param userId - Target user ID
   * @param roleId - Target role ID
   * @param tenantId - Tenant ID
   */
  async assignRoleToUser(userId: string, roleId: string, tenantId: string): Promise<void> {
    const query = `
      INSERT INTO user_roles (user_id, role_id, tenant_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
    await pool.query(query, [userId, roleId, tenantId]);
  }

  /**
   * Removes a role from a user within a tenant.
   *
   * @param userId - Target user ID
   * @param roleId - Target role ID
   * @param tenantId - Tenant ID
   */
  async removeRoleFromUser(userId: string, roleId: string, tenantId: string): Promise<void> {
    const query = `
      DELETE FROM user_roles
      WHERE user_id = $1 AND role_id = $2 AND tenant_id = $3
    `;
    await pool.query(query, [userId, roleId, tenantId]);
  }
}

export const permissionRepository = new PermissionRepository();
