import { Request, Response } from 'express';
import { InvalidFileTypeError } from '@shared/errors';
import { ticketCreationService } from '@modules/tickets/services/TicketCreationService';
import { ticketQueryService } from '@modules/tickets/services/TicketQueryService';
import { ticketStatusService } from '@modules/tickets/services/TicketStatusService';
import { ticketAssignmentService } from '@modules/tickets/services/TicketAssignmentService';
import { ticketResponseService } from '@modules/tickets/services/TicketResponseService';
import { ticketAttachmentService } from '@modules/tickets/services/TicketAttachmentService';
import { CreateTicketInput, UpdateTicketStatusInput, TicketQueryInput, CreateTicketResponseInput } from '@shared/dtos/ticket.dto';
import { CreateAgentTicketInput, AddAgentTicketResponseInput, AgentUpdateTicketStatusInput } from '@shared/contracts';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@shared/config/constants';
import { UserContext, UserRole, TicketStatus } from '@shared/types';

/**
 * Controller handling HTTP requests for support ticket creation, listing, status updates,
 * technician assignment, audit timeline, conversation replies, and attachments.
 */
export class TicketController {
  /**
   * Helper extracting authenticated UserContext from Express request.
   *
   * @param req - Express request
   * @returns Structured UserContext (userId, role, tenantId)
   */
  private getUserContext(req: Request): UserContext {
    return {
      userId: req.user!.userId,
      role: req.user!.role as UserRole,
      tenantId: req.user!.tenantId,
    };
  }

