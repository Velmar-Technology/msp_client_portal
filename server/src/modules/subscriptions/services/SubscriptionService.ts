import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions/repositories/SubscriptionRepository';
import { UserRepository, userRepository } from '@modules/auth/repositories/UserRepository';
import { SubscriptionLifecycleService, subscriptionLifecycleService } from '@modules/subscriptions/services/SubscriptionLifecycleService';
import { SubscriptionPaymentService, subscriptionPaymentService } from '@modules/subscriptions/services/SubscriptionPaymentService';
import { SubscriptionQuotationService, subscriptionQuotationService } from '@modules/subscriptions/services/SubscriptionQuotationService';
import { AppError } from '@shared/utils/AppError';
import { Subscription } from '@shared/types';
import { CreateSubscriptionInput, UpdateSubscriptionInput, SendQuoteInput } from '@shared/dtos/subscription.dto';

export class SubscriptionService {
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private userRepo: UserRepository = userRepository,
    private lifecycleService: SubscriptionLifecycleService = subscriptionLifecycleService,
    private paymentService: SubscriptionPaymentService = subscriptionPaymentService,
    private quotationService: SubscriptionQuotationService = subscriptionQuotationService
  ) {}

  async getClientTenantId(clientId: string): Promise<string> {
    const clientUser = await this.userRepo.findById(clientId);
    if (!clientUser) {
      throw AppError.notFound('Client user not found');
    }
    return clientUser.tenant_id;
  }

  async getClientSubscriptions(tenantId: string): Promise<Subscription[]> {
    return this.subscriptionRepo.findByTenant(tenantId);
  }

  async getSubscriptionById(id: string, tenantId: string): Promise<Subscription> {
    const sub = await this.subscriptionRepo.findById(id);
    if (!sub) throw AppError.notFound('Subscription not found');
    if (sub.tenant_id !== tenantId) throw AppError.forbidden('Access denied');
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

  async sendQuotation(data: SendQuoteInput, senderUserId: string, senderTenantId: string, role: string): Promise<void> {
    return this.quotationService.sendQuotation(data, senderUserId, senderTenantId, role);
  }
}

export const subscriptionService = new SubscriptionService();
