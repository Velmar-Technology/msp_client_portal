import { Request, Response } from 'express';
import { expenseService } from '@modules/billing/services/ExpenseService';
import { UserRole } from '@shared/types';
import { z } from 'zod';

const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['cloudInfra', 'salaries', 'marketing', 'officeSpace', 'other']),
  expense_date: z.string().transform((str) => new Date(str)).optional(),
  tenantId: z.string().uuid().optional(),
  expense_identifier: z.string().max(100).optional().nullable(),
});

/**
 * Controller handling HTTP requests for operational expense tracking, category filtering, and expense management.
 */
export class ExpenseController {
  /**
   * Handles listing paginated expenses for current tenant or all expenses for administrators.
   *
   * @param req - Express request with pagination query parameters
   * @param res - Express response returning expenses array and pagination metadata
   */
  async getAll(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Handles retrieving a single expense by UUID.
   *
   * @param req - Express request with expense ID in params
   * @param res - Express response returning expense entity
   */
  async getById(req: Request, res: Response): Promise<void> {
    const expense = await expenseService.getExpenseById(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole
    );
    res.json({ success: true, data: expense });
  }

  /**
   * Handles creating a new operational expense entry.
   *
   * @param req - Express request with createExpenseSchema body
   * @param res - Express response returning HTTP 201 with created expense
   */
  async create(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Handles deleting an operational expense entry.
   *
   * @param req - Express request with expense ID in params
   * @param res - Express response returning success message
   */
  async delete(req: Request, res: Response): Promise<void> {
    await expenseService.deleteExpense(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole
    );
    res.json({ success: true, message: 'Expense deleted successfully' });
  }
}

export const expenseController = new ExpenseController();
