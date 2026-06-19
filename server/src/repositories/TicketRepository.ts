import { BaseRepository } from './BaseRepository';
import { Ticket, TicketAttachment, TicketFilters, TicketStatus, TicketCategory, TicketPriority } from '../types';

export class TicketRepository extends BaseRepository<Ticket> {
  constructor() {
    super('tickets');
  }

  override async findById(id: string): Promise<Ticket | null> {
    return this.queryOne<Ticket>(
      `SELECT t.*, 
              c.name as client_name, c.email as client_email,
              tech.name as assigned_tech_name, tech.email as assigned_tech_email
       FROM tickets t
       JOIN users c ON t.client_id = c.id
       LEFT JOIN users tech ON t.assigned_tech_id = tech.id
       WHERE t.id = $1`,
      [id],
    );
  }

  async create(data: {
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    client_id: string;
  }): Promise<Ticket> {
    const result = await this.queryOne<Ticket>(
      `INSERT INTO tickets (title, description, category, priority, client_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.title, data.description, data.category, data.priority, data.client_id],
    );
    return result!;
  }

  async findByClient(clientId: string, limit = 20, offset = 0): Promise<Ticket[]> {
    return this.query<Ticket>(
      `SELECT * FROM tickets WHERE client_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [clientId, limit, offset],
    );
  }

  async findByTechnician(techId: string, limit = 20, offset = 0): Promise<Ticket[]> {
    return this.query<Ticket>(
      `SELECT * FROM tickets WHERE assigned_tech_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [techId, limit, offset],
    );
  }

  async findWithFilters(filters: TicketFilters): Promise<{ tickets: Ticket[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    if (filters.category) {
      conditions.push(`t.category = $${paramIndex++}`);
      params.push(filters.category);
    }
    if (filters.priority) {
      conditions.push(`t.priority = $${paramIndex++}`);
      params.push(filters.priority);
    }
    if (filters.clientId) {
      conditions.push(`t.client_id = $${paramIndex++}`);
      params.push(filters.clientId);
    }
    if (filters.assignedTechId) {
      conditions.push(`t.assigned_tech_id = $${paramIndex++}`);
      params.push(filters.assignedTechId);
    }
    if (filters.search) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const countResult = await this.queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM tickets t ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit, offset);
    const tickets = await this.query<Ticket>(
      `SELECT t.*, 
              c.name as client_name, c.email as client_email,
              tech.name as assigned_tech_name, tech.email as assigned_tech_email
       FROM tickets t
       JOIN users c ON t.client_id = c.id
       LEFT JOIN users tech ON t.assigned_tech_id = tech.id
       ${whereClause} 
       ORDER BY t.created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params,
    );

    return { tickets, total };
  }

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket | null> {
    return this.queryOne<Ticket>(
      'UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );
  }

  async assignTechnician(id: string, techId: string): Promise<Ticket | null> {
    return this.queryOne<Ticket>(
      'UPDATE tickets SET assigned_tech_id = $1 WHERE id = $2 RETURNING *',
      [techId, id],
    );
  }

  async countByStatus(clientId?: string): Promise<Record<string, number>> {
    const whereClause = clientId ? 'WHERE client_id = $1' : '';
    const params = clientId ? [clientId] : [];
    const result = await this.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) FROM tickets ${whereClause} GROUP BY status`,
      params,
    );
    const counts: Record<string, number> = {};
    result.forEach((row) => {
      counts[row.status] = parseInt(row.count, 10);
    });
    return counts;
  }

  // ---- Attachments ----

  async addAttachment(data: {
    ticket_id: string;
    filename: string;
    path: string;
    mime_type: string;
    size_bytes: number;
  }): Promise<TicketAttachment> {
    const result = await this.queryOne<TicketAttachment>(
      `INSERT INTO ticket_attachments (ticket_id, filename, path, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.ticket_id, data.filename, data.path, data.mime_type, data.size_bytes],
    );
    return result!;
  }

  async getAttachments(ticketId: string): Promise<TicketAttachment[]> {
    return this.query<TicketAttachment>(
      'SELECT * FROM ticket_attachments WHERE ticket_id = $1 ORDER BY uploaded_at',
      [ticketId],
    );
  }
}

export const ticketRepository = new TicketRepository();