  /**
   * Handles ticket creation request from client.
   *
   * @param req - Express request containing CreateTicketInput body
   * @param res - Express response returning HTTP 201 with created ticket
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateTicketInput;
    const ticket = await ticketCreationService.createTicket(data, this.getUserContext(req));
    res.status(201).json({ success: true, data: ticket });
  }

  /**
   * Handles paginated ticket query with role and tenant scoping.
   *
   * @param req - Express request with query filter parameters
   * @param res - Express response returning tickets array and pagination metadata
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const filters = req.query as unknown as TicketQueryInput;
    const ctx = this.getUserContext(req);
    const { tickets, total } = await ticketQueryService.getTickets(filters, ctx);

    const page = Number(filters.page) || DEFAULT_PAGE;
    const limit = Number(filters.limit) || DEFAULT_LIMIT;

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Handles retrieving a single ticket by UUID.
   *
   * @param req - Express request with ticket ID in params
   * @param res - Express response returning ticket entity
   */
  async getById(req: Request, res: Response): Promise<void> {
    const ticket = await ticketQueryService.getTicketById(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: ticket });
  }

  /**
   * Handles updating the lifecycle status of a ticket.
   *
   * @param req - Express request with ticket ID in params and UpdateTicketStatusInput body
   * @param res - Express response returning updated ticket
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdateTicketStatusInput;
    const ticket = await ticketStatusService.updateStatus(req.params.id as string, data, this.getUserContext(req));
    res.json({ success: true, data: ticket });
  }

  /**
   * Handles retrieving the chronological audit timeline events for a ticket.
   *
   * @param req - Express request with ticket ID in params
   * @param res - Express response returning array of timeline events
   */
  async getTimeline(req: Request, res: Response): Promise<void> {
    const events = await ticketStatusService.getTicketTimeline(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: events });
  }

  /**
   * Handles retrieving attachments associated directly with a ticket.
   *
   * @param req - Express request with ticket ID in params
   * @param res - Express response returning list of attachments
   */
  async getAttachments(req: Request, res: Response): Promise<void> {
    const attachments = await ticketAttachmentService.getTicketAttachments(
      req.params.id as string,
      this.getUserContext(req)
    );
    res.json({ success: true, data: attachments });
  }

  /**
   * Handles uploading a file attachment to a ticket.
   *
   * @param req - Express request with uploaded file and ticket ID in params
   * @param res - Express response returning HTTP 201 with created attachment
   * @throws {InvalidFileTypeError} When no file is uploaded
   */
  async uploadAttachment(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new InvalidFileTypeError('No file uploaded');
    }

    const attachment = await ticketAttachmentService.addAttachment(
      req.params.id as string,
      {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      this.getUserContext(req),
    );

    res.status(201).json({ success: true, data: attachment });
  }

  /**
   * Handles fetching ticket counts aggregated by status for the requesting user context.
   *
   * @param req - Express request
   * @param res - Express response returning status count breakdown
   */
  async getStatusSummary(req: Request, res: Response): Promise<void> {
    const summary = await ticketQueryService.getStatusSummary(this.getUserContext(req));
    res.json({ success: true, data: summary });
  }

  /**
   * Handles assigning a technician to a ticket.
   *
   * @param req - Express request with ticket ID in params and technicianId in body
   * @param res - Express response returning updated ticket
   */
  async assign(req: Request, res: Response): Promise<void> {
    const { technicianId } = req.body as { technicianId: string };
    const ticket = await ticketAssignmentService.assignTicket(
      req.params.id as string,
      technicianId,
      req.user!.userId,
    );
    res.json({ success: true, data: ticket });
  }

  /**
   * Handles fetching all conversational response messages and attachments for a ticket.
   *
   * @param req - Express request with ticket ID in params
   * @param res - Express response returning array of response messages
   */
  async getResponses(req: Request, res: Response): Promise<void> {
    const responses = await ticketResponseService.getTicketResponses(
      req.params.id as string,
      this.getUserContext(req)
    );
    res.json({ success: true, data: responses });
  }

  /**
   * Handles posting a new message reply with optional attachments to a ticket.
   *
   * @param req - Express request with ticket ID in params, message in body, and optional uploaded files
   * @param res - Express response returning HTTP 201 with created response
   */
  async createResponse(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateTicketResponseInput;
    const files = (req.files as Express.Multer.File[]) || [];
    const response = await ticketResponseService.addTicketResponse(
      req.params.id as string,
      data.message,
      this.getUserContext(req),
      files.map((f) => ({
        filename: f.originalname,
        path: f.path,
        mimetype: f.mimetype,
        size: f.size,
      })),
    );
    res.status(201).json({ success: true, data: response });
  }

  /**
   * Handles ticket creation request from a machine-authenticated endpoint agent.
   *
   * @param req - Express request containing CreateAgentTicketInput and req.agent context
   * @param res - Express response returning HTTP 201 with created ticket
   */
  async createFromAgent(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateAgentTicketInput;
    const ticket = await ticketCreationService.createTicketFromAgent(data, req.agent!);
    res.status(201).json({
      success: true,
      data: {
        ...ticket,
        ticketId: ticket.id,
        reporterName: ticket.reporter_name,
        reporterEmail: ticket.reporter_email,
        createdAt: ticket.created_at ? new Date(ticket.created_at).toISOString() : new Date().toISOString(),
      },
    });
  }

  /**
   * Handles conversational response message posted from an endpoint workstation agent.
   *
   * @param req - Express request with AddAgentTicketResponseInput and req.agent context
   * @param res - Express response returning HTTP 201 with created response
   */
  async addResponseFromAgent(req: Request, res: Response): Promise<void> {
    const data = req.body as AddAgentTicketResponseInput;
    const response = await ticketResponseService.addTicketResponseFromAgent(
      req.params.id as string,
      data,
      req.agent!
    );
    res.status(201).json({ success: true, data: response });
  }

  /**
   * Retrieves the currently active (OPEN or IN_PROGRESS) ticket for the calling workstation agent.
   *
   * @param req - Express request with req.agent context
   * @param res - Express response returning active ticket or null
   */
  async getActiveTicketForAgent(req: Request, res: Response): Promise<void> {
    const ticket = await ticketQueryService.getActiveTicketForAgent(req.agent!);
    if (!ticket) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({
      success: true,
      data: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTechId: ticket.assigned_tech_id,
        assignedTechName: ticket.assigned_tech_name,
        equipmentId: ticket.equipment_id,
        createdAt: ticket.created_at ? new Date(ticket.created_at).toISOString() : new Date().toISOString(),
        updatedAt: ticket.updated_at ? new Date(ticket.updated_at).toISOString() : new Date().toISOString(),
      },
    });
  }

  /**
   * Retrieves ticket history for the calling workstation agent.
   *
   * @param req - Express request with req.agent context
   * @param res - Express response returning array of workstation tickets
   */
  async getTicketsForAgent(req: Request, res: Response): Promise<void> {
    const limit = Number(req.query.limit) || 20;
    const tickets = await ticketQueryService.getTicketsForAgent(req.agent!, limit);
    res.json({
      success: true,
      data: tickets.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        category: t.category,
        assignedTechId: t.assigned_tech_id,
        assignedTechName: t.assigned_tech_name,
        equipmentId: t.equipment_id,
        createdAt: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
        updatedAt: t.updated_at ? new Date(t.updated_at).toISOString() : new Date().toISOString(),
      })),
    });
  }

  /**
   * Retrieves conversational responses for a ticket requested by the endpoint machine agent.
   *
   * @param req - Express request with ticket ID in params and req.agent context
   * @param res - Express response returning array of messages
   */
  async getResponsesForAgent(req: Request, res: Response): Promise<void> {
    const responses = await ticketResponseService.getTicketResponsesForAgent(
      req.params.id as string,
      req.agent!
    );
    res.json({
      success: true,
      data: responses.map((r) => ({
        id: r.id,
        authorName: r.author_name || r.user_name || 'Support Technician',
        authorRole: r.user_role === 'CLIENT' ? 'CLIENT' : 'TECHNICIAN',
        message: r.message,
        isInternal: false,
        attachments: (r.attachments || []).map((a) => a.filename),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      })),
    });
  }

  /**
   * Updates ticket status from a machine-authenticated endpoint workstation agent.
   *
   * @param req - Express request with ticket ID in params, status in body, and req.agent context
   * @param res - Express response returning updated ticket
   */
  async updateStatusFromAgent(req: Request, res: Response): Promise<void> {
    const { status } = req.body as AgentUpdateTicketStatusInput;
    const updated = await ticketStatusService.updateStatusFromAgent(
      req.params.id as string,
      status as TicketStatus.RESOLVED | TicketStatus.CLOSED,
      req.agent!
    );
    res.json({ success: true, data: updated });
  }
}

export const ticketController = new TicketController();
