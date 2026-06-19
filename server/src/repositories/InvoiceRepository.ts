import { BaseRepository } from './BaseRepository';
import { Invoice, InvoiceStatus } from '../types';

export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor() {
    super('invoices');
  }

  async findByTenant(tenantId: string, limit = 20, offset = 0): Promise<Invoice[]> {
    return this.query<Invoice>(
      'SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY invoice_date DESC LIMIT $2 OFFSET $3',
      [tenantId, limit, offset],
    );
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.queryOne<Invoice>(
      'SELECT * FROM invoices WHERE invoice_number = $1',
      [invoiceNumber],
    );
  }

  async create(data: {
    invoice_number: string;
    client_id: string;
    amount: number;
    tax_amount: number;
    total: number;
    due_date: Date;
    tenant_id: string;
  }): Promise<Invoice> {
    const result = await this.queryOne<Invoice>(
      `INSERT INTO invoices (invoice_number, client_id, amount, tax_amount, total, due_date, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.invoice_number,
        data.client_id,
        data.amount,
        data.tax_amount,
        data.total,
        data.due_date,
        data.tenant_id,
      ],
    );
    return result!;
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice | null> {
    return this.queryOne<Invoice>(
      'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.count('tenant_id = $1', [tenantId]);
  }
}

export const invoiceRepository = new InvoiceRepository();
