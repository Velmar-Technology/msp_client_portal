import { Request, Response } from 'express';
import { ConsumableService, consumableService } from '../services/ConsumableService';
import {
  CreateConsumableInput,
  UpdateConsumableInput,
  CheckoutConsumableInput,
  RestockConsumableInput,
} from '@shared/contracts';

/**
 * Controller exposing Consumables inventory endpoints, stock checkouts, and restocking workflows.
 */
export class ConsumableController {
  constructor(private readonly service: ConsumableService = consumableService) {}

  async listConsumables(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const search = req.query.search as string | undefined;

    const data = await this.service.listConsumables(tenantId, search);
    res.json({ success: true, data });
  }

  async getConsumable(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;

    const data = await this.service.getConsumable(tenantId, id);
    res.json({ success: true, data });
  }

  async createConsumable(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const input = req.body as CreateConsumableInput;

    const data = await this.service.createConsumable(tenantId, input);
    res.status(201).json({ success: true, data });
  }

  async updateConsumable(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const input = req.body as UpdateConsumableInput;

    const data = await this.service.updateConsumable(tenantId, id, input);
    res.json({ success: true, data });
  }

  async deleteConsumable(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;

    const data = await this.service.deleteConsumable(tenantId, id);
    res.json({ success: true, data });
  }

  async checkout(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const dispensedById = req.user!.userId;
    const id = req.params.id as string;
    const input = req.body as CheckoutConsumableInput;

    const data = await this.service.checkout(tenantId, id, input, dispensedById);
    res.json({ success: true, data });
  }

  async restock(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const input = req.body as RestockConsumableInput;

    const data = await this.service.restock(tenantId, id, input);
    res.json({ success: true, data });
  }

  async getCheckouts(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;

    const data = await this.service.getCheckouts(tenantId, id);
    res.json({ success: true, data });
  }
}

export const consumableController = new ConsumableController();
