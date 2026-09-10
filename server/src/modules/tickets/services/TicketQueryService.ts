import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketAccessPolicy, TicketAccessPolicy } from '@shared/policies/TicketAccessPolicy';
import { NotFoundError } from '@shared/errors';
import { Ticket, TicketFilters, UserContext, UserRole, AgentPayload, TicketStatus } from '@shared/types';
import { db, tickets } from '@shared/db';
import { and, desc, eq, inArray } from 'drizzle-orm';

/**
 * Domain service for querying tickets, enforcing tenant isolation, role-based visibility, and status metrics.
 */
export class TicketQueryService {
  /**
   * Initializes TicketQueryService with repository and access policy dependencies.
   *
   * @param ticketRepo - Ticket data repository
   * @param accessPol - Ticket access policy for tenant scoping
   */
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  /**
   * Retrieves a single ticket by UUID with RBAC and tenant authorization check.
   *
   * @param ticketId - Unique ticket identifier
   * @param ctx - Authenticated user context
   * @returns Authorized Ticket entity
   * @throws {NotFoundError} When ticket does not exist
   * @throws {ForbiddenError} When user does not have permission to view ticket
   */
  async getTicketById(ticketId: string, ctx: UserContext): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return ticket;
  }

  /**
   * Retrieves a paginated list of tickets scoped to the user's role and tenant.
   *
   * @param filters - Search, status, priority, category, and pagination parameters
   * @param ctx - Authenticated user context
   * @returns Object containing list of matching tickets and total count
   */
  async getTickets(filters: TicketFilters, ctx: UserContext): Promise<{ tickets: Ticket[]; total: number }> {
    const scopedFilters = this.accessPol.applyFilterScope(filters, ctx);
    return this.ticketRepo.findWithFilters(scopedFilters);
  }

  /**
   * Computes ticket count breakdown grouped by lifecycle status, scoped to the caller's context.
   *
   * @param ctx - Authenticated user context
   * @returns Record mapping TicketStatus to count
   */
  async getStatusSummary(ctx: UserContext): Promise<Record<string, number>> {
    const clientId = ctx.role === UserRole.CLIENT ? ctx.userId : undefined;
    const assignedTechId = ctx.role === UserRole.TECHNICIAN ? ctx.userId : undefined;
    const tenantId = ctx.role === UserRole.CLIENT ? ctx.tenantId : undefined;
    return this.ticketRepo.countByStatus(clientId, assignedTechId, tenantId);
  }

  /**
   * Retrieves the currently active (OPEN or IN_PROGRESS) ticket for a machine-authenticated workstation agent.
   *
   * @param agent - Machine authentication context
   * @returns Enriched active Ticket entity or null if none is currently active
   */
  async getActiveTicketForAgent(agent: AgentPayload): Promise<Ticket | null> {
    const activeStatuses: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS];
    const results = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          eq(tickets.equipment_id, agent.equipmentId),
          eq(tickets.tenant_id, agent.tenantId),
          inArray(tickets.status, activeStatuses)
        )
      )
      .orderBy(desc(tickets.created_at))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.ticketRepo.findById(results[0].id);
  }
}

export const ticketQueryService = new TicketQueryService();
