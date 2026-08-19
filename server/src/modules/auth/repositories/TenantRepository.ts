import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Tenant } from '@shared/types';
import { db, tenants } from '@shared/db';
import { eq } from 'drizzle-orm';

export class TenantRepository extends BaseRepository<Tenant> {
  constructor() {
    super(tenants, 'tenants');
  }

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

  async findByName(name: string): Promise<Tenant | null> {
    const results = await db
      .select()
      .from(tenants)
      .where(eq(tenants.name, name));
    return (results[0] as Tenant) || null;
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const results = await db
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain));
    return (results[0] as Tenant) || null;
  }
}

export const tenantRepository = new TenantRepository();
