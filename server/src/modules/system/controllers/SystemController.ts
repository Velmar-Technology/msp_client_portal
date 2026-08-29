import { Request, Response } from 'express';
import { nextcloudService } from '@modules/system/services/NextcloudService';
import { systemService as defaultSystemService, SystemService } from '@modules/system/services/SystemService';

/**
 * Controller handling HTTP requests for system storage capacity and global API health diagnostics.
 */
export class SystemController {
  /**
   * Initializes SystemController with SystemService dependency.
   *
   * @param service - System domain service
   */
  constructor(private service: SystemService = defaultSystemService) {}

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
}

export const systemController = new SystemController();
