import { BaseRepository } from './BaseRepository';
import { TicketResponse } from '../types';
import { db, ticketResponses, users } from '../db';
import { eq, asc } from 'drizzle-orm';

export class TicketResponseRepository extends BaseRepository<TicketResponse> {
  constructor() {
    super(ticketResponses, 'ticket_responses');
  }

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
