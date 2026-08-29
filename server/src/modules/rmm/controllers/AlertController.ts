import { Request, Response } from 'express';
import { alertService } from '@modules/rmm/services/AlertService';
import { ProcessRmmAlertInput } from '@shared/dtos/alert.dto';

/**
 * Controller handling HTTP requests and webhooks for RMM alert processing and Zabbix integration.
 */
export class AlertController {
  /**
   * Handles direct RMM alert ingestion and auto-remediation pipeline.
   *
   * @param req - Express request with ProcessRmmAlertInput body
   * @param res - Express response returning HTTP 201 with RmmAlertOutcome
   */
  async processRmmAlert(req: Request, res: Response): Promise<void> {
    const data = req.body as ProcessRmmAlertInput;
    const result = await alertService.processRMMAlert(data);
    res.status(201).json({ success: true, data: result });
  }

  /**
   * Handles incoming Zabbix alert webhooks, transforming severity and triggering tickets.
   *
   * @param req - Express request with Zabbix payload
   * @param res - Express response returning HTTP 200 with result
   */
  async processZabbixWebhook(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const tenantId = user?.tenantId || user?.tenant_id || req.body.tenantId;
    const userId = user?.userId || user?.id || req.body.clientId;
    const result = await alertService.processZabbixWebhook(req.body, tenantId, userId);
    res.status(200).json({ success: true, data: result });
  }
}

export const alertController = new AlertController();

