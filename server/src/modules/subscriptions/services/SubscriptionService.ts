import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions/repositories/SubscriptionRepository';
import { UserRepository, userRepository } from '@modules/auth';
import { SubscriptionLifecycleService, subscriptionLifecycleService } from '@modules/subscriptions/services/SubscriptionLifecycleService';
import { SubscriptionPaymentService, subscriptionPaymentService } from '@modules/subscriptions/services/SubscriptionPaymentService';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { Subscription } from '@shared/types';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from '@shared/dtos/subscription.dto';

/**
 * Primary domain facade orchestrating client subscriptions, PayPal checkout agreements,
 * subscription lifecycle updates, and tenant associations.
 */
export class SubscriptionService {
  /**
   * Initializes SubscriptionService with repository and sub-service dependencies.
   *
   * @param subscriptionRepo - Subscription repository
   * @param userRepo - User repository
   * @param lifecycleService - Subscription lifecycle service
   * @param paymentService - Subscription payment service
   */
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private userRepo: UserRepository = userRepository,
    private lifecycleService: SubscriptionLifecycleService = subscriptionLifecycleService,
    private paymentService: SubscriptionPaymentService = subscriptionPaymentService
  ) {}

  /**
   * Retrieves the tenant UUID for a specific client user.
   *
   * @param clientId - Client user UUID
   * @returns Tenant UUID
   * @throws {NotFoundError} When user is not found
   */
  async getClientTenantId(clientId: string): Promise<string> {
    const clientUser = await this.userRepo.findById(clientId);
    if (!clientUser) {
      throw new NotFoundError('Client user not found');
    }
    return clientUser.tenant_id;
  }

  /**
   * Retrieves all subscription contracts belonging to a specific tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of Subscription entities
   */
  async getClientSubscriptions(tenantId: string): Promise<Subscription[]> {
    return this.subscriptionRepo.findByTenant(tenantId);
  }

  /**
   * Retrieves a single subscription by UUID with tenant authorization verification.
   *
   * @param id - Subscription UUID
   * @param tenantId - Tenant UUID
   * @returns Subscription entity
   * @throws {NotFoundError} When subscription is not found
   * @throws {ForbiddenError} When accessing another tenant's subscription
   */
  async getSubscriptionById(id: string, tenantId: string): Promise<Subscription> {
    const sub = await this.subscriptionRepo.findById(id);
    if (!sub) throw new NotFoundError('Subscription not found');
    if (sub.tenant_id !== tenantId) throw new ForbiddenError('Access denied');
    return sub;
  }

  /**
   * Generates a PayPal checkout order for a new subscription or capacity upgrade.
   *
   * @param data - Plan, equipment count, billing cycle, and optional current subscription ID
   * @returns Object with generated PayPal order ID
   */
  async createPaypalOrderForSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
    currentSubscriptionId?: string;
  }): Promise<{ orderId: string }> {
    return this.paymentService.createPaypalOrderForSubscription(data);
  }

  /**
   * Generates a recurring PayPal subscription agreement.
   *
   * @param data - Plan, equipment count, and billing cycle
   * @returns Subscription ID and PayPal approval link
   */
  async createPaypalSubscription(data: {
    plan: string;
    equipmentCount: number;
    billingCycle?: 'monthly' | 'annual';
  }): Promise<{ subscriptionId: string; approveUrl: string }> {
    return this.paymentService.createPaypalSubscription(data);
  }

  /**
   * Creates a new subscription contract and provisions its hardware slots.
   *
   * @param data - CreateSubscriptionInput attributes
   * @param clientId - Client user UUID
   * @param tenantId - Tenant UUID
   * @param byAdmin - True if invoked by admin
   * @returns Created Subscription entity
   */
  async createSubscription(data: CreateSubscriptionInput, clientId: string, tenantId: string, byAdmin = false): Promise<Subscription> {
    return this.lifecycleService.createSubscription(data, clientId, tenantId, byAdmin);
  }

  /**
   * Updates plan tier, hardware slots, or cancellation status on a subscription.
   *
   * @param id - Subscription UUID
   * @param data - UpdateSubscriptionInput attributes
   * @param tenantId - Tenant UUID
   * @param byAdmin - True if invoked by admin
   * @returns Updated Subscription entity
   */
  async updateSubscription(id: string, data: UpdateSubscriptionInput, tenantId: string, byAdmin = false): Promise<Subscription> {
    return this.lifecycleService.updateSubscription(id, data, tenantId, byAdmin);
  }
}

export const subscriptionService = new SubscriptionService();
