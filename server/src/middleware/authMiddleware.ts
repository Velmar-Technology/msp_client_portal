import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { AppError } from '../utils/AppError';
import { userRepository } from '../repositories/UserRepository';

/**
 * JWT authentication middleware.
 * Verifies the Bearer token and attaches the decoded user to req.user.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or invalid authorization header'));
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
    next(AppError.unauthorized('Invalid or expired token'));
  }
}
