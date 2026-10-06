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
