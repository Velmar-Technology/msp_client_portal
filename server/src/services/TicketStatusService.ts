import { ticketRepository, TicketRepository } from '../repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '../repositories/TicketEventRepository';
import { userRepository, UserRepository } from '../repositories/UserRepository';
import { notificationService, NotificationService } from './NotificationService';
import { ticketAccessPolicy, TicketAccessPolicy } from '../policies/TicketAccessPolicy';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { Ticket, TicketCategory, TicketEvent, TicketStatus, UserContext } from '../types';
import { UpdateTicketStatusInput } from '../dtos/ticket.dto';

export class TicketStatusService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  async updateStatus(ticketId: string, data: UpdateTicketStatusInput, ctx: UserContext): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
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
      throw AppError.internal('Failed to update ticket status');
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

    logger.info('Ticket status updated', { ticketId, from: ticket.status, to: data.status, updatedBy: ctx.userId });
    return updated;
  }

  async getTicketTimeline(ticketId: string, ctx: UserContext): Promise<TicketEvent[]> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return this.eventRepo.findByTicket(ticketId);
  }

  private async notifyClientOfStatusChange(ticketId: string, updated: Ticket, notes?: string): Promise<void> {
    const client = await this.userRepo.findById(updated.client_id);
    if (!client) return;

    const fullUpdatedTicket = (await this.ticketRepo.findById(ticketId)) || updated;
    await this.notifSvc.onTicketStatusChanged(fullUpdatedTicket, client, notes);
  }
}

export const ticketStatusService = new TicketStatusService();
