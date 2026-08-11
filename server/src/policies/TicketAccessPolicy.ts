import { Ticket, TicketFilters, TicketStatus, UserContext, UserRole } from '../types';
import { AppError } from '../utils/AppError';
import { SLA_WINDOW_MS, STATUS_TRANSITIONS } from '../config/constants';

export type { UserContext };

export class TicketAccessPolicy {
  assertReadAccess(ticket: Ticket, ctx: UserContext): void {
    if (ctx.role === UserRole.CLIENT && ticket.tenant_id !== ctx.tenantId) {
      throw AppError.forbidden('You do not have access to this ticket');
    }
  }

  assertStatusTransition(currentStatus: TicketStatus, targetStatus: TicketStatus): void {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
      throw AppError.badRequest(
        `Cannot transition from ${currentStatus} to ${targetStatus}`,
        'INVALID_STATUS_TRANSITION',
      );
    }
  }

  assertStatusUpdateAccess(ticket: Ticket, targetStatus: TicketStatus, ctx: UserContext): void {
    this.assertReadAccess(ticket, ctx);
    this.assertStatusTransition(ticket.status, targetStatus);

    if (ctx.role === UserRole.CLIENT) {
      if (targetStatus !== TicketStatus.CANCELLED) {
        throw AppError.forbidden('Clients can only cancel tickets');
      }
      if (ticket.client_id !== ctx.userId) {
        throw AppError.forbidden('You can only cancel your own tickets');
      }
    }
  }

  enforceSLARule(ticket: Ticket): void {
    const elapsed = Date.now() - new Date(ticket.created_at).getTime();
    if (elapsed > SLA_WINDOW_MS) {
      const minutesAgo = Math.floor(elapsed / 60000);
      throw AppError.slaViolation(
        `SLA window expired. This ticket was created ${minutesAgo} minutes ago. ` +
        `Warranty and service outage tickets can only be cancelled within 60 minutes of creation.`,
      );
    }
  }

  applyFilterScope(filters: TicketFilters, ctx: UserContext): TicketFilters {
    const scopedFilters = { ...filters };
    if (ctx.role === UserRole.CLIENT) {
      scopedFilters.tenantId = ctx.tenantId;
    } else if (ctx.role === UserRole.TECHNICIAN) {
      scopedFilters.assignedTechId = ctx.userId;
    }
    return scopedFilters;
  }
}

export const ticketAccessPolicy = new TicketAccessPolicy();
