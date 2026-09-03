import { Request, Response } from 'express';
import { subscriptionService } from '@modules/subscriptions/services/SubscriptionService';
import { CreateSubscriptionInput, UpdateSubscriptionInput, CreatePaypalOrderInput } from '@shared/dtos/subscription.dto';

/**
 * Controller handling HTTP requests for client subscriptions, PayPal checkout order generation,
 * subscription agreement creation, and subscription plan/quantity updates.
 */
export class SubscriptionController {
  /**
   * Handles retrieving all subscription contracts for the authenticated tenant.
   *
   * @param req - Express request
   * @param res - Express response returning array of subscriptions
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const subscriptions = await subscriptionService.getClientSubscriptions(req.user!.tenantId);
    res.json({ success: true, data: subscriptions });
  }

  /**
   * Handles retrieving a single subscription by UUID.
   *
   * @param req - Express request with subscription ID in params
   * @param res - Express response returning subscription entity
   */
  async getById(req: Request, res: Response): Promise<void> {
    const subscription = await subscriptionService.getSubscriptionById(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: subscription });
  }

  /**
   * Handles creating a new subscription contract.
   *
   * @param req - Express request with CreateSubscriptionInput body
   * @param res - Express response returning HTTP 201 with created subscription
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateSubscriptionInput;
    const byAdmin = req.user!.role === 'ADMIN' && !!data.clientId;
    let targetClientId = req.user!.userId;
    let targetTenantId = req.user!.tenantId;

    if (byAdmin && data.clientId) {
      targetClientId = data.clientId;
      targetTenantId = await subscriptionService.getClientTenantId(targetClientId);
    }

    const subscription = await subscriptionService.createSubscription(data, targetClientId, targetTenantId, byAdmin);
    res.status(201).json({ success: true, data: subscription });
  }

  /**
   * Handles creating a PayPal checkout order for subscription purchase or upgrade.
   *
   * @param req - Express request with CreatePaypalOrderInput body
   * @param res - Express response returning PayPal order ID
   */
  async createPaypalOrder(req: Request, res: Response): Promise<void> {
    const data = req.body as CreatePaypalOrderInput;
    const orderData = await subscriptionService.createPaypalOrderForSubscription(data);
    res.json({ success: true, data: orderData });
  }

  /**
   * Handles creating an automated recurring PayPal subscription agreement.
   *
   * @param req - Express request with plan details and quantity
   * @param res - Express response returning subscription ID and approval URL
   */
  async createPaypalSubscription(req: Request, res: Response): Promise<void> {
    const data = req.body as { plan: string; equipmentCount: number; billingCycle?: 'monthly' | 'annual' };
    const subData = await subscriptionService.createPaypalSubscription(data);
    res.json({ success: true, data: subData });
  }

  /**
   * Handles modifying plan tier, hardware slots, or cancelling a subscription.
   *
   * @param req - Express request with subscription ID in params and UpdateSubscriptionInput body
   * @param res - Express response returning updated subscription
   */
  async update(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdateSubscriptionInput;
    const byAdmin = req.user!.role === 'ADMIN';
    const subscription = await subscriptionService.updateSubscription(req.params.id as string, data, req.user!.tenantId, byAdmin);
    res.json({ success: true, data: subscription });
  }

  /**
   * Retrieves all enabled feature codes for the authenticated tenant.
   *
   * @param req - Express request
   * @param res - Express response returning array of active feature strings
   */
  async getActiveFeatures(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId || (req.user as any)!.tenant_id;
    const features = tenantId
      ? await subscriptionService.getClientActiveFeatures(tenantId)
      : [];
    res.json({ success: true, data: features });
  }
}

export const subscriptionController = new SubscriptionController();
