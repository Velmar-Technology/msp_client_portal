import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { SubscriptionRepository, subscriptionRepository, PlanRepository, planRepository } from '@modules/subscriptions';
import { InvoicePdfService, invoicePdfService } from '@modules/billing/services/InvoicePdfService';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing/services/InvoiceNotificationService';
import { InvoiceAccessPolicy, invoiceAccessPolicy } from '@shared/policies/InvoiceAccessPolicy';
import { NotFoundError, ValidationError, InternalServerError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { Invoice, UserRole, InvoiceStatus, SubscriptionStatus } from '@shared/types';

export interface EnrichedInvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export type EnrichedInvoice = Invoice & { line_items?: EnrichedInvoiceLineItem[] };

/**
 * Domain service managing invoice retrieval, line item dynamic enrichment, cancellation workflows, and PDF downloads.
 */
export class InvoiceManagementService {
  /**
   * Initializes InvoiceManagementService with repository, PDF, notification, and policy dependencies.
   *
   * @param invoiceRepo - Invoice repository
   * @param subscriptionRepo - Subscription repository
   * @param pdfService - Invoice PDF generator service
   * @param notifService - Invoice notification service
   * @param accessPolicy - Invoice access policy
   * @param planRepo - Plan repository
   */
  constructor(
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private pdfService: InvoicePdfService = invoicePdfService,
    private notifService: InvoiceNotificationService = invoiceNotificationService,
    private accessPolicy: InvoiceAccessPolicy = invoiceAccessPolicy,
    private planRepo: PlanRepository = planRepository
  ) {}

  private get subRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  private get planRepository(): PlanRepository {
    return this.planRepo || planRepository;
  }

  /**
   * Retrieves an invoice by UUID with multi-tenant access policy verification.
   *
   * @param id - Invoice UUID
   * @param tenantId - Calling user's tenant UUID
   * @param userRole - Calling user's role
   * @returns Authorized Invoice entity
   * @throws {NotFoundError} When invoice does not exist
   * @throws {ForbiddenError} When tenant access is disallowed
   */
  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    this.accessPolicy.assertAccess(invoice, tenantId, userRole);
    return invoice;
  }

  /**
   * Retrieves paginated invoices enriched with matched subscription line items.
   *
   * @param tenantId - Calling user tenant UUID
   * @param userRole - Calling user role
   * @param page - Page number
   * @param limit - Page size
   * @returns Object with enriched invoices array and total count
   */
  async getClientInvoices(
    tenantId: string,
    userRole: UserRole,
    page = 1,
    limit = 20
  ): Promise<{ invoices: EnrichedInvoice[]; total: number }> {
    const offset = (page - 1) * limit;
    const isAdmin = userRole === UserRole.ADMIN;

    const rawInvoices = isAdmin
      ? await this.invoiceRepo.findAll(limit, offset)
      : await this.invoiceRepo.findByTenant(tenantId, limit, offset);

    const total = isAdmin
      ? await this.invoiceRepo.count()
      : await this.invoiceRepo.countByTenant(tenantId);

    const enriched = await Promise.all(rawInvoices.map((inv) => this.enrichInvoiceWithLineItems(inv)));
    return { invoices: enriched, total };
  }

  /**
   * Dynamically calculates and attaches descriptive line items by matching client subscription history.
   *
   * @param inv - Raw Invoice entity
   * @returns Enriched invoice with line_items
   */
  private async enrichInvoiceWithLineItems(inv: Invoice): Promise<EnrichedInvoice> {
    try {
      const subs = await this.subscriptionRepo.findByClient(inv.client_id, inv.tenant_id);
      const invCreatedAt = new Date(inv.created_at || inv.invoice_date).getTime();
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
            planName = (plan.name as Record<string, string>)['en_US'] || (plan.name as Record<string, string>)['es_DO'] || bestMatch.service_name;
          } else if (typeof plan.name === 'string') {
            planName = plan.name;
          }

          if (typeof plan.description === 'object' && plan.description !== null) {
            productDesc = (plan.description as Record<string, string>)['en_US'] || (plan.description as Record<string, string>)['es_DO'] || '';
          } else if (typeof plan.description === 'string') {
            productDesc = plan.description;
          }
        }

        const fullDesc = productDesc
          ? `${planName} — ${productDesc}`
          : `${planName} (${bestMatch.plan.toUpperCase()} Plan)`;

        const qty = bestMatch.equipment_count || 1;
        return {
          ...inv,
          line_items: [
            {
              description: fullDesc,
              quantity: qty,
              unit_price: Number(inv.amount) / qty,
            },
          ],
        };
      }
    } catch (err) {
      logger.warn(`Could not enrich invoice ${inv.id} line items`, { err });
    }
    return inv;
  }

  /**
   * Cancels an unpaid invoice, cancelling any linked expired subscriptions and dispatching cancellation alerts.
   *
   * @param id - Invoice UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @param userId - Calling user ID
   * @param reason - Optional cancellation reason
   * @returns Cancelled invoice entity
   * @throws {ValidationError} When invoice is already paid
   * @throws {InternalServerError} When database update fails
   */
  async cancelInvoice(id: string, tenantId: string, userRole: UserRole, userId: string, reason?: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ValidationError('Cannot cancel an already paid invoice');
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      return invoice;
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(id, InvoiceStatus.CANCELLED);
    if (!updatedInvoice) {
      throw new InternalServerError('Failed to update invoice status in database');
    }

    await this.cancelRelatedSubscriptionIfExpired(invoice);
    await this.notifService.notifyInvoiceCancelled(invoice, userId, userRole, reason);

    return updatedInvoice;
  }

  /**
   * Helper cascading invoice cancellation to expired subscription contracts.
   *
   * @param invoice - Cancelled invoice
   */
  private async cancelRelatedSubscriptionIfExpired(invoice: Invoice): Promise<void> {
    try {
      const clientSubs = await this.subRepo.findByClient(invoice.client_id, invoice.tenant_id);
      const invCreatedAt = new Date(invoice.created_at || invoice.invoice_date).getTime();
      let bestMatch = clientSubs[0];
      let bestDiff = Infinity;
      for (const sub of clientSubs) {
        if (sub.status !== SubscriptionStatus.EXPIRED) continue;
        const subCreatedAt = new Date(sub.created_at || '').getTime();
        const diff = Math.abs(subCreatedAt - invCreatedAt);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = sub;
        }
      }
      if (bestMatch && bestMatch.status === SubscriptionStatus.EXPIRED) {
        await this.subRepo.updateStatus(bestMatch.id, SubscriptionStatus.CANCELLED);
      }
    } catch (err) {
      logger.error('Failed to cancel related subscription for cancelled invoice:', err);
    }
  }

  /**
   * Renders and streams the binary PDF for an authorized invoice.
   *
   * @param id - Invoice UUID
   * @param tenantId - Tenant UUID
   * @param userRole - Calling user role
   * @param lang - Optional language code
   * @returns Object containing PDF buffer and invoice number
   */
  async downloadInvoice(id: string, tenantId: string, userRole: UserRole, lang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    const enriched = await this.enrichInvoiceWithLineItems(invoice);
    return this.pdfService.generatePdf(enriched, lang);
  }
}

export const invoiceManagementService = new InvoiceManagementService();
