import { Request, Response } from 'express';
import { ticketService } from '../services/TicketService';
import { CreateTicketInput, UpdateTicketStatusInput, TicketQueryInput, CreateTicketResponseInput } from '../dtos/ticket.dto';
import { UserRole } from '../types';

export class TicketController {
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateTicketInput;
    const ticket = await ticketService.createTicket(data, req.user!.userId, req.user!.tenantId);
    res.status(201).json({ success: true, data: ticket });
  }

  async getAll(req: Request, res: Response): Promise<void> {
    const filters = req.query as unknown as TicketQueryInput;
    const { tickets, total } = await ticketService.getTickets(
      filters,
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );

    const page = filters.page || 1;
    const limit = filters.limit || 20;

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
    const ticket = await ticketService.getTicketById(
      req.params.id as string,
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );
    res.json({ success: true, data: ticket });
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdateTicketStatusInput;
    const ticket = await ticketService.updateTicketStatus(
      req.params.id as string,
      data,
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );
    res.json({ success: true, data: ticket });
  }

  async getTimeline(req: Request, res: Response): Promise<void> {
    const events = await ticketService.getTicketTimeline(
      req.params.id as string,
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );
    res.json({ success: true, data: events });
  }

  async getAttachments(req: Request, res: Response): Promise<void> {
    const attachments = await ticketService.getTicketAttachments(
      req.params.id as string,
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );
    res.json({ success: true, data: attachments });
  }

  async uploadAttachment(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const attachment = await ticketService.addAttachment(
      req.params.id as string,
      {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );

    res.status(201).json({ success: true, data: attachment });
  }

  async getStatusSummary(req: Request, res: Response): Promise<void> {
    const summary = await ticketService.getStatusSummary(
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );
    res.json({ success: true, data: summary });
  }

  async assign(req: Request, res: Response): Promise<void> {
    const { technicianId } = req.body as { technicianId: string };
    const ticket = await ticketService.assignTicket(
      req.params.id as string,
      technicianId,
      req.user!.userId,
    );
    res.json({ success: true, data: ticket });
  }

  async getResponses(req: Request, res: Response): Promise<void> {
    const responses = await ticketService.getTicketResponses(
      req.params.id as string,
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
    );
    res.json({ success: true, data: responses });
  }

  async createResponse(req: Request, res: Response): Promise<void> {
    const data = req.body as CreateTicketResponseInput;
    const files = (req.files as Express.Multer.File[]) || [];
    const response = await ticketService.addTicketResponse(
      req.params.id as string,
      data.message,
      req.user!.userId,
      req.user!.role as UserRole,
      req.user!.tenantId,
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
