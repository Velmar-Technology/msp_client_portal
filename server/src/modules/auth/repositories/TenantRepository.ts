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
}

export const tenantRepository = new TenantRepository();
