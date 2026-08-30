import { Ticket, TicketFilters, TicketStatus, UserContext, UserRole } from '@shared/types';
import { ForbiddenError, InvalidTransitionError, SlaViolationError } from '@shared/errors';
import { SLA_WINDOW_MS, STATUS_TRANSITIONS } from '@shared/config/constants';
import { calculateElapsedBusinessMs } from '@shared/utils/businessHours';

export type { UserContext };

/**
 * Policy enforcing multi-tenant ticket read access, RBAC state machine transitions,
 * client self-cancellation constraints, and SLA 1-hour cancellation boundaries.
 *
 * @see BL-101 - 1-Hour SLA Cancellation Window
 * @see BL-301 - RBAC & State Machine Transitions
 */
export class TicketAccessPolicy {
  /**
   * Asserts that the authenticated user context has read access to the ticket entity.
   *
   * @param ticket - Target Ticket entity
   * @param ctx - UserContext containing role, userId, and tenantId
   * @throws {ForbiddenError} When a client attempts to read a cross-tenant ticket
   */
  assertReadAccess(ticket: Ticket, ctx: UserContext): void {
    if (ctx.role === UserRole.CLIENT && ticket.tenant_id !== ctx.tenantId) {
      throw new ForbiddenError('You do not have access to this ticket');
    }
  }

  /**
   * Asserts that a proposed status transition is permitted by the STATUS_TRANSITIONS state machine.
   *
   * @see BL-301
   * @param currentStatus - Current TicketStatus
   * @param targetStatus - Proposed TicketStatus
   * @throws {InvalidTransitionError} When the transition is disallowed
   */
  assertStatusTransition(currentStatus: TicketStatus, targetStatus: TicketStatus): void {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
      throw new InvalidTransitionError(
        `Cannot transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  /**
   * Asserts that the user is authorized to perform the given status update on the ticket.
   * Clients may only cancel their own tickets.
   *
   * @see BL-301
   * @param ticket - Target Ticket entity
   * @param targetStatus - Proposed TicketStatus
   * @param ctx - UserContext
   * @throws {ForbiddenError} When role constraints or ownership checks fail
   * @throws {InvalidTransitionError} When status transition is invalid
   */
  assertStatusUpdateAccess(ticket: Ticket, targetStatus: TicketStatus, ctx: UserContext): void {
    this.assertReadAccess(ticket, ctx);
    this.assertStatusTransition(ticket.status, targetStatus);

    if (ctx.role === UserRole.CLIENT) {
      if (targetStatus !== TicketStatus.CANCELLED) {
        throw new ForbiddenError('Clients can only cancel tickets');
      }
      if (ticket.client_id !== ctx.userId) {
        throw new ForbiddenError('You can only cancel your own tickets');
      }
    }
  }

  /**
   * Enforces the 1-hour SLA cancellation rule for warranty and service outage tickets.
   *
   * @see BL-101
   * @param ticket - Ticket entity to evaluate
   * @throws {SlaViolationError} When elapsed time exceeds SLA_WINDOW_MS (60 minutes)
   */
  enforceSLARule(ticket: Ticket): void {
    const elapsed = calculateElapsedBusinessMs(new Date(ticket.created_at));
    if (elapsed > SLA_WINDOW_MS) {
      const minutesAgo = Math.floor(elapsed / 60000);
      throw new SlaViolationError(
        `SLA window expired. This ticket was created ${minutesAgo} business minutes ago. ` +
        `Warranty and service outage tickets can only be cancelled within 60 minutes of SLA start.`,
      );
    }
  }

  /**
   * Scopes ticket query filters based on the user's role and identity.
   *
   * @param filters - Original TicketFilters
   * @param ctx - UserContext
   * @returns Scoped TicketFilters
   */
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
