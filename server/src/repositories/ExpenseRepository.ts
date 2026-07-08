import { BaseRepository } from './BaseRepository';
import { Expense } from '../types';
import { db, expenses } from '../db';
import { eq, desc, count } from 'drizzle-orm';

export class ExpenseRepository extends BaseRepository<Expense> {
  constructor() {
    super(expenses, 'expenses');
  }

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

  async countByTenant(tenantId: string): Promise<number> {
    const results = await db
      .select({ val: count() })
      .from(expenses)
      .where(eq(expenses.tenant_id, tenantId));
    return results[0]?.val ?? 0;
  }

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
}

export const expenseRepository = new ExpenseRepository();
