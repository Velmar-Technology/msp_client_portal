import { BaseRepository } from '@shared/repositories/BaseRepository';
import { TicketResponse } from '@shared/types';
import { db, ticketResponses, users } from '@shared/db';
import { eq, asc } from 'drizzle-orm';

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
   * @param data - Response attributes (ticketId, userId, message, tenantId)
   * @returns Created TicketResponse entity
   */
  async create(data: {
    ticket_id: string;
    user_id: string;
    message: string;
    tenant_id: string;
  }): Promise<TicketResponse> {
    const results = await db
      .insert(ticketResponses)
      .values({
        ticket_id: data.ticket_id,
        user_id: data.user_id,
        message: data.message,
        tenant_id: data.tenant_id,
      })
      .returning();
    return results[0] as TicketResponse;
  }

  /**
   * Retrieves all conversational responses for a ticket, joined with author details.
   *
   * @param ticketId - Unique ticket UUID
   * @returns Array of TicketResponse records in chronological order
   */
  async findByTicket(ticketId: string): Promise<TicketResponse[]> {
    const results = await db
      .select({
        id: ticketResponses.id,
        ticket_id: ticketResponses.ticket_id,
        user_id: ticketResponses.user_id,
        message: ticketResponses.message,
        tenant_id: ticketResponses.tenant_id,
        created_at: ticketResponses.created_at,
        user_name: users.name,
        user_role: users.role,
      })
      .from(ticketResponses)
      .innerJoin(users, eq(ticketResponses.user_id, users.id))
      .where(eq(ticketResponses.ticket_id, ticketId))
      .orderBy(asc(ticketResponses.created_at));

    return results as unknown as TicketResponse[];
  }
}

export const ticketResponseRepository = new TicketResponseRepository();
