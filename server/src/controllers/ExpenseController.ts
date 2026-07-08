import { Request, Response, NextFunction } from 'express';
import { expenseService } from '../services/ExpenseService';
import { UserRole } from '../types';
import { z } from 'zod';

const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['cloudInfra', 'salaries', 'marketing', 'officeSpace', 'other']),
  expense_date: z.string().transform((str) => new Date(str)).optional(),
  tenantId: z.string().uuid().optional(),
  expense_identifier: z.string().max(100).optional().nullable(),
});

export class ExpenseController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { expenses, total } = await expenseService.getExpenses(
        req.user!.tenantId,
        req.user!.role as UserRole,
        page,
        limit
      );
      res.json({
        success: true,
        data: expenses,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await expenseService.getExpenseById(
        req.params.id as string,
        req.user!.tenantId,
        req.user!.role as UserRole
      );
      res.json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createExpenseSchema.parse(req.body);
      const targetTenantId = dto.tenantId || req.user!.tenantId;

      const expense = await expenseService.createExpense({
        amount: dto.amount,
        description: dto.description,
        category: dto.category,
        expense_date: dto.expense_date || new Date(),
        tenant_id: targetTenantId,
        expense_identifier: dto.expense_identifier,
      }, req.user!.role as UserRole);

      res.status(201).json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await expenseService.deleteExpense(
        req.params.id as string,
        req.user!.tenantId,
        req.user!.role as UserRole
      );
      res.json({ success: true, message: 'Expense deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const expenseController = new ExpenseController();
