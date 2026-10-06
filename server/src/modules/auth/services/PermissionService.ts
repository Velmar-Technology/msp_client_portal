import { PermissionRepository, permissionRepository } from '../repositories/PermissionRepository';
import { cacheManager, CacheManager } from '@shared/utils/cache/CacheManager';
import { UserRole } from '@shared/types';
import { logger } from '@shared/utils/logger';

const ALL_SYSTEM_PERMISSIONS = [
  'users:read',
  'users:manage',
  'roles:manage',
  'crm:leads:read',
  'crm:leads:write',
  'crm:quotes:write',
  'invoices:read',
  'invoices:write',
  'invoices:mark_paid',
  'devices:read',
  'devices:manage',
  'tickets:read',
  'tickets:create',
  'tickets:manage',
  'plans:read',
  'plans:manage',
  'system:read',
  'system:audit',
];

const TECHNICIAN_DEFAULT_PERMISSIONS = [
  'tickets:read',
  'tickets:manage',
  'devices:read',
  'devices:manage',
  'users:read',
  'invoices:read',
  'plans:read',
  'system:read',
];

const CLIENT_DEFAULT_PERMISSIONS = [
  'tickets:read',
  'tickets:create',
  'devices:read',
  'invoices:read',
  'plans:read',
];

/**
 * Domain service managing dynamic capabilities, RBAC resolution, and Redis permission caching.
 */
export class PermissionService {
  /**
   * Initializes PermissionService with repository and cache manager dependencies.
   *
   * @param permRepo - Data repository for permission queries
   * @param cache - Cache abstraction conforming to CachePort
   */
  constructor(
    private permRepo: PermissionRepository = permissionRepository,
    private cache: CacheManager = cacheManager
  ) {}

  /**
   * Resolves the complete set of permission codes for a user with sub-millisecond Redis caching.
   * Supports zero-downtime backwards compatibility with legacy user roles.
   *
   * @param userId - Unique user ID
   * @param tenantId - Unique tenant ID
   * @param legacyRole - Optional legacy UserRole for fail-safe fallback
   * @returns Array of unique permission code strings
   */
  async getUserPermissions(
    userId: string,
    tenantId: string,
    legacyRole?: UserRole | string
  ): Promise<string[]> {
    if (!userId || !tenantId) {
      return [];
    }

    // Wrap in versioned cache under 'rbac' namespace with 15-minute TTL
    return this.cache.wrapVersioned<string[]>(
      'rbac',
      tenantId,
      `perms:${userId}`,
      900,
      async () => {
        try {
          const dbPerms = await this.permRepo.getUserPermissions(userId, tenantId);

          if (dbPerms.length > 0) {
            // If user is also ADMIN, ensure all capabilities are present
            if (legacyRole === UserRole.ADMIN || legacyRole === 'ADMIN') {
              return Array.from(new Set([...dbPerms, ...ALL_SYSTEM_PERMISSIONS]));
            }
            return dbPerms;
          }

          // Backwards-compatible fallback when relational rows haven't been backfilled yet
          if (legacyRole === UserRole.ADMIN || legacyRole === 'ADMIN') {
            return ALL_SYSTEM_PERMISSIONS;
          }
          if (legacyRole === UserRole.TECHNICIAN || legacyRole === 'TECHNICIAN') {
            return TECHNICIAN_DEFAULT_PERMISSIONS;
          }
          if (legacyRole === UserRole.CLIENT || legacyRole === 'CLIENT') {
            return CLIENT_DEFAULT_PERMISSIONS;
          }

          return [];
        } catch (error) {
          logger.warn(`Failed to query permissions from DB for user ${userId}, falling back to role fallback:`, error);
          if (legacyRole === UserRole.ADMIN || legacyRole === 'ADMIN') {
            return ALL_SYSTEM_PERMISSIONS;
          }
          return [];
        }
      }
    );
  }

  /**
   * Verifies if a user possesses a specific permission capability.
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param requiredPermission - Permission code to check (e.g. 'crm:leads:read')
   * @param legacyRole - Optional legacy role fallback
   * @returns Boolean indicating whether permission is granted
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    requiredPermission: string,
    legacyRole?: UserRole | string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId, legacyRole);
    return permissions.includes(requiredPermission) || permissions.includes('*');
  }

  /**
   * Verifies if a user possesses any of the specified permission capabilities.
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param requiredPermissions - Array of permission codes
   * @param legacyRole - Optional legacy role fallback
   * @returns Boolean indicating whether at least one permission is granted
   */
  async hasAnyPermission(
    userId: string,
    tenantId: string,
    requiredPermissions: string[],
    legacyRole?: UserRole | string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId, legacyRole);
    return requiredPermissions.some((p) => permissions.includes(p) || permissions.includes('*'));
  }

  /**
   * Invalidates cached permissions for a specific user.
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   */
  async invalidateUserPermissions(userId: string, tenantId: string): Promise<void> {
    const key = `rbac:${tenantId}:perms:${userId}`;
    await this.cache.del(key);
  }

  /**
   * Atomically invalidates all cached permissions across a tenant.
   *
   * @param tenantId - Tenant ID
   */
  async invalidateTenantPermissions(tenantId: string): Promise<void> {
    await this.cache.invalidateScope('rbac', tenantId);
  }
}

export const permissionService = new PermissionService();
