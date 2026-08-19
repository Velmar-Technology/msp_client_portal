import { ticketRepository, TicketRepository } from '@modules/tickets/repositories/TicketRepository';
import { ticketAccessPolicy, TicketAccessPolicy } from '@shared/policies/TicketAccessPolicy';
import { AppError } from '@shared/utils/AppError';
import { Ticket, TicketFilters, UserContext, UserRole } from '@shared/types';

export class TicketQueryService {
  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  async getTicketById(ticketId: string, ctx: UserContext): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) {
      throw AppError.notFound('Ticket not found');
    }
    this.accessPol.assertReadAccess(ticket, ctx);
    return ticket;
  }

  async getTickets(filters: TicketFilters, ctx: UserContext): Promise<{ tickets: Ticket[]; total: number }> {
    const scopedFilters = this.accessPol.applyFilterScope(filters, ctx);
    return this.ticketRepo.findWithFilters(scopedFilters);
  }

  async getStatusSummary(ctx: UserContext): Promise<Record<string, number>> {
    const clientId = ctx.role === UserRole.CLIENT ? ctx.userId : undefined;
    const assignedTechId = ctx.role === UserRole.TECHNICIAN ? ctx.userId : undefined;
    const tenantId = ctx.role === UserRole.CLIENT ? ctx.tenantId : undefined;
    return this.ticketRepo.countByStatus(clientId, assignedTechId, tenantId);
  }
}

export const ticketQueryService = new TicketQueryService();
