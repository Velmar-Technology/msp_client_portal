import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Plan, PlanFilters, CachePort } from '@shared/types';
import { db, plans } from '@shared/db';
import { eq, and, ilike, asc, count, SQL } from 'drizzle-orm';
import { cacheManager } from '@shared/utils/cache';

/**
 * Data repository managing service plans, cached with versioned generation tracking.
 */
export class PlanRepository extends BaseRepository<Plan> {
  /**
   * Initializes PlanRepository with CachePort abstraction.
   *
   * @param cache - CachePort implementation
   */
  constructor(private cache: CachePort = cacheManager) {
    super(plans, 'plans');
  }

  /**
   * Finds a plan by ID, backed by generation-tracked Redis/memory caching.
   *
   * @param id - Plan string ID or UUID
   * @returns Plan entity or null
   */
  async findById(id: string): Promise<Plan | null> {
    if (!id) return null;

    return this.cache.wrapVersioned<Plan | null>(
      'plans',
      'global',
      `id:${id}`,
      3600,
      async () => {
        const result = await db.select().from(plans).where(eq(plans.id, id));
        return (result[0] as Plan) || null;
      }
    );
  }

  /**
   * Inserts a new plan record and invalidates the cached plans scope.
   *
   * @param data - Plan record properties
   * @returns Created Plan entity
   */
  async create(data: Omit<Plan, 'created_at' | 'updated_at'>): Promise<Plan> {
    const results = await db
      .insert(plans)
      .values(data)
      .returning();

    // Atomic generation invalidation
    await this.cache.invalidateScope('plans', 'global');

    return (results as any[])[0] as Plan;
  }

  /**
   * Updates an existing plan and atomically invalidates all cached plan queries.
   *
   * @param id - Plan ID
   * @param data - Updated plan properties
   * @returns Updated Plan entity or null
   */
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

    // Atomic generation invalidation across all nodes
    await this.cache.invalidateScope('plans', 'global');

    return ((results as any[])[0] as Plan) || null;
  }

  /**
   * Finds plans matching filters (active state, client type, search term) with caching.
   *
   * @param filters - PlanFilters object
   * @returns List of plans and total count
   */
  async findWithFilters(filters: PlanFilters): Promise<{ plans: Plan[]; total: number }> {
    const filterKey = `filters:${JSON.stringify(filters)}`;

    return this.cache.wrapVersioned(
      'plans',
      'global',
      filterKey,
      300,
      async () => {
        const conditions: (SQL | undefined)[] = [];

        if (filters.includeInactive === false) {
          conditions.push(eq(plans.active, true));
        }
        if (filters.includeCustom !== true) {
          conditions.push(eq(plans.is_custom, false));
        } else if (filters.tenantId) {
          conditions.push(eq(plans.tenant_id, filters.tenantId));
        }
        if (filters.leadId) {
          conditions.push(eq(plans.lead_id, filters.leadId));
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
    );
  }
}

export const planRepository = new PlanRepository();

