import { subscriptionRepository, SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { planRepository, PlanRepository } from '../repositories/PlanRepository';
import { ticketRepository, TicketRepository } from '../repositories/TicketRepository';
import { AppError } from '../utils/AppError';

export class TicketQuotaService {
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private planRepo: PlanRepository = planRepository,
    private ticketRepo: TicketRepository = ticketRepository,
  ) {}

  async enforceTicketLimit(clientId: string, tenantId: string, equipmentId?: string): Promise<void> {
    const subs = await this.subscriptionRepo.findByClient(clientId, tenantId);
    const activeSubs = subs.filter((s) => s.status === 'ACTIVE' || s.status === 'EXPIRING');

    if (activeSubs.length === 0) return;

    let hasUnlimited = false;
    let maxNumericLimit = 0;
    let checkedAnyFeature = false;

    for (const sub of activeSubs) {
      const plan = await this.planRepo.findById(sub.plan);
      if (!plan || !Array.isArray(plan.features)) continue;

      for (const feat of plan.features as any[]) {
        if (feat.code === 'HELPDESK_SUPPORT' && feat.included !== false) {
          checkedAnyFeature = true;
          const limitVal = feat.params?.limit;
          if (!limitVal || limitVal === 'Unlimited') {
            hasUnlimited = true;
            break;
          }
          const parsed = parseInt(String(limitVal), 10);
          if (!isNaN(parsed) && parsed > 0) {
            if (parsed > maxNumericLimit) {
              maxNumericLimit = parsed;
            }
          }
        }
      }
      if (hasUnlimited) break;
    }

    if (checkedAnyFeature && !hasUnlimited && maxNumericLimit > 0) {
      if (equipmentId) {
        const deviceTicketCount = await this.ticketRepo.countEquipmentTicketsInCurrentMonth(equipmentId);
        if (deviceTicketCount >= maxNumericLimit) {
          throw AppError.forbidden(
            `Monthly ticket limit reached for this device (${deviceTicketCount}/${maxNumericLimit}). Your plan allows up to ${maxNumericLimit} tickets per device per month.`,
            'TICKET_LIMIT_EXCEEDED'
          );
        }
      } else {
        const clientTicketCount = await this.ticketRepo.countClientTicketsInCurrentMonth(clientId);
        if (clientTicketCount >= maxNumericLimit) {
          throw AppError.forbidden(
            `Monthly ticket limit reached (${clientTicketCount}/${maxNumericLimit}). Your subscription plan allows up to ${maxNumericLimit} tickets per month.`,
            'TICKET_LIMIT_EXCEEDED'
          );
        }
      }
    }
  }
}

export const ticketQuotaService = new TicketQuotaService();
