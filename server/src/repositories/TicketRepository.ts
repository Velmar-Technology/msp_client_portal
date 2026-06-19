import { BaseRepository } from './BaseRepository';
import { Ticket, TicketAttachment, TicketFilters, TicketStatus, TicketCategory, TicketPriority } from '../types';
import { db, tickets, users, ticketAttachments } from '../db';
import { eq, and, or, ilike, desc, asc, count, SQL, isNull, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export class TicketRepository extends BaseRepository<Ticket> {
  constructor() {
    super(tickets, 'tickets');
  }

  override async findById(id: string): Promise<Ticket | null> {
    const clientAlias = alias(users, 'client');
    const techAlias = alias(users, 'tech');

    const results = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        category: tickets.category,
        status: tickets.status,
        priority: tickets.priority,
        client_id: tickets.client_id,
        assigned_tech_id: tickets.assigned_tech_id,
        tenant_id: tickets.tenant_id,
        created_at: tickets.created_at,
        updated_at: tickets.updated_at,
        client_name: clientAlias.name,
        client_email: clientAlias.email,
        assigned_tech_name: techAlias.name,
        assigned_tech_email: techAlias.email,
      })
      .from(tickets)
      .innerJoin(clientAlias, eq(tickets.client_id, clientAlias.id))
      .leftJoin(techAlias, eq(tickets.assigned_tech_id, techAlias.id))
      .where(eq(tickets.id, id));

    return (results[0] as unknown as Ticket) || null;
  }

  async create(data: {
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    client_id: string;
    tenant_id: string;
  }): Promise<Ticket> {
    const results = await db
      .insert(tickets)
      .values({
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        client_id: data.client_id,
        tenant_id: data.tenant_id,
      })
      .returning();
    return results[0] as Ticket;
  }

  async findByClient(clientId: string, limit = 20, offset = 0): Promise<Ticket[]> {
    const results = await db
      .select()
      .from(tickets)
      .where(eq(tickets.client_id, clientId))
      .orderBy(desc(tickets.created_at))
      .limit(limit)
      .offset(offset);
    return results as Ticket[];
  }

  async findByTechnician(techId: string, limit = 20, offset = 0): Promise<Ticket[]> {
    const results = await db
      .select()
      .from(tickets)
      .where(eq(tickets.assigned_tech_id, techId))
      .orderBy(desc(tickets.created_at))
      .limit(limit)
      .offset(offset);
    return results as Ticket[];
  }

  async findWithFilters(filters: TicketFilters): Promise<{ tickets: Ticket[]; total: number }> {
    const conditions: (SQL | undefined)[] = [];

    if (filters.status) {
      conditions.push(eq(tickets.status, filters.status));
    }
    if (filters.category) {
      conditions.push(eq(tickets.category, filters.category));
    }
    if (filters.priority) {
      conditions.push(eq(tickets.priority, filters.priority));
    }
    if (filters.clientId) {
      conditions.push(eq(tickets.client_id, filters.clientId));
    }
    if (filters.assignedTechId) {
      conditions.push(eq(tickets.assigned_tech_id, filters.assignedTechId));
    }
    if (filters.tenantId) {
      conditions.push(eq(tickets.tenant_id, filters.tenantId));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(tickets.title, `%${filters.search}%`),
          ilike(tickets.description, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const countResult = await db
      .select({ val: count() })
      .from(tickets)
      .where(whereClause);
    const total = countResult[0]?.val ?? 0;

    const clientAlias = alias(users, 'client');
    const techAlias = alias(users, 'tech');

    const results = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        category: tickets.category,
        status: tickets.status,
        priority: tickets.priority,
        client_id: tickets.client_id,
        assigned_tech_id: tickets.assigned_tech_id,
        tenant_id: tickets.tenant_id,
        created_at: tickets.created_at,
        updated_at: tickets.updated_at,
        client_name: clientAlias.name,
        client_email: clientAlias.email,
        assigned_tech_name: techAlias.name,
        assigned_tech_email: techAlias.email,
      })
      .from(tickets)
      .innerJoin(clientAlias, eq(tickets.client_id, clientAlias.id))
      .leftJoin(techAlias, eq(tickets.assigned_tech_id, techAlias.id))
      .where(whereClause)
      .orderBy(desc(tickets.created_at))
      .limit(limit)
      .offset(offset);

    return { tickets: results as unknown as Ticket[], total };
  }

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket | null> {
    const results = await db
      .update(tickets)
      .set({ status })
      .where(eq(tickets.id, id))
      .returning();
    return (results[0] as Ticket) || null;
  }

  async assignTechnician(id: string, techId: string): Promise<Ticket | null> {
    const results = await db
      .update(tickets)
      .set({ assigned_tech_id: techId })
      .where(eq(tickets.id, id))
      .returning();
    return (results[0] as Ticket) || null;
  }

  async countByStatus(clientId?: string, assignedTechId?: string, tenantId?: string): Promise<Record<string, number>> {
    const conditions: (SQL | undefined)[] = [];

    if (clientId) {
      conditions.push(eq(tickets.client_id, clientId));
    }
    if (assignedTechId) {
      conditions.push(eq(tickets.assigned_tech_id, assignedTechId));
    }
    if (tenantId) {
      conditions.push(eq(tickets.tenant_id, tenantId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        status: tickets.status,
        count: count(),
      })
      .from(tickets)
      .where(whereClause)
      .groupBy(tickets.status);

    const counts: Record<string, number> = {};
    result.forEach((row) => {
      counts[row.status] = row.count;
    });
    return counts;
  }

  // ---- Attachments ----

  async addAttachment(data: {
    ticket_id: string;
    response_id?: string | null;
    filename: string;
    path: string;
    mime_type: string;
    size_bytes: number;
    tenant_id: string;
  }): Promise<TicketAttachment> {
    const results = await db
      .insert(ticketAttachments)
      .values({
        ticket_id: data.ticket_id,
        response_id: data.response_id || null,
        filename: data.filename,
        path: data.path,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        tenant_id: data.tenant_id,
      })
      .returning();
    return results[0] as TicketAttachment;
  }

  async getAttachments(ticketId: string): Promise<TicketAttachment[]> {
    const results = await db
      .select()
      .from(ticketAttachments)
      .where(and(eq(ticketAttachments.ticket_id, ticketId), isNull(ticketAttachments.response_id)))
      .orderBy(asc(ticketAttachments.uploaded_at));
    return results as TicketAttachment[];
  }

  async getAttachmentsByResponses(ticketId: string): Promise<TicketAttachment[]> {
    const results = await db
      .select()
      .from(ticketAttachments)
      .where(and(eq(ticketAttachments.ticket_id, ticketId), isNotNull(ticketAttachments.response_id)))
      .orderBy(asc(ticketAttachments.uploaded_at));
    return results as TicketAttachment[];
  }
}

export const ticketRepository = new TicketRepository();
