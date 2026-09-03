import { Router } from 'express';
import { expenseController } from '@modules/billing/controllers/ExpenseController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { ExpenseQueryDTO, ExpenseIdParamDTO, CreateExpenseDTO } from '@shared/dtos/billing.dto';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/expenses — List organization expenses */
router.get('/', validate(ExpenseQueryDTO, 'query'), (req, res) => expenseController.getAll(req, res));

/** GET /api/v1/expenses/:id — Get expense details */
router.get('/:id', validate(ExpenseIdParamDTO, 'params'), (req, res) => expenseController.getById(req, res));

/** POST /api/v1/expenses — Log a new business expense */
router.post('/', validate(CreateExpenseDTO, 'body'), (req, res) => expenseController.create(req, res));

/** DELETE /api/v1/expenses/:id — Delete an expense */
router.delete('/:id', validate(ExpenseIdParamDTO, 'params'), (req, res) => expenseController.delete(req, res));

export default router;
