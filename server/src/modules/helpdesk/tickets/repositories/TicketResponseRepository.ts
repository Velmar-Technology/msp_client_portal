import { BaseRepository } from '@shared/repositories/BaseRepository';
import { TicketResponse } from '@shared/types';
import { db, ticketResponses, users } from '@shared/db';
import { eq, asc, and } from 'drizzle-orm';

/**
 * Data repository for ticket message responses and conversational threads.
 */
export class TicketResponseRepository extends BaseRepository<TicketResponse> {
  /**
   * Initializes TicketResponseRepository for the ticket_responses table.
   */
  constructor() {
    super(ticketResponses, 'ticket_responses');
  }

  /**
   * Inserts a new reply message into a ticket conversation thread.
   *
   * @param data - Response attributes (ticketId, userId, message, tenantId, optional authorName, optional is_internal)
   * @returns Created TicketResponse entity
   */
  async create(data: {
    ticket_id: string;
    user_id: string;
    message: string;
    tenant_id: string;
    author_name?: string | null;
    is_internal?: boolean;
  }): Promise<TicketResponse> {
    const results = await db
      .insert(ticketResponses)
      .values({
        ticket_id: data.ticket_id,
        user_id: data.user_id,
        message: data.message,
        tenant_id: data.tenant_id,
        author_name: data.author_name || null,
        is_internal: data.is_internal ?? false,
      })
      .returning();
    return results[0] as TicketResponse;
  }

  /**
   * Retrieves all conversational responses for a ticket, joined with author details.
   * Optionally filters out internal notes for client users.
   *
   * @param ticketId - Unique ticket UUID
   * @param includeInternal - Whether to include internal staff-only notes (default true)
   * @returns Array of TicketResponse records in chronological order
   */
  async findByTicket(ticketId: string, includeInternal: boolean = true): Promise<TicketResponse[]> {
    const condition = includeInternal
      ? eq(ticketResponses.ticket_id, ticketId)
      : and(eq(ticketResponses.ticket_id, ticketId), eq(ticketResponses.is_internal, false));

    const results = await db
      .select({
        id: ticketResponses.id,
        ticket_id: ticketResponses.ticket_id,
        user_id: ticketResponses.user_id,
        message: ticketResponses.message,
        author_name: ticketResponses.author_name,
        is_internal: ticketResponses.is_internal,
        tenant_id: ticketResponses.tenant_id,
        created_at: ticketResponses.created_at,
        user_name: users.name,
        user_role: users.role,
      })
      .from(ticketResponses)
      .innerJoin(users, eq(ticketResponses.user_id, users.id))
      .where(condition)
      .orderBy(asc(ticketResponses.created_at));

    return results as unknown as TicketResponse[];
  }
}

export const ticketResponseRepository = new TicketResponseRepository();
