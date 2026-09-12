import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Plan, PlanFilters, CachePort } from '@shared/types';
import { db, plans } from '@shared/db';
import { eq, and, or, ilike, asc, count, SQL } from 'drizzle-orm';
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
    return this.cache.wrapVersioned(
      'plans',
      'global',
      `id:${id}`,
      300,
      async () => {
        const results = await db
          .select()
          .from(plans)
          .where(eq(plans.id, id))
          .limit(1);

        return (results[0] as Plan) || null;
      }
    );
  }

  /**
   * Creates a new plan and increments global plans generation counter to purge cache.
   *
   * @param data - Plan insertion attributes
   * @returns Created Plan entity
   */
  async create(data: Partial<Plan>): Promise<Plan> {
    const results = await db
      .insert(plans)
      .values(data as any)
      .returning();

    await this.cache.invalidateScope('plans', 'global');

    return (results[0] as Plan) || null;
  }

  /**
   * Updates an existing plan and purges plan caches globally.
   *
   * @param id - Plan string ID or UUID
   * @param data - Attributes to update
   * @returns Updated Plan entity or null
   */
  async update(id: string, data: Partial<Plan>): Promise<Plan | null> {
    const results = await db
      .update(plans)
      .set({ ...data, updated_at: new Date() } as any)
      .where(eq(plans.id, id))
      .returning();

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
        if (filters.includeCustom === true && !filters.tenantId) {
          // Admin viewing custom plans across system
        } else if (filters.tenantId) {
          conditions.push(
            or(
              eq(plans.is_custom, false),
              and(eq(plans.is_custom, true), eq(plans.tenant_id, filters.tenantId))
            )
          );
        } else {
          conditions.push(eq(plans.is_custom, false));
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

