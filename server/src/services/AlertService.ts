import { rmmAlertRepository, RmmAlertRepository } from '../repositories/RmmAlertRepository';
import { ticketRepository, TicketRepository } from '../repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '../repositories/TicketEventRepository';
import { assignmentService, AssignmentService } from './AssignmentService';
import { logger } from '../utils/logger';
import {
  RMM_DEDUP_WINDOW_MS,
  RMM_FLAP_WINDOW_MS,
  RMM_FLAP_THRESHOLD,
  RMM_SELF_HEAL_MAX_MS,
  FLAPPING_ALERT_TAG,
  TIER_2_SPECIALTY,
} from '../config/constants';
import { RmmAlertInput, Ticket, TicketCategory, TicketPriority, TicketStatus } from '../types';

export type RmmAlertOutcome =
  | { status: 'DEDUPLICATED' }
  | { status: 'FLAPPING'; ticket: Ticket }
  | { status: 'SELF_HEALED'; ticket: Ticket }
  | { status: 'TICKET_CREATED'; ticket: Ticket };

export class AlertService {
  constructor(
    private rmmAlertRepo: RmmAlertRepository = rmmAlertRepository,
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private assignmentSvc: AssignmentService = assignmentService,
  ) {}

  /**
   * Process an incoming RMM alert (BL-103):
   * 1. Deduplicate alerts within a 15-minute window for the same asset.
   * 2. Track rolling 24-hour frequency per (alertType, assetId).
   * 3. Flapping alerts (>= 3 triggers in 24h) bypass auto-close, open a
   *    PREVENTATIVE_MAINTENANCE ticket tagged [FLAPPING_ALERT], and route to Tier 2.
   * 4. Self-healing scripts that resolve within 300s auto-close as RESOLVED_AUTOMATED.
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
      const ticket = await this.createTicketFromAlert(input, {
        status: TicketStatus.OPEN,
        category: TicketCategory.PREVENTATIVE_MAINTENANCE,
        priority,
        tag: FLAPPING_ALERT_TAG,
      });
      const technician = await this.assignmentSvc.getNextTechnician(ticket.category, TIER_2_SPECIALTY, priority);
      if (technician) {
        await this.ticketRepo.assignTechnician(ticket.id, technician.id);
      }
      logger.warn('Flapping alert detected, escalating to Tier 2', {
        alertType: input.alertType,
        assetId: input.assetId,
        flapCount,
        ticketId: ticket.id,
      });
      return { status: 'FLAPPING', ticket };
    }

    if (input.executionTimeMs < RMM_SELF_HEAL_MAX_MS) {
      const ticket = await this.createTicketFromAlert(input, {
        status: TicketStatus.OPEN,
        category: TicketCategory.REPAIR,
        priority,
        tag: null,
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

    const ticket = await this.createTicketFromAlert(input, {
      status: TicketStatus.OPEN,
      category: TicketCategory.REPAIR,
      priority,
      tag: null,
    });
    const technician = await this.assignmentSvc.getNextTechnician(ticket.category, undefined, priority);
    if (technician) {
      await this.ticketRepo.assignTechnician(ticket.id, technician.id);
    }
    return { status: 'TICKET_CREATED', ticket };
  }

  // ---- KPI Calculators ----

  /** Noise Reduction Ratio: share of alerts that never required human touch. */
  calculateNoiseReductionRatio(totalAlerts: number, humanTouchTickets: number): number {
    if (totalAlerts <= 0) return 0;
    return Math.max(0, (totalAlerts - humanTouchTickets) / totalAlerts);
  }

  /** Self-Healing Efficiency: share of auto-closed tickets among all auto-processable outcomes. */
  calculateSelfHealingEfficiency(autoClosedCount: number, flappingOverridesCount: number): number {
    const total = autoClosedCount + flappingOverridesCount;
    if (total <= 0) return 0;
    return autoClosedCount / total;
  }

  /** Automated First Contact Resolution: share of ingested tickets resolved without dispatcher intervention. */
  calculateFirstContactResolutionAutomation(automatedResolvedCount: number, totalTicketsIngested: number): number {
    if (totalTicketsIngested <= 0) return 0;
    return automatedResolvedCount / totalTicketsIngested;
  }

  private async createTicketFromAlert(
    input: RmmAlertInput,
    opts: { status: TicketStatus; category: TicketCategory; priority: TicketPriority; tag: string | null }
  ): Promise<Ticket> {
    const baseTitle = input.title || `RMM Alert: ${input.alertType}`;
    const title = opts.tag ? `${opts.tag} ${baseTitle}` : baseTitle;

    const ticket = await this.ticketRepo.create({
      title,
      description: input.description || `Automated RMM alert (${input.alertType}) for asset ${input.assetId}`,
      category: opts.category,
      priority: opts.priority,
      client_id: input.clientId,
      equipment_id: null,
      tenant_id: input.tenantId,
    });

    await this.eventRepo.create({
      ticket_id: ticket.id,
      old_status: null,
      new_status: opts.status,
      changed_by: input.createdByUserId ?? input.clientId,
      notes: `Ticket created from RMM alert (${input.alertType})`,
      tenant_id: input.tenantId,
    });

    return ticket;
  }

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
