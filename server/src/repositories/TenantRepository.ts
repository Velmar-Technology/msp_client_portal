import { BaseRepository } from './BaseRepository';
import { Tenant } from '../types';

export class TenantRepository extends BaseRepository<Tenant> {
  constructor() {
    super('tenants');
  }

  async create(name: string, subdomain?: string): Promise<Tenant> {
    const result = await this.queryOne<Tenant>(
      `INSERT INTO tenants (name, subdomain) VALUES ($1, $2) RETURNING *`,
      [name, subdomain || null],
    );
    return result!;
  }

  async findByName(name: string): Promise<Tenant | null> {
    return this.queryOne<Tenant>(
      'SELECT * FROM tenants WHERE name = $1',
      [name],
    );
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    return this.queryOne<Tenant>(
      'SELECT * FROM tenants WHERE subdomain = $1',
      [subdomain],
    );
  }
}

export const tenantRepository = new TenantRepository();
