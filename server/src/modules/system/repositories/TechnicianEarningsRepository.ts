import { db, technicianEarnings, technicianRates, users, tickets } from '@shared/db';
import { TechnicianEarning, TechnicianRate, TechnicianEarningsSummary } from '@shared/types';
import { eq, and, desc, sql, inArray, isNull } from 'drizzle-orm';

/**
 * Data repository for technician closed-ticket earnings, rate profiles, and payroll summaries.
 */
export class TechnicianEarningsRepository {
  /**
   * Initializes TechnicianEarningsRepository with database pool reference.
   *
   * @param dbInstance - Drizzle database instance
   */
  constructor(private dbInstance = db) {}

  /**
   * Retrieves the compensation rate profile for a specific technician, falling back to the tenant-wide default.
   *
   * @param technicianId - Technician UUID
   * @param tenantId - Tenant UUID
   * @returns TechnicianRate record or null
   */
  async getRateForTechnician(technicianId: string, tenantId: string): Promise<TechnicianRate | null> {
    // 1. Check for technician-specific rate
    const specific = await this.dbInstance
      .select()
      .from(technicianRates)
      .where(and(eq(technicianRates.technician_id, technicianId), eq(technicianRates.tenant_id, tenantId)))
      .limit(1);

    if (specific.length > 0) {
      return specific[0] as unknown as TechnicianRate;
    }

    // 2. Fall back to tenant global default (technician_id is NULL)
    const globalDefault = await this.dbInstance
      .select()
      .from(technicianRates)
      .where(and(isNull(technicianRates.technician_id), eq(technicianRates.tenant_id, tenantId)))
      .limit(1);

    if (globalDefault.length > 0) {
      return globalDefault[0] as unknown as TechnicianRate;
    }

    return null;
  }

  /**
   * Creates or updates a rate profile for a technician or tenant default.
   *
   * @param data - Rate configuration data
   * @returns Created or updated TechnicianRate record
   */
  async upsertRate(data: {
    technician_id?: string | null;
    base_closed_rate: number;
    sla_bonus_rate: number;
    currency?: string;
    multiplier_critical?: number;
    multiplier_high?: number;
    multiplier_medium?: number;
    multiplier_low?: number;
    tenant_id: string;
  }): Promise<TechnicianRate> {
    const existing = data.technician_id
      ? await this.dbInstance
          .select()
          .from(technicianRates)
          .where(and(eq(technicianRates.technician_id, data.technician_id), eq(technicianRates.tenant_id, data.tenant_id)))
          .limit(1)
      : await this.dbInstance
          .select()
          .from(technicianRates)
          .where(and(isNull(technicianRates.technician_id), eq(technicianRates.tenant_id, data.tenant_id)))
          .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.dbInstance
        .update(technicianRates)
        .set({
          base_closed_rate: data.base_closed_rate,
          sla_bonus_rate: data.sla_bonus_rate,
          currency: data.currency || 'USD',
          multiplier_critical: data.multiplier_critical ?? 2.5,
          multiplier_high: data.multiplier_high ?? 1.75,
          multiplier_medium: data.multiplier_medium ?? 1.25,
          multiplier_low: data.multiplier_low ?? 1.0,
          updated_at: new Date(),
        })
        .where(eq(technicianRates.id, existing[0].id))
        .returning();
      return updated as unknown as TechnicianRate;
    }

    const [created] = await this.dbInstance
      .insert(technicianRates)
      .values({
        technician_id: data.technician_id || null,
        base_closed_rate: data.base_closed_rate,
        sla_bonus_rate: data.sla_bonus_rate,
        currency: data.currency || 'USD',
        multiplier_critical: data.multiplier_critical ?? 2.5,
        multiplier_high: data.multiplier_high ?? 1.75,
        multiplier_medium: data.multiplier_medium ?? 1.25,
        multiplier_low: data.multiplier_low ?? 1.0,
        tenant_id: data.tenant_id,
      })
      .returning();

