import { Router, Request, Response, NextFunction } from 'express';
import { notificationController } from '../controllers/NotificationController';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';
import { AppError } from '../utils/AppError';
import { userRepository } from '../repositories/UserRepository';

const router = Router();

/**
 * Flexible authentication middleware that accepts Bearer token in Headers
 * OR token as a query parameter (needed for browser native EventSource).
 */
async function flexibleAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  let token = req.query.token as string;
  
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(AppError.unauthorized('Missing or invalid authorization token'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

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

// All notification routes require flexible authentication
router.use(flexibleAuthMiddleware);

/** GET /api/v1/notifications — Get all notifications for current user */
router.get('/', (req, res) => notificationController.getAll(req, res));

/** GET /api/v1/notifications/stream — SSE Real-time notification stream */
router.get('/stream', (req, res) => notificationController.stream(req, res));

/** PUT /api/v1/notifications/:id/read — Mark a single notification as read */
router.put('/:id/read', (req, res) => notificationController.markAsRead(req, res));

/** PUT /api/v1/notifications/read-all — Mark all notifications as read */
router.put('/read-all', (req, res) => notificationController.markAllAsRead(req, res));

/** DELETE /api/v1/notifications — Clear all notifications for current user */
router.delete('/', (req, res) => notificationController.clearAll(req, res));

export default router;
