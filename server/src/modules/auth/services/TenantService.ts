import { TenantRepository, tenantRepository } from '@modules/auth/repositories/TenantRepository';
import { Tenant } from '@shared/types';
import { NotFoundError } from '@shared/errors';

/**
 * Service orchestrating multi-tenant organization directory operations.
 */
export class TenantService {
  /**
   * Initializes TenantService with injected repository.
   *
   * @param tenantRepo - Tenant data repository instance
   */
  constructor(private readonly tenantRepo: TenantRepository = tenantRepository) {}

  /**
   * Lists all registered tenant organizations in the system.
   *
   * @param limit - Maximum records to retrieve (default: 100)
   * @returns Array of sanitized tenant organizations
   */
  async listTenants(limit = 100): Promise<Array<Pick<Tenant, 'id' | 'name' | 'subdomain' | 'account_status' | 'created_at'>>> {
    const tenants = await this.tenantRepo.listAll(limit);
    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      subdomain: t.subdomain,
      account_status: t.account_status,
      created_at: t.created_at,
    }));
  }

  /**
   * Retrieves a specific tenant organization by unique ID.
   *
   * @param tenantId - Target tenant UUID
   * @returns Tenant entity
   * @throws {NotFoundError} If the requested tenant does not exist
   */
  async getTenantById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError(`Tenant with ID ${tenantId} not found`);
    }
    return tenant;
  }
}

export const tenantService = new TenantService();
