import { Router } from 'express';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { requirePermission } from '@shared/middleware/requirePermission';
import { validate } from '@shared/middleware/validationMiddleware';
import { CreateKbInputSchema } from '@shared/contracts';
import { kbController } from '../controllers/KbController';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('helpdesk:kb:read'), (req, res) =>
  kbController.list(req, res)
);

router.get('/:id', requirePermission('helpdesk:kb:read'), (req, res) =>
  kbController.getById(req, res)
);

router.post(
  '/',
  requirePermission('helpdesk:kb:create'),
  validate(CreateKbInputSchema),
  (req, res) => kbController.create(req, res)
);

export default router;
