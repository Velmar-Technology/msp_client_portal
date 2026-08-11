import { generateInvoicePdf } from '../utils/pdfGenerator';
import { userRepository, UserRepository } from '../repositories/UserRepository';
import { tenantRepository, TenantRepository } from '../repositories/TenantRepository';
import { AppError } from '../utils/AppError';
import { Invoice } from '../types';

export class InvoicePdfService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private tenantRepo: TenantRepository = tenantRepository,
  ) {}

  async generatePdf(invoice: Invoice, preferredLang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const client = await this.userRepo.findById(invoice.client_id);
    if (!client) throw AppError.notFound('Client not found');

    const tenant = await this.tenantRepo.findById(invoice.tenant_id);
    if (!tenant) throw AppError.notFound('Tenant not found');

    const finalLang = preferredLang || client.language || 'en_US';

    const pdfBuffer = generateInvoicePdf(
      invoice,
      client.name,
      client.email,
      tenant.name,
      finalLang
    );

    return {
      pdfBuffer,
      invoiceNumber: invoice.invoice_number,
    };
  }
}

export const invoicePdfService = new InvoicePdfService();
