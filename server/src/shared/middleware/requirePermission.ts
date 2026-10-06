import { Request, Response, NextFunction } from 'express';
import { permissionService } from '@modules/auth';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';

/**
 * Capability-based Authorization middleware factory.
 * Verifies that the authenticated caller has ALL specified permission capabilities.
 *
 * @example
 * ```ts
 * router.get('/leads', requirePermission('crm:leads:read'), handler);
 * ```
 *
 * @param permissions - One or more required permission codes
 * @param service - Optional PermissionService injection for testing
 * @returns Express middleware function
 * @throws {UnauthorizedError} When req.user is absent
 * @throws {ForbiddenError} When user lacks one or more required permissions
 */
export function requirePermission(
  ...permissions: string[]
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPerms = req.user.permissions || (
      await permissionService.getUserPermissions(req.user.userId, req.user.tenantId, req.user.role)
    );

    // Save resolved permissions on request context
    req.user.permissions = userPerms;

    if (userPerms.includes('*')) {
      return next();
    }

    const missing = permissions.filter((p) => !userPerms.includes(p));
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
 * Verifies that the authenticated caller has AT LEAST ONE of the specified permission capabilities.
 *
 * @example
 * ```ts
 * router.get('/telemetry', requireAnyPermission('devices:read', 'system:read'), handler);
 * ```
 *
 * @param permissions - List of permitted alternative permission codes
 * @returns Express middleware function
 * @throws {UnauthorizedError} When req.user is absent
 * @throws {ForbiddenError} When user lacks all of the specified permissions
 */
export function requireAnyPermission(
  ...permissions: string[]
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPerms = req.user.permissions || (
      await permissionService.getUserPermissions(req.user.userId, req.user.tenantId, req.user.role)
    );

    req.user.permissions = userPerms;

    if (userPerms.includes('*') || permissions.some((p) => userPerms.includes(p))) {
      return next();
    }

    throw new ForbiddenError(
      `Access denied. Requires at least one capability: ${permissions.join(' or ')}`
    );
  };
}
