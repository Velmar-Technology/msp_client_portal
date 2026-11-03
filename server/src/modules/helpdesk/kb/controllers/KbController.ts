import { Request, Response } from 'express';
import { kbService, KbService } from '../services/KbService';

/**
 * HTTP controller for Kb endpoints (Express 5 native async propagation).
 */
export class KbController {
  constructor(private service: KbService = kbService) {}

  /**
   * Lists all Kb items for the authenticated tenant.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async list(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const data = await this.service.list(tenantId);
    res.status(200).json({ status: 'success', data });
  }

  /**
   * Retrieves a single Kb item by ID.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async getById(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const data = await this.service.getById(String(req.params.id), tenantId);
    res.status(200).json({ status: 'success', data });
  }

  /**
   * Creates a new Kb item.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async create(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const data = await this.service.create(tenantId, req.body);
    res.status(201).json({ status: 'success', data });
  }
}

export const kbController = new KbController();
