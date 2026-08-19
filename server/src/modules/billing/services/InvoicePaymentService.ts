import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions';
import { PaypalService, paypalService } from '@modules/billing/services/PaypalService';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing/services/InvoiceNotificationService';
import { InvoiceAccessPolicy, invoiceAccessPolicy } from '@shared/policies/InvoiceAccessPolicy';
import { ValidationError, InternalServerError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { Invoice, InvoiceStatus, SubscriptionStatus, UserRole } from '@shared/types';

export class InvoicePaymentService {
  constructor(
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private paypalSvc: PaypalService = paypalService,
    private notifService: InvoiceNotificationService = invoiceNotificationService,
    private accessPolicy: InvoiceAccessPolicy = invoiceAccessPolicy
  ) {}

  private get subRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  private async activateExpiredSubscriptionsForClient(clientId: string, tenantId: string): Promise<void> {
    try {
      const clientSubs = await this.subRepo.findByClient(clientId, tenantId);
      for (const sub of clientSubs) {
        if (sub.status === SubscriptionStatus.EXPIRED) {
          await this.subRepo.updateStatus(sub.id, SubscriptionStatus.ACTIVE);
        }
      }
    } catch (err) {
      logger.error('Failed to activate expired subscriptions for client:', err);
    }
  }

  async createPaypalOrder(invoice: Invoice): Promise<{ orderId: string }> {
    if (invoice.status === InvoiceStatus.PAID) {
      throw new ValidationError('Invoice is already paid');
    }
    const order = await this.paypalSvc.createOrder(invoice);
    return { orderId: order.id };
  }

  async capturePaypalOrder(invoice: Invoice, paypalOrderId: string): Promise<Invoice> {
    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    const captureResult = await this.paypalSvc.captureOrder(paypalOrderId);
    if (captureResult.status !== 'COMPLETED') {
      throw new ValidationError('PayPal payment was not completed');
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(invoice.id, InvoiceStatus.PAID);
    if (!updatedInvoice) {
      throw new InternalServerError('Failed to update invoice status in database');
    }

    await this.activateExpiredSubscriptionsForClient(invoice.client_id, invoice.tenant_id);
    await this.notifService.notifyPaymentReceived(invoice);

    return updatedInvoice;
  }

  async markAsPaid(invoice: Invoice, userRole: UserRole): Promise<Invoice> {
    this.accessPolicy.assertAdmin(userRole, 'Only administrators can mark invoices as paid manually');

    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    const updatedInvoice = await this.invoiceRepo.updateStatus(invoice.id, InvoiceStatus.PAID);
    if (!updatedInvoice) {
      throw new InternalServerError('Failed to update invoice status in database');
    }

    await this.activateExpiredSubscriptionsForClient(invoice.client_id, invoice.tenant_id);
    await this.notifService.notifyManualPaymentConfirmed(invoice);

    return updatedInvoice;
  }
}

export const invoicePaymentService = new InvoicePaymentService();
