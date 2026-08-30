import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketResponseRepository, TicketResponseRepository } from '@modules/tickets/repositories/TicketResponseRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { notificationService, NotificationService } from '@modules/notifications';
import { ticketAccessPolicy, TicketAccessPolicy } from '@shared/policies/TicketAccessPolicy';
import { accountStatusPolicy, AccountStatusPolicy } from '@shared/policies/AccountStatusPolicy';
import { NotFoundError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { Ticket, TicketAttachment, TicketResponse, UploadedFile, UserContext, UserRole } from '@shared/types';

/**
 * Domain service managing conversational message responses and reply attachments on support tickets.
 */
export class TicketResponseService {
  /**
   * Initializes TicketResponseService with repository, user, notification, and policy dependencies.
   *
   * @param ticketRepo - Ticket data repository
   * @param responseRepo - Ticket conversation response repository
   * @param userRepo - User repository for sender/recipient details
   * @param notifSvc - Notification service for real-time alerts
   * @param accessPol - Ticket access policy
   * @param accountPol - Account status policy for read-only / suspension enforcement
   */
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private responseRepo: TicketResponseRepository = ticketResponseRepository,
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
    private accountPol: AccountStatusPolicy = accountStatusPolicy,
  ) {}

  /**
   * Retrieves all conversational responses and their associated file attachments for a ticket.
   *
   * @param ticketId - Target ticket UUID
   * @param ctx - Authenticated user context
   * @returns Array of TicketResponse entities enriched with attachments
   * @throws {NotFoundError} When ticket is not found
   * @throws {ForbiddenError} When access to ticket is disallowed
   */
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

  /**
   * Posts a new reply message and optional file attachments to a ticket, and sends a notification to the counterparty.
   *
   * @param ticketId - Target ticket UUID
   * @param message - Response body text
   * @param ctx - Authenticated user context of the sender
   * @param files - Optional list of uploaded file attachments
   * @returns Newly created TicketResponse entity enriched with sender metadata
   * @throws {ForbiddenError} When the account is in Read-Only, Suspended, or Purged state (Section 9.3)
   * @throws {NotFoundError} When ticket is not found
   * @throws {ForbiddenError} When access is disallowed
   */
  async addTicketResponse(
    ticketId: string,
    message: string,
    ctx: UserContext,
    files: UploadedFile[] = [],
  ): Promise<TicketResponse> {
    this.accountPol.assertWriteAllowed(ctx);
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

  /**
   * Validates ticket existence and read access.
   *
   * @param ticketId - Target ticket UUID
   * @param ctx - Authenticated user context
   * @returns Authorized Ticket entity
   * @throws {NotFoundError} When ticket not found
   * @throws {ForbiddenError} When access is forbidden
   */
  private async requireTicket(ticketId: string, ctx: UserContext): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return ticket;
  }

  /**
   * Helper to group a flat list of ticket attachments by their associated response ID.
   *
   * @param attachments - Array of attachments
   * @returns Map of responseId -> TicketAttachment[]
   */
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

  /**
   * Dispatches a notification to the counterparty (technician if client responded, or client if technician responded).
   *
   * @param ticket - Target Ticket entity
   * @param ctx - Authenticated sender context
   * @param message - Reply message content
   */
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
