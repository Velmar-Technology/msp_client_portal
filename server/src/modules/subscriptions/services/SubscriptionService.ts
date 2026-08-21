import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions/repositories/SubscriptionRepository';
import { UserRepository, userRepository } from '@modules/auth';
import { SubscriptionLifecycleService, subscriptionLifecycleService } from '@modules/subscriptions/services/SubscriptionLifecycleService';
import { SubscriptionPaymentService, subscriptionPaymentService } from '@modules/subscriptions/services/SubscriptionPaymentService';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { Subscription } from '@shared/types';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from '@shared/dtos/subscription.dto';

export class SubscriptionService {
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private userRepo: UserRepository = userRepository,
    private lifecycleService: SubscriptionLifecycleService = subscriptionLifecycleService,
    private paymentService: SubscriptionPaymentService = subscriptionPaymentService
  ) {}

  async getClientTenantId(clientId: string): Promise<string> {
    const clientUser = await this.userRepo.findById(clientId);
    if (!clientUser) {
      throw new NotFoundError('Client user not found');
    }
    return clientUser.tenant_id;
  }

  async getClientSubscriptions(tenantId: string): Promise<Subscription[]> {
    return this.subscriptionRepo.findByTenant(tenantId);
  }

  async getSubscriptionById(id: string, tenantId: string): Promise<Subscription> {
    const sub = await this.subscriptionRepo.findById(id);
    if (!sub) throw new NotFoundError('Subscription not found');
    if (sub.tenant_id !== tenantId) throw new ForbiddenError('Access denied');
    return sub;
  }

  async createPaypalOrderForSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
    currentSubscriptionId?: string;
  }): Promise<{ orderId: string }> {
    return this.paymentService.createPaypalOrderForSubscription(data);
  }

  async createPaypalSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
  }): Promise<{ subscriptionId: string; approveUrl: string }> {
    return this.paymentService.createPaypalSubscription(data);
  }

  async createSubscription(data: CreateSubscriptionInput, clientId: string, tenantId: string, byAdmin = false): Promise<Subscription> {
    return this.lifecycleService.createSubscription(data, clientId, tenantId, byAdmin);
  }

  async updateSubscription(id: string, data: UpdateSubscriptionInput, tenantId: string, byAdmin = false): Promise<Subscription> {
    return this.lifecycleService.updateSubscription(id, data, tenantId, byAdmin);
  }
}

export const subscriptionService = new SubscriptionService();
