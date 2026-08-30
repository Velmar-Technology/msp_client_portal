import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Invoice, InvoiceStatus } from '@shared/types';
import { db, invoices } from '@shared/db';
import { eq, desc, count, inArray } from 'drizzle-orm';

/**
 * Data repository for client invoices, lifecycle statuses, anti-spam email timestamps, and financial stats queries.
 */
export class InvoiceRepository extends BaseRepository<Invoice> {
  /**
   * Initializes InvoiceRepository for the invoices database table.
   */
  constructor() {
    super(invoices, 'invoices');
  }

  /**
   * Retrieves paginated invoices belonging to a specific tenant organization.
   *
   * @param tenantId - Tenant UUID
   * @param limit - Page size
   * @param offset - Offset index
   * @returns Array of Invoice entities
   */
  async findByTenant(tenantId: string, limit = 20, offset = 0): Promise<Invoice[]> {
    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.tenant_id, tenantId))
      .orderBy(desc(invoices.created_at))
      .limit(limit)
      .offset(offset);
    return results as Invoice[];
  }

  /**
   * Finds an invoice by its unique formatted invoice number (e.g. `INV-2025-123456`).
   *
   * @param invoiceNumber - Unique invoice string identifier
   * @returns Invoice entity or null if not found
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoice_number, invoiceNumber));
    return (results[0] as Invoice) || null;
  }

  /**
   * Inserts a new invoice record into the database.
   *
   * @param data - Invoice record attributes
   * @returns Created Invoice entity
   */
  async create(data: {
    invoice_number: string;
    client_id: string;
    amount: number;
    tax_amount: number;
    total: number;
    currency?: string;
    ncf?: string | null;
    rnc?: string | null;
    due_date: Date;
    tenant_id: string;
    status?: InvoiceStatus;
    last_email_sent_at?: Date | null;
  }): Promise<Invoice> {
    const results = await db
      .insert(invoices)
      .values({
        invoice_number: data.invoice_number,
        client_id: data.client_id,
        amount: data.amount,
        tax_amount: data.tax_amount,
        total: data.total,
        currency: data.currency || 'USD',
        ncf: data.ncf,
        rnc: data.rnc,
        due_date: data.due_date,
        tenant_id: data.tenant_id,
        status: data.status,
        last_email_sent_at: data.last_email_sent_at,
      })
      .returning();
    return results[0] as Invoice;
  }

  /**
   * Updates the lifecycle status of an invoice.
   *
   * @param id - Invoice UUID
   * @param status - Target InvoiceStatus
   * @returns Updated Invoice entity or null
   */
  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice | null> {
    const results = await db
      .update(invoices)
      .set({ status })
      .where(eq(invoices.id, id))
      .returning();
    return (results[0] as Invoice) || null;
  }

  /**
   * Updates the timestamp when a reminder email was last sent for this invoice.
   *
   * @param id - Invoice UUID
   * @param sentAt - Timestamp of email delivery
   * @returns Updated Invoice entity or null
   */
  async updateLastEmailSentAt(id: string, sentAt: Date): Promise<Invoice | null> {
    const results = await db
      .update(invoices)
      .set({ last_email_sent_at: sentAt })
      .where(eq(invoices.id, id))
      .returning();
    return (results[0] as Invoice) || null;
  }

  /**
   * Finds all pending or overdue invoices for notification sweep processing.
   *
   * @returns Array of unpaid invoices
   */
  async findPendingDueInvoices(): Promise<Invoice[]> {
    const results = await db
      .select()
      .from(invoices)
      .where(inArray(invoices.status, [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
      .orderBy(desc(invoices.created_at));
    return results as Invoice[];
  }

  /**
   * Counts the total number of invoices for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Count of invoices
   */
  async countByTenant(tenantId: string): Promise<number> {
    const results = await db
      .select({ val: count() })
      .from(invoices)
      .where(eq(invoices.tenant_id, tenantId));
    return results[0]?.val ?? 0;
  }

  /**
   * Finds an invoice by its issued NCF fiscal number.
   *
   * @param ncf - NCF fiscal voucher number
   * @returns Matching Invoice or null
   */
  async findByNcf(ncf: string): Promise<Invoice | null> {
    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.ncf, ncf));
    return (results[0] as Invoice) || null;
  }

  /**
   * Retrieves the most recently created NCF series B01 voucher string.
   *
   * @returns Latest NCF string or null
   */
  async findLatestNcf(): Promise<string | null> {
    const results = await db
      .select({ ncf: invoices.ncf })
      .from(invoices)
      .orderBy(desc(invoices.ncf))
      .limit(10);
    const valid = results.find((r) => r.ncf && r.ncf.startsWith('B01'));
    return valid?.ncf ?? null;
  }

  /**
   * Retrieves all invoices for a specific client user.
   *
   * @param clientId - Client user UUID
   * @param tenantId - Optional tenant organization UUID
   * @returns Array of Invoice entities
   */
  async findByClient(clientId: string, tenantId?: string): Promise<Invoice[]> {
    if (tenantId) {
      const results = await db
        .select()
        .from(invoices)
        .where(eq(invoices.client_id, clientId))
        .orderBy(desc(invoices.created_at));
      return (results as Invoice[]).filter((inv) => inv.tenant_id === tenantId);
    }
    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.client_id, clientId))
      .orderBy(desc(invoices.created_at));
    return results as Invoice[];
  }

  /**
   * Retrieves all overdue/pending invoices across all tenants or for a specific tenant.
   *
   * @param tenantId - Optional tenant organization UUID
   * @returns Array of unpaid invoices
   */
  async findOverdueInvoices(tenantId?: string): Promise<Invoice[]> {
    if (tenantId) {
      const results = await db
        .select()
        .from(invoices)
        .where(inArray(invoices.status, [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
        .orderBy(desc(invoices.due_date));
      return (results as Invoice[]).filter((inv) => inv.tenant_id === tenantId);
    }
    const results = await db
      .select()
      .from(invoices)
      .where(inArray(invoices.status, [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
      .orderBy(desc(invoices.due_date));
    return results as Invoice[];
  }

  /**
   * Retrieves all invoices ordered by date for financial analytics and KPI aggregations.
   *
   * @param tenantId - Optional tenant UUID filter
   * @returns Array of Invoice entities
   */
  async getAllForStats(tenantId?: string): Promise<Invoice[]> {
    if (tenantId) {
      return (await db
        .select()
        .from(invoices)
        .where(eq(invoices.tenant_id, tenantId))
        .orderBy(desc(invoices.created_at))) as Invoice[];
    }
    return (await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.created_at))) as Invoice[];
  }
}

export const invoiceRepository = new InvoiceRepository();

