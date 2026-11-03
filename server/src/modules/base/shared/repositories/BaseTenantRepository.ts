import { BaseRepository } from '@shared/repositories/BaseRepository';
import { db, pool } from '@shared/db';
import { eq, and, desc } from 'drizzle-orm';
import { isUuid } from '@shared/utils/validation';

/**
 * Tenant-scoped generic repository enforcing fail-closed multi-tenant data isolation.
 * Extends `BaseRepository` with mandatory `tenant_id` filters across all entity lookups,
 * queries, and lifecycle mutations.
 *
 * @typeParam T - Entity schema row type (must contain `tenant_id`)
 * @see ADR-017
 * @see ADR-018
 * @see BL-302
 */
export abstract class BaseTenantRepository<T> extends BaseRepository<T> {
  /**
   * Finds a single entity by its UUID primary key scoped strictly to a specific tenant.
   *
   * @param id - Entity UUID
   * @param tenantId - Tenant UUID owning the entity
   * @returns Entity instance or null if not found or unauthorized
   */
  async findTenantById(id: string, tenantId: string): Promise<T | null> {
    if (!id || !isUuid(id) || !tenantId || !isUuid(tenantId)) {
      return null;
    }
    const result = await db
      .select()
      .from(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.tenant_id, tenantId)));

    return (result[0] as T) || null;
  }

  /**
   * Retrieves paginated entity records strictly scoped to a specific tenant.
   *
   * @param tenantId - Tenant UUID owning the entities
   * @param limit - Maximum records to return (default: 20)
   * @param offset - Offset index (default: 0)
   * @returns Array of entity records belonging to the tenant
   */
  async findTenantAll(tenantId: string, limit = 20, offset = 0): Promise<T[]> {
    if (!tenantId || !isUuid(tenantId)) {
      return [];
    }

    const orderBy = 'created_at' in this.table ? desc(this.table.created_at) : undefined;
    const query = db
      .select()
      .from(this.table)
      .where(eq(this.table.tenant_id, tenantId))
      .limit(limit)
      .offset(offset);

    if (orderBy) {
      query.orderBy(orderBy);
    }

    const result = await query;
    return result as T[];
  }

  /**
   * Deletes a single entity record scoped strictly to a specific tenant.
   *
   * @param id - Entity UUID
   * @param tenantId - Tenant UUID owning the entity
   * @returns True if a row was deleted, false otherwise
   */
  async deleteTenantById(id: string, tenantId: string): Promise<boolean> {
    if (!id || !isUuid(id) || !tenantId || !isUuid(tenantId)) {
      return false;
    }
    const result = await db
      .delete(this.table)
      .where(and(eq(this.table.id, id), eq(this.table.tenant_id, tenantId)));

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Returns total count of matching records belonging to a tenant.
   *
   * @param tenantId - Tenant UUID
   * @param additionalWhere - Optional additional SQL WHERE predicates (e.g. "status = 'ACTIVE'")
   * @param params - Additional query parameters array
   * @returns Total record count for the tenant
   */
  async countTenant(
    tenantId: string,
    additionalWhere = '',
    params: unknown[] = []
  ): Promise<number> {
    if (!tenantId || !isUuid(tenantId)) {
      return 0;
    }

    const whereClause = additionalWhere
      ? `tenant_id = $1 AND (${additionalWhere})`
      : 'tenant_id = $1';

    const allParams = [tenantId, ...params];
    const query = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await pool.query(query, allParams);
    return parseInt(result.rows[0].count, 10);
  }
}
