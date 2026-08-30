import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets/repositories/TicketEventRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { notificationService, NotificationService } from '@modules/notifications';
import { technicianEarningsService, TechnicianEarningsService } from '@modules/system';
import { ticketAccessPolicy, TicketAccessPolicy } from '@shared/policies/TicketAccessPolicy';
import { NotFoundError, InternalServerError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { Ticket, TicketCategory, TicketEvent, TicketStatus, UserContext } from '@shared/types';
import { UpdateTicketStatusInput } from '@shared/dtos/ticket.dto';

/**
 * Domain service managing ticket status state transitions, SLA cancellation constraints,
 * audit event logging, status change client notifications, and technician closure commission calculation.
 *
 * @see BL-101 (1-Hour SLA Cancellation Rule)
 * @see BL-301 (RBAC & Status Transition State Machine)
 */
export class TicketStatusService {
  /**
   * Initializes TicketStatusService with repository, notification, earnings, and policy dependencies.
   *
   * @param ticketRepo - Ticket data repository
   * @param eventRepo - Ticket audit event repository
   * @param userRepo - User repository for client lookup
   * @param notifSvc - Notification service for real-time dispatch
   * @param accessPol - Ticket access and state transition policy
   * @param earningsSvc - Technician earnings and OpEx calculation service
   */
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
    private earningsSvc: TechnicianEarningsService = technicianEarningsService,
  ) {}

  /**
   * Updates the lifecycle status of a ticket, enforcing RBAC permissions, state machine transitions,
   * and the 1-hour SLA cancellation window for WARRANTY / SERVICE_OUTAGE tickets.
   *
   * @param ticketId - Target ticket UUID
   * @param data - Target status and optional transition notes
   * @param ctx - Authenticated user context
   * @returns Updated Ticket entity
   * @throws {NotFoundError} When the ticket does not exist
   * @throws {ForbiddenError} When user lacks permission to update status or cross-tenant access is attempted (BL-301)
   * @throws {InvalidTransitionError} When state transition is disallowed by state machine (BL-301)
   * @throws {SlaViolationError} When attempting to cancel WARRANTY/SERVICE_OUTAGE ticket beyond 60m SLA (BL-101)
   * @throws {InternalServerError} When database update fails
   * @see BL-101
   * @see BL-301
   */
  async updateStatus(ticketId: string, data: UpdateTicketStatusInput, ctx: UserContext): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    this.accessPol.assertStatusUpdateAccess(ticket, data.status, ctx);

    if (
      data.status === TicketStatus.CANCELLED &&
      (ticket.category === TicketCategory.WARRANTY || ticket.category === TicketCategory.SERVICE_OUTAGE)
    ) {
      this.accessPol.enforceSLARule(ticket);
    }

    const updated = await this.ticketRepo.updateStatus(ticketId, data.status);
    if (!updated) {
      throw new InternalServerError('Failed to update ticket status');
    }

    await this.eventRepo.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: data.status,
      changed_by: ctx.userId,
      notes: data.notes,
      tenant_id: ticket.tenant_id,
    });

    await this.notifyClientOfStatusChange(ticketId, updated, data.notes);

    // Trigger technician closure earnings or void if reopened
    if (data.status === TicketStatus.RESOLVED || data.status === TicketStatus.CLOSED) {
      const closingTechId = updated.assigned_tech_id || ctx.userId;
      if (closingTechId && ctx.role === 'TECHNICIAN' || ctx.role === 'ADMIN') {
        this.earningsSvc.calculateAndRecordEarnings(updated, closingTechId, ticket.tenant_id).catch((err) => {
          logger.error('Failed to calculate technician earnings for ticket closure', { error: err, ticketId });
        });
      }
    } else if (
      (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) &&
      (data.status === TicketStatus.OPEN || data.status === TicketStatus.IN_PROGRESS || data.status === TicketStatus.CANCELLED)
    ) {
      this.earningsSvc.voidEarningsForReopenedTicket(ticketId, ticket.tenant_id).catch((err) => {
        logger.error('Failed to void technician earnings on ticket reopen', { error: err, ticketId });
      });
    }

    logger.info('Ticket status updated', { ticketId, from: ticket.status, to: data.status, updatedBy: ctx.userId });
    return updated;
  }

  /**
   * Retrieves the historical audit timeline events for a ticket.
   *
   * @param ticketId - Target ticket UUID
   * @param ctx - Authenticated user context
   * @returns Array of TicketEvent records in chronological order
   * @throws {NotFoundError} When ticket does not exist
   * @throws {ForbiddenError} When user does not have permission to view ticket
   */
  async getTicketTimeline(ticketId: string, ctx: UserContext): Promise<TicketEvent[]> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return this.eventRepo.findByTicket(ticketId);
  }

  /**
   * Dispatches email and WebSocket notifications to the client regarding a ticket status change.
   *
   * @param ticketId - Target ticket UUID
   * @param updated - Updated Ticket entity
   * @param notes - Optional status change notes
   */
  private async notifyClientOfStatusChange(ticketId: string, updated: Ticket, notes?: string): Promise<void> {
    const client = await this.userRepo.findById(updated.client_id);
    if (!client) return;

    const fullUpdatedTicket = (await this.ticketRepo.findById(ticketId)) || updated;
    await this.notifSvc.onTicketStatusChanged(fullUpdatedTicket, client, notes);
  }
}

export const ticketStatusService = new TicketStatusService();
