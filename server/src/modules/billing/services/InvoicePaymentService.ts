import { InvoiceRepository, invoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions';
import { PaypalService, paypalService } from '@modules/billing/services/PaypalService';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing/services/InvoiceNotificationService';
import { NonPaymentSuspensionService, nonPaymentSuspensionService } from '@modules/billing/services/NonPaymentSuspensionService';
import { InvoiceAccessPolicy, invoiceAccessPolicy } from '@shared/policies/InvoiceAccessPolicy';
import { ValidationError, InternalServerError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { Invoice, InvoiceStatus, SubscriptionStatus, UserRole } from '@shared/types';

/**
 * Domain service managing invoice payment captures via PayPal or manual admin confirmation,
 * activating linked client subscriptions upon successful settlement, and restoring accounts from suspension.
 *
 * @see BL-401 (Subscription Reactivation upon Payment)
 * @see Section 9.3 (Account Restoration upon Non-Payment Settlement)
 */
export class InvoicePaymentService {
  /**
   * Initializes InvoicePaymentService with invoice, subscription, paypal, notification, and policy dependencies.
   *
   * @param invoiceRepo - Invoice repository
   * @param subscriptionRepo - Subscription repository
   * @param paypalSvc - PayPal integration service
   * @param notifService - Invoice notification service
   * @param accessPolicy - Invoice access policy
   * @param nonPaymentSvc - Non-payment suspension service
   */
  constructor(
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private paypalSvc: PaypalService = paypalService,
    private notifService: InvoiceNotificationService = invoiceNotificationService,
    private accessPolicy: InvoiceAccessPolicy = invoiceAccessPolicy,
    private nonPaymentSvc: NonPaymentSuspensionService = nonPaymentSuspensionService
  ) {}

  private get subRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  /**
   * Re-activates any EXPIRED subscriptions for the client after invoice settlement (BL-401).
   *
   * @param clientId - Client user UUID
   * @param tenantId - Tenant UUID
   * @see BL-401
   */
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

  /**
   * Generates a PayPal checkout order for an unpaid invoice.
   *
   * @param invoice - Invoice entity
   * @returns Object with PayPal order ID
   * @throws {ValidationError} When invoice is already paid
   */
  async createPaypalOrder(invoice: Invoice): Promise<{ orderId: string }> {
    if (invoice.status === InvoiceStatus.PAID) {
      throw new ValidationError('Invoice is already paid');
    }
    const order = await this.paypalSvc.createOrder(invoice);
    return { orderId: order.id };
  }

  /**
   * Captures an approved PayPal order, transitions the invoice to PAID, reactivates expired subscriptions, and dispatches receipt emails.
   *
   * @param invoice - Target invoice entity
   * @param paypalOrderId - PayPal order ID to capture
   * @returns Updated Invoice entity
   * @throws {ValidationError} When PayPal capture status is not COMPLETED
   * @throws {InternalServerError} When database status update fails
   * @see BL-401
   */
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
    await this.nonPaymentSvc.restoreAccountIfPaid(invoice.client_id, invoice.tenant_id);
    await this.notifService.notifyPaymentReceived(invoice);

    return updatedInvoice;
  }

  /**
   * Manually marks an invoice as PAID (e.g. for wire transfers or cash payments).
   *
   * @param invoice - Target invoice entity
   * @param userRole - Calling user's role (must be ADMIN)
   * @returns Updated Invoice entity
   * @throws {ForbiddenError} When user is not an administrator
   * @throws {InternalServerError} When database update fails
   * @see BL-401
   */
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
    await this.nonPaymentSvc.restoreAccountIfPaid(invoice.client_id, invoice.tenant_id);
    await this.notifService.notifyManualPaymentConfirmed(invoice);

    return updatedInvoice;
  }
}

export const invoicePaymentService = new InvoicePaymentService();
