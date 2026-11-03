import { PermissionRepository, permissionRepository } from '../repositories/PermissionRepository';
import { cacheManager, CacheManager } from '@shared/utils/cache/CacheManager';
import { UserRole } from '@shared/types';
import { logger } from '@shared/utils/logger';
import {
  registeredModulePermissions,
  registeredSecurityRules,
} from '@shared/registry/permissions.generated';

const BASE_SYSTEM_PERMISSIONS = [
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
  'plans:read',
  'plans:manage',
  'system:read',
  'system:audit',
];

const BASE_TECHNICIAN_PERMISSIONS = [
  'devices:read',
  'devices:manage',
  'users:read',
  'invoices:read',
  'plans:read',
  'system:read',
];

const BASE_CLIENT_PERMISSIONS = [
  'devices:read',
  'invoices:read',
  'plans:read',
];

const IMPLIED_ACTIONS: Record<string, ReadonlySet<string>> = {
  '*': new Set(['*']),
  manage: new Set(['manage', 'write', 'create', 'update', 'delete', 'read']),
  write: new Set(['write', 'create', 'update', 'read']),
  create: new Set(['create']),
  update: new Set(['update']),
  delete: new Set(['delete']),
  read: new Set(['read']),
};

/**
 * Evaluates whether a set of granted permissions satisfies a required permission
 * under strict Least Privilege & Hierarchical RBAC rules (ADR-014 / ADR-017 / BL-302):
 * 1. Exact match or global `'*'` wildcard.
 * 2. Explicit namespace prefix wildcard (e.g., `'helpdesk:*'` or `'crm:leads:*'`).
 * 3. Action dominance (`manage` -> `write`/`create`/`update`/`delete`/`read`; `write` -> `create`/`update`/`read`)
 *    strictly within the **exact same module scope** (e.g., `'helpdesk:tickets:manage'` grants `'helpdesk:tickets:read'`,
 *    but a parent scope `'helpdesk:read'` or `'helpdesk:manage'` does NOT implicitly grant child sub-module capabilities
 *    unless an explicit `'helpdesk:*'` wildcard is granted).
 *
 * @param grantedPermissions - Array of permission codes held by the user
 * @param requiredPermission - Required permission code to verify
 * @returns Boolean indicating whether the required permission is satisfied
 * @see BL-302
 */
export function matchesHierarchicalPermission(
  grantedPermissions: string[],
  requiredPermission: string
): boolean {
  if (!requiredPermission) return false;

  const reqParts = requiredPermission.split(':');
  const reqAction = reqParts[reqParts.length - 1];
  const reqScopeParts = reqParts.slice(0, -1);

  for (const granted of grantedPermissions) {
    if (granted === '*' || granted === requiredPermission) {
      return true;
    }

    // Explicit namespace wildcard: e.g. 'helpdesk:*' or 'crm:leads:*'
    if (granted.endsWith(':*')) {
      const prefix = granted.slice(0, -1); // includes trailing ':'
      if (requiredPermission.startsWith(prefix)) {
        return true;
      }
    }

    // Action implication within the exact same module scope:
    // e.g. 'helpdesk:tickets:manage' -> 'helpdesk:tickets:create' | 'helpdesk:tickets:read'
    const grantParts = granted.split(':');
    if (grantParts.length < 2 || reqScopeParts.length === 0) {
      continue;
    }

    const grantAction = grantParts[grantParts.length - 1];
    const grantScopeParts = grantParts.slice(0, -1);

    // Least Privilege: parent scopes do NOT implicitly cascade to child sub-modules
    if (grantScopeParts.length !== reqScopeParts.length) {
      continue;
    }

    const isSameScope = grantScopeParts.every(
      (segment, idx) => segment === reqScopeParts[idx]
    );
    if (!isSameScope) {
      continue;
    }

    const impliedSet = IMPLIED_ACTIONS[grantAction];
    if (
      grantAction === reqAction ||
      impliedSet?.has('*') ||
      impliedSet?.has(reqAction)
    ) {
      return true;
    }
  }

  return false;
}

