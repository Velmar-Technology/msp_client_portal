import { Router } from 'express';
import { notificationPreferenceController } from '@modules/notifications/controllers/NotificationPreferenceController';
import { authMiddleware } from '@shared/middleware/authMiddleware';

const router = Router();

// All preference routes require authentication
router.use(authMiddleware);

/** GET /api/v1/notification-preferences — Get user's preferences */
router.get('/', (req, res) => notificationPreferenceController.getPreferences(req, res));

/** PUT /api/v1/notification-preferences — Update user's preferences */
router.put('/', (req, res) => notificationPreferenceController.updatePreferences(req, res));

export default router;
