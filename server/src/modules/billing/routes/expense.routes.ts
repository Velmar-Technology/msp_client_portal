import { Router } from 'express';
import { expenseController } from '@modules/billing/controllers/ExpenseController';
import { authMiddleware } from '@shared/middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/expenses — List organization expenses */
router.get('/', (req, res) => expenseController.getAll(req, res));

/** GET /api/v1/expenses/:id — Get expense details */
router.get('/:id', (req, res) => expenseController.getById(req, res));

/** POST /api/v1/expenses — Log a new business expense */
router.post('/', (req, res) => expenseController.create(req, res));

/** DELETE /api/v1/expenses/:id — Delete an expense */
router.delete('/:id', (req, res) => expenseController.delete(req, res));

export default router;
