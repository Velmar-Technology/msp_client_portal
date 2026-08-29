import { subscriptionRepository, SubscriptionRepository } from '@modules/subscriptions';
import { planRepository, PlanRepository } from '@modules/subscriptions';
import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { TicketLimitExceededError, ForbiddenError } from '@shared/errors';
import { HELPDESK_SUPPORT_FEATURE_CODE } from '@shared/config/constants';
import { Subscription, SubscriptionStatus } from '@shared/types';

interface HelpdeskQuota {
  checkedAnyFeature: boolean;
  unlimited: boolean;
  limit: number;
}

/**
 * Domain service enforcing subscription plan quotas and device ticket limits.
 *
 * @see BL-201 (Feature Quota Enforcement)
 */
export class TicketQuotaService {
  /**
   * Initializes TicketQuotaService with subscription, plan, and ticket repositories.
   *
   * @param subscriptionRepo - Subscription data repository
   * @param planRepo - Service plan data repository
   * @param ticketRepo - Ticket data repository
   */
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private planRepo: PlanRepository = planRepository,
    private ticketRepo: TicketRepository = ticketRepository,
  ) {}

  private get subsRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  private get plansRepo(): PlanRepository {
    return this.planRepo || planRepository;
  }

  private get ticketsRepo(): TicketRepository {
    return this.ticketRepo || ticketRepository;
  }

  /**
   * Validates that the client has an active subscription and has not exceeded monthly ticket quotas.
   * Checks per-device limits when equipmentId is provided, or per-tenant account limits otherwise.
   *
   * @param clientId - Client user ID
   * @param tenantId - Tenant UUID
   * @param equipmentId - Optional equipment asset ID
   * @returns Resolves when within allowed quota
   * @throws {ForbiddenError} When client has no active subscription
   * @throws {TicketLimitExceededError} When monthly ticket quota has been reached (BL-201)
   * @see BL-201
   */
  async enforceTicketLimit(clientId: string, tenantId: string, equipmentId?: string): Promise<void> {
    const subs = await this.subsRepo.findByClient(clientId, tenantId);
    const activeSubs = subs.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.EXPIRING
    );

    if (activeSubs.length === 0) {
      throw new ForbiddenError(
        'No active subscription found. Please renew your subscription to continue creating tickets.',
        { code: 'NO_ACTIVE_SUBSCRIPTION' }
      );
    }

    const quota = await this.resolveQuota(activeSubs);
    if (!quota.checkedAnyFeature || quota.unlimited || quota.limit === 0) return;

    if (equipmentId) {
      await this.enforceDeviceQuota(equipmentId, quota.limit);
    } else {
      await this.enforceAccountQuota(clientId, quota.limit);
    }
  }

  /**
   * Evaluates active subscriptions to calculate maximum allowed helpdesk ticket limits.
   *
   * @param activeSubs - Array of active client subscriptions
   * @returns HelpdeskQuota summary
   */
  private async resolveQuota(activeSubs: Subscription[]): Promise<HelpdeskQuota> {
    let checkedAnyFeature = false;
    let unlimited = false;
    let maxLimit = 0;

    for (const sub of activeSubs) {
      const plan = await this.plansRepo.findById(sub.plan);
      if (!plan || !Array.isArray(plan.features)) continue;

      for (const feature of plan.features) {
        if (feature.code !== HELPDESK_SUPPORT_FEATURE_CODE || feature.included === false) continue;

        checkedAnyFeature = true;
        const limitValue = feature.params?.limit;
        if (!limitValue || limitValue === 'Unlimited') {
          unlimited = true;
          break;
        }

        const parsed = parseInt(String(limitValue), 10);
        if (!isNaN(parsed) && parsed > maxLimit) {
          maxLimit = parsed;
        }
      }
      if (unlimited) break;
    }

    return { checkedAnyFeature, unlimited, limit: maxLimit };
  }

  /**
   * Verifies that the specific equipment asset has not exceeded its monthly ticket limit.
   *
   * @param equipmentId - Equipment UUID
   * @param limit - Max tickets per device per month
   * @throws {TicketLimitExceededError} When limit is exceeded
   * @see BL-201
   */
  private async enforceDeviceQuota(equipmentId: string, limit: number): Promise<void> {
    const deviceTicketCount = await this.ticketsRepo.countEquipmentTicketsInCurrentMonth(equipmentId);
    if (deviceTicketCount >= limit) {
      throw new TicketLimitExceededError(
        `Monthly ticket limit reached for this device (${deviceTicketCount}/${limit}). Your plan allows up to ${limit} tickets per device per month.`,
      );
    }
  }

  /**
   * Verifies that the client account has not exceeded its monthly total ticket limit.
   *
   * @param clientId - Client user ID
   * @param limit - Max tickets per account per month
   * @throws {TicketLimitExceededError} When limit is exceeded
   * @see BL-201
   */
  private async enforceAccountQuota(clientId: string, limit: number): Promise<void> {
    const clientTicketCount = await this.ticketsRepo.countClientTicketsInCurrentMonth(clientId);
    if (clientTicketCount >= limit) {
      throw new TicketLimitExceededError(
        `Monthly ticket limit reached (${clientTicketCount}/${limit}). Your subscription plan allows up to ${limit} tickets per month.`,
      );
    }
  }
}

export const ticketQuotaService = new TicketQuotaService();
