import { generateInvoicePdf, CustomerBillingInfo, InvoiceWithLineItems } from '@shared/utils/pdfGenerator';
import { userRepository, UserRepository } from '@modules/auth';
import { tenantRepository, TenantRepository } from '@modules/auth';
import { subscriptionRepository, SubscriptionRepository, planRepository, PlanRepository } from '@modules/subscriptions';
import { NotFoundError } from '@shared/errors';
import { logger } from '@shared/utils/logger';

/**
 * Domain service generating formatted PDF invoices with full customer, tenant, and product plan description metadata.
 */
export class InvoicePdfService {
  /**
   * Initializes InvoicePdfService with user, tenant, subscription, and plan repositories.
   *
   * @param userRepo - User repository for customer account details
   * @param tenantRepo - Tenant repository for organization details
   * @param subscriptionRepo - Subscription repository for service line item resolution
   * @param planRepo - Plan repository for product description resolution
   */
  constructor(
    private userRepo: UserRepository = userRepository,
    private tenantRepo: TenantRepository = tenantRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private planRepo: PlanRepository = planRepository,
  ) {}

  private get subRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  private get planRepository(): PlanRepository {
    return this.planRepo || planRepository;
  }

  /**
   * Generates a binary PDF buffer for an invoice in the user's preferred language,
   * fully populating customer details and dynamic product plan descriptions.
   *
   * @param invoice - Invoice entity with optional line items
   * @param preferredLang - Optional language override ('en_US' or 'es_DO')
   * @returns Object containing raw PDF buffer and formatted invoice number
   * @throws {NotFoundError} When client user or tenant organization is not found
   */
  async generatePdf(
    invoice: InvoiceWithLineItems,
    preferredLang?: string
  ): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const client = await this.userRepo.findById(invoice.client_id);
    if (!client) throw new NotFoundError('Client not found');

    const tenant = await this.tenantRepo.findById(invoice.tenant_id);
    if (!tenant) throw new NotFoundError('Tenant not found');

    const finalLang = preferredLang || client.language || 'en_US';

    // Enrich line items with subscription & product plan descriptions if not provided on invoice
    let lineItems = invoice.line_items;
    if (!lineItems || lineItems.length === 0) {
      try {
        const subs = await this.subRepo.findByClient(invoice.client_id, invoice.tenant_id);
        const invCreatedAt = new Date(invoice.created_at || invoice.invoice_date).getTime();
        let bestMatch = subs[0];
        let bestDiff = Infinity;
        for (const sub of subs) {
          const subCreatedAt = new Date(sub.created_at || '').getTime();
          const diff = Math.abs(subCreatedAt - invCreatedAt);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestMatch = sub;
          }
        }

        if (bestMatch) {
          const plan = await this.planRepository.findById(bestMatch.plan);
          let planName = bestMatch.service_name;
          let productDesc = '';

          if (plan) {
            if (typeof plan.name === 'object' && plan.name !== null) {
              planName = (plan.name as Record<string, string>)[finalLang] || (plan.name as Record<string, string>)['en_US'] || bestMatch.service_name;
            } else if (typeof plan.name === 'string') {
              planName = plan.name;
            }

            if (typeof plan.description === 'object' && plan.description !== null) {
              productDesc = (plan.description as Record<string, string>)[finalLang] || (plan.description as Record<string, string>)['en_US'] || '';
            } else if (typeof plan.description === 'string') {
              productDesc = plan.description;
            }
          }

          const fullItemDescription = productDesc
            ? `${planName} — ${productDesc}`
            : `${planName} (${bestMatch.plan.toUpperCase()} Plan)`;

          const qty = bestMatch.equipment_count || 1;
          lineItems = [
            {
              description: fullItemDescription,
              quantity: qty,
              unit_price: Number(invoice.amount) / qty,
              amount: Number(invoice.amount),
            },
          ];
        }
      } catch (err) {
        logger.warn(`Could not resolve subscription line items for invoice ${invoice.id}`, { err });
      }
    }

    const customerInfo: CustomerBillingInfo = {
      name: client.name,
      email: client.email,
      tenantName: tenant.name,
      phoneNumber: client.phone_number,
      clientType: client.client_type,
      clientId: client.id,
    };

    const pdfBuffer = await generateInvoicePdf(
      {
        ...invoice,
        line_items: lineItems,
      },
      customerInfo,
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
