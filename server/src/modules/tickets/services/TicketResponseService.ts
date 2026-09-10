import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketResponseRepository, TicketResponseRepository } from '@modules/tickets/repositories/TicketResponseRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { notificationService, NotificationService } from '@modules/notifications';
import { agentGateway, AgentGateway } from '@modules/rmm';
import { ticketAccessPolicy, TicketAccessPolicy } from '@shared/policies/TicketAccessPolicy';
import { accountStatusPolicy, AccountStatusPolicy } from '@shared/policies/AccountStatusPolicy';
import { NotFoundError, ForbiddenError, ValidationError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { Ticket, TicketAttachment, TicketResponse, TicketStatus, UploadedFile, UserContext, UserRole, AgentPayload } from '@shared/types';
import { AddAgentTicketResponseInput } from '@shared/contracts';
import { ticketStreamGateway, TicketStreamGateway } from './TicketStreamGateway';

/**
 * Domain service managing conversational message responses and reply attachments on support tickets.
 */
export class TicketResponseService {
  /**
   * Initializes TicketResponseService with repository, user, notification, policy, agentGateway, and ticketStreamGateway dependencies.
   *
   * @param ticketRepo - Ticket data repository
   * @param responseRepo - Ticket conversation response repository
   * @param userRepo - User repository for sender/recipient details
   * @param notifSvc - Notification service for real-time alerts
   * @param accessPol - Ticket access policy
   * @param accountPol - Account status policy for read-only / suspension enforcement
   * @param agentGw - RMM AgentGateway for live WebSocket chat push
   * @param streamGw - Web portal WebSocket stream gateway
   */
  private _agentGw?: AgentGateway;

  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private responseRepo: TicketResponseRepository = ticketResponseRepository,
    private userRepo: UserRepository = userRepository,
    private notifSvc: NotificationService = notificationService,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
    private accountPol: AccountStatusPolicy = accountStatusPolicy,
    agentGw?: AgentGateway,
    private streamGw: TicketStreamGateway = ticketStreamGateway,
  ) {
    this._agentGw = agentGw;
  }

  private get agentGw(): AgentGateway {
    if (!this._agentGw) {
      this._agentGw = agentGateway;
    }
    return this._agentGw;
  }

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

    // Push live WebSocket message to endpoint if ticket is bound to an equipment slot
    if (ticket.equipment_id) {
      this.agentGw.pushTicketChatMessage(ticket.equipment_id, {
        ticketId: ticket.id,
        responseId: response.id,
        authorName: user?.name ?? 'MSP Support',
        authorRole: ctx.role,
        message,
        attachments: responseAttachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          path: a.path,
        })),
        createdAt: response.created_at ? new Date(response.created_at).toISOString() : new Date().toISOString(),
      });
    }

    // Broadcast live message to web portal viewers subscribed to this ticket room
    this.streamGw.broadcastToTicket(ticket.id, {
      id: response.id,
      ticketId: ticket.id,
      userId: ctx.userId,
      authorName: user?.name ?? 'MSP Support',
      authorRole: ctx.role,
      isAgentAuthored: false,
      message,
      attachments: responseAttachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        path: a.path,
      })),
      createdAt: response.created_at ? new Date(response.created_at).toISOString() : new Date().toISOString(),
    });

    return {
      ...response,
      user_name: user?.name,
      user_role: user?.role,
      attachments: responseAttachments,
    };
  }

  /**
   * Posts a response message from an endpoint workstation agent without requiring portal login.
   *
   * @param ticketId - Target ticket UUID
   * @param data - Message payload containing reporterName and message
   * @param agent - Machine authentication context
   * @returns Newly created TicketResponse entity
   * @throws {NotFoundError} When ticket not found
   * @throws {ForbiddenError} When ticket does not belong to the calling endpoint (ZSP)
   * @throws {ValidationError} When ticket is closed or cancelled
   */
  async addTicketResponseFromAgent(
    ticketId: string,
    data: AddAgentTicketResponseInput,
    agent: AgentPayload
  ): Promise<TicketResponse> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.equipment_id !== agent.equipmentId || ticket.tenant_id !== agent.tenantId) {
      throw new ForbiddenError('Endpoint is not authorized to access or reply to this ticket');
    }

    if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.CANCELLED) {
      throw new ValidationError(`Cannot add responses to a ${ticket.status.toLowerCase()} ticket`);
    }

    const response = await this.responseRepo.create({
      ticket_id: ticketId,
      user_id: agent.clientId,
      author_name: data.reporterName,
      message: data.message,
      tenant_id: agent.tenantId,
    });

    // Update ticket updated_at
    await this.ticketRepo.update(ticketId, {
      updated_at: new Date(),
    });

    // Broadcast live message to web portal viewers subscribed to this ticket room
    this.streamGw.broadcastToTicket(ticket.id, {
      id: response.id,
      ticketId: ticket.id,
      userId: agent.clientId,
      authorName: data.reporterName,
      authorRole: 'CLIENT',
      isAgentAuthored: true,
      message: data.message,
      attachments: [],
      createdAt: response.created_at ? new Date(response.created_at).toISOString() : new Date().toISOString(),
    });

    // Notify assigned technician if present
    if (ticket.assigned_tech_id) {
      const technician = await this.userRepo.findById(ticket.assigned_tech_id);
      if (technician) {
        await this.notifSvc.onTicketResponseCreated(
          ticket,
          technician,
          `${data.reporterName} (Endpoint)`,
          data.message
        );
      }
    }

    return {
      ...response,
      author_name: data.reporterName,
      user_name: data.reporterName,
      user_role: 'CLIENT',
      attachments: [],
    };
  }

  /**
   * Retrieves all conversational responses for a ticket on behalf of a machine-authenticated endpoint agent.
   *
   * @param ticketId - Target ticket UUID
   * @param agent - Machine authentication context
   * @returns Array of TicketResponse entities enriched with attachments
   * @throws {NotFoundError} When ticket is not found
   * @throws {ForbiddenError} When ticket does not belong to the calling endpoint
   */
  async getTicketResponsesForAgent(ticketId: string, agent: AgentPayload): Promise<TicketResponse[]> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    if (ticket.equipment_id !== agent.equipmentId || ticket.tenant_id !== agent.tenantId) {
      throw new ForbiddenError('Endpoint is not authorized to access responses for this ticket');
    }

    const responses = await this.responseRepo.findByTicket(ticketId);
    const attachments = await this.ticketRepo.getAttachmentsByResponses(ticketId);
    const attachmentsByResponse = this.groupAttachmentsByResponse(attachments);

    return responses
      .filter((resp) => !resp.is_internal)
      .map((resp) => ({
        ...resp,
        attachments: attachmentsByResponse.get(resp.id) || [],
      }));
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
