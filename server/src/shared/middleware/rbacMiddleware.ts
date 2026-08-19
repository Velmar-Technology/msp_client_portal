import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/types';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Pass allowed roles to restrict endpoint access.
 *
 * Usage: rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN)
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
