import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Ticket, TicketAttachment, TicketFilters, TicketStatus, TicketCategory, TicketPriority, EscalationCandidate } from '@shared/types';
import { db, tickets, users, ticketAttachments, ticketResponses, subscriptionEquipment } from '@shared/db';
import { eq, ne, gte, and, or, ilike, desc, asc, count, lt, inArray, SQL, isNull, isNotNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { validate as isUuid } from 'uuid';

/**
 * Data repository for support tickets, multi-parameter filtering, technician assignments,
 * status summary aggregates, SLA escalation sweeps, and attachments.
 */
export class TicketRepository extends BaseRepository<Ticket> {
  /**
   * Initializes TicketRepository for the tickets table.
   */
  constructor() {
    super(tickets, 'tickets');
  }

  /**
   * Retrieves an enriched ticket entity by UUID, joining client, technician, and equipment metadata.
   *
   * @param id - Unique ticket UUID
   * @returns Enriched Ticket entity or null if not found
   */
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

  /**
   * Inserts a new support ticket record.
   *
   * @param data - Ticket creation properties
   * @returns Created Ticket entity
   */
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

  /**
   * Retrieves paginated tickets filed by a specific client.
   *
   * @param clientId - Client user UUID
   * @param limit - Page size
   * @param offset - Offset index
   * @returns Array of tickets
   */
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

  /**
   * Retrieves paginated tickets assigned to a specific technician.
   *
   * @param techId - Technician user UUID
   * @param limit - Page size
   * @param offset - Offset index
   * @returns Array of tickets
   */
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

  /**
   * Retrieves active open or in-progress tickets assigned across a list of technicians for load calculation.
   *
   * @param techIds - Array of technician user UUIDs
   * @returns Array of active tickets
   */
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

  /**
   * Finds OPEN tickets created before a cutoff timestamp with their response count for SLA escalation evaluation.
   *
   * @param cutoff - Expiration threshold timestamp
   * @returns Array of candidate tickets for escalation
   */
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

  /**
   * Retrieves a paginated and filtered ticket dataset with total count.
   *
   * @param filters - Search query, category, priority, status, client/tech/tenant/equipment filters
   * @returns Filtered tickets list and total record count
   */
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

  /**
   * Updates the lifecycle status of a ticket.
   *
   * @param id - Unique ticket UUID
   * @param status - Target TicketStatus
   * @returns Updated Ticket entity or null
   */
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

  /**
   * Updates the assigned technician on a ticket.
   *
   * @param id - Unique ticket UUID
   * @param techId - Technician user UUID
   * @returns Updated Ticket entity or null
   */
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

  /**
   * Calculates a breakdown of ticket counts by status, scoped to optional client, technician, or tenant filters.
   *
   * @param clientId - Optional client filter
   * @param assignedTechId - Optional technician filter
   * @param tenantId - Optional tenant filter
   * @returns Record mapping TicketStatus to count
   */
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

  /**
   * Stores a file attachment associated with a ticket or ticket response.
   *
   * @param data - Attachment metadata and file storage path
   * @returns Created TicketAttachment entity
   */
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

  /**
   * Retrieves initial attachments uploaded directly to the ticket (excluding response attachments).
   *
   * @param ticketId - Unique ticket UUID
   * @returns Array of TicketAttachment records
   */
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

  /**
   * Retrieves all attachments attached to subsequent ticket responses.
   *
   * @param ticketId - Unique ticket UUID
   * @returns Array of TicketAttachment records
   */
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

  /**
   * Counts non-cancelled tickets created by a client in the current calendar month.
   *
   * @param clientId - Client user UUID
   * @returns Count of tickets created this month
   * @see BL-201
   */
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

  /**
   * Counts non-cancelled tickets created for a specific equipment asset in the current calendar month.
   *
   * @param equipmentId - Equipment UUID
   * @returns Count of tickets created for device this month
   * @see BL-201
   */
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
