import { Request, Response, NextFunction } from 'express';
import { nextcloudService } from '../services/NextcloudService';

export class SystemController {
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
}

export const systemController = new SystemController();
