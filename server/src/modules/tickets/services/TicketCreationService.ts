import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketEventRepository, TicketEventRepository } from '@modules/tickets/repositories/TicketEventRepository';
import { userRepository, UserRepository } from '@modules/auth';
import { assignmentService, AssignmentService } from '@modules/tickets/services/AssignmentService';
import { notificationService, NotificationService } from '@modules/notifications';
import { ticketQuotaService, TicketQuotaService } from '@modules/tickets/services/TicketQuotaService';
import { accountStatusPolicy, AccountStatusPolicy } from '@shared/policies/AccountStatusPolicy';
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

/**
 * Domain service responsible for ticket creation workflows, quota enforcement,
 * initial audit event generation, notification dispatch, and round-robin / capacity assignment.
 *
 * @see BL-201 (Feature Quota Enforcement)
 * @see BL-102 (Round-Robin Technician Dispatch)
 * @see Section 9.3 (Non-Payment Suspension Scale - Read-Only lock)
 */
export class TicketCreationService {
  /**
   * Initializes TicketCreationService with repositories, assignment, notifications, and quota services.
   *
   * @param ticketRepo - Ticket data repository
   * @param eventRepo - Ticket audit event repository
   * @param userRepo - User repository for client and technician lookups
   * @param assignmentSvc - Assignment domain service for technician dispatch
   * @param notifSvc - Notification service for real-time alerts
   * @param quotaSvc - Quota service for plan limit enforcement
   * @param accountPol - Account status policy for read-only / suspension enforcement
   */
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private eventRepo: TicketEventRepository = ticketEventRepository,
    private userRepo: UserRepository = userRepository,
    private assignmentSvc: AssignmentService = assignmentService,
    private notifSvc: NotificationService = notificationService,
    private quotaSvc: TicketQuotaService = ticketQuotaService,
    private accountPol: AccountStatusPolicy = accountStatusPolicy,
  ) {}

  private get ticketsRepo(): TicketRepository {
    return this.ticketRepo || ticketRepository;
  }

  private get eventsRepo(): TicketEventRepository {
    return this.eventRepo || ticketEventRepository;
  }

  private get usersRepo(): UserRepository {
    return this.userRepo || userRepository;
  }

  private get assignSvc(): AssignmentService {
    return this.assignmentSvc || assignmentService;
  }

  private get notifsSvc(): NotificationService {
    return this.notifSvc || notificationService;
  }

  private get quotasSvc(): TicketQuotaService {
    return this.quotaSvc || ticketQuotaService;
  }

  private get accountPolicy(): AccountStatusPolicy {
    return this.accountPol || accountStatusPolicy;
  }

  /**
   * Creates a new support ticket from client request after validating subscription quotas,
   * creates an initial audit event, automatically assigns an available technician,
   * and dispatches email/notification alerts.
   *
   * @param data - Ticket creation details (title, description, category, priority, equipmentId)
   * @param ctx - Authenticated user context (userId, tenantId, role)
   * @returns Newly created and assigned Ticket entity
   * @throws {ForbiddenError} When the account is in Read-Only, Suspended, or Purged state (Section 9.3)
   * @throws {TicketLimitExceededError} When the tenant or device has exceeded monthly ticket quotas (BL-201)
   * @see BL-201
   * @see BL-102
   * @see Section 9.3
   */
  async createTicket(data: CreateTicketInput, ctx: UserContext): Promise<Ticket> {
    this.accountPolicy.assertWriteAllowed(ctx);
    await this.quotasSvc.enforceTicketLimit(ctx.userId, ctx.tenantId, data.equipmentId);

    const priority = data.priority ?? TicketPriority.MEDIUM;
    const ticket = await this.ticketsRepo.create({
      title: data.title,
      description: data.description,
      category: data.category,
      priority,
      client_id: ctx.userId,
      equipment_id: data.equipmentId || null,
      tenant_id: ctx.tenantId,
    });

    await this.eventsRepo.create({
      ticket_id: ticket.id,
      old_status: null,
      new_status: TicketStatus.OPEN,
      changed_by: ctx.userId,
      notes: 'Ticket created by client',
      tenant_id: ctx.tenantId,
    });

    await this.assignIfPossible(ticket, data.category, undefined, priority);

    const client = await this.usersRepo.findById(ctx.userId);
    if (client) {
      await this.notifsSvc.onTicketCreated(ticket, client);
    }

    return ticket;
  }

  /**
   * Creates an automated support ticket from an RMM alert trigger (e.g. agent offline, high CPU, disk full).
   *
   * @param input - RMM alert payload
   * @param opts - Ticket status, category, priority, tag prefix, and assignment strategy configuration
   * @returns Newly created Ticket entity
   */
  async createTicketFromAlert(input: RmmAlertInput, opts: CreateAlertTicketOptions): Promise<Ticket> {
    const baseTitle = input.title || `RMM Alert: ${input.alertType}`;
    const title = opts.tag ? `${opts.tag} ${baseTitle}` : baseTitle;

    const ticket = await this.ticketsRepo.create({
      title,
      description: input.description || `Automated RMM alert (${input.alertType}) for asset ${input.assetId}`,
      category: opts.category,
      priority: opts.priority,
      client_id: input.clientId,
      equipment_id: null,
      tenant_id: input.tenantId,
    });

    await this.eventsRepo.create({
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

  /**
   * Attempts to auto-assign a technician based on ticket category, specialty, and priority.
   *
   * @param ticket - Target Ticket entity
   * @param category - Ticket domain category
   * @param requestedSpecialty - Optional technician specialty filter
   * @param priority - Ticket priority level
   */
  private async assignIfPossible(
    ticket: Ticket,
    category: Ticket['category'],
    requestedSpecialty: string | undefined,
    priority?: TicketPriority,
  ): Promise<void> {
    const technician = await this.assignSvc.assignNext(category, requestedSpecialty, priority);
    if (!technician) return;

    await this.ticketsRepo.assignTechnician(ticket.id, technician.id);
    ticket.assigned_tech_id = technician.id;
    logger.info('Ticket auto-assigned', { ticketId: ticket.id, techId: technician.id, techName: technician.name });
  }
}

export const ticketCreationService = new TicketCreationService();
