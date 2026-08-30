import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Tenant } from '@shared/types';
import { db, tenants } from '@shared/db';
import { eq } from 'drizzle-orm';

/**
 * Data repository for multi-tenant accounts and subdomain lookups.
 */
export class TenantRepository extends BaseRepository<Tenant> {
  /**
   * Initializes TenantRepository for the tenants table.
   */
  constructor() {
    super(tenants, 'tenants');
  }

  /**
   * Inserts a new tenant organization record.
   *
   * @param name - Display name of the tenant organization
   * @param subdomain - Optional unique subdomain identifier
   * @returns Created Tenant entity
   */
  async create(name: string, subdomain?: string): Promise<Tenant> {
    const results = await db
      .insert(tenants)
      .values({
        name,
        subdomain: subdomain || null,
      })
      .returning();
    return results[0] as Tenant;
  }

  /**
   * Finds a tenant record by exact organization name.
   *
   * @param name - Organization name
   * @returns Matching Tenant or null
   */
  async findByName(name: string): Promise<Tenant | null> {
    const results = await db
      .select()
      .from(tenants)
      .where(eq(tenants.name, name));
    return (results[0] as Tenant) || null;
  }

  /**
   * Finds a tenant record by unique subdomain.
   *
   * @param subdomain - Subdomain slug
   * @returns Matching Tenant or null
   */
  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const results = await db
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain));
    return (results[0] as Tenant) || null;
  }

  /**
   * Updates the operational account status and milestone timestamps for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @param status - Target AccountStatus
   * @param dates - Optional milestone timestamps
   * @returns Updated Tenant or null
   */
  async updateAccountStatus(
    tenantId: string,
    status: any,
    dates?: { read_only_at?: Date | null; suspended_at?: Date | null; purged_at?: Date | null }
  ): Promise<Tenant | null> {
    const updateData: Record<string, any> = {
      account_status: status,
      updated_at: new Date(),
    };
    if (dates?.read_only_at !== undefined) updateData.read_only_at = dates.read_only_at;
    if (dates?.suspended_at !== undefined) updateData.suspended_at = dates.suspended_at;
    if (dates?.purged_at !== undefined) updateData.purged_at = dates.purged_at;

    const results = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, tenantId))
      .returning();
    return (results[0] as Tenant) || null;
  }

  /**
   * Updates the official tax RNC number for the tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @param rnc - Dominican RNC string
   * @returns Updated Tenant or null
   */
  async updateRnc(tenantId: string, rnc: string | null): Promise<Tenant | null> {
    const results = await db
      .update(tenants)
      .set({ rnc, updated_at: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();
    return (results[0] as Tenant) || null;
  }
}

export const tenantRepository = new TenantRepository();

