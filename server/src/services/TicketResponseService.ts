import { ticketRepository, TicketRepository } from '../repositories/TicketRepository';
import { ticketResponseRepository, TicketResponseRepository } from '../repositories/TicketResponseRepository';
import { userRepository, UserRepository } from '../repositories/UserRepository';
import { notificationService, NotificationService } from './NotificationService';
import { ticketAccessPolicy, TicketAccessPolicy } from '../policies/TicketAccessPolicy';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { Ticket, TicketAttachment, TicketResponse, UploadedFile, UserContext, UserRole } from '../types';

export class TicketResponseService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private responseRepo: TicketResponseRepository = ticketResponseRepository,
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  async getTicketResponses(ticketId: string, ctx: UserContext): Promise<TicketResponse[]> {
    await this.requireTicket(ticketId, ctx);

    const responses = await this.responseRepo.findByTicket(ticketId);
    const attachments = await this.ticketRepo.getAttachmentsByResponses(ticketId);

    const attachmentsByResponse = this.groupAttachmentsByResponse(attachments);

    return responses.map((resp) => ({
      ...resp,
      attachments: attachmentsByResponse.get(resp.id) || [],
    }));
  }

  async addTicketResponse(
    ticketId: string,
    message: string,
    ctx: UserContext,
    files: UploadedFile[] = [],
  ): Promise<TicketResponse> {
    const ticket = await this.requireTicket(ticketId, ctx);

    const response = await this.responseRepo.create({
      ticket_id: ticketId,
      user_id: ctx.userId,
      message,
      tenant_id: ticket.tenant_id,
    });

    const responseAttachments: TicketAttachment[] = [];
    for (const file of files) {
      const attachment = await this.ticketRepo.addAttachment({
        ticket_id: ticketId,
        response_id: response.id,
        filename: file.filename,
        path: file.path,
        mime_type: file.mimetype,
        size_bytes: file.size,
        tenant_id: ticket.tenant_id,
      });
      responseAttachments.push(attachment);
    }

    await this.notifyResponseRecipient(ticket, ctx, message);

    const user = await this.userRepo.findById(ctx.userId);
    return {
      ...response,
      user_name: user?.name,
      user_role: user?.role,
      attachments: responseAttachments,
    };
  }

  private async requireTicket(ticketId: string, ctx: UserContext): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return ticket;
  }

  private groupAttachmentsByResponse(attachments: TicketAttachment[]): Map<string, TicketAttachment[]> {
    const grouped = new Map<string, TicketAttachment[]>();
    for (const attachment of attachments) {
      if (!attachment.response_id) continue;
      const list = grouped.get(attachment.response_id) || [];
      list.push(attachment);
      grouped.set(attachment.response_id, list);
    }
    return grouped;
  }

  private async notifyResponseRecipient(ticket: Ticket, ctx: UserContext, message: string): Promise<void> {
    try {
      const sender = await this.userRepo.findById(ctx.userId);
      if (!sender) return;

      if (ctx.role === UserRole.CLIENT) {
        if (ticket.assigned_tech_id) {
          const technician = await this.userRepo.findById(ticket.assigned_tech_id);
          if (technician) {
            await this.notifSvc.onTicketResponseCreated(ticket, technician, sender.name, message);
          }
        }
      } else {
        const client = await this.userRepo.findById(ticket.client_id);
        if (client) {
          await this.notifSvc.onTicketResponseCreated(ticket, client, sender.name, message);
        }
      }
    } catch (err) {
      logger.error('Failed to send ticket response notification', { ticketId: ticket.id, error: err });
    }
  }
}

export const ticketResponseService = new TicketResponseService();
