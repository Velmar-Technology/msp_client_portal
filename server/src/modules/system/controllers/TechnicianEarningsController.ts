import { Request, Response } from 'express';
import { technicianEarningsService as defaultService, TechnicianEarningsService } from '../services/TechnicianEarningsService';
import { UserContext } from '@shared/types';
import { UnauthorizedError } from '@shared/errors';

/**
 * Controller handling HTTP endpoints for technician earnings, payroll summaries,
 * batch payout approvals, and compensation rate configurations.
 */
export class TechnicianEarningsController {
  /**
   * Initializes TechnicianEarningsController with TechnicianEarningsService dependency.
   *
   * @param service - Technician earnings domain service
   */
  constructor(private service: TechnicianEarningsService = defaultService) {}

  /**
   * Helper to extract authenticated UserContext from request.
   */
  private getContext(req: Request): UserContext {
    if (!req.user) {
      throw new UnauthorizedError('User authentication required');
    }
    return {
      userId: req.user.userId,
      role: req.user.role as any,
      tenantId: req.user.tenantId,
    };
  }

  /**
   * GET /api/v1/system/technicians/me/earnings
   * Retrieves personal earnings, SLA bonus statistics, and closed ticket breakdown for the calling technician.
   */
  async getMyEarnings(req: Request, res: Response): Promise<void> {
    const ctx = this.getContext(req);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const result = await this.service.getTechnicianEarnings(ctx.userId, ctx.tenantId, page, limit);

    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * GET /api/v1/system/technicians/earnings
   * Retrieves organization-wide technician earnings roster and detailed closed-ticket payout history (Admin only).
   */
  async getAdminEarningsOverview(req: Request, res: Response): Promise<void> {
    const ctx = this.getContext(req);
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const result = await this.service.getAdminEarningsOverview(ctx.tenantId, status, page, limit);

    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * POST /api/v1/system/technicians/earnings/payout
   * Processes batch payout for selected earnings, marking them as PAID with payout timestamp (Admin only).
   */
  async processBatchPayout(req: Request, res: Response): Promise<void> {
    const ctx = this.getContext(req);
    const { earningIds } = req.body;

    const result = await this.service.processBatchPayout(earningIds, ctx);

    res.json({
      success: true,
      data: result,
      message: `Successfully processed payout for ${result.processed} earnings.`,
    });
  }

  /**
   * PUT /api/v1/system/technicians/rates
   * Configures base closed ticket compensation rate, SLA bonus rate, and priority multipliers (Admin only).
   */
  async updateRates(req: Request, res: Response): Promise<void> {
    const ctx = this.getContext(req);
    const rate = await this.service.updateRates(req.body, ctx);

    res.json({
      success: true,
      data: rate,
      message: 'Compensation rates updated successfully.',
    });
  }
}

export const technicianEarningsController = new TechnicianEarningsController();
