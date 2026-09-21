import { Request, Response } from 'express';
import { UserContext, UserRole } from '@shared/types';
import { navCounterService } from '@modules/nav/services/NavCounterService';
import type { NavKey } from '@shared/contracts';

/**
 * Controller handling HTTP requests for sidebar navigation counters and seen-state management.
 */
export class NavCounterController {
  private getUserContext(req: Request): UserContext {
    return {
      userId: req.user!.userId,
      role: req.user!.role as UserRole,
      tenantId: req.user!.tenantId,
    };
  }

  /**
   * Handles retrieving all nav counters for the authenticated user.
   *
   * @param req - Express request
   * @param res - Express response returning counter map keyed by nav key
   */
  async getCounters(req: Request, res: Response): Promise<void> {
    const counters = await navCounterService.getCounters(this.getUserContext(req));
    res.json({ success: true, data: counters });
  }

  /**
   * Handles marking a nav destination as seen (upserts last_seen_at).
   *
   * @param req - Express request with navKey in body
   * @param res - Express response returning confirmation
   */
  async markSeen(req: Request, res: Response): Promise<void> {
    const { navKey } = req.body as { navKey: NavKey };
    await navCounterService.markSeen(this.getUserContext(req), navKey);
    res.json({ success: true, data: { marked: true } });
  }
}

export const navCounterController = new NavCounterController();
