import { Router } from 'express';
import { planController } from '../controllers/PlanController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { UpdatePlanDTO } from '../dtos/plan.dto';
import { UserRole } from '../types';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/plans — List all plans */
router.get('/', (req, res) => planController.getAll(req, res));

/** GET /api/v1/plans/:id — Get plan details */
router.get('/:id', (req, res) => planController.getById(req, res));

/** PATCH /api/v1/plans/:id — Update plan (Admin only) */
router.patch(
  '/:id',
  rbacMiddleware(UserRole.ADMIN),
  validate(UpdatePlanDTO),
  (req, res) => planController.update(req, res)
);

export default router;
