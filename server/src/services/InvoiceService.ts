import { invoiceRepository } from '../repositories/InvoiceRepository';
import { AppError } from '../utils/AppError';
import { Invoice, UserRole } from '../types';

export class InvoiceService {
  async getClientInvoices(tenantId: string, page = 1, limit = 20): Promise<{ invoices: Invoice[]; total: number }> {
    const offset = (page - 1) * limit;
    const invoices = await invoiceRepository.findByTenant(tenantId, limit, offset);
    const total = await invoiceRepository.countByTenant(tenantId);
    return { invoices, total };
  }

  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw AppError.notFound('Invoice not found');
    if (userRole === UserRole.CLIENT && invoice.tenant_id !== tenantId) {
      throw AppError.forbidden('Access denied');
    }
    return invoice;
  }
}

export const invoiceService = new InvoiceService();
