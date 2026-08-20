import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Plan, PlanFilters } from '@shared/types';
import { db, plans } from '@shared/db';
import { eq, and, ilike, asc, count, SQL } from 'drizzle-orm';

export class PlanRepository extends BaseRepository<Plan> {
  constructor() {
    super(plans, 'plans');
  }

  async findById(id: string): Promise<Plan | null> {
    if (!id) return null;
    const result = await db.select().from(plans).where(eq(plans.id, id));
    return (result[0] as Plan) || null;
  }

  async create(data: Omit<Plan, 'created_at' | 'updated_at'>): Promise<Plan> {
    const results = await db
      .insert(plans)
      .values(data)
      .returning();
    return results[0] as Plan;
  }

  async update(
    id: string,
    data: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Plan | null> {
    const results = await db
      .update(plans)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();
    return (results[0] as Plan) || null;
  }

  async findWithFilters(filters: PlanFilters): Promise<{ plans: Plan[]; total: number }> {
    const conditions: (SQL | undefined)[] = [];

    if (filters.includeInactive === false) {
      conditions.push(eq(plans.active, true));
    }
    if (filters.clientType) {
      conditions.push(eq(plans.client_type, filters.clientType));
    }
    if (filters.search) {
      conditions.push(ilike(plans.id, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const countResult = await db
      .select({ val: count() })
      .from(plans)
      .where(whereClause);
    const total = countResult[0]?.val ?? 0;

    const results = await db
      .select()
      .from(plans)
      .where(whereClause)
      .orderBy(asc(plans.price), asc(plans.id))
      .limit(limit)
      .offset(offset);

    return { plans: results as Plan[], total };
  }
}

export const planRepository = new PlanRepository();
