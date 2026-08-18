import { Request, Response, NextFunction } from 'express';
import { nextcloudService } from '../services/NextcloudService';
import { systemService as defaultSystemService, SystemService } from '../services/SystemService';

export class SystemController {
  constructor(private service: SystemService = defaultSystemService) {}

  async getStorageStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const storageStatus = await nextcloudService.getStorageUsage();
      res.json({
        success: true,
        data: storageStatus,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApiStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await this.service.getApiStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const systemController = new SystemController();

