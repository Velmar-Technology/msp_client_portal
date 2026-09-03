import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions/repositories/SubscriptionRepository';
import { PlanRepository, planRepository } from '@modules/subscriptions/repositories/PlanRepository';
import { UserRepository, userRepository } from '@modules/auth';
import { SubscriptionLifecycleService, subscriptionLifecycleService } from '@modules/subscriptions/services/SubscriptionLifecycleService';
import { SubscriptionPaymentService, subscriptionPaymentService } from '@modules/subscriptions/services/SubscriptionPaymentService';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { Subscription, expandFeatureBundles } from '@shared/types';
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
   * @param planRepo - Plan repository
   */
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private userRepo: UserRepository = userRepository,
    private lifecycleService: SubscriptionLifecycleService = subscriptionLifecycleService,
    private paymentService: SubscriptionPaymentService = subscriptionPaymentService,
    private planRepo: PlanRepository = planRepository
  ) {}

  /**
   * Resolves the union of all active subscription features for a tenant.
   *
   * Evaluates all subscriptions in ACTIVE or EXPIRING status and maps their
   * plan feature definitions into a deduplicated list of active feature codes.
   *
   * @param tenantId - Tenant UUID
   * @returns Promise resolving to an array of unique feature code strings
   */
  async getClientActiveFeatures(tenantId: string): Promise<string[]> {
    const subscriptions = await this.subscriptionRepo.findByTenant(tenantId);
    const activeSubs = subscriptions.filter(
      (sub) => sub.status === 'ACTIVE' || sub.status === 'EXPIRING'
    );

    if (activeSubs.length === 0) {
      return [];
    }

    const featureSet = new Set<string>();

    for (const sub of activeSubs) {
      const planId = sub.plan;
      if (!planId) continue;

      const plan = await this.planRepo.findById(planId);
      if (!plan || !Array.isArray(plan.features)) continue;

      for (const feat of plan.features) {
        if (typeof feat === 'string') {
          featureSet.add(feat);
        } else if (typeof feat === 'object' && feat !== null) {
          const item = feat as { code?: string; included?: boolean };
          if (item.included !== false && item.code) {
            featureSet.add(item.code);
          }
        }
      }
    }

    return expandFeatureBundles(featureSet);
  }

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
