import { Request, Response } from 'express';
import { TenantByokService } from '@modules/system/services/TenantByokService';
import {
  TenantByokConfigInputSchema,
  TestByokConnectionInputSchema,
} from '@shared/contracts';
import { UnauthorizedError, ValidationError } from '@shared/errors';

/**
 * Controller managing HTTP requests for Tenant BYOK AI credentials,
 * in-memory connection testing, and internal MCP server proxy resolution.
 */
export class TenantByokController {
  /**
   * Initializes TenantByokController with domain service dependency.
   *
   * @param service - Tenant BYOK service
   */
  constructor(private service: TenantByokService = new TenantByokService()) {}

  /**
   * Handles saving or updating private BYOK credentials for the authenticated tenant.
   *
   * @param req - Express request containing TenantByokConfigInput
   * @param res - Express response returning TenantByokStatus
   */
  async saveConfig(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError('Authenticated tenant context is required');
    }

    const parseResult = TenantByokConfigInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => e.message).join(', ')
      );
    }

    const status = await this.service.upsertTenantByok(tenantId, parseResult.data);
    res.json({
      success: true,
      data: status,
    });
  }

  /**
   * Handles querying the public sanitized BYOK status for the authenticated tenant.
   *
   * @param req - Express request
   * @param res - Express response returning TenantByokStatus
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    const user = req.user;
    const tenantId = user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedError('Authenticated tenant context is required');
    }

    const status = await this.service.getTenantByokStatus(tenantId);
    res.json({
      success: true,
      data: status,
    });
  }

  /**
   * Handles executing an in-memory connection and model list test without persisting secrets.
   *
   * @param req - Express request containing candidate credentials
   * @param res - Express response returning TestByokConnectionResponse
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    const parseResult = TestByokConnectionInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => e.message).join(', ')
      );
    }

    const result = await this.service.testConnection(parseResult.data);
    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Handles resolving decrypted credentials for internal microservices (MCP Server).
   * Guarded by internal system API key.
   *
   * @param req - Express request with internal key in headers and tenantId param
   * @param res - Express response returning decrypted credentials or null
   */
  async getInternalTenantCredentials(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
    const internalKey =
      (req.headers['x-api-key'] as string)?.trim() || bearerToken;

    const expectedKey = (
      process.env.MSP_API_KEY ||
      process.env.JWT_SECRET ||
      'velmar-system-token'
    ).trim();

    if (!internalKey || internalKey !== expectedKey) {
      throw new UnauthorizedError('Invalid internal service token');
    }

    const { tenantId } = req.params;
    if (!tenantId || typeof tenantId !== 'string') {
      throw new ValidationError('Tenant ID is required in path');
    }

    const credentials = await this.service.getDecryptedKeyForTenant(tenantId);
    res.json({
      success: true,
      data: credentials,
    });
  }
}

export const tenantByokController = new TenantByokController();
