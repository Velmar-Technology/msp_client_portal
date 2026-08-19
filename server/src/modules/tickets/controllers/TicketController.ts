import { Request, Response } from 'express';
import { ticketCreationService } from '@modules/tickets/services/TicketCreationService';
import { ticketQueryService } from '@modules/tickets/services/TicketQueryService';
import { ticketStatusService } from '@modules/tickets/services/TicketStatusService';
import { ticketAssignmentService } from '@modules/tickets/services/TicketAssignmentService';
import { ticketResponseService } from '@modules/tickets/services/TicketResponseService';
import { ticketAttachmentService } from '@modules/tickets/services/TicketAttachmentService';
import { CreateTicketInput, UpdateTicketStatusInput, TicketQueryInput, CreateTicketResponseInput } from '@shared/dtos/ticket.dto';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@shared/config/constants';
import { UserContext, UserRole } from '@shared/types';

export class TicketController {
  private getUserContext(req: Request): UserContext {
    return {
      userId: req.user!.userId,
      role: req.user!.role as UserRole,
      tenantId: req.user!.tenantId,
    };
  }

  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateTicketInput;
    const ticket = await ticketCreationService.createTicket(data, this.getUserContext(req));
    res.status(201).json({ success: true, data: ticket });
  }

  async getAll(req: Request, res: Response): Promise<void> {
    const filters = req.query as unknown as TicketQueryInput;
    const ctx = this.getUserContext(req);
    const { tickets, total } = await ticketQueryService.getTickets(filters, ctx);

    const page = filters.page || DEFAULT_PAGE;
    const limit = filters.limit || DEFAULT_LIMIT;

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

  async getById(req: Request, res: Response): Promise<void> {
    const ticket = await ticketQueryService.getTicketById(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: ticket });
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdateTicketStatusInput;
    const ticket = await ticketStatusService.updateStatus(req.params.id as string, data, this.getUserContext(req));
    res.json({ success: true, data: ticket });
  }

  async getTimeline(req: Request, res: Response): Promise<void> {
    const events = await ticketStatusService.getTicketTimeline(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: events });
  }

  async getAttachments(req: Request, res: Response): Promise<void> {
    const attachments = await ticketAttachmentService.getTicketAttachments(
      req.params.id as string,
      this.getUserContext(req)
    );
    res.json({ success: true, data: attachments });
  }

  async uploadAttachment(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
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

  async getStatusSummary(req: Request, res: Response): Promise<void> {
    const summary = await ticketQueryService.getStatusSummary(this.getUserContext(req));
    res.json({ success: true, data: summary });
  }

  async assign(req: Request, res: Response): Promise<void> {
    const { technicianId } = req.body as { technicianId: string };
    const ticket = await ticketAssignmentService.assignTicket(
      req.params.id as string,
      technicianId,
      req.user!.userId,
    );
    res.json({ success: true, data: ticket });
  }

  async getResponses(req: Request, res: Response): Promise<void> {
    const responses = await ticketResponseService.getTicketResponses(
      req.params.id as string,
      this.getUserContext(req)
    );
    res.json({ success: true, data: responses });
  }

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
}

export const ticketController = new TicketController();
