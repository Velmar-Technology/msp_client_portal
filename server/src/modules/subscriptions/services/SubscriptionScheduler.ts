import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions/repositories/SubscriptionRepository';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing/services/InvoiceNotificationService';
import { SubscriptionRenewalService, subscriptionRenewalService } from '@modules/subscriptions/services/SubscriptionRenewalService';
import { logger } from '@shared/utils/logger';

export class SubscriptionScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private notifSvc: InvoiceNotificationService = invoiceNotificationService,
    private renewalSvc: SubscriptionRenewalService = subscriptionRenewalService
  ) {}

  start(intervalMs = 15000): void {
    if (this.intervalId) return;

    logger.info('Subscription Scheduler started');

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

    try {
      await this.notifSvc.checkAndSendDueInvoiceNotifications(now);
    } catch (err) {
      logger.error('Error checking and sending due invoice email notifications', { err });
    }

    const subsToRenew = await this.subscriptionRepo.findPendingRenewal(now);
    if (subsToRenew.length === 0) {
      return;
    }

    logger.info(`Found ${subsToRenew.length} subscription(s) pending renewal check.`);
    for (const sub of subsToRenew) {
      try {
        await this.renewalSvc.renewSubscription(sub);
      } catch (err) {
        logger.error(`Failed to renew subscription ${sub.id}`, { err, sub });
      }
    }
  }
}

export const subscriptionScheduler = new SubscriptionScheduler();
