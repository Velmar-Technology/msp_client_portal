import { Router } from 'express';
import { tenantController } from '@modules/auth/controllers/TenantController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { UserRole } from '@shared/types';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/tenants — List all registered tenant organizations (Admin & Technician only) */
router.get(
  '/',
  rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN),
  (req, res) => tenantController.listTenants(req, res)
);

/** GET /api/v1/tenants/:id — Get details of a specific tenant organization (Admin & Technician only) */
router.get(
  '/:id',
  rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN),
  (req, res) => tenantController.getTenant(req, res)
);

export default router;
