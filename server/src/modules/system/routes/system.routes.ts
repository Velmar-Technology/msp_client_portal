import { Router } from 'express';
import { systemController } from '@modules/system/controllers/SystemController';
import { technicianEarningsController } from '@modules/system/controllers/TechnicianEarningsController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { requireSubscriptionFeature } from '@shared/middleware/requireSubscriptionFeature';
import { createGatewayRateLimiter } from '@shared/middleware/gatewayRateLimiterMiddleware';
import { UserRole, FEATURE_CODES } from '@shared/types';

const router = Router();

router.use(authMiddleware);

const vaultResetLimiter = createGatewayRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  prefix: 'ratelimit:vault:reset',
  keyGenerator: (req) => {
    const user = (req as any).user;
    const userId = user?.userId || user?.id || user?.email || req.ip || '127.0.0.1';
    const tenantId = user?.tenant_id || user?.tenantId || 'global';
    return `${tenantId}:${userId}`;
  },
  message: 'Too many vault reset attempts. Please wait 15 minutes before trying again.',
});

/** POST /api/v1/system/vault/reset-user-access — Self-service vault reset and re-invitation */
router.post(
  '/vault/reset-user-access',
  vaultResetLimiter,
  requireSubscriptionFeature(FEATURE_CODES.PASSWORD_MANAGER),
  (req, res) => systemController.resetVaultAccess(req, res),
);

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

/** GET /api/v1/system/technicians/me/earnings — Get personal earnings and closed-ticket history (Technician & Admin) */
router.get(
  '/technicians/me/earnings',
  rbacMiddleware(UserRole.TECHNICIAN, UserRole.ADMIN),
  (req, res) => technicianEarningsController.getMyEarnings(req, res),
);

/** GET /api/v1/system/technicians/earnings — Get organization-wide technician earnings roster (Admin only) */
router.get(
  '/technicians/earnings',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => technicianEarningsController.getAdminEarningsOverview(req, res),
);

/** POST /api/v1/system/technicians/earnings/payout — Process batch payout for earnings (Admin only) */
router.post(
  '/technicians/earnings/payout',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => technicianEarningsController.processBatchPayout(req, res),
);

/** POST /api/v1/system/technicians/earnings/recalculate — Recalculate and sync closed ticket commissions (Admin only) */
router.post(
  '/technicians/earnings/recalculate',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => technicianEarningsController.recalculateCommissions(req, res),
);

/** PUT /api/v1/system/technicians/rates — Update technician closed rate and priority multipliers (Admin only) */
router.put(
  '/technicians/rates',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => technicianEarningsController.updateRates(req, res),
);

export default router;

