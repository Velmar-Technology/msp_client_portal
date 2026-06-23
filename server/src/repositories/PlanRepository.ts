import { BaseRepository } from './BaseRepository';
import { Plan } from '../types';
import { db, plans } from '../db';
import { eq } from 'drizzle-orm';

export class PlanRepository extends BaseRepository<Plan> {
  constructor() {
    super(plans, 'plans');
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
}

export const planRepository = new PlanRepository();
