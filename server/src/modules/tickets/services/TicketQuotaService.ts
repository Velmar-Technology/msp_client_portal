import { subscriptionRepository, SubscriptionRepository } from '@modules/subscriptions';
import { planRepository, PlanRepository } from '@modules/subscriptions';
import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { AppError } from '@shared/utils/AppError';
import { HELPDESK_SUPPORT_FEATURE_CODE } from '@shared/config/constants';
import { Subscription, SubscriptionStatus } from '@shared/types';

interface HelpdeskQuota {
  checkedAnyFeature: boolean;
  unlimited: boolean;
  limit: number;
}

export class TicketQuotaService {
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private planRepo: PlanRepository = planRepository,
    private ticketRepo: TicketRepository = ticketRepository,
  ) {}

  async enforceTicketLimit(clientId: string, tenantId: string, equipmentId?: string): Promise<void> {
    const subs = await this.subscriptionRepo.findByClient(clientId, tenantId);
    const activeSubs = subs.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.EXPIRING
    );

    if (activeSubs.length === 0) return;

    const quota = await this.resolveQuota(activeSubs);
    if (!quota.checkedAnyFeature || quota.unlimited || quota.limit === 0) return;

    if (equipmentId) {
      await this.enforceDeviceQuota(equipmentId, quota.limit);
    } else {
      await this.enforceAccountQuota(clientId, quota.limit);
    }
  }

  private async resolveQuota(activeSubs: Subscription[]): Promise<HelpdeskQuota> {
    let checkedAnyFeature = false;
    let unlimited = false;
    let maxLimit = 0;

    for (const sub of activeSubs) {
      const plan = await this.planRepo.findById(sub.plan);
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

  private async enforceDeviceQuota(equipmentId: string, limit: number): Promise<void> {
    const deviceTicketCount = await this.ticketRepo.countEquipmentTicketsInCurrentMonth(equipmentId);
    if (deviceTicketCount >= limit) {
      throw AppError.forbidden(
        `Monthly ticket limit reached for this device (${deviceTicketCount}/${limit}). Your plan allows up to ${limit} tickets per device per month.`,
        'TICKET_LIMIT_EXCEEDED'
      );
    }
  }

  private async enforceAccountQuota(clientId: string, limit: number): Promise<void> {
    const clientTicketCount = await this.ticketRepo.countClientTicketsInCurrentMonth(clientId);
    if (clientTicketCount >= limit) {
      throw AppError.forbidden(
        `Monthly ticket limit reached (${clientTicketCount}/${limit}). Your subscription plan allows up to ${limit} tickets per month.`,
        'TICKET_LIMIT_EXCEEDED'
      );
    }
  }
}

export const ticketQuotaService = new TicketQuotaService();
