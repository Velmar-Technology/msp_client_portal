import { Invoice, UserRole } from '@shared/types';
import { userRepository, UserRepository } from '@modules/auth';
import { invoiceRepository, InvoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { notificationService, NotificationService } from '@modules/notifications';
import { sendInvoiceDueEmail } from '@shared/utils/emailService';
import { logger } from '@shared/utils/logger';

/**
 * Domain service dispatching in-app alerts and anti-spam throttled email reminders for invoice lifecycle events.
 */
export class InvoiceNotificationService {
  /** Minimum interval (3 days in milliseconds) enforced between recurring payment reminder emails. */
  readonly MIN_NOTIFICATION_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

  /**
   * Initializes InvoiceNotificationService with user repository, invoice repository, and notification service dependencies.
   *
   * @param userRepo - User repository
   * @param invoiceRepo - Invoice repository
   * @param notifService - In-app notification service
   */
  constructor(
    private userRepo: UserRepository = userRepository,
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private notifService: NotificationService = notificationService,
  ) {}

  /**
   * Dispatches in-app notifications to client and all administrators after an online payment is received.
   *
   * @param invoice - Paid invoice entity
   */
  async notifyPaymentReceived(invoice: Invoice): Promise<void> {
    await this.notifService.createInAppNotification({
      userId: invoice.client_id,
      title: 'Payment Received',
      message: `Your payment of $${Number(invoice.total).toFixed(2)} for invoice ${invoice.invoice_number} has been processed successfully.`,
      link: '/billing',
      type: 'INVOICE_PAID',
      tenantId: invoice.tenant_id,
    });

    try {
      const adminUsers = await this.userRepo.findByRole(UserRole.ADMIN);
      const clientUser = await this.userRepo.findById(invoice.client_id);
      const clientName = clientUser?.name || 'A customer';
      for (const admin of adminUsers) {
        await this.notifService.createInAppNotification({
          userId: admin.id,
          title: 'Invoice Payment Received',
          message: `${clientName} paid $${Number(invoice.total).toFixed(2)} for invoice ${invoice.invoice_number}.`,
          link: '/billing',
          type: 'INVOICE_PAID_ADMIN',
          tenantId: invoice.tenant_id,
        });
      }
    } catch (err) {
      logger.error('Failed to notify admin of payment success:', err);
    }
  }

  /**
   * Dispatches in-app confirmation notifications after an administrator manually confirms payment.
   *
   * @param invoice - Paid invoice entity
   */
  async notifyManualPaymentConfirmed(invoice: Invoice): Promise<void> {
    await this.notifService.createInAppNotification({
      userId: invoice.client_id,
      title: 'Payment Confirmed',
      message: `Your payment of $${Number(invoice.total).toFixed(2)} for invoice ${invoice.invoice_number} has been confirmed.`,
      link: '/billing',
      type: 'INVOICE_PAID',
      tenantId: invoice.tenant_id,
    });

    try {
      const adminUsers = await this.userRepo.findByRole(UserRole.ADMIN);
      const clientUser = await this.userRepo.findById(invoice.client_id);
      const clientName = clientUser?.name || 'A customer';
      for (const admin of adminUsers) {
        await this.notifService.createInAppNotification({
          userId: admin.id,
          title: 'Invoice Payment Confirmed',
          message: `Invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)}) for ${clientName} was marked as paid.`,
          link: '/billing',
          type: 'INVOICE_PAID_ADMIN',
          tenantId: invoice.tenant_id,
        });
      }
    } catch (err) {
      logger.error('Failed to notify admins of manual payment confirmation:', err);
    }
  }

  /**
   * Dispatches notifications when an invoice is cancelled.
   *
   * @param invoice - Cancelled invoice entity
   * @param userId - Initiating user ID
   * @param userRole - Initiating user role
   * @param reason - Optional cancellation reason
   */
  async notifyInvoiceCancelled(invoice: Invoice, userId: string, userRole: UserRole, reason?: string): Promise<void> {
    const reasonSuffix = reason ? ` Reason: ${reason}` : '';
    await this.notifService.createInAppNotification({
      userId: invoice.client_id,
      title: 'Invoice Cancelled',
      message: `Invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)}) has been cancelled.${reasonSuffix}`,
      link: '/billing',
      type: 'INVOICE_CANCELLED',
      tenantId: invoice.tenant_id,
    }).catch((err) => {
      logger.error('Failed to send invoice cancellation notification to client:', err);
    });

    if (userRole !== UserRole.ADMIN) {
      try {
        const adminUsers = await this.userRepo.findByRole(UserRole.ADMIN);
        const clientUser = await this.userRepo.findById(userId);
        const clientName = clientUser?.name || 'A customer';
        for (const admin of adminUsers) {
          await this.notifService.createInAppNotification({
            userId: admin.id,
            title: 'Invoice Cancelled by Client',
            message: `${clientName} cancelled invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)}).${reasonSuffix}`,
            link: '/billing',
            type: 'INVOICE_CANCELLED_ADMIN',
            tenantId: invoice.tenant_id,
          });
        }
      } catch (err) {
        logger.error('Failed to notify admins of invoice cancellation:', err);
      }
    }
  }

  /**
   * Checks whether an invoice reminder email can be sent based on 3-day minimum interval anti-spam rules.
   *
   * @param lastSentAt - Date/timestamp of previous email
   * @param now - Current reference timestamp
   * @returns True if eligible for new email
   */
  isEligibleForEmailNotification(lastSentAt: Date | string | null | undefined, now = new Date()): boolean {
    if (!lastSentAt) return true;
    const lastSentMs = new Date(lastSentAt).getTime();
    return (now.getTime() - lastSentMs) >= this.MIN_NOTIFICATION_INTERVAL_MS;
  }

  /**
   * Evaluates and sends an email payment reminder for an unpaid due invoice, updating last_email_sent_at.
   *
   * @param invoice - Invoice entity
   * @param now - Current reference timestamp
   * @returns True if email was successfully sent
   */
  async processDueInvoiceEmailNotification(invoice: Invoice, now = new Date()): Promise<boolean> {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      return false;
    }

    if (!this.isEligibleForEmailNotification(invoice.last_email_sent_at, now)) {
      return false;
    }

    const client = await this.userRepo.findById(invoice.client_id);
    if (!client || !client.email) {
      logger.warn(`Could not send due email for invoice ${invoice.id}: Client email not found`);
      return false;
    }

    await sendInvoiceDueEmail(client.email, client.name, invoice, client.language || 'en_US');
    await this.invoiceRepo.updateLastEmailSentAt(invoice.id, now);

    logger.info(`Due payment email notification successfully sent for invoice ${invoice.invoice_number} to ${client.email}`);
    return true;
  }

  /**
   * Sweeps all pending overdue/due invoices and sends eligible email reminders.
   *
   * @param now - Current reference timestamp
   * @returns Total number of emails sent
   */
  async checkAndSendDueInvoiceNotifications(now = new Date()): Promise<number> {
    const pendingInvoices = await this.invoiceRepo.findPendingDueInvoices();
    let sentCount = 0;

    for (const inv of pendingInvoices) {
      try {
        const sent = await this.processDueInvoiceEmailNotification(inv, now);
        if (sent) sentCount++;
      } catch (err) {
        logger.error(`Error processing due email notification for invoice ${inv.id}`, { err });
      }
    }

    return sentCount;
  }
}

export const invoiceNotificationService = new InvoiceNotificationService();
