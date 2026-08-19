import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions';
import { InvoicePdfService, invoicePdfService } from '@modules/billing/services/InvoicePdfService';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing/services/InvoiceNotificationService';
import { InvoiceAccessPolicy, invoiceAccessPolicy } from '@shared/policies/InvoiceAccessPolicy';
import { AppError } from '@shared/utils/AppError';
import { logger } from '@shared/utils/logger';
import { Invoice, UserRole, InvoiceStatus, SubscriptionStatus } from '@shared/types';

export interface EnrichedInvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export type EnrichedInvoice = Invoice & { line_items?: EnrichedInvoiceLineItem[] };

export class InvoiceManagementService {
  constructor(
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private pdfService: InvoicePdfService = invoicePdfService,
    private notifService: InvoiceNotificationService = invoiceNotificationService,
    private accessPolicy: InvoiceAccessPolicy = invoiceAccessPolicy
  ) {}

  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw AppError.notFound('Invoice not found');
    this.accessPolicy.assertAccess(invoice, tenantId, userRole);
    return invoice;
  }

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
        const qty = bestMatch.equipment_count || 1;
        return {
          ...inv,
          line_items: [
            {
              description: bestMatch.service_name,
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

  async cancelInvoice(id: string, tenantId: string, userRole: UserRole, userId: string, reason?: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);

    if (invoice.status === InvoiceStatus.PAID) {
      throw AppError.badRequest('Cannot cancel an already paid invoice');
    }
    if (invoice.status === InvoiceStatus.CANCELLED) {
      return invoice;
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(id, InvoiceStatus.CANCELLED);
    if (!updatedInvoice) {
      throw AppError.internal('Failed to update invoice status in database');
    }

    await this.cancelRelatedSubscriptionIfExpired(invoice);
    await this.notifService.notifyInvoiceCancelled(invoice, userId, userRole, reason);

    return updatedInvoice;
  }

  private async cancelRelatedSubscriptionIfExpired(invoice: Invoice): Promise<void> {
    try {
      const clientSubs = await this.subscriptionRepo.findByClient(invoice.client_id, invoice.tenant_id);
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
        await this.subscriptionRepo.updateStatus(bestMatch.id, SubscriptionStatus.CANCELLED);
      }
    } catch (err) {
      logger.error('Failed to cancel related subscription for cancelled invoice:', err);
    }
  }

  async downloadInvoice(id: string, tenantId: string, userRole: UserRole, lang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    return this.pdfService.generatePdf(invoice, lang);
  }
}

export const invoiceManagementService = new InvoiceManagementService();
