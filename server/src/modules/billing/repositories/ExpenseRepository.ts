import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Expense } from '@shared/types';
import { db, expenses } from '@shared/db';
import { eq, desc, count } from 'drizzle-orm';

/**
 * Data repository for operational expense records, category allocations, and tenant aggregations.
 */
export class ExpenseRepository extends BaseRepository<Expense> {
  /**
   * Initializes ExpenseRepository for the expenses database table.
   */
  constructor() {
    super(expenses, 'expenses');
  }

  /**
   * Retrieves paginated expense records scoped to a specific tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @param limit - Page size
   * @param offset - Offset index
   * @returns Array of Expense entities
   */
  async findByTenant(tenantId: string, limit = 20, offset = 0): Promise<Expense[]> {
    const results = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tenant_id, tenantId))
      .orderBy(desc(expenses.expense_date))
      .limit(limit)
      .offset(offset);
    return results as Expense[];
  }

  /**
   * Counts the total number of expenses recorded for a tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @returns Total count of records
   */
  async countByTenant(tenantId: string): Promise<number> {
    const results = await db
      .select({ val: count() })
      .from(expenses)
      .where(eq(expenses.tenant_id, tenantId));
    return results[0]?.val ?? 0;
  }

  /**
   * Retrieves all expenses ordered by date for financial analytics and KPI calculations.
   *
   * @param tenantId - Optional tenant UUID filter
   * @returns Array of Expense entities
   */
  async getAllForStats(tenantId?: string): Promise<Expense[]> {
    if (tenantId) {
      return (await db
        .select()
        .from(expenses)
        .where(eq(expenses.tenant_id, tenantId))
        .orderBy(desc(expenses.expense_date))) as Expense[];
    }
    return (await db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.expense_date))) as Expense[];
  }

  /**
   * Inserts a new operational expense entry.
   *
   * @param data - Expense data (amount, description, category, expense_date, tenant_id, expense_identifier)
   * @returns Created Expense entity
   */
  async create(data: {
    amount: number;
    description: string;
    category: string;
    expense_date: Date;
    tenant_id: string;
    expense_identifier?: string | null;
  }): Promise<Expense> {
    const results = await db
      .insert(expenses)
      .values({
        amount: data.amount,
        description: data.description,
        category: data.category,
        expense_date: data.expense_date,
        tenant_id: data.tenant_id,
        expense_identifier: data.expense_identifier,
      })
      .returning();
    return results[0] as Expense;
  }

  /**
   * Updates an existing operational expense entry.
   *
   * @param id - Expense UUID
   * @param data - Expense data to update
   * @returns Updated Expense entity or null
   */
  async update(
    id: string,
    data: Partial<{ amount: number; description: string; category: string; expense_date: Date }>
  ): Promise<Expense | null> {
    const results = await db
      .update(expenses)
      .set(data)
      .where(eq(expenses.id, id))
      .returning();
    return (results[0] as Expense) || null;
  }
}

export const expenseRepository = new ExpenseRepository();
