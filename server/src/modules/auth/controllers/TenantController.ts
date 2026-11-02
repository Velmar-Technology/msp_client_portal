import { Request, Response } from 'express';
import { TenantService, tenantService } from '@modules/auth/services/TenantService';

/**
 * Controller exposing multi-tenant administrative lookups and workspace switching support.
 */
export class TenantController {
  /**
   * Initializes TenantController with injected service.
   *
   * @param service - Tenant business logic service
   */
  constructor(private readonly service: TenantService = tenantService) {}

  /**
   * Retrieves all registered tenant organizations for administrative switching.
   *
   * @param _req - Express request
   * @param res - Express response returning tenant list
   */
  async listTenants(_req: Request, res: Response): Promise<void> {
    const tenants = await this.service.listTenants();
    res.json({
      success: true,
      data: tenants,
    });
  }

  /**
   * Retrieves single tenant organization metadata by ID.
   *
   * @param req - Express request containing tenantId param
   * @param res - Express response returning tenant details
   */
  async getTenant(req: Request, res: Response): Promise<void> {
    const tenantId = req.params.id as string;
    const tenant = await this.service.getTenantById(tenantId);
    res.json({
      success: true,
      data: tenant,
    });
  }
}

export const tenantController = new TenantController();
