import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketAccessPolicy, TicketAccessPolicy } from '@shared/policies/TicketAccessPolicy';
import { NotFoundError } from '@shared/errors';
import { Ticket, TicketAttachment, UploadedFile, UserContext } from '@shared/types';

/**
 * Domain service managing ticket file attachments with tenant security and RBAC validation.
 */
export class TicketAttachmentService {
  /**
   * Initializes TicketAttachmentService with repository and policy dependencies.
   *
   * @param ticketRepo - Ticket data repository
   * @param accessPol - Ticket access policy
   */
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  /**
   * Retrieves all file attachments associated with a ticket.
   *
   * @param ticketId - Target ticket UUID
   * @param ctx - Authenticated user context
   * @returns Array of TicketAttachment records
   * @throws {NotFoundError} When ticket does not exist
   * @throws {ForbiddenError} When user does not have permission to view ticket
   */
  async getTicketAttachments(ticketId: string, ctx: UserContext): Promise<TicketAttachment[]> {
    await this.requireTicket(ticketId, ctx);
    return this.ticketRepo.getAttachments(ticketId);
  }

  /**
   * Links an uploaded file attachment to a ticket.
   *
   * @param ticketId - Target ticket UUID
   * @param file - Uploaded file metadata (filename, path, mimetype, size)
   * @param ctx - Authenticated user context
   * @returns Newly created TicketAttachment entity
   * @throws {NotFoundError} When ticket does not exist
   * @throws {ForbiddenError} When user lacks access to ticket
   */
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

  /**
   * Validates ticket existence and read authorization for the requesting user context.
   *
   * @param ticketId - Target ticket UUID
   * @param ctx - Authenticated user context
   * @returns Authorized Ticket entity
   * @throws {NotFoundError} When ticket is not found
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
}

export const ticketAttachmentService = new TicketAttachmentService();
