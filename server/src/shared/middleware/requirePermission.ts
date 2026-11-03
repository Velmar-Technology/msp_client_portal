import { Request, Response, NextFunction } from 'express';
import type { PermissionRequirement } from '@shared/contracts';
import { permissionService, matchesHierarchicalPermission } from '@modules/auth';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';

/**
 * Capability-based Authorization middleware factory.
 * Verifies that the authenticated caller has ALL specified permission capabilities
 * (evaluated via `matchesHierarchicalPermission` under strict Least Privilege).
 *
 * @example
 * ```ts
 * router.get('/leads', requirePermission('crm:leads:read'), handler);
 * ```
 *
 * @param permissions - One or more required permission codes
 * @returns Express middleware function
 * @throws {UnauthorizedError} When req.user is absent
 * @throws {ForbiddenError} When user lacks one or more required permissions
 * @see BL-302
 */
export function requirePermission(
  ...permissions: Array<PermissionRequirement | PermissionRequirement[]>
) {
  const flatPermissions = permissions.flat();
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPerms = req.user.permissions || (
      await permissionService.getUserPermissions(req.user.userId, req.user.tenantId, req.user.role)
    );

    // Save resolved permissions on request context
    req.user.permissions = userPerms;

    const missing = flatPermissions.filter((p) => !matchesHierarchicalPermission(userPerms, p));
    if (missing.length > 0) {
      throw new ForbiddenError(
        `Access denied. Missing required capability: ${missing.join(', ')}`
      );
    }

    next();
  };
}

/**
 * Capability-based Authorization middleware factory for ANY matching permission.
 * Verifies that the authenticated caller has AT LEAST ONE of the specified permission capabilities
 * (evaluated via `matchesHierarchicalPermission` under strict Least Privilege).
 *
 * @example
 * ```ts
 * router.get('/telemetry', requireAnyPermission('devices:read', 'system:read'), handler);
 * ```
 *
 * @param permissions - List of permitted alternative permission codes (rest params or array)
 * @returns Express middleware function
 * @throws {UnauthorizedError} When req.user is absent
 * @throws {ForbiddenError} When user lacks all of the specified permissions
 * @see BL-302
 */
export function requireAnyPermission(
  ...permissions: Array<PermissionRequirement | PermissionRequirement[]>
) {
  const flatPermissions = permissions.flat();
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPerms = req.user.permissions || (
      await permissionService.getUserPermissions(req.user.userId, req.user.tenantId, req.user.role)
    );

    req.user.permissions = userPerms;

    if (flatPermissions.some((p) => matchesHierarchicalPermission(userPerms, p))) {
      return next();
    }

    throw new ForbiddenError(
      `Access denied. Requires at least one capability: ${flatPermissions.join(' or ')}`
    );
  };
}
