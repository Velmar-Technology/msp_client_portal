import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@shared/config/env';
import { JwtPayload } from '@shared/types';
import { UnauthorizedError } from '@shared/errors';
import { userRepository } from '@modules/auth';

/**
 * Express middleware validating incoming JWT Bearer tokens and populating req.user context.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next function
 * @throws {UnauthorizedError} When token is missing, invalid, or expired
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query?.token === 'string' && req.query.token.length > 0) {
    token = req.query.token as string;
  }

  if (!token) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    
    // Fallback: If tenantId is missing from the token, fetch it from the database
    if (!decoded.tenantId && decoded.userId) {
      const user = await userRepository.findById(decoded.userId);
      if (user) {
        decoded.tenantId = user.tenant_id;
      }
    }

    req.user = decoded;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