function getAllSystemPermissions(): string[] {
  return Array.from(
    new Set([
      ...BASE_SYSTEM_PERMISSIONS,
      ...(registeredModulePermissions ?? []).flatMap((p) => [
        ...(p.catalog ?? []),
        ...(p.admin ?? []),
        ...(p.technician ?? []),
        ...(p.client ?? []),
      ]),
    ])
  );
}

function getTechnicianDefaultPermissions(): string[] {
  return Array.from(
    new Set([
      ...BASE_TECHNICIAN_PERMISSIONS,
      ...(registeredModulePermissions ?? []).flatMap((p) => p.technician ?? []),
    ])
  );
}

function getClientDefaultPermissions(): string[] {
  return Array.from(
    new Set([
      ...BASE_CLIENT_PERMISSIONS,
      ...(registeredModulePermissions ?? []).flatMap((p) => p.client ?? []),
    ])
  );
}

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
              return Array.from(new Set([...dbPerms, ...getAllSystemPermissions()]));
            }
            return dbPerms;
          }

          // Backwards-compatible fallback when relational rows haven't been backfilled yet
          if (legacyRole === UserRole.ADMIN || legacyRole === 'ADMIN') {
            return getAllSystemPermissions();
          }
          if (legacyRole === UserRole.TECHNICIAN || legacyRole === 'TECHNICIAN') {
            return getTechnicianDefaultPermissions();
          }
          if (legacyRole === UserRole.CLIENT || legacyRole === 'CLIENT') {
            return getClientDefaultPermissions();
          }

          return [];
        } catch (error) {
          logger.warn(`Failed to query permissions from DB for user ${userId}, falling back to role fallback:`, error);
          if (legacyRole === UserRole.ADMIN || legacyRole === 'ADMIN') {
            return getAllSystemPermissions();
          }
          return [];
        }
      }
    );
  }

  /**
   * Verifies if a user possesses a specific permission capability (including hierarchical scopes).
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @param requiredPermission - Permission code to check (e.g. 'crm:leads:read' or 'assets:consumables:read')
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
    return matchesHierarchicalPermission(permissions, requiredPermission);
  }

  /**
   * Verifies if a user possesses any of the specified permission capabilities (including hierarchical scopes).
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
    return requiredPermissions.some((p) => matchesHierarchicalPermission(permissions, p));
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

  /**
   * Synchronizes auto-discovered module `security.csv` rules (`ADR-017`) with the
   * PostgreSQL `permissions`, `roles`, and `role_permissions` catalog (`ADR-014` / `BL-302`).
   * Idempotently upserts any missing capability codes and default role bindings into the database.
   *
   * @returns Array of all registered permission catalog entries
   * @see BL-302
   */
  async syncPermissionCatalog(): Promise<
    Array<{ code: string; module: string; description: string }>
  > {
    const csvByCode = new Map(
      (registeredSecurityRules ?? []).map((rule) => [rule.code, rule])
    );
    const allCodes = getAllSystemPermissions();

    const catalogEntries = allCodes.map((code) => {
      const csvRule = csvByCode.get(code);
      if (csvRule) {
        return {
          code: csvRule.code,
          module: csvRule.module,
          description: csvRule.description,
        };
      }
      const parts = code.split(':');
      const moduleName = parts[0] || 'system';
      const action = parts[parts.length - 1] || 'access';
      const scopeLabel = parts.slice(0, -1).join(' / ');
      return {
        code,
        module: moduleName,
        description: `Allows ${action} operations on ${scopeLabel}`,
      };
    });

    const roleBindings: Array<{ roleName: string; permissionCode: string }> = [];
    for (const rule of registeredSecurityRules ?? []) {
      for (const roleName of rule.roles) {
        roleBindings.push({ roleName, permissionCode: rule.code });
      }
    }

    try {
      await this.permRepo.upsertPermissions(catalogEntries);
      if (roleBindings.length > 0 && typeof this.permRepo.seedRolePermissions === 'function') {
        await this.permRepo.seedRolePermissions(roleBindings);
      }
    } catch (error) {
      logger.warn(
        'Failed to upsert discovered security.csv permissions into DB catalog; returning in-memory catalog:',
        error
      );
    }

    return catalogEntries;
  }
}

export const permissionService = new PermissionService();
