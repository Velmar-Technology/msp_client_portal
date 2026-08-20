import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions/repositories/SubscriptionRepository';
import { InvoiceNotificationService, invoiceNotificationService } from '@modules/billing';
import { SubscriptionRenewalService, subscriptionRenewalService } from '@modules/subscriptions/services/SubscriptionRenewalService';
import { NotificationService, notificationService } from '@modules/notifications';
import { UserRepository, userRepository } from '@modules/auth';
import { logger } from '@shared/utils/logger';

const EXPIRY_WARNING_DAYS = 7;

export class SubscriptionScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private notifSvc: InvoiceNotificationService = invoiceNotificationService,
    private renewalSvc: SubscriptionRenewalService = subscriptionRenewalService,
    private notificationSvc: NotificationService = notificationService,
    private userRepo: UserRepository = userRepository,
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

    try {
      await this.checkAndSendExpiryWarnings(now);
    } catch (err) {
      logger.error('Error checking and sending subscription expiry warnings', { err });
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

  private async checkAndSendExpiryWarnings(now: Date): Promise<void> {
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + EXPIRY_WARNING_DAYS);

    const expiringSubs = await this.subscriptionRepo.findExpiringSoon(thresholdDate, now);
    if (expiringSubs.length === 0) return;

    logger.info(`Found ${expiringSubs.length} subscription(s) expiring within ${EXPIRY_WARNING_DAYS} days.`);

    for (const sub of expiringSubs) {
      try {
        const client = await this.userRepo.findById(sub.client_id);
        if (!client) {
          logger.warn(`Client ${sub.client_id} not found for expiry warning on subscription ${sub.id}`);
          continue;
        }
        await this.notificationSvc.onSubscriptionExpiringSoon(sub, client);
      } catch (err) {
        logger.error(`Failed to send expiry warning for subscription ${sub.id}`, { err });
      }
    }
  }
}

export const subscriptionScheduler = new SubscriptionScheduler();
