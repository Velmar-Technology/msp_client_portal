import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@shared/config/env';
import { JwtPayload } from '@shared/types';
import { UnauthorizedError } from '@shared/errors';
import { userRepository } from '@modules/auth';

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches the decoded user to req.user.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];

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
