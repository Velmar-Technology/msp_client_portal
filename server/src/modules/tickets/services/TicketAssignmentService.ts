import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets/repositories/TicketEventRepository';
import { userRepository, UserRepository } from '@modules/auth/repositories/UserRepository';
import { notificationService, NotificationService } from '@modules/notifications/services/NotificationService';
import { AppError } from '@shared/utils/AppError';
import { Ticket, UserRole } from '@shared/types';

export class TicketAssignmentService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
  ) {}

  async assignTicket(ticketId: string, techId: string, actorId: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    const technician = await this.userRepo.findById(techId);
    if (!technician) {
      throw AppError.notFound('Technician not found');
    }

    if (technician.role !== UserRole.TECHNICIAN) {
      throw AppError.badRequest('Assigned user must be a technician');
    }

    const updated = await this.ticketRepo.assignTechnician(ticketId, techId);
    if (!updated) {
      throw AppError.internal('Failed to assign technician');
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
      throw AppError.internal('Failed to retrieve updated ticket details');
    }

    await this.notifSvc.onTicketAssigned(fullUpdatedTicket, technician);
    return fullUpdatedTicket;
  }
}

export const ticketAssignmentService = new TicketAssignmentService();
