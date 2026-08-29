import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/types';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Restricts endpoint invocation strictly to designated user roles.
 *
 * @example
 * ```ts
 * router.get('/admin', rbacMiddleware(UserRole.ADMIN), handler);
 * ```
 *
 * @param allowedRoles - Variadic list of permitted UserRole values
 * @returns Express middleware function
 * @throws {UnauthorizedError} When req.user is absent
 * @throws {ForbiddenError} When user role is not among allowedRoles
 */
export function rbacMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      );
    }

    next();
  };
}
