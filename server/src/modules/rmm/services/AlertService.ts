import { rmmAlertRepository, RmmAlertRepository } from '@modules/rmm/repositories/RmmAlertRepository';
import { ticketRepository, TicketRepository } from '@modules/tickets';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets';
import { ticketCreationService, TicketCreationService } from '@modules/tickets';
import { logger } from '@shared/utils/logger';
import {
  RMM_DEDUP_WINDOW_MS,
  RMM_FLAP_WINDOW_MS,
  RMM_FLAP_THRESHOLD,
  RMM_SELF_HEAL_MAX_MS,
  FLAPPING_ALERT_TAG,
  TIER_2_SPECIALTY,
} from '@shared/config/constants';
import { RmmAlertInput, Ticket, TicketCategory, TicketPriority, TicketStatus, ZabbixWebhookPayload } from '@shared/types';

export type RmmAlertOutcome =
  | { status: 'DEDUPLICATED' }
  | { status: 'FLAPPING'; ticket: Ticket }
  | { status: 'SELF_HEALED'; ticket: Ticket }
  | { status: 'TICKET_CREATED'; ticket: Ticket };

/**
 * Domain service processing RMM and Zabbix telemetry alerts, enforcing 15-minute deduplication,
 * self-healing auto-resolution (<300s), and 24h flapping detection escalations to Tier 2.
 *
 * @see BL-103 (Alert Noise & Auto-Remediation)
 */
export class AlertService {
  /**
   * Initializes AlertService with alert, ticket, event repositories, and ticket creation service dependencies.
   *
   * @param rmmAlertRepo - RMM alert event repository
   * @param ticketRepo - Support ticket repository
   * @param eventRepo - Ticket audit event repository
   * @param creationSvc - Ticket creation domain service
   */
  constructor(
    private rmmAlertRepo: RmmAlertRepository = rmmAlertRepository,
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private creationSvc: TicketCreationService = ticketCreationService,
  ) {}

  /**
   * Ingests and transforms external Zabbix webhook payload into normalized RMM alert parameters.
   *
   * @param payload - Zabbix webhook payload
   * @param fallbackTenantId - Tenant UUID fallback
   * @param fallbackUserId - Optional user ID fallback
   * @returns RmmAlertOutcome result
   * @see BL-103
   */
  async processZabbixWebhook(payload: ZabbixWebhookPayload, fallbackTenantId: string, fallbackUserId?: string): Promise<RmmAlertOutcome> {
    const alertType = payload.alertType || payload.triggername || 'ZABBIX_ALERT';
    const assetId = payload.assetId || payload.hostname || 'UNKNOWN_HOST';
    const tenantId = payload.tenantId || fallbackTenantId;
    const clientId = payload.clientId || fallbackUserId || fallbackTenantId;

    let priority = TicketPriority.MEDIUM;
    const sev = String(payload.severity || '').toLowerCase();
    if (sev === '5' || sev.includes('disaster') || sev.includes('critical')) {
      priority = TicketPriority.CRITICAL;
    } else if (sev === '4' || sev.includes('high')) {
      priority = TicketPriority.HIGH;
    } else if (sev === '1' || sev === '2' || sev.includes('info') || sev.includes('warning')) {
      priority = TicketPriority.LOW;
    }

    const input: RmmAlertInput = {
      alertType,
      assetId,
      tenantId,
      priority,
      executionTimeMs: payload.executionTimeMs ?? 500000,
      clientId,
    };

    return this.processRMMAlert(input);
  }

