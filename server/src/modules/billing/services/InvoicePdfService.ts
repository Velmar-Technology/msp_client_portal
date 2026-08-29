import { generateInvoicePdf } from '@shared/utils/pdfGenerator';
import { userRepository, UserRepository } from '@modules/auth';
import { tenantRepository, TenantRepository } from '@modules/auth';
import { NotFoundError } from '@shared/errors';
import { Invoice } from '@shared/types';

/**
 * Domain service generating formatted PDF invoices with localized customer/tenant metadata.
 */
export class InvoicePdfService {
  /**
   * Initializes InvoicePdfService with user and tenant repositories.
   *
   * @param userRepo - User repository
   * @param tenantRepo - Tenant repository
   */
  constructor(
    private userRepo: UserRepository = userRepository,
    private tenantRepo: TenantRepository = tenantRepository,
  ) {}

  /**
   * Generates a binary PDF buffer for an invoice in the user's preferred language.
   *
   * @param invoice - Invoice entity
   * @param preferredLang - Optional language override ('en_US' or 'es_DO')
   * @returns Object containing raw PDF buffer and formatted invoice number
   * @throws {NotFoundError} When client user or tenant organization is not found
   */
  async generatePdf(invoice: Invoice, preferredLang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const client = await this.userRepo.findById(invoice.client_id);
    if (!client) throw new NotFoundError('Client not found');

    const tenant = await this.tenantRepo.findById(invoice.tenant_id);
    if (!tenant) throw new NotFoundError('Tenant not found');

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
