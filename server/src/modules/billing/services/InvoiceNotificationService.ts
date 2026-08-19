import { Invoice, UserRole } from '@shared/types';
import { userRepository, UserRepository } from '@modules/auth/repositories/UserRepository';
import { invoiceRepository, InvoiceRepository } from '@modules/billing/repositories/InvoiceRepository';
import { notificationService, NotificationService } from '@modules/notifications/services/NotificationService';
import { sendInvoiceDueEmail } from '@shared/utils/emailService';
import { logger } from '@shared/utils/logger';

export class InvoiceNotificationService {
  readonly MIN_NOTIFICATION_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

  constructor(
    private userRepo: UserRepository = userRepository,
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private notifService: NotificationService = notificationService,
  ) {}

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

  isEligibleForEmailNotification(lastSentAt: Date | string | null | undefined, now = new Date()): boolean {
    if (!lastSentAt) return true;
    const lastSentMs = new Date(lastSentAt).getTime();
    return (now.getTime() - lastSentMs) >= this.MIN_NOTIFICATION_INTERVAL_MS;
  }

  async processDueInvoiceEmailNotification(invoice: Invoice, now = new Date()): Promise<boolean> {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      return false;
    }

    if (!this.isEligibleForEmailNotification(invoice.last_email_sent_at, now)) {
      logger.info(`Skipped email reminder for invoice ${invoice.invoice_number}: Notification sent within the last 3 days.`, {
        invoiceId: invoice.id,
        lastSentAt: invoice.last_email_sent_at,
      });
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
