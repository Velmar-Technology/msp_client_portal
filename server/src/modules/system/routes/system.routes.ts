import { Router } from 'express';
import { systemController } from '@modules/system/controllers/SystemController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { UserRole } from '@shared/types';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/system/storage — Get Nextcloud storage status (Admin only) */
router.get(
  '/storage',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => systemController.getStorageStatus(req, res),
);

/** GET /api/v1/system/api-status — Get overall system & API status breakdown (Admin only) */
router.get(
  '/api-status',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => systemController.getApiStatus(req, res),
);

export default router;
