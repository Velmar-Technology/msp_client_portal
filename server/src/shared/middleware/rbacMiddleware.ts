import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/types';
import { AppError } from '@shared/utils/AppError';

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Pass allowed roles to restrict endpoint access.
 *
 * Usage: rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN)
 */
export function rbacMiddleware(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      throw AppError.forbidden(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      );
    }

    next();
  };
}
