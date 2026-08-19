import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets/repositories/TicketEventRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { assignmentService, AssignmentService } from '@modules/tickets/services/AssignmentService';
import { notificationService, NotificationService } from '@modules/notifications';
import { ticketQuotaService, TicketQuotaService } from '@modules/tickets/services/TicketQuotaService';
import { logger } from '@shared/utils/logger';
import { Ticket, TicketPriority, TicketStatus, UserContext } from '@shared/types';
import { CreateTicketInput } from '@shared/dtos/ticket.dto';
import { RmmAlertInput } from '@shared/types';

export type AlertTicketAssignment = { mode: 'general' } | { mode: 'specialty'; specialty: string };

export interface CreateAlertTicketOptions {
  status: TicketStatus;
  category: Ticket['category'];
  priority: TicketPriority;
  tag: string | null;
  assignment?: AlertTicketAssignment | null;
}

export class TicketCreationService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private userRepo: UserRepository = userRepository,
    private assignmentSvc: AssignmentService = assignmentService,
    private notifSvc: NotificationService = notificationService,
    private quotaSvc: TicketQuotaService = ticketQuotaService,
  ) {}

  async createTicket(data: CreateTicketInput, ctx: UserContext): Promise<Ticket> {
    await this.quotaSvc.enforceTicketLimit(ctx.userId, ctx.tenantId, data.equipmentId);

    const priority = data.priority ?? TicketPriority.MEDIUM;
    const ticket = await this.ticketRepo.create({
      title: data.title,
      description: data.description,
      category: data.category,
      priority,
      client_id: ctx.userId,
      equipment_id: data.equipmentId || null,
      tenant_id: ctx.tenantId,
    });

    await this.eventRepo.create({
      ticket_id: ticket.id,
      old_status: null,
      new_status: TicketStatus.OPEN,
      changed_by: ctx.userId,
      notes: 'Ticket created by client',
      tenant_id: ctx.tenantId,
    });

    await this.assignIfPossible(ticket, data.category, undefined, priority);

    const client = await this.userRepo.findById(ctx.userId);
    if (client) {
      await this.notifSvc.onTicketCreated(ticket, client);
    }

    return ticket;
  }

  async createTicketFromAlert(input: RmmAlertInput, opts: CreateAlertTicketOptions): Promise<Ticket> {
    const baseTitle = input.title || `RMM Alert: ${input.alertType}`;
    const title = opts.tag ? `${opts.tag} ${baseTitle}` : baseTitle;

    const ticket = await this.ticketRepo.create({
      title,
      description: input.description || `Automated RMM alert (${input.alertType}) for asset ${input.assetId}`,
      category: opts.category,
      priority: opts.priority,
      client_id: input.clientId,
      equipment_id: null,
      tenant_id: input.tenantId,
    });

    await this.eventRepo.create({
      ticket_id: ticket.id,
      old_status: null,
      new_status: opts.status,
      changed_by: input.createdByUserId ?? input.clientId,
      notes: `Ticket created from RMM alert (${input.alertType})`,
      tenant_id: input.tenantId,
    });

    if (opts.assignment) {
      const specialty = opts.assignment.mode === 'specialty' ? opts.assignment.specialty : undefined;
      await this.assignIfPossible(ticket, opts.category, specialty, opts.priority);
    }

    return ticket;
  }

  private async assignIfPossible(
    ticket: Ticket,
    category: Ticket['category'],
    requestedSpecialty: string | undefined,
    priority?: TicketPriority,
  ): Promise<void> {
    const technician = await this.assignmentSvc.assignNext(category, requestedSpecialty, priority);
    if (!technician) return;

    await this.ticketRepo.assignTechnician(ticket.id, technician.id);
    ticket.assigned_tech_id = technician.id;
    logger.info('Ticket auto-assigned', { ticketId: ticket.id, techId: technician.id, techName: technician.name });
  }
}

export const ticketCreationService = new TicketCreationService();
