import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Invoice, InvoiceStatus } from '@shared/types';
import { db, invoices } from '@shared/db';
import { eq, desc, count, inArray } from 'drizzle-orm';

export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor() {
    super(invoices, 'invoices');
  }

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

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    const results = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoice_number, invoiceNumber));
    return (results[0] as Invoice) || null;
  }

  async create(data: {
    invoice_number: string;
    client_id: string;
    amount: number;
    tax_amount: number;
    total: number;
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
        due_date: data.due_date,
        tenant_id: data.tenant_id,
        status: data.status,
        last_email_sent_at: data.last_email_sent_at,
      })
      .returning();
    return results[0] as Invoice;
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice | null> {
    const results = await db
      .update(invoices)
      .set({ status })
      .where(eq(invoices.id, id))
      .returning();
    return (results[0] as Invoice) || null;
  }

  async updateLastEmailSentAt(id: string, sentAt: Date): Promise<Invoice | null> {
    const results = await db
      .update(invoices)
      .set({ last_email_sent_at: sentAt })
      .where(eq(invoices.id, id))
      .returning();
    return (results[0] as Invoice) || null;
  }

  async findPendingDueInvoices(): Promise<Invoice[]> {
    const results = await db
      .select()
      .from(invoices)
      .where(inArray(invoices.status, [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE]))
      .orderBy(desc(invoices.created_at));
    return results as Invoice[];
  }

  async countByTenant(tenantId: string): Promise<number> {
    const results = await db
      .select({ val: count() })
      .from(invoices)
      .where(eq(invoices.tenant_id, tenantId));
    return results[0]?.val ?? 0;
  }

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
