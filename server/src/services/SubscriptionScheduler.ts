import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { planRepository } from '../repositories/PlanRepository';
import { invoiceRepository } from '../repositories/InvoiceRepository';
import { equipmentRepository } from '../repositories/EquipmentRepository';
import { userRepository } from '../repositories/UserRepository';
import { nextcloudService } from './NextcloudService';
import { paypalService } from './PaypalService';
import { notificationService } from './NotificationService';
import { invoiceService } from './InvoiceService';
import { sendInvoiceDueEmail } from '../utils/emailService';
import { logger } from '../utils/logger';
import { TAX_RATE } from '../config/constants';
import { InvoiceStatus, SubscriptionStatus, Subscription } from '../types';

export class SubscriptionScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start(intervalMs = 15000): void {
    if (this.intervalId) return;

    logger.info('Subscription Scheduler started');
    
    // Run immediately on start, then periodically
    this.checkAndRenewSubscriptions().catch((err) => {
      logger.error('Error during initial subscription check', { err });
    });

    this.intervalId = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.checkAndRenewSubscriptions();
      } catch (err) {
        logger.error('Error in subscription scheduler loop', { err });
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Subscription Scheduler stopped');
    }
  }

  async processSubscriptions(): Promise<void> {
    return this.checkAndRenewSubscriptions();
  }

  async checkAndRenewSubscriptions(): Promise<void> {
    const now = new Date();
    
    // 1. Process due invoice email reminders with 3-day rate limiting to prevent spam
    try {
      await invoiceService.checkAndSendDueInvoiceNotifications(now);
    } catch (err) {
      logger.error('Error checking and sending due invoice email notifications', { err });
    }

    // 2. Find active/expiring subscriptions where renewal date is in the past
    const subsToRenew = await subscriptionRepository.findPendingRenewal(now);

    if (subsToRenew.length === 0) {
      return;
    }

    logger.info(`Found ${subsToRenew.length} subscription(s) pending renewal check.`);

    for (const sub of subsToRenew) {
      try {
        await this.renewSubscription(sub);
      } catch (err) {
        logger.error(`Failed to renew subscription ${sub.id}`, { err, sub });
      }
    }
  }

  private async renewSubscription(sub: Subscription): Promise<void> {
    logger.info(`Processing renewal for subscription ${sub.id} (client: ${sub.client_id})`);

    // Handle subscriptions that were set to EXPIRING (cancelled by user at end of billing cycle)
    if (sub.status === SubscriptionStatus.EXPIRING) {
      logger.info(`Subscription ${sub.id} reached end of paid billing period (${sub.renewal_date}). Finalizing cancellation.`);
      await subscriptionRepository.updateStatus(sub.id, SubscriptionStatus.CANCELLED);

      // Clean up Nextcloud accounts for active slots
      const slots = await equipmentRepository.findBySubscription(sub.id);
      for (const slot of slots) {
        if (slot.nextcloud_username) {
          try {
            await nextcloudService.deleteUser(slot.nextcloud_username);
          } catch (err) {
            logger.error(`Failed to delete Nextcloud user ${slot.nextcloud_username} during scheduler cancellation`, { err });
          }
          await equipmentRepository.update(slot.id, {
            status: 'PENDING_ACTIVATION',
            device_name: null,
            device_serial: null,
            otp: null,
            otp_expires_at: null,
            nextcloud_username: null,
            nextcloud_password: null,
          });
        }
      }

      await notificationService.createInAppNotification({
        userId: sub.client_id,
        title: 'Subscription Cancelled',
        message: `Your subscription to ${sub.service_name} has reached the end of its billing cycle and is now inactive.`,
        link: '/plans',
        type: 'SUBSCRIPTION_CANCELLED',
        tenantId: sub.tenant_id,
      });
      return;
    }

    const planDetails = await planRepository.findById(sub.plan);
    if (!planDetails) {
      logger.error(`Plan ${sub.plan} not found for subscription ${sub.id}`);
      return;
    }

    const billingCycle = (sub.service_name.includes('Annual') || sub.service_name.includes('Anual')) ? 'annual' : 'monthly';
    let newRenewalDate: Date;
    let isActive = true;

    if (sub.paypal_order_id && (sub.paypal_order_id.startsWith('I-') || sub.paypal_order_id.startsWith('MOCK-SUB-'))) {
      if (sub.paypal_order_id.startsWith('MOCK-SUB-')) {
        // Mock PayPal Subscription Renewal: simulate renewal dates
        newRenewalDate = new Date(sub.renewal_date);
        if (billingCycle === 'annual') {
          newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
        } else {
          newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
        }
        logger.info(`[PayPal Mock] Simulating renewal for ${sub.paypal_order_id}, next renewal: ${newRenewalDate.toISOString()}`);
      } else {
        // Real PayPal Subscription: fetch latest billing status
        const payPalSub = await paypalService.getSubscription(sub.paypal_order_id);
        
        if (payPalSub.status !== 'ACTIVE' && payPalSub.status !== 'APPROVED') {
          // Subscription was cancelled or suspended in PayPal
          logger.warn(`PayPal subscription ${sub.paypal_order_id} is no longer active (status: ${payPalSub.status}). Cancelling locally.`);
          await subscriptionRepository.updateStatus(sub.id, SubscriptionStatus.CANCELLED);
          isActive = false;
          
          await notificationService.createInAppNotification({
            userId: sub.client_id,
            title: 'Subscription Cancelled',
            message: `Your subscription to ${sub.service_name} has been cancelled because of payment failure or cancellation on PayPal.`,
            link: '/plans',
            type: 'SUBSCRIPTION_CANCELLED',
            tenantId: sub.tenant_id,
          });
          return;
        }

        newRenewalDate = new Date(payPalSub.nextBillingTime);
        
        // If PayPal hasn't advanced the next billing time yet, wait
        if (newRenewalDate.getTime() <= new Date(sub.renewal_date).getTime()) {
          logger.info(`PayPal next billing time for ${sub.paypal_order_id} is not yet advanced. Retrying in next loop.`);
          return;
        }
      }
    } else {
      // Manual/Legacy/Bank Transfer Subscription Renewal: auto-advance renewal date
      newRenewalDate = new Date(sub.renewal_date);
      if (billingCycle === 'annual') {
        newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
      } else {
        newRenewalDate.setMonth(newRenewalDate.getMonth() + 1);
      }
    }

    if (isActive) {
      // 1. Update subscription renewal date in database
      await subscriptionRepository.updateRenewal(sub.id, newRenewalDate, SubscriptionStatus.ACTIVE);

      // 2. Create paid invoice record for the new cycle
      const price = planDetails.price;
      const equipmentCount = sub.equipment_count;
      const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
      const subtotal = Math.round(price * priceMultiplier * equipmentCount * 100) / 100;
      const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      let invoiceNumber = '';
      while (true) {
        const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        invoiceNumber = `INV-${new Date().getFullYear()}-${rand}`;
        const existing = await invoiceRepository.findByInvoiceNumber(invoiceNumber);
        if (!existing) break;
      }

      const createdInvoice = await invoiceRepository.create({
        invoice_number: invoiceNumber,
        client_id: sub.client_id,
        amount: subtotal,
        tax_amount: tax,
        total: total,
        due_date: newRenewalDate,
        tenant_id: sub.tenant_id,
        status: InvoiceStatus.PAID,
      });

      // 3. Send notification to the user
      await notificationService.createInAppNotification({
        userId: sub.client_id,
        title: 'Subscription Renewed',
        message: `Your subscription to ${sub.service_name} has been renewed successfully. Next billing date: ${newRenewalDate.toLocaleDateString()}.`,
        link: '/plans',
        type: 'SUBSCRIPTION_RENEWED',
        tenantId: sub.tenant_id,
      });

      // 4. Dispatch billing email notification to the client
      try {
        const clientUser = await userRepository.findById(sub.client_id);
        if (clientUser && clientUser.email) {
          await sendInvoiceDueEmail(clientUser.email, clientUser.name, createdInvoice, clientUser.language || 'en');
        }
      } catch (err) {
        logger.error(`Failed to send billing email for renewed subscription ${sub.id}`, { err });
      }

      logger.info(`Subscription ${sub.id} renewed successfully. Next renewal: ${newRenewalDate.toISOString()}`);
    }
  }
}

export const subscriptionScheduler = new SubscriptionScheduler();