    return created as unknown as TechnicianRate;
  }

  /**
   * Records a new earning entry in the ledger.
   *
   * @param data - Earning ledger data
   * @returns Created TechnicianEarning record
   */
  async createEarning(data: {
    ticket_id: string;
    technician_id: string;
    base_amount: number;
    sla_bonus_amount: number;
    final_amount: number;
    currency?: string;
    status?: 'PENDING' | 'APPROVED' | 'PAID' | 'VOIDED';
    breakdown: any;
    expense_id?: string | null;
    tenant_id: string;
  }): Promise<TechnicianEarning> {
    const [created] = await this.dbInstance
      .insert(technicianEarnings)
      .values({
        ticket_id: data.ticket_id,
        technician_id: data.technician_id,
        base_amount: data.base_amount,
        sla_bonus_amount: data.sla_bonus_amount,
        final_amount: data.final_amount,
        currency: data.currency || 'USD',
        status: data.status || 'PENDING',
        breakdown: data.breakdown,
        expense_id: data.expense_id || null,
        tenant_id: data.tenant_id,
      })
      .returning();

    return created as unknown as TechnicianEarning;
  }

  /**
   * Finds an earning entry by ticket ID.
   *
   * @param ticketId - Ticket UUID
   * @returns TechnicianEarning or null
   */
  async findByTicketId(ticketId: string): Promise<TechnicianEarning | null> {
    const results = await this.dbInstance
      .select()
      .from(technicianEarnings)
      .where(eq(technicianEarnings.ticket_id, ticketId))
      .limit(1);

    return (results[0] as unknown as TechnicianEarning) || null;
  }

  /**
   * Retrieves paginated earnings for a specific technician with joined ticket info.
   *
   * @param technicianId - Technician UUID
   * @param _tenantId - Tenant UUID (optional scope)
   * @param limit - Page size
   * @param offset - Offset index
   * @returns Array of TechnicianEarning records
   */
  async findByTechnician(
    technicianId: string,
    _tenantId?: string,
    limit = 50,
    offset = 0
  ): Promise<TechnicianEarning[]> {
    const rows = await this.dbInstance
      .select({
        earning: technicianEarnings,
        ticketTitle: tickets.title,
      })
      .from(technicianEarnings)
      .leftJoin(tickets, eq(technicianEarnings.ticket_id, tickets.id))
      .where(eq(technicianEarnings.technician_id, technicianId))
      .orderBy(desc(technicianEarnings.earned_at))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...(r.earning as unknown as TechnicianEarning),
      ticket_title: r.ticketTitle || undefined,
    }));
  }

  /**
   * Retrieves paginated earnings across all technicians for admin payroll review.
   *
   * @param _tenantId - Tenant UUID
   * @param status - Optional status filter
   * @param limit - Page size
   * @param offset - Offset index
   * @returns Array of TechnicianEarning records with technician and ticket details
   */
  async findAll(
    _tenantId?: string,
    status?: string,
    limit = 100,
    offset = 0
  ): Promise<TechnicianEarning[]> {
    let query = this.dbInstance
      .select({
        earning: technicianEarnings,
        ticketTitle: tickets.title,
        techName: users.name,
        techEmail: users.email,
      })
      .from(technicianEarnings)
      .leftJoin(tickets, eq(technicianEarnings.ticket_id, tickets.id))
      .leftJoin(users, eq(technicianEarnings.technician_id, users.id))
      .where(
        status
          ? eq(technicianEarnings.status, status as any)
          : undefined
      )
      .orderBy(desc(technicianEarnings.earned_at))
      .limit(limit)
      .offset(offset);

    const rows = await query;
    return rows.map((r) => ({
      ...(r.earning as unknown as TechnicianEarning),
      ticket_title: r.ticketTitle || undefined,
      technician_name: r.techName || undefined,
      technician_email: r.techEmail || undefined,
    }));
  }

  /**
   * Aggregates total earnings metrics for a specific technician.
   *
   * @param technicianId - Technician UUID
   * @param _tenantId - Tenant UUID (optional scope)
   * @returns TechnicianEarningsSummary
   */
  async getSummaryByTechnician(technicianId: string, _tenantId?: string): Promise<TechnicianEarningsSummary> {
    const stats = await this.dbInstance
      .select({
        totalTickets: sql<number>`count(${technicianEarnings.id})`,
        totalEarned: sql<number>`coalesce(sum(case when ${technicianEarnings.status} != 'VOIDED' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        pendingAmount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} = 'PENDING' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        approvedAmount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} = 'APPROVED' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        paidAmount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} = 'PAID' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        slaMetCount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} != 'VOIDED' and (${technicianEarnings.breakdown}->>'slaMet')::boolean = true then 1 else 0 end), 0)`,
      })
      .from(technicianEarnings)
      .where(eq(technicianEarnings.technician_id, technicianId));

    const s = stats[0] || {
      totalTickets: 0,
      totalEarned: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      paidAmount: 0,
      slaMetCount: 0,
    };

    const totalTickets = Number(s.totalTickets) || 0;
    const slaMetCount = Number(s.slaMetCount) || 0;

    return {
      technician_id: technicianId,
      total_closed_tickets: totalTickets,
      total_earned: Number(s.totalEarned) || 0,
      pending_amount: Number(s.pendingAmount) || 0,
      approved_amount: Number(s.approvedAmount) || 0,
      paid_amount: Number(s.paidAmount) || 0,
      sla_met_count: slaMetCount,
      sla_met_rate: totalTickets > 0 ? Number(((slaMetCount / totalTickets) * 100).toFixed(1)) : 0,
    };
  }

  /**
   * Aggregates payroll summaries across all technicians in the tenant.
   *
   * @param _tenantId - Tenant UUID
   * @returns Array of TechnicianEarningsSummary with technician names
   */
  async getAllTechniciansSummary(_tenantId?: string): Promise<TechnicianEarningsSummary[]> {
    const rows = await this.dbInstance
      .select({
        technicianId: users.id,
        technicianName: users.name,
        totalTickets: sql<number>`count(${technicianEarnings.id})`,
        totalEarned: sql<number>`coalesce(sum(case when ${technicianEarnings.status} != 'VOIDED' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        pendingAmount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} = 'PENDING' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        approvedAmount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} = 'APPROVED' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        paidAmount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} = 'PAID' then ${technicianEarnings.final_amount} else 0 end), 0)`,
        slaMetCount: sql<number>`coalesce(sum(case when ${technicianEarnings.status} != 'VOIDED' and (${technicianEarnings.breakdown}->>'slaMet')::boolean = true then 1 else 0 end), 0)`,
      })
      .from(users)
      .leftJoin(
        technicianEarnings,
        eq(technicianEarnings.technician_id, users.id)
      )
      .where(eq(users.role, 'TECHNICIAN'))
      .groupBy(users.id, users.name);

    return rows.map((r) => {
      const totalTickets = Number(r.totalTickets) || 0;
      const slaMetCount = Number(r.slaMetCount) || 0;
      return {
        technician_id: r.technicianId,
        technician_name: r.technicianName,
        total_closed_tickets: totalTickets,
        total_earned: Number(r.totalEarned) || 0,
        pending_amount: Number(r.pendingAmount) || 0,
        approved_amount: Number(r.approvedAmount) || 0,
        paid_amount: Number(r.paidAmount) || 0,
        sla_met_count: slaMetCount,
        sla_met_rate: totalTickets > 0 ? Number(((slaMetCount / totalTickets) * 100).toFixed(1)) : 0,
      };
    });
  }

  /**
   * Updates status of an earning record.
   *
   * @param id - Earning UUID
   * @param status - Target earning status
   * @param paidAt - Optional payout timestamp
   * @returns Updated TechnicianEarning
   */
  async updateStatus(
    id: string,
    status: 'PENDING' | 'APPROVED' | 'PAID' | 'VOIDED',
    paidAt?: Date | null
  ): Promise<TechnicianEarning | null> {
    const updateData: any = { status, updated_at: new Date() };
    if (paidAt !== undefined) {
      updateData.paid_at = paidAt;
    }

    const [updated] = await this.dbInstance
      .update(technicianEarnings)
      .set(updateData)
      .where(eq(technicianEarnings.id, id))
      .returning();

    return (updated as unknown as TechnicianEarning) || null;
  }

  /**
   * Batch updates status of multiple earning records.
   *
   * @param ids - Array of earning UUIDs
   * @param status - Target status
   * @param paidAt - Optional payout timestamp
   * @returns Number of updated rows
   */
  async batchUpdateStatus(
    ids: string[],
    status: 'PENDING' | 'APPROVED' | 'PAID' | 'VOIDED',
    paidAt?: Date | null
  ): Promise<number> {
    if (ids.length === 0) return 0;

    const updateData: any = { status, updated_at: new Date() };
    if (paidAt !== undefined) {
      updateData.paid_at = paidAt;
    }

    const res = await this.dbInstance
      .update(technicianEarnings)
      .set(updateData)
      .where(inArray(technicianEarnings.id, ids))
      .returning();

    return res.length;
  }
}

export const technicianEarningsRepository = new TechnicianEarningsRepository();
