import { BaseRepository } from '@shared/repositories/BaseRepository';
import { quotations } from '@shared/db/schema';
import { Quotation, QuotationStatus } from '@shared/types';
import { db, pool } from '@shared/db';
import { eq, and } from 'drizzle-orm';
import { isUuid } from '@shared/utils/validation';

/**
 * Data repository managing commercial quotation records, auto-number generation, and status lifecycles.
 */
export class QuotationRepository extends BaseRepository<Quotation> {
  /**
   * Initializes QuotationRepository for the quotations database table.
   */
  constructor() {
    super(quotations, 'quotations');
  }

  /**
   * Generates the next sequential quotation number for the current year (e.g. QT-2026-0001).
   *
   * @returns Formatted quotation number string
   */
  async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const sql = `
      SELECT quotation_number 
      FROM quotations 
      WHERE quotation_number LIKE $1 
      ORDER BY quotation_number DESC 
      LIMIT 1
    `;
    const res = await pool.query(sql, [`${prefix}%`]);

    if (res.rows.length === 0) {
      return `${prefix}0001`;
    }

    const lastNumStr = res.rows[0].quotation_number.replace(prefix, '');
    const lastNum = parseInt(lastNumStr, 10);
    const nextNum = isNaN(lastNum) ? 1 : lastNum + 1;
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Inserts a new quotation record with calculated subtotals, taxes, and expiration dates.
   *
   * @param data - Quotation creation parameters
   * @returns Created Quotation entity
   */
  async createQuotation(data: {
    tenantId: string;
    leadId?: string | null;
    clientId?: string | null;
    recipientName: string;
    recipientEmail: string;
    planId: string;
    billingCycle: 'monthly' | 'annual';
    equipmentCount: number;
    subtotal: number;
    tax: number;
    total: number;
    validUntil?: Date | null;
    createdBy?: string | null;
  }): Promise<Quotation> {
    const quotationNumber = await this.generateQuotationNumber();

    const result = await db
      .insert(quotations)
      .values({
        quotation_number: quotationNumber,
        tenant_id: data.tenantId,
        lead_id: data.leadId || null,
        client_id: data.clientId || null,
        recipient_name: data.recipientName,
        recipient_email: data.recipientEmail,
        plan_id: data.planId,
        billing_cycle: data.billingCycle,
        equipment_count: data.equipmentCount,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        status: 'SENT',
        valid_until: data.validUntil || null,
        created_by: data.createdBy || null,
      })
      .returning();

    const created = result[0];
    const full = await this.findQuotationById(created.id, data.tenantId);
    return full || (created as unknown as Quotation);
  }

  /**
   * Retrieves a single quotation by UUID joined with plan and creator metadata.
   *
   * @param id - Quotation UUID
   * @param tenantId - Optional tenant UUID
   * @returns Quotation entity or null
   */
  async findQuotationById(id: string, tenantId?: string): Promise<Quotation | null> {
    if (!id || !isUuid(id)) return null;

    let sqlQuery = `
      SELECT 
        q.*,
        p.name as raw_plan_name,
        u.name as created_by_name
      FROM quotations q
      LEFT JOIN plans p ON q.plan_id = p.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = $1
    `;
    const params: unknown[] = [id];

    if (tenantId) {
      sqlQuery += ' AND q.tenant_id = $2';
      params.push(tenantId);
    }

    const res = await pool.query(sqlQuery, params);
    if (!res.rows || res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      quotation_number: row.quotation_number,
      tenant_id: row.tenant_id,
      lead_id: row.lead_id,
      client_id: row.client_id,
      recipient_name: row.recipient_name,
      recipient_email: row.recipient_email,
      plan_id: row.plan_id,
      plan_name: typeof row.raw_plan_name === 'object' && row.raw_plan_name !== null
        ? (row.raw_plan_name.en_US || row.raw_plan_name.es_DO || Object.values(row.raw_plan_name)[0])
        : row.raw_plan_name || row.plan_id,
      billing_cycle: row.billing_cycle,
      equipment_count: Number(row.equipment_count || 1),
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total: Number(row.total || 0),
      status: row.status as QuotationStatus,
      valid_until: row.valid_until ? new Date(row.valid_until) : null,
      sent_at: new Date(row.sent_at),
      last_reminder_sent_at: row.last_reminder_sent_at ? new Date(row.last_reminder_sent_at) : null,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: new Date(row.created_at),
    };
  }

  /**
   * Retrieves all quotations linked to a specific lead UUID.
   *
   * @param leadId - Lead UUID
   * @param tenantId - Tenant UUID
   * @returns Array of Quotation entities
   */
  async findByLead(leadId: string, tenantId: string): Promise<Quotation[]> {
    if (!leadId || !isUuid(leadId)) return [];

    const sqlQuery = `
      SELECT 
        q.*,
        p.name as raw_plan_name,
        u.name as created_by_name
      FROM quotations q
      LEFT JOIN plans p ON q.plan_id = p.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.lead_id = $1 AND q.tenant_id = $2
      ORDER BY q.created_at DESC
    `;

    const res = await pool.query(sqlQuery, [leadId, tenantId]);
    return res.rows.map((row) => ({
      id: row.id,
      quotation_number: row.quotation_number,
      tenant_id: row.tenant_id,
      lead_id: row.lead_id,
      client_id: row.client_id,
      recipient_name: row.recipient_name,
      recipient_email: row.recipient_email,
      plan_id: row.plan_id,
      plan_name: typeof row.raw_plan_name === 'object' && row.raw_plan_name !== null
        ? (row.raw_plan_name.en_US || row.raw_plan_name.es_DO || Object.values(row.raw_plan_name)[0])
        : row.raw_plan_name || row.plan_id,
      billing_cycle: row.billing_cycle,
      equipment_count: Number(row.equipment_count || 1),
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total: Number(row.total || 0),
      status: row.status as QuotationStatus,
      valid_until: row.valid_until ? new Date(row.valid_until) : null,
      sent_at: new Date(row.sent_at),
      last_reminder_sent_at: row.last_reminder_sent_at ? new Date(row.last_reminder_sent_at) : null,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: new Date(row.created_at),
    }));
  }

  /**
   * Updates the last_reminder_sent_at timestamp to now.
   *
   * @param id - Quotation UUID
   * @param tenantId - Tenant UUID
   */
  async updateReminderTimestamp(id: string, tenantId: string): Promise<void> {
    await db
      .update(quotations)
      .set({
        last_reminder_sent_at: new Date(),
      })
      .where(and(eq(quotations.id, id), eq(quotations.tenant_id, tenantId)));
  }

  /**
   * Updates quotation status (e.g. SENT, ACCEPTED, DECLINED, EXPIRED).
   *
   * @param id - Quotation UUID
   * @param status - Target QuotationStatus
   * @param tenantId - Tenant UUID
   */
  async updateQuotationStatus(id: string, status: QuotationStatus, tenantId: string): Promise<void> {
    await db
      .update(quotations)
      .set({
        status,
      })
      .where(and(eq(quotations.id, id), eq(quotations.tenant_id, tenantId)));
  }
}

export const quotationRepository = new QuotationRepository();
