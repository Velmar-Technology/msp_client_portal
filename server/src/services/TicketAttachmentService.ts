import { ticketRepository, TicketRepository } from '../repositories/TicketRepository';
import { ticketAccessPolicy, TicketAccessPolicy } from '../policies/TicketAccessPolicy';
import { AppError } from '../utils/AppError';
import { Ticket, TicketAttachment, UploadedFile, UserContext } from '../types';

export class TicketAttachmentService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  async getTicketAttachments(ticketId: string, ctx: UserContext): Promise<TicketAttachment[]> {
    await this.requireTicket(ticketId, ctx);
    return this.ticketRepo.getAttachments(ticketId);
  }

  async addAttachment(ticketId: string, file: UploadedFile, ctx: UserContext): Promise<TicketAttachment> {
    const ticket = await this.requireTicket(ticketId, ctx);

    return this.ticketRepo.addAttachment({
      ticket_id: ticketId,
      filename: file.filename,
      path: file.path,
      mime_type: file.mimetype,
      size_bytes: file.size,
      tenant_id: ticket.tenant_id,
    });
  }

  private async requireTicket(ticketId: string, ctx: UserContext): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return ticket;
  }
}

export const ticketAttachmentService = new TicketAttachmentService();
