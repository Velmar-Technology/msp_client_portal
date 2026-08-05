import { Router } from 'express';
import { planController } from '../controllers/PlanController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { CreatePlanDTO, UpdatePlanDTO } from '../dtos/plan.dto';
import { UserRole } from '../types';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/plans — List all plans */
router.get('/', (req, res) => planController.getAll(req, res));

/** GET /api/v1/plans/:id — Get plan details */
router.get('/:id', (req, res) => planController.getById(req, res));

/** POST /api/v1/plans — Create new plan (Admin only) */
router.post(
  '/',
  rbacMiddleware(UserRole.ADMIN),
  validate(CreatePlanDTO),
  (req, res) => planController.create(req, res)
);

/** PATCH /api/v1/plans/:id — Update plan (Admin only) */
router.patch(
  '/:id',
  rbacMiddleware(UserRole.ADMIN),
  validate(UpdatePlanDTO),
  (req, res) => planController.update(req, res)
);

/** DELETE /api/v1/plans/:id — Soft delete plan (Admin only) */
router.delete(
  '/:id',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => planController.delete(req, res)
);

export default router;
