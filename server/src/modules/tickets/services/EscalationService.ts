import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets/repositories/TicketEventRepository';
import { ticketResponseRepository, TicketResponseRepository } from '@modules/tickets/repositories/TicketResponseRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { assignmentService, AssignmentService } from '@modules/tickets/services/AssignmentService';
import { notificationService, NotificationService } from '@modules/notifications';
import { NotFoundError, InternalServerError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { calculateElapsedBusinessMs } from '@shared/utils/businessHours';
import { ESCALATION_THRESHOLDS_MS, TIER_2_SPECIALTY } from '@shared/config/constants';
import { Ticket, TicketStatus } from '@shared/types';

/**
 * Domain service enforcing automatic Tier 2 ticket escalation for unworked OPEN tickets exceeding priority SLA windows.
 *
 * @see BL-104 (Tier Escalation & Priority Thresholds)
 */
export class EscalationService {
  /**
   * Initializes EscalationService with repositories, assignment, and notification services.
   *
   * @param ticketRepo - Ticket data repository
   * @param eventRepo - Ticket audit event repository
   * @param responseRepo - Ticket conversation response repository
   * @param userRepo - User repository
   * @param assignmentSvc - Technician assignment service
   * @param notifSvc - Notification service for escalation alerts
   */
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private responseRepo: TicketResponseRepository = ticketResponseRepository,
    private userRepo: UserRepository = userRepository,
    private assignmentSvc: AssignmentService = assignmentService,
    private notifSvc: NotificationService = notificationService,
  ) {}

  /**
   * Evaluates an individual ticket against SLA escalation rules (BL-104).
   * Escalates unworked OPEN tickets beyond their priority threshold to a Tier 2 specialist.
   *
   * @param ticketId - Target ticket UUID
   * @returns Escalated Ticket entity or null if ticket is not eligible for escalation
   * @throws {NotFoundError} When ticket does not exist
   * @throws {InternalServerError} When reassignment fails
   * @see BL-104
   */
  async enforceEscalation(ticketId: string): Promise<Ticket | null> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.status !== TicketStatus.OPEN) {
      return null;
    }

    if (this.isWithinThreshold(ticket)) {
      return null;
    }

    if (!(await this.isUnworked(ticket))) {
      return null;
    }

    if (await this.isAssignedToTierTwo(ticket)) {
      return null;
    }

    const technician = await this.assignmentSvc.assignNext(ticket.category, TIER_2_SPECIALTY, ticket.priority);
    if (!technician) {
      logger.warn('No Tier 2 specialist available for escalation', { ticketId });
      return null;
    }

    const updated = await this.ticketRepo.assignTechnician(ticketId, technician.id);
    if (!updated) {
      throw new InternalServerError('Failed to assign technician during escalation');
    }

    await this.eventRepo.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: ticket.status,
      changed_by: ticket.client_id,
      notes: `Escalated to Tier 2 specialist (${technician.name}) after priority SLA threshold`,
      tenant_id: ticket.tenant_id,
    });

    const fullUpdatedTicket = (await this.ticketRepo.findById(ticketId)) || updated;
    await this.notifSvc.onTicketAssigned(fullUpdatedTicket, technician);

    logger.info('Ticket escalated to Tier 2', { ticketId, techId: technician.id, priority: ticket.priority });
    return fullUpdatedTicket;
  }

  /**
   * Sweeps all pending open tickets created prior to minimum escalation SLA threshold and processes escalations.
   *
   * @param tenantId - Optional tenant UUID filter
   * @returns Object containing count of escalated tickets
   * @see BL-104
   */
  async processPendingEscalations(tenantId?: string): Promise<{ escalated: number }> {
    const minThreshold = Math.min(...Object.values(ESCALATION_THRESHOLDS_MS));
    const cutoff = new Date(Date.now() - minThreshold);
    const candidates = await this.ticketRepo.findPendingEscalations(cutoff);

    let escalated = 0;
    for (const candidate of candidates) {
      if (tenantId && candidate.tenant_id !== tenantId) continue;
      try {
        const result = await this.enforceEscalation(candidate.id);
        if (result) escalated += 1;
      } catch (err) {
        logger.error('Failed to escalate ticket', { ticketId: candidate.id, error: err });
      }
    }

    if (escalated > 0) {
      logger.info(`Processed pending escalations: ${escalated} ticket(s) escalated`, { tenantId });
    }
    return { escalated };
  }

  /**
   * Checks whether the ticket's elapsed business time is still within priority escalation SLA threshold.
   * Uses business-hours-aware elapsed time so tickets submitted outside business hours
   * are not prematurely escalated before staff have had their active SLA window.
   *
   * @param ticket - Ticket entity
   * @returns True if within SLA window, false if threshold exceeded
   * @see Section 3.2 (SLA Calculation)
   * @see BL-104
   */
  private isWithinThreshold(ticket: Ticket): boolean {
    const threshold = ESCALATION_THRESHOLDS_MS[ticket.priority];
    if (!threshold) return true;
    const elapsedBusinessMs = calculateElapsedBusinessMs(new Date(ticket.created_at));
    return elapsedBusinessMs <= threshold;
  }

  /**
   * Determines if a ticket has had any technician responses or work recorded.
   *
   * @param ticket - Ticket entity
   * @returns True if unworked (no tech assigned or no tech responses)
   */
  private async isUnworked(ticket: Ticket): Promise<boolean> {
    if (!ticket.assigned_tech_id) return true;
    const responses = await this.responseRepo.findByTicket(ticket.id);
    return responses.length === 0;
  }

  /**
   * Checks if the assigned technician already possesses Tier 2 specialty credentials.
   *
   * @param ticket - Ticket entity
   * @returns True if already assigned to a Tier 2 technician
   */
  private async isAssignedToTierTwo(ticket: Ticket): Promise<boolean> {
    if (!ticket.assigned_tech_id) return false;
    const current = await this.userRepo.findById(ticket.assigned_tech_id);
    if (current && current.specialty && current.specialty.includes(TIER_2_SPECIALTY)) {
      logger.info('Ticket already assigned to a Tier 2 specialist, skipping escalation', { ticketId: ticket.id });
      return true;
    }
    return false;
  }
}

export const escalationService = new EscalationService();
