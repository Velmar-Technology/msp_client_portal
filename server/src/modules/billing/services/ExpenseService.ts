import { expenseRepository, ExpenseRepository } from '@modules/billing/repositories/ExpenseRepository';
import { NotFoundError, ForbiddenError, ValidationError } from '@shared/errors';
import { Expense, UserRole } from '@shared/types';

export class ExpenseService {
  constructor(private expenseRepo: ExpenseRepository = expenseRepository) {}
  async getExpenses(tenantId: string, userRole: UserRole, page = 1, limit = 20): Promise<{ expenses: Expense[]; total: number }> {
    const offset = (page - 1) * limit;
    if (userRole === UserRole.ADMIN) {
      const expenses = await this.expenseRepo.findAll(limit, offset);
      const total = await this.expenseRepo.count();
      return { expenses, total };
    } else {
      const expenses = await this.expenseRepo.findByTenant(tenantId, limit, offset);
      const total = await this.expenseRepo.countByTenant(tenantId);
      return { expenses, total };
    }
  }

  async getExpenseById(id: string, tenantId: string, userRole: UserRole): Promise<Expense> {
    const expense = await this.expenseRepo.findById(id);
    if (!expense) throw new NotFoundError('Expense not found');
    if (userRole === UserRole.CLIENT && expense.tenant_id !== tenantId) {
      throw new ForbiddenError('Access denied');
    }
    return expense;
  }

  async createExpense(data: {
    amount: number;
    description: string;
    category: string;
    expense_date: Date;
    tenant_id: string;
    expense_identifier?: string | null;
  }, userRole: UserRole): Promise<Expense> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can log expenses');
    }
    if (data.amount <= 0) {
      throw new ValidationError('Expense amount must be greater than zero');
    }
    return this.expenseRepo.create(data);
  }

  async deleteExpense(id: string, tenantId: string, userRole: UserRole): Promise<boolean> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can delete expenses');
    }
    const expense = await this.getExpenseById(id, tenantId, userRole);
    return this.expenseRepo.deleteById(expense.id);
  }
}

export const expenseService = new ExpenseService();
