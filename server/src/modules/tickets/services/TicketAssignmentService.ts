import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets/repositories/TicketEventRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { notificationService, NotificationService } from '@modules/notifications';
import { NotFoundError, ValidationError, InternalServerError } from '@shared/errors';
import { Ticket, UserRole } from '@shared/types';

/**
 * Domain service managing explicit technician assignment to tickets,
 * event audit trail logging, and real-time technician notification.
 */
export class TicketAssignmentService {
  /**
   * Initializes TicketAssignmentService with repositories and notification service.
   *
   * @param ticketRepo - Ticket data repository
   * @param eventRepo - Ticket audit event repository
   * @param userRepo - User repository for validating technician role
   * @param notifSvc - Notification service for real-time alerts
   */
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
  ) {}

  /**
   * Assigns a ticket to a specific technician, records the assignment audit event,
   * and sends an assignment notification to the technician.
   *
   * @param ticketId - Target ticket UUID
   * @param techId - User ID of the technician being assigned
   * @param actorId - User ID of the administrator or user initiating the assignment
   * @returns Updated Ticket entity with assigned technician
   * @throws {NotFoundError} When the ticket or technician is not found
   * @throws {ValidationError} When the assigned user does not have the TECHNICIAN role
   * @throws {InternalServerError} When database mutation fails
   */
  async assignTicket(ticketId: string, techId: string, actorId: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const technician = await this.userRepo.findById(techId);
    if (!technician) {
      throw new NotFoundError('Technician not found');
    }

    if (technician.role !== UserRole.TECHNICIAN) {
      throw new ValidationError('Assigned user must be a technician');
    }

    const updated = await this.ticketRepo.assignTechnician(ticketId, techId);
    if (!updated) {
      throw new InternalServerError('Failed to assign technician');
    }

    await this.eventRepo.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: ticket.status,
      changed_by: actorId,
      notes: `Ticket assigned to technician: ${technician.name}`,
      tenant_id: ticket.tenant_id,
    });

    const fullUpdatedTicket = await this.ticketRepo.findById(ticketId);
    if (!fullUpdatedTicket) {
      throw new InternalServerError('Failed to retrieve updated ticket details');
    }

    await this.notifSvc.onTicketAssigned(fullUpdatedTicket, technician);
    return fullUpdatedTicket;
  }
}

export const ticketAssignmentService = new TicketAssignmentService();
