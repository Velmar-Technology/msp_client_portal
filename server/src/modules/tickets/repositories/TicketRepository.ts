import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Ticket, TicketAttachment, TicketFilters, TicketStatus, TicketCategory, TicketPriority, EscalationCandidate } from '@shared/types';
import { db, tickets, users, ticketAttachments, ticketResponses, subscriptionEquipment } from '@shared/db';
import { eq, ne, gte, and, or, ilike, desc, asc, count, lt, inArray, SQL, isNull, isNotNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { validate as isUuid } from 'uuid';

export class TicketRepository extends BaseRepository<Ticket> {
  constructor() {
    super(tickets, 'tickets');
  }

  override async findById(id: string): Promise<Ticket | null> {
    if (!id || !isUuid(id)) {
      return null;
    }

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
        equipment_id: tickets.equipment_id,
        tenant_id: tickets.tenant_id,
        created_at: tickets.created_at,
        updated_at: tickets.updated_at,
        client_name: clientAlias.name,
        client_email: clientAlias.email,
        assigned_tech_name: techAlias.name,
        assigned_tech_email: techAlias.email,
        device_name: subscriptionEquipment.device_name,
      })
      .from(tickets)
      .innerJoin(clientAlias, eq(tickets.client_id, clientAlias.id))
      .leftJoin(techAlias, eq(tickets.assigned_tech_id, techAlias.id))
      .leftJoin(subscriptionEquipment, eq(tickets.equipment_id, subscriptionEquipment.id))
      .where(eq(tickets.id, id));

    return (results[0] as unknown as Ticket) || null;
  }

  async create(data: {
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    client_id: string;
    equipment_id?: string | null;
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
        equipment_id: data.equipment_id || null,
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

  async findOpenTicketsForTechnicians(techIds: string[]): Promise<Ticket[]> {
    if (techIds.length === 0) return [];
    const results = await db
      .select()
      .from(tickets)
      .where(
        and(
          inArray(tickets.assigned_tech_id, techIds),
          or(eq(tickets.status, TicketStatus.OPEN), eq(tickets.status, TicketStatus.IN_PROGRESS))
        )
      );
    return results as Ticket[];
  }

  async findPendingEscalations(cutoff: Date): Promise<EscalationCandidate[]> {
    const results = await db
      .select({
        id: tickets.id,
        priority: tickets.priority,
        status: tickets.status,
        category: tickets.category,
        assigned_tech_id: tickets.assigned_tech_id,
        tenant_id: tickets.tenant_id,
        created_at: tickets.created_at,
        responseCount: count(ticketResponses.id),
      })
      .from(tickets)
      .leftJoin(ticketResponses, eq(ticketResponses.ticket_id, tickets.id))
      .where(and(eq(tickets.status, TicketStatus.OPEN), lt(tickets.created_at, cutoff)))
      .groupBy(tickets.id);

    return results as unknown as EscalationCandidate[];
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
    if (filters.equipmentId) {
      conditions.push(eq(tickets.equipment_id, filters.equipmentId));
    }
    if (filters.search) {
      const searchTerm = filters.search.startsWith('#') ? filters.search.slice(1).trim() : filters.search;
      conditions.push(
        or(
          ilike(sql`${tickets.id}::text`, `%${searchTerm}%`),
          ilike(tickets.title, `%${searchTerm}%`),
          ilike(tickets.description, `%${searchTerm}%`)
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

    const orderFn = filters.sortOrder === 'asc' ? asc : desc;

    let orderByClause;
    switch (filters.sortBy) {
      case 'title':
        orderByClause = orderFn(tickets.title);
        break;
      case 'client_name':
        orderByClause = orderFn(clientAlias.name);
        break;
      case 'category':
        orderByClause = orderFn(tickets.category);
        break;
      case 'priority':
        orderByClause = orderFn(tickets.priority);
        break;
      case 'status':
        orderByClause = orderFn(tickets.status);
        break;
      case 'created_at':
        orderByClause = orderFn(tickets.created_at);
        break;
      default:
        orderByClause = desc(tickets.created_at);
    }

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
        equipment_id: tickets.equipment_id,
        tenant_id: tickets.tenant_id,
        created_at: tickets.created_at,
        updated_at: tickets.updated_at,
        client_name: clientAlias.name,
        client_email: clientAlias.email,
        assigned_tech_name: techAlias.name,
        assigned_tech_email: techAlias.email,
        device_name: subscriptionEquipment.device_name,
      })
      .from(tickets)
      .innerJoin(clientAlias, eq(tickets.client_id, clientAlias.id))
      .leftJoin(techAlias, eq(tickets.assigned_tech_id, techAlias.id))
      .leftJoin(subscriptionEquipment, eq(tickets.equipment_id, subscriptionEquipment.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return { tickets: results as unknown as Ticket[], total };
  }

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket | null> {
    if (!id || !isUuid(id)) {
      return null;
    }
    const results = await db
      .update(tickets)
      .set({ status })
      .where(eq(tickets.id, id))
      .returning();
    return (results[0] as Ticket) || null;
  }

  async assignTechnician(id: string, techId: string): Promise<Ticket | null> {
    if (!id || !isUuid(id) || !isUuid(techId)) {
      return null;
    }
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
      if (!isUuid(clientId)) return {};
      conditions.push(eq(tickets.client_id, clientId));
    }
    if (assignedTechId) {
      if (!isUuid(assignedTechId)) return {};
      conditions.push(eq(tickets.assigned_tech_id, assignedTechId));
    }
    if (tenantId) {
      if (!isUuid(tenantId)) return {};
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
    if (!ticketId || !isUuid(ticketId)) {
      return [];
    }
    const results = await db
      .select()
      .from(ticketAttachments)
      .where(and(eq(ticketAttachments.ticket_id, ticketId), isNull(ticketAttachments.response_id)))
      .orderBy(asc(ticketAttachments.uploaded_at));
    return results as TicketAttachment[];
  }

  async getAttachmentsByResponses(ticketId: string): Promise<TicketAttachment[]> {
    if (!ticketId || !isUuid(ticketId)) {
      return [];
    }
    const results = await db
      .select()
      .from(ticketAttachments)
      .where(and(eq(ticketAttachments.ticket_id, ticketId), isNotNull(ticketAttachments.response_id)))
      .orderBy(asc(ticketAttachments.uploaded_at));
    return results as TicketAttachment[];
  }

  async countClientTicketsInCurrentMonth(clientId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const countResult = await db
      .select({ val: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.client_id, clientId),
          gte(tickets.created_at, startOfMonth),
          ne(tickets.status, TicketStatus.CANCELLED)
        )
      );

    return countResult[0]?.val ?? 0;
  }

  async countEquipmentTicketsInCurrentMonth(equipmentId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const countResult = await db
      .select({ val: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.equipment_id, equipmentId),
          gte(tickets.created_at, startOfMonth),
          ne(tickets.status, TicketStatus.CANCELLED)
        )
      );

    return countResult[0]?.val ?? 0;
  }
}

export const ticketRepository = new TicketRepository();