  /**
   * Executes RMM alert evaluation:
   * 1. 15-minute deduplication window for same asset (BL-103).
   * 2. Flapping detection (>=3 triggers in 24h) tagging [FLAPPING_ALERT] and routing to Tier 2 (BL-103).
   * 3. Self-healing evaluation (executionTimeMs < 300,000ms auto-closes as RESOLVED_AUTOMATED).
   *
   * @param input - RmmAlertInput data
   * @returns RmmAlertOutcome indicating DEDUPLICATED, FLAPPING, SELF_HEALED, or TICKET_CREATED
   * @see BL-103
   */
  async processRMMAlert(input: RmmAlertInput): Promise<RmmAlertOutcome> {
    const now = new Date();

    const recentCount = await this.rmmAlertRepo.countInWindow(
      input.alertType,
      input.assetId,
      new Date(now.getTime() - RMM_DEDUP_WINDOW_MS)
    );
    if (recentCount > 0) {
      logger.info('RMM alert deduplicated within 15-minute window', {
        alertType: input.alertType,
        assetId: input.assetId,
      });
      return { status: 'DEDUPLICATED' };
    }

    await this.rmmAlertRepo.create({
      alertType: input.alertType,
      assetId: input.assetId,
      tenantId: input.tenantId,
    });

    const flapCount = await this.rmmAlertRepo.countInWindow(
      input.alertType,
      input.assetId,
      new Date(now.getTime() - RMM_FLAP_WINDOW_MS)
    );

    const priority = input.priority ?? TicketPriority.MEDIUM;

    if (flapCount >= RMM_FLAP_THRESHOLD) {
      const ticket = await this.creationSvc.createTicketFromAlert(input, {
        status: TicketStatus.OPEN,
        category: TicketCategory.PREVENTATIVE_MAINTENANCE,
        priority,
        tag: FLAPPING_ALERT_TAG,
        assignment: { mode: 'specialty', specialty: TIER_2_SPECIALTY },
      });
      logger.warn('Flapping alert detected, escalating to Tier 2', {
        alertType: input.alertType,
        assetId: input.assetId,
        flapCount,
        ticketId: ticket.id,
      });
      return { status: 'FLAPPING', ticket };
    }

    if (input.executionTimeMs < RMM_SELF_HEAL_MAX_MS) {
      const ticket = await this.creationSvc.createTicketFromAlert(input, {
        status: TicketStatus.OPEN,
        category: TicketCategory.REPAIR,
        priority,
        tag: null,
        assignment: null,
      });
      const closed = await this.autoCloseTicket(ticket, input);
      logger.info('RMM alert self-healed and auto-closed', {
        alertType: input.alertType,
        assetId: input.assetId,
        executionTimeMs: input.executionTimeMs,
        ticketId: closed.id,
      });
      return { status: 'SELF_HEALED', ticket: closed };
    }

    const ticket = await this.creationSvc.createTicketFromAlert(input, {
      status: TicketStatus.OPEN,
      category: TicketCategory.REPAIR,
      priority,
      tag: null,
      assignment: { mode: 'general' },
    });
    return { status: 'TICKET_CREATED', ticket };
  }

  // ---- KPI Calculators ----

  /**
   * Calculates the noise reduction ratio percentage across ingested alerts.
   *
   * @param totalAlerts - Total alerts received
   * @param humanTouchTickets - Number of alerts converted to manual technician tickets
   * @returns Ratio scalar between 0 and 1
   */
  calculateNoiseReductionRatio(totalAlerts: number, humanTouchTickets: number): number {
    if (totalAlerts <= 0) return 0;
    return Math.max(0, (totalAlerts - humanTouchTickets) / totalAlerts);
  }

  /**
   * Calculates the percentage efficiency of automated self-healing scripts.
   *
   * @param autoClosedCount - Count of tickets auto-closed
   * @param flappingOverridesCount - Count of tickets escalating as flapping alerts
   * @returns Efficiency ratio between 0 and 1
   */
  calculateSelfHealingEfficiency(autoClosedCount: number, flappingOverridesCount: number): number {
    const total = autoClosedCount + flappingOverridesCount;
    if (total <= 0) return 0;
    return autoClosedCount / total;
  }

  /**
   * Computes the automated first-contact resolution percentage.
   *
   * @param automatedResolvedCount - Count of automatically resolved tickets
   * @param totalTicketsIngested - Total tickets ingested from alerts
   * @returns Resolution ratio between 0 and 1
   */
  calculateFirstContactResolutionAutomation(automatedResolvedCount: number, totalTicketsIngested: number): number {
    if (totalTicketsIngested <= 0) return 0;
    return automatedResolvedCount / totalTicketsIngested;
  }

  /**
   * Transitions ticket to RESOLVED_AUTOMATED status and logs audit trail event.
   *
   * @param ticket - Created ticket
   * @param input - Alert input parameters
   * @returns Updated Ticket entity
   */
  private async autoCloseTicket(ticket: Ticket, input: RmmAlertInput): Promise<Ticket> {
    const updated = await this.ticketRepo.updateStatus(ticket.id, TicketStatus.RESOLVED_AUTOMATED);
    await this.eventRepo.create({
      ticket_id: ticket.id,
      old_status: TicketStatus.OPEN,
      new_status: TicketStatus.RESOLVED_AUTOMATED,
      changed_by: input.createdByUserId ?? input.clientId,
      notes: 'Self-healing script resolved the alert within 300 seconds',
      tenant_id: input.tenantId,
    });
    return updated || ticket;
  }
}

export const alertService = new AlertService();
