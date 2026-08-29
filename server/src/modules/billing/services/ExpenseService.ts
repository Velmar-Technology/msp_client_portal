import { expenseRepository, ExpenseRepository } from '@modules/billing/repositories/ExpenseRepository';
import { NotFoundError, ForbiddenError, ValidationError } from '@shared/errors';
import { Expense, UserRole } from '@shared/types';

/**
 * Domain service managing operational expense records, financial classifications, and admin permissions.
 */
export class ExpenseService {
  /**
   * Initializes ExpenseService with ExpenseRepository dependency.
   *
   * @param expenseRepo - Operational expenses repository
   */
  constructor(private expenseRepo: ExpenseRepository = expenseRepository) {}

  /**
   * Retrieves paginated expenses scoped by user role and tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @param page - Page number
   * @param limit - Page size
   * @returns Object with expenses array and total count
   */
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

  /**
   * Retrieves a single expense record by UUID with tenant authorization check.
   *
   * @param id - Expense UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @returns Expense entity
   * @throws {NotFoundError} When expense does not exist
   * @throws {ForbiddenError} When client user attempts to access another tenant's expense
   */
  async getExpenseById(id: string, tenantId: string, userRole: UserRole): Promise<Expense> {
    const expense = await this.expenseRepo.findById(id);
    if (!expense) throw new NotFoundError('Expense not found');
    if (userRole === UserRole.CLIENT && expense.tenant_id !== tenantId) {
      throw new ForbiddenError('Access denied');
    }
    return expense;
  }

  /**
   * Creates a new operational expense entry (Admin only).
   *
   * @param data - Expense data (amount, description, category, expense_date, tenant_id, expense_identifier)
   * @param userRole - Calling user role
   * @returns Created Expense entity
   * @throws {ForbiddenError} When caller is not an administrator
   * @throws {ValidationError} When amount is less than or equal to zero
   */
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

  /**
   * Deletes an operational expense entry (Admin only).
   *
   * @param id - Expense UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @returns True if deleted successfully
   * @throws {ForbiddenError} When caller is not an administrator
   * @throws {NotFoundError} When expense not found
   */
  async deleteExpense(id: string, tenantId: string, userRole: UserRole): Promise<boolean> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can delete expenses');
    }
    const expense = await this.getExpenseById(id, tenantId, userRole);
    return this.expenseRepo.deleteById(expense.id);
  }
}

export const expenseService = new ExpenseService();
