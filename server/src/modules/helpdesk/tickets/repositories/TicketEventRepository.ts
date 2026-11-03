import { BaseRepository } from '@shared/repositories/BaseRepository';
import { TicketEvent, TicketStatus } from '@shared/types';
import { db, ticketEvents, users } from '@shared/db';
import { eq, asc, and, or, ilike } from 'drizzle-orm';

/**
 * Data repository for ticket lifecycle event audit trails and status timeline history.
 */
export class TicketEventRepository extends BaseRepository<TicketEvent> {
  /**
   * Initializes TicketEventRepository for the ticket_events table.
   */
  constructor() {
    super(ticketEvents, 'ticket_events');
  }

  /**
   * Records a new lifecycle status change or assignment audit event for a ticket.
   *
   * @param data - Audit event attributes
   * @returns Created TicketEvent record
   */
  async create(data: {
    ticket_id: string;
    old_status: TicketStatus | null;
    new_status: TicketStatus;
    changed_by: string;
    notes?: string;
    tenant_id: string;
  }): Promise<TicketEvent> {
    const results = await db
      .insert(ticketEvents)
      .values({
        ticket_id: data.ticket_id,
        old_status: data.old_status,
        new_status: data.new_status,
        changed_by: data.changed_by,
        notes: data.notes || null,
        tenant_id: data.tenant_id,
      })
      .returning();
    return results[0] as TicketEvent;
  }

  /**
   * Retrieves the chronological audit event timeline for a ticket, joined with actor names and roles.
   *
   * @param ticketId - Unique ticket UUID
   * @returns Array of enriched TicketEvent records
   */
  async findByTicket(ticketId: string): Promise<TicketEvent[]> {
    const results = await db
      .select({
        id: ticketEvents.id,
        ticket_id: ticketEvents.ticket_id,
        old_status: ticketEvents.old_status,
        new_status: ticketEvents.new_status,
        changed_by: ticketEvents.changed_by,
        notes: ticketEvents.notes,
        tenant_id: ticketEvents.tenant_id,
        created_at: ticketEvents.created_at,
        changed_by_name: users.name,
        changed_by_role: users.role,
      })
      .from(ticketEvents)
      .innerJoin(users, eq(ticketEvents.changed_by, users.id))
      .where(eq(ticketEvents.ticket_id, ticketId))
      .orderBy(asc(ticketEvents.created_at));

    return results as unknown as TicketEvent[];
  }

  /**
   * Checks whether a ticket has already undergone Tier 2 escalation in its audit timeline.
   * Prevents repeated escalation sweeps from spamming assignment events and notifications (BL-104).
   *
   * @param ticketId - Unique ticket UUID
   * @returns True if an escalation audit event already exists for this ticket
   * @see BL-104
   */
  async hasEscalationEvent(ticketId: string): Promise<boolean> {
    const results = await db
      .select({ id: ticketEvents.id })
      .from(ticketEvents)
      .where(
        and(
          eq(ticketEvents.ticket_id, ticketId),
          or(
            ilike(ticketEvents.notes, '%Escalated to Tier 2%'),
            ilike(ticketEvents.notes, '%Tier 2%'),
            ilike(ticketEvents.notes, '%Auto-Heal BL-104%')
          )
        )
      )
      .limit(1);

    return results.length > 0;
  }
}

export const ticketEventRepository = new TicketEventRepository();
