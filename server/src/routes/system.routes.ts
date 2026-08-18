import { Router } from 'express';
import { systemController } from '../controllers/SystemController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';
import { UserRole } from '../types';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/system/storage — Get Nextcloud storage status (Admin only) */
router.get(
  '/storage',
  rbacMiddleware(UserRole.ADMIN),
  (req, res, next) => systemController.getStorageStatus(req, res, next),
);

/** GET /api/v1/system/api-status — Get overall system & API status breakdown (Admin only) */
router.get(
  '/api-status',
  rbacMiddleware(UserRole.ADMIN),
  (req, res, next) => systemController.getApiStatus(req, res, next),
);

export default router;

