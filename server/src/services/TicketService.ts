import { ticketRepository } from '../repositories/TicketRepository';
import { ticketEventRepository } from '../repositories/TicketEventRepository';
import { ticketResponseRepository } from '../repositories/TicketResponseRepository';
import { userRepository } from '../repositories/UserRepository';
import { assignmentService } from './AssignmentService';
import { notificationService } from './NotificationService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { SLA_WINDOW_MS, STATUS_TRANSITIONS } from '../config/constants';
import {
  Ticket,
  TicketAttachment,
  TicketEvent,
  TicketResponse,
  TicketStatus,
  TicketCategory,
  TicketFilters,
  UserRole,
} from '../types';
import { CreateTicketInput, UpdateTicketStatusInput } from '../dtos/ticket.dto';

export class TicketService {
  /**
   * Create a new ticket and auto-assign a technician via Round-Robin.
   */
  async createTicket(data: CreateTicketInput, clientId: string, tenantId: string): Promise<Ticket> {
    // Create the ticket linked to the tenant
    const ticket = await ticketRepository.create({
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      client_id: clientId,
      tenant_id: tenantId,
    });

    // Log the creation event
    await ticketEventRepository.create({
      ticket_id: ticket.id,
      old_status: null,
      new_status: TicketStatus.OPEN,
      changed_by: clientId,
      notes: 'Ticket created by client',
      tenant_id: tenantId,
    });

    // Auto-assign technician via Round-Robin
    const technician = await assignmentService.getNextTechnician(data.category);
    if (technician) {
      await ticketRepository.assignTechnician(ticket.id, technician.id);
      ticket.assigned_tech_id = technician.id;

      logger.info('Ticket auto-assigned', {
        ticketId: ticket.id,
        techId: technician.id,
        techName: technician.name,
      });
    }

    // Notify the client
    const client = await userRepository.findById(clientId);
    if (client) {
      await notificationService.onTicketCreated(ticket, client);
    }

    return ticket;
  }

  /**
   * Get a ticket by ID with access control.
   */
  async getTicketById(ticketId: string, _userId: string, userRole: UserRole, tenantId: string): Promise<Ticket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    // Access control: Clients can only see their own tenant's tickets
    if (userRole === UserRole.CLIENT && ticket.tenant_id !== tenantId) {
      throw AppError.forbidden('You do not have access to this ticket');
    }

