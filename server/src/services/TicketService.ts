import { ticketRepository, TicketRepository } from '../repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '../repositories/TicketEventRepository';
import { ticketResponseRepository, TicketResponseRepository } from '../repositories/TicketResponseRepository';
import { userRepository, UserRepository } from '../repositories/UserRepository';
import { assignmentService, AssignmentService } from './AssignmentService';
import { notificationService, NotificationService } from './NotificationService';
import { ticketQuotaService, TicketQuotaService } from './TicketQuotaService';
import { ticketAccessPolicy, TicketAccessPolicy, UserContext } from '../policies/TicketAccessPolicy';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ESCALATION_THRESHOLDS_MS, TIER_2_SPECIALTY } from '../config/constants';
import {
  Ticket,
  TicketAttachment,
  TicketEvent,
  TicketResponse,
  TicketStatus,
  TicketCategory,
  TicketFilters,
  TicketPriority,
  UserRole,
} from '../types';
import { CreateTicketInput, UpdateTicketStatusInput } from '../dtos/ticket.dto';

export type { UserContext };

export class TicketService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private responseRepo: TicketResponseRepository = ticketResponseRepository,
    private userRepo: UserRepository = userRepository,
    private assignmentSvc: AssignmentService = assignmentService,
    private notifSvc: NotificationService = notificationService,
    private quotaSvc: TicketQuotaService = ticketQuotaService,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  private resolveContext(userIdOrCtx: string | UserContext, userRole?: UserRole, tenantId?: string): UserContext {
    if (typeof userIdOrCtx === 'object') {
      return userIdOrCtx;
    }
    return { userId: userIdOrCtx, role: userRole!, tenantId: tenantId! };
  }

  async createTicket(data: CreateTicketInput, clientId: string, tenantId: string): Promise<Ticket> {
    await this.quotaSvc.enforceTicketLimit(clientId, tenantId, data.equipmentId);

    const ticket = await this.ticketRepo.create({
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      client_id: clientId,
      equipment_id: data.equipmentId || null,
      tenant_id: tenantId,
    });

    await this.eventRepo.create({
      ticket_id: ticket.id,
      old_status: null,
      new_status: TicketStatus.OPEN,
      changed_by: clientId,
      notes: 'Ticket created by client',
      tenant_id: tenantId,
    });

    const technician = await this.assignmentSvc.getNextTechnician(data.category, undefined, (data.priority ?? TicketPriority.MEDIUM) as unknown as TicketPriority);
    if (technician) {
      await this.ticketRepo.assignTechnician(ticket.id, technician.id);
      ticket.assigned_tech_id = technician.id;
      logger.info('Ticket auto-assigned', { ticketId: ticket.id, techId: technician.id, techName: technician.name });
    }

    const client = await this.userRepo.findById(clientId);
    if (client) {
      await this.notifSvc.onTicketCreated(ticket, client);
    }

    return ticket;
  }

  /**
   * Enforce dynamic priority-weighted SLA escalation (BL-104).
   * Escalates an OPEN, unworked ticket to a Tier 2 specialist once its
   * priority threshold (CRITICAL=10m, HIGH=20m, MEDIUM=45m, LOW=120m) is exceeded.
   */
  async enforceEscalation(ticketId: string): Promise<Ticket | null> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    if (ticket.status !== TicketStatus.OPEN) {
      return null;
    }

    const threshold = ESCALATION_THRESHOLDS_MS[ticket.priority];
    if (!threshold) {
      return null;
    }

    if (Date.now() - new Date(ticket.created_at).getTime() <= threshold) {
      return null;
    }

    if (!(await this.isUnworked(ticket))) {
      return null;
    }

    if (ticket.assigned_tech_id) {
      const current = await this.userRepo.findById(ticket.assigned_tech_id);
      if (current && current.specialty && current.specialty.includes(TIER_2_SPECIALTY)) {
        logger.info('Ticket already assigned to a Tier 2 specialist, skipping escalation', { ticketId });
        return null;
      }
    }

    const technician = await this.assignmentSvc.getNextTechnician(ticket.category, TIER_2_SPECIALTY, ticket.priority);
    if (!technician) {
      logger.warn('No Tier 2 specialist available for escalation', { ticketId });
      return null;
    }

    const updated = await this.ticketRepo.assignTechnician(ticketId, technician.id);
    if (!updated) {
      throw AppError.internal('Failed to assign technician during escalation');
    }

    await this.eventRepo.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: ticket.status,
      changed_by: ticket.client_id,
      notes: `Escalated to Tier 2 specialist (${technician.name}) after priority SLA threshold`,
      tenant_id: ticket.tenant_id,
    });

    const fullUpdatedTicket = await this.ticketRepo.findById(ticketId) || updated;
    await this.notifSvc.onTicketAssigned(fullUpdatedTicket, technician);

    logger.info('Ticket escalated to Tier 2', { ticketId, techId: technician.id, priority: ticket.priority });
    return fullUpdatedTicket;
  }

  /**
   * Sweep all pending escalation candidates (optionally scoped to a tenant)
   * and apply priority-weighted SLA escalation to each.
   */
  async processPendingEscalations(tenantId?: string): Promise<{ escalated: number }> {
    const minThreshold = Math.min(...Object.values(ESCALATION_THRESHOLDS_MS));
    const cutoff = new Date(Date.now() - minThreshold);
    const candidates = await this.ticketRepo.findPendingEscalations(cutoff);

    let escalated = 0;
    for (const candidate of candidates) {
      if (tenantId && candidate.tenant_id !== tenantId) continue;
      try {
        const result = await this.enforceEscalation(candidate.id);
        if (result) escalated += 1;
      } catch (err) {
        logger.error('Failed to escalate ticket', { ticketId: candidate.id, error: err });
      }
    }

    if (escalated > 0) {
      logger.info(`Processed pending escalations: ${escalated} ticket(s) escalated`, { tenantId });
    }
    return { escalated };
  }

  private async isUnworked(ticket: Ticket): Promise<boolean> {
    if (!ticket.assigned_tech_id) return true;
    const responses = await this.responseRepo.findByTicket(ticket.id);
    return responses.length === 0;
  }

  async getTicketById(ticketId: string, ctx: UserContext): Promise<Ticket>;
  async getTicketById(ticketId: string, userId: string, userRole: UserRole, tenantId: string): Promise<Ticket>;
  async getTicketById(ticketId: string, arg2: string | UserContext, arg3?: UserRole, arg4?: string): Promise<Ticket> {
    const ctx = this.resolveContext(arg2, arg3, arg4);
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return ticket;
  }

  async getTickets(filters: TicketFilters, ctx: UserContext): Promise<{ tickets: Ticket[]; total: number }>;
  async getTickets(filters: TicketFilters, userId: string, userRole: UserRole, tenantId: string): Promise<{ tickets: Ticket[]; total: number }>;
  async getTickets(filters: TicketFilters, arg2: string | UserContext, arg3?: UserRole, arg4?: string): Promise<{ tickets: Ticket[]; total: number }> {
    const ctx = this.resolveContext(arg2, arg3, arg4);
    const scopedFilters = this.accessPol.applyFilterScope(filters, ctx);
    return this.ticketRepo.findWithFilters(scopedFilters);
  }

  async updateTicketStatus(ticketId: string, data: UpdateTicketStatusInput, ctx: UserContext): Promise<Ticket>;
  async updateTicketStatus(ticketId: string, data: UpdateTicketStatusInput, userId: string, userRole: UserRole, tenantId: string): Promise<Ticket>;
  async updateTicketStatus(
    ticketId: string,
    data: UpdateTicketStatusInput,
    arg3: string | UserContext,
    arg4?: UserRole,
    arg5?: string,
  ): Promise<Ticket> {
    const ctx = this.resolveContext(arg3, arg4, arg5);
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

    const client = await this.userRepo.findById(ticket.client_id);
    if (client) {
      const fullUpdatedTicket = await this.ticketRepo.findById(ticketId) || updated;
      await this.notifSvc.onTicketStatusChanged(fullUpdatedTicket, client, data.notes);
    }

    logger.info('Ticket status updated', { ticketId, from: ticket.status, to: data.status, updatedBy: ctx.userId });
    return updated;
  }

  async getTicketTimeline(ticketId: string, ctx: UserContext): Promise<TicketEvent[]>;
  async getTicketTimeline(ticketId: string, userId: string, userRole: UserRole, tenantId: string): Promise<TicketEvent[]>;
  async getTicketTimeline(ticketId: string, arg2: string | UserContext, arg3?: UserRole, arg4?: string): Promise<TicketEvent[]> {
    const ctx = this.resolveContext(arg2, arg3, arg4);
    await this.getTicketById(ticketId, ctx);
    return this.eventRepo.findByTicket(ticketId);
  }

  async getTicketAttachments(ticketId: string, ctx: UserContext): Promise<TicketAttachment[]>;
  async getTicketAttachments(ticketId: string, userId: string, userRole: UserRole, tenantId: string): Promise<TicketAttachment[]>;
  async getTicketAttachments(ticketId: string, arg2: string | UserContext, arg3?: UserRole, arg4?: string): Promise<TicketAttachment[]> {
    const ctx = this.resolveContext(arg2, arg3, arg4);
    await this.getTicketById(ticketId, ctx);
    return this.ticketRepo.getAttachments(ticketId);
  }

  async addAttachment(
    ticketId: string,
    file: { filename: string; path: string; mimetype: string; size: number },
    ctx: UserContext,
  ): Promise<TicketAttachment>;
  async addAttachment(
    ticketId: string,
    file: { filename: string; path: string; mimetype: string; size: number },
    userId: string,
    userRole: UserRole,
    tenantId: string,
  ): Promise<TicketAttachment>;
  async addAttachment(
    ticketId: string,
    file: { filename: string; path: string; mimetype: string; size: number },
    arg3: string | UserContext,
    arg4?: UserRole,
    arg5?: string,
  ): Promise<TicketAttachment> {
    const ctx = this.resolveContext(arg3, arg4, arg5);
    const ticket = await this.getTicketById(ticketId, ctx);

    return this.ticketRepo.addAttachment({
      ticket_id: ticketId,
      filename: file.filename,
      path: file.path,
      mime_type: file.mimetype,
      size_bytes: file.size,
      tenant_id: ticket.tenant_id,
    });
  }

  async getStatusSummary(ctx: UserContext): Promise<Record<string, number>>;
  async getStatusSummary(userId: string, userRole: UserRole, tenantId: string): Promise<Record<string, number>>;
  async getStatusSummary(arg1: string | UserContext, arg2?: UserRole, arg3?: string): Promise<Record<string, number>> {
    const ctx = this.resolveContext(arg1, arg2, arg3);
    const clientId = ctx.role === UserRole.CLIENT ? ctx.userId : undefined;
    const assignedTechId = ctx.role === UserRole.TECHNICIAN ? ctx.userId : undefined;
    const targetTenantId = ctx.role === UserRole.CLIENT ? ctx.tenantId : undefined;
    return this.ticketRepo.countByStatus(clientId, assignedTechId, targetTenantId);
  }

  async assignTicket(ticketId: string, techId: string, userId: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }

    const technician = await this.userRepo.findById(techId);
    if (!technician) {
      throw AppError.notFound('Technician not found');
    }

    if (technician.role !== UserRole.TECHNICIAN) {
      throw AppError.badRequest('Assigned user must be a technician');
    }

    const updated = await this.ticketRepo.assignTechnician(ticketId, techId);
    if (!updated) {
      throw AppError.internal('Failed to assign technician');
    }

    await this.eventRepo.create({
      ticket_id: ticketId,
      old_status: ticket.status,
      new_status: ticket.status,
      changed_by: userId,
      notes: `Ticket assigned to technician: ${technician.name}`,
      tenant_id: ticket.tenant_id,
    });

    const fullUpdatedTicket = await this.ticketRepo.findById(ticketId);
    if (!fullUpdatedTicket) {
      throw AppError.internal('Failed to retrieve updated ticket details');
    }

    await this.notifSvc.onTicketAssigned(fullUpdatedTicket, technician);
    return fullUpdatedTicket;
  }

  async getTicketResponses(ticketId: string, ctx: UserContext): Promise<TicketResponse[]>;
  async getTicketResponses(ticketId: string, userId: string, userRole: UserRole, tenantId: string): Promise<TicketResponse[]>;
  async getTicketResponses(ticketId: string, arg2: string | UserContext, arg3?: UserRole, arg4?: string): Promise<TicketResponse[]> {
    const ctx = this.resolveContext(arg2, arg3, arg4);
    await this.getTicketById(ticketId, ctx);
    
    const responses = await this.responseRepo.findByTicket(ticketId);
    const attachments = await this.ticketRepo.getAttachmentsByResponses(ticketId);
    
    const responseAttachmentsMap = new Map<string, TicketAttachment[]>();
    for (const att of attachments) {
      if (att.response_id) {
        if (!responseAttachmentsMap.has(att.response_id)) {
          responseAttachmentsMap.set(att.response_id, []);
        }
        responseAttachmentsMap.get(att.response_id)!.push(att);
      }
    }
    
    return responses.map((resp) => ({
      ...resp,
      attachments: responseAttachmentsMap.get(resp.id) || [],
    }));
  }

  async addTicketResponse(
    ticketId: string,
    message: string,
    ctx: UserContext,
    files?: { filename: string; path: string; mimetype: string; size: number }[],
  ): Promise<TicketResponse>;
  async addTicketResponse(
    ticketId: string,
    message: string,
    userId: string,
    userRole: UserRole,
    tenantId: string,
    files?: { filename: string; path: string; mimetype: string; size: number }[],
  ): Promise<TicketResponse>;
  async addTicketResponse(
    ticketId: string,
    message: string,
    arg3: string | UserContext,
    arg4?: UserRole | { filename: string; path: string; mimetype: string; size: number }[],
    arg5?: string,
    arg6: { filename: string; path: string; mimetype: string; size: number }[] = [],
  ): Promise<TicketResponse> {
    let ctx: UserContext;
    let files: { filename: string; path: string; mimetype: string; size: number }[] = [];

    if (typeof arg3 === 'object') {
      ctx = arg3;
      files = (arg4 as { filename: string; path: string; mimetype: string; size: number }[]) || [];
    } else {
      ctx = { userId: arg3, role: arg4 as UserRole, tenantId: arg5! };
      files = arg6;
    }

    const ticket = await this.getTicketById(ticketId, ctx);

    const response = await this.responseRepo.create({
      ticket_id: ticketId,
      user_id: ctx.userId,
      message,
      tenant_id: ticket.tenant_id,
    });

    const responseAttachments: TicketAttachment[] = [];
    for (const file of files) {
      const att = await this.ticketRepo.addAttachment({
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

    await this.notifyResponseRecipient(ticket, ctx, message);

    const user = await this.userRepo.findById(ctx.userId);
    return {
      ...response,
      user_name: user?.name,
      user_role: user?.role,
      attachments: responseAttachments,
    };
  }

  private async notifyResponseRecipient(ticket: Ticket, ctx: UserContext, message: string): Promise<void> {
    try {
      const sender = await this.userRepo.findById(ctx.userId);
      if (!sender) return;

      if (ctx.role === UserRole.CLIENT) {
        if (ticket.assigned_tech_id) {
          const tech = await this.userRepo.findById(ticket.assigned_tech_id);
          if (tech) {
            await this.notifSvc.onTicketResponseCreated(ticket, tech, sender.name, message);
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

export const ticketService = new TicketService();
