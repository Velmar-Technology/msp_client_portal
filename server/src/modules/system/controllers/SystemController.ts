import { Request, Response } from 'express';
import { nextcloudService } from '@modules/system/services/NextcloudService';
import { systemService as defaultSystemService, SystemService } from '@modules/system/services/SystemService';

export class SystemController {
  constructor(private service: SystemService = defaultSystemService) {}

  async getStorageStatus(_req: Request, res: Response): Promise<void> {
    const storageStatus = await nextcloudService.getStorageUsage();
    res.json({
      success: true,
      data: storageStatus,
    });
  }

  async getApiStatus(_req: Request, res: Response): Promise<void> {
    const status = await this.service.getApiStatus();
    res.json({
      success: true,
      data: status,
    });
  }
}

export const systemController = new SystemController();
