import { BaseRepository } from './BaseRepository';
import { TicketEvent, TicketStatus } from '../types';

export class TicketEventRepository extends BaseRepository<TicketEvent> {
  constructor() {
    super('ticket_events');
  }

  async create(data: {
    ticket_id: string;
    old_status: TicketStatus | null;
    new_status: TicketStatus;
    changed_by: string;
    notes?: string;
    tenant_id: string;
  }): Promise<TicketEvent> {
    const result = await this.queryOne<TicketEvent>(
      `INSERT INTO ticket_events (ticket_id, old_status, new_status, changed_by, notes, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.ticket_id,
        data.old_status,
        data.new_status,
        data.changed_by,
        data.notes || null,
        data.tenant_id,
      ],
    );
    return result!;
  }

  async findByTicket(ticketId: string): Promise<TicketEvent[]> {
    return this.query<TicketEvent>(
      `SELECT te.*, u.name as changed_by_name, u.role as changed_by_role
       FROM ticket_events te
       JOIN users u ON te.changed_by = u.id
       WHERE te.ticket_id = $1
       ORDER BY te.created_at ASC`,
      [ticketId],
    );
  }
}

export const ticketEventRepository = new TicketEventRepository();
