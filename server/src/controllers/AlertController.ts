import { Request, Response } from 'express';
import { alertService } from '../services/AlertService';
import { ProcessRmmAlertInput } from '../dtos/alert.dto';

export class AlertController {
  async processRmmAlert(req: Request, res: Response): Promise<void> {
    const data = req.body as ProcessRmmAlertInput;
    const result = await alertService.processRMMAlert(data);
    res.status(201).json({ success: true, data: result });
  }

  async processZabbixWebhook(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const tenantId = user?.tenantId || user?.tenant_id || req.body.tenantId;
    const userId = user?.userId || user?.id || req.body.clientId;
    const result = await alertService.processZabbixWebhook(req.body, tenantId, userId);
    res.status(200).json({ success: true, data: result });
  }
}

export const alertController = new AlertController();

