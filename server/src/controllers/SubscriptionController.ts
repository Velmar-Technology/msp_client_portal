import { Request, Response } from 'express';
import { subscriptionService } from '../services/SubscriptionService';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from '../dtos/subscription.dto';
import { userRepository } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';

export class SubscriptionController {
  async getAll(req: Request, res: Response): Promise<void> {
    const subscriptions = await subscriptionService.getClientSubscriptions(req.user!.tenantId);
    res.json({ success: true, data: subscriptions });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const subscription = await subscriptionService.getSubscriptionById(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: subscription });
  }

  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateSubscriptionInput;
    let targetClientId = req.user!.userId;
    let targetTenantId = req.user!.tenantId;
    if (req.user!.role === 'ADMIN' && data.clientId) {
      targetClientId = data.clientId;
      const clientUser = await userRepository.findById(targetClientId);
      if (!clientUser) {
        throw AppError.notFound('Client user not found');
      }
      targetTenantId = clientUser.tenant_id;
    }
    const byAdmin = req.user!.role === 'ADMIN' && !!data.clientId;
    const subscription = await subscriptionService.createSubscription(data, targetClientId, targetTenantId, byAdmin);
    res.status(201).json({ success: true, data: subscription });
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdateSubscriptionInput;
    const subscription = await subscriptionService.updateSubscription(req.params.id as string, data, req.user!.tenantId);
    res.json({ success: true, data: subscription });
  }
}

export const subscriptionController = new SubscriptionController();
