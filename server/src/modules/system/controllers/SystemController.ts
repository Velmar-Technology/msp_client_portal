import { Request, Response } from 'express';
import { nextcloudService } from '@modules/system/services/NextcloudService';
import { systemService as defaultSystemService, SystemService } from '@modules/system/services/SystemService';
import { vaultwardenService as defaultVaultwardenService, VaultwardenService } from '@modules/system/services/VaultwardenService';
import { clientHealthService, ClientHealthService } from '@modules/system/services/ClientHealthService';
import { UnauthorizedError, ValidationError } from '@shared/errors';

/**
 * Controller handling HTTP requests for system storage capacity, global API health diagnostics,
 * and hosted password manager user lifecycle actions.
 */
export class SystemController {
  /**
   * Initializes SystemController with SystemService and VaultwardenService dependencies.
   *
   * @param service - System domain service
   * @param vaultwardenSvc - Vaultwarden domain service
   * @param healthSvc - Client health service
   */
  constructor(
    private service: SystemService = defaultSystemService,
    private vaultwardenSvc: VaultwardenService = defaultVaultwardenService,
    private healthSvc: ClientHealthService = clientHealthService
  ) {}

  /**
   * Handles querying global Nextcloud storage usage metrics and server status.
   *
   * @param _req - Express request
   * @param res - Express response returning StorageStatus
   */
  async getStorageStatus(_req: Request, res: Response): Promise<void> {
    const storageStatus = await nextcloudService.getStorageUsage();
    res.json({
      success: true,
      data: storageStatus,
    });
  }

  /**
   * Handles querying real-time system health checks, latency, service status, and environment audits.
   *
   * @param _req - Express request
   * @param res - Express response returning SystemApiStatusResponse
   */
  async getApiStatus(_req: Request, res: Response): Promise<void> {
    const status = await this.service.getApiStatus();
    res.json({
      success: true,
      data: status,
    });
  }

  /**
   * Handles querying composite client health scoring across tickets, hardware, and security (BL-601).
   *
   * @param req - Express request with tenantId in params
   * @param res - Express response returning ClientHealthReport
   */
  async getClientHealth(req: Request, res: Response): Promise<void> {
    const tenantId = req.params.tenantId as string;
    if (!tenantId) {
      throw new ValidationError('tenantId is required');
    }
    const report = await this.healthSvc.calculateScore(tenantId);
    res.json({
      success: true,
      data: report,
    });
  }

  /**
   * Resets the authenticated client user's Vaultwarden access and dispatches a fresh organization invitation.
   *
   * @param req - Authenticated Express request
   * @param res - Express response
   * @throws {UnauthorizedError} When user is unauthenticated
   * @throws {ValidationError} When tenant ID is missing
   */
  async resetVaultAccess(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user || !user.email) {
      throw new UnauthorizedError('User authentication required');
    }

    const tenantId = user.tenant_id || user.tenantId;
    if (!tenantId) {
      throw new ValidationError('Tenant ID missing from user profile');
    }

    const result = await this.vaultwardenSvc.resetUserVaultAccess(tenantId, user.email);
    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Handles running an on-demand SequenceSentinel passive integrity audit over BL-101 to BL-802.
   *
   * @param req - Express request with hours, tenantId, and generateTests in body
   * @param res - Express response returning AuditReport
   */
  async runSentinelAudit(req: Request, res: Response): Promise<void> {
    const hours = parseInt(req.body?.hours, 10) || 24;
    const generateTests = Boolean(req.body?.generateTests);
    const autoHeal = Boolean(req.body?.autoHeal);
    const tenantId = req.body?.tenantId || (req as any).user?.tenant_id;

    const now = new Date();
    const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const { SequenceSentinelService } = await import('../sentinel/services/SequenceSentinelService');
    const sentinelService = new SequenceSentinelService();
    const report = await sentinelService.runAudit(
      { startDate, endDate: now, tenantId },
      { generateTests, autoHeal, saveReport: true }
    );

    res.json({
      success: true,
      data: report,
    });
  }
}

export const systemController = new SystemController();