    return ticket;
  }

  /**
   * Get tickets with filters and pagination.
   */
  async getTickets(
    filters: TicketFilters,
    userId: string,
    userRole: UserRole,
    tenantId: string,
  ): Promise<{ tickets: Ticket[]; total: number }> {
    // Scope queries based on role
    if (userRole === UserRole.CLIENT) {
      // Clients see all tickets belonging to their tenant
      filters.tenantId = tenantId;
    } else if (userRole === UserRole.TECHNICIAN) {
      filters.assignedTechId = userId;
    }
    // ADMIN sees all tickets

    return ticketRepository.findWithFilters(filters);
  }

  /**
   * Update ticket status with SLA enforcement and notifications.
   */
  async updateTicketStatus(
    ticketId: string,
    data: UpdateTicketStatusInput,
    userId: string,
    userRole: UserRole,
    tenantId: string,
  ): Promise<Ticket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    // Access control: Verify client belongs to the ticket's tenant
    if (userRole === UserRole.CLIENT && ticket.tenant_id !== tenantId) {
      throw AppError.forbidden('You do not have access to this ticket');
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[ticket.status];
    if (!allowedTransitions || !allowedTransitions.includes(data.status)) {
      throw AppError.badRequest(
        `Cannot transition from ${ticket.status} to ${data.status}`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    // SLA 1-Hour Rule: Only for WARRANTY and SERVICE_OUTAGE cancellations
    if (
      data.status === TicketStatus.CANCELLED &&
      (ticket.category === TicketCategory.WARRANTY || ticket.category === TicketCategory.SERVICE_OUTAGE)
    ) {
      this.enforceSLARule(ticket);
    }

    // Access control for status updates
    if (userRole === UserRole.CLIENT) {
      // Clients can only cancel their own tickets
      if (data.status !== TicketStatus.CANCELLED) {
        throw AppError.forbidden('Clients can only cancel tickets');
      }
      if (ticket.client_id !== userId) {
        throw AppError.forbidden('You can only cancel your own tickets');
      }
    }

    // Perform the update
    const updated = await ticketRepository.updateStatus(ticketId, data.status);
    if (!updated) {
      throw AppError.internal('Failed to update ticket status');
    }

    // Log the event
    await ticketEventRepository.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: data.status,
      changed_by: userId,
      notes: data.notes,
      tenant_id: ticket.tenant_id,
    });

    // Trigger notifications
    const client = await userRepository.findById(ticket.client_id);
    if (client) {
      const fullUpdatedTicket = await ticketRepository.findById(ticketId) || updated;
      await notificationService.onTicketStatusChanged(fullUpdatedTicket, client, data.notes);
    }

    logger.info('Ticket status updated', {
      ticketId,
      from: ticket.status,
      to: data.status,
      updatedBy: userId,
    });

    return updated;
  }

  /**
   * Get ticket event timeline.
   */
  async getTicketTimeline(ticketId: string, userId: string, userRole: UserRole, tenantId: string): Promise<TicketEvent[]> {
    // Verify access
    await this.getTicketById(ticketId, userId, userRole, tenantId);
    return ticketEventRepository.findByTicket(ticketId);
  }

  /**
   * Get ticket attachments.
   */
  async getTicketAttachments(ticketId: string, userId: string, userRole: UserRole, tenantId: string): Promise<TicketAttachment[]> {
    await this.getTicketById(ticketId, userId, userRole, tenantId);
    return ticketRepository.getAttachments(ticketId);
  }

  /**
   * Add attachment to a ticket.
   */
  async addAttachment(
    ticketId: string,
    file: { filename: string; path: string; mimetype: string; size: number },
    userId: string,
    userRole: UserRole,
    tenantId: string,
  ): Promise<TicketAttachment> {
    const ticket = await this.getTicketById(ticketId, userId, userRole, tenantId);

    return ticketRepository.addAttachment({
      ticket_id: ticketId,
      filename: file.filename,
      path: file.path,
      mime_type: file.mimetype,
      size_bytes: file.size,
      tenant_id: ticket.tenant_id,
    });
  }

  /**
   * Get ticket count summary by status.
   */
  async getStatusSummary(userId: string, userRole: UserRole, tenantId: string): Promise<Record<string, number>> {
    const clientId = userRole === UserRole.CLIENT ? userId : undefined;
    const assignedTechId = userRole === UserRole.TECHNICIAN ? userId : undefined;
    const targetTenantId = userRole === UserRole.CLIENT ? tenantId : undefined;
    return ticketRepository.countByStatus(clientId, assignedTechId, targetTenantId);
  }

  /**
   * Assign a technician/agent to a ticket.
   */
  async assignTicket(
    ticketId: string,
    techId: string,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    const technician = await userRepository.findById(techId);
    if (!technician) {
      throw AppError.notFound('Technician not found');
    }

    if (technician.role !== UserRole.TECHNICIAN) {
      throw AppError.badRequest('Assigned user must be a technician');
    }

    const updated = await ticketRepository.assignTechnician(ticketId, techId);
    if (!updated) {
      throw AppError.internal('Failed to assign technician');
    }

    // Log the assignment event
    await ticketEventRepository.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: ticket.status,
      changed_by: userId,
      notes: `Ticket assigned to technician: ${technician.name}`,
      tenant_id: ticket.tenant_id,
    });

    // Fetch the updated ticket with the joined names/emails so that the response matches the structure
    const fullUpdatedTicket = await ticketRepository.findById(ticketId);
    if (!fullUpdatedTicket) {
      throw AppError.internal('Failed to retrieve updated ticket details');
    }

    // Notify the technician
    await notificationService.onTicketAssigned(fullUpdatedTicket, technician);

    return fullUpdatedTicket;
  }

  /**
   * Enforce the 1-hour SLA window for warranty/service ticket modifications.
   * Throws if the ticket was created more than 1 hour ago.
   */
  private enforceSLARule(ticket: Ticket): void {
    const elapsed = Date.now() - new Date(ticket.created_at).getTime();
    if (elapsed > SLA_WINDOW_MS) {
      const minutesAgo = Math.floor(elapsed / 60000);
      throw AppError.slaViolation(
        `SLA window expired. This ticket was created ${minutesAgo} minutes ago. ` +
        `Warranty and service outage tickets can only be cancelled within 60 minutes of creation.`,
      );
    }
  }

  /**
   * Get responses associated with a ticket.
   */
  async getTicketResponses(
    ticketId: string,
    userId: string,
    userRole: UserRole,
    tenantId: string,
  ): Promise<TicketResponse[]> {
    // Verify access
    await this.getTicketById(ticketId, userId, userRole, tenantId);
    
    const responses = await ticketResponseRepository.findByTicket(ticketId);
    const attachments = await ticketRepository.getAttachmentsByResponses(ticketId);
    
    // Group attachments by response_id
    const responseAttachmentsMap = new Map<string, TicketAttachment[]>();
    for (const att of attachments) {
      if (att.response_id) {
        if (!responseAttachmentsMap.has(att.response_id)) {
          responseAttachmentsMap.set(att.response_id, []);
        }
        responseAttachmentsMap.get(att.response_id)!.push(att);
      }
    }
    
    // Map attachments to responses
    return responses.map((resp) => ({
      ...resp,
      attachments: responseAttachmentsMap.get(resp.id) || [],
    }));
  }

  /**
   * Add a response to a ticket.
   */
  async addTicketResponse(
    ticketId: string,
    message: string,
    userId: string,
    userRole: UserRole,
    tenantId: string,
    files: { filename: string; path: string; mimetype: string; size: number }[] = [],
  ): Promise<TicketResponse> {
    const ticket = await this.getTicketById(ticketId, userId, userRole, tenantId);

    const response = await ticketResponseRepository.create({
      ticket_id: ticketId,
      user_id: userId,
      message,
      tenant_id: ticket.tenant_id,
    });

    const responseAttachments: TicketAttachment[] = [];

    // Save attachments if any
    for (const file of files) {
      const att = await ticketRepository.addAttachment({
        ticket_id: ticketId,
        response_id: response.id,
        filename: file.filename,
        path: file.path,
        mime_type: file.mimetype,
        size_bytes: file.size,
        tenant_id: ticket.tenant_id,
      });
      responseAttachments.push(att);
    }

    // Notify the other party
    try {
      const sender = await userRepository.findById(userId);
      if (sender) {
        if (userRole === UserRole.CLIENT) {
          if (ticket.assigned_tech_id) {
            const tech = await userRepository.findById(ticket.assigned_tech_id);
            if (tech) {
              await notificationService.onTicketResponseCreated(ticket, tech, sender.name, message);
            }
          } else {
            logger.info('No tech assigned to ticket, notification skipped', { ticketId });
          }
        } else {
          const client = await userRepository.findById(ticket.client_id);
          if (client) {
            await notificationService.onTicketResponseCreated(ticket, client, sender.name, message);
          }
        }
      }
    } catch (err) {
      logger.error('Failed to send ticket response notification', { ticketId, error: err });
    }

    const user = await userRepository.findById(userId);
    return {
      ...response,
      user_name: user?.name,
      user_role: user?.role,
      attachments: responseAttachments,
    };
  }
}

export const ticketService = new TicketService();
