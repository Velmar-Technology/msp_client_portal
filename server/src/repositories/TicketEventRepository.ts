import { BaseRepository } from './BaseRepository';
import { TicketEvent, TicketStatus } from '../types';
import { db, ticketEvents, users } from '../db';
import { eq, asc } from 'drizzle-orm';

export class TicketEventRepository extends BaseRepository<TicketEvent> {
  constructor() {
    super(ticketEvents, 'ticket_events');
  }

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
}

export const ticketEventRepository = new TicketEventRepository();
