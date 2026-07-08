import { Router } from 'express';
import { expenseController } from '../controllers/ExpenseController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/expenses — List organization expenses */
router.get('/', (req, res, next) => expenseController.getAll(req, res, next));

/** GET /api/v1/expenses/:id — Get expense details */
router.get('/:id', (req, res, next) => expenseController.getById(req, res, next));

/** POST /api/v1/expenses — Log a new business expense */
router.post('/', (req, res, next) => expenseController.create(req, res, next));

/** DELETE /api/v1/expenses/:id — Delete an expense */
router.delete('/:id', (req, res, next) => expenseController.delete(req, res, next));

export default router;
