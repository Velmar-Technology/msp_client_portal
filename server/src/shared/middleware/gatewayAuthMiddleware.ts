import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@shared/config/env';
import { JwtPayload } from '@shared/types';
import { userRepository } from '@modules/auth';

/**
 * Ingress Gateway Authentication & Header Injection Middleware.
 * Decodes Bearer JWTs at the entry point and injects standardized downstream headers:
 * - `X-User-Id`
 * - `X-Tenant-Id`
 * Also populates `req.user` for downstream context compatibility.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next function
 */
export async function gatewayAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      // Fallback: If tenantId is missing from token payload, retrieve from repository
      if (!decoded.tenantId && decoded.userId) {
        const user = await userRepository.findById(decoded.userId);
        if (user) {
          decoded.tenantId = user.tenant_id;
        }
      }

      // Inject downstream standard gateway headers
      if (decoded.userId) {
        req.headers['x-user-id'] = decoded.userId;
      }
      if (decoded.tenantId) {
        req.headers['x-tenant-id'] = decoded.tenantId;
      }

      req.user = decoded;
    } catch {
      // Malformed or expired token will be handled by authMiddleware for protected routes
    }
  }

  next();
}
