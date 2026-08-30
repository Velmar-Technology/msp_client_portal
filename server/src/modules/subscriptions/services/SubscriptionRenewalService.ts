import { SubscriptionRepository, subscriptionRepository } from '../repositories/SubscriptionRepository';
import { PlanRepository, planRepository } from '../repositories/PlanRepository';
import { InvoiceRepository, invoiceRepository, NcfService, ncfService } from '@modules/billing';
import { EquipmentRepository, equipmentRepository } from '@modules/equipment';
import { UserRepository, userRepository, TenantRepository, tenantRepository } from '@modules/auth';
import { NextcloudService, nextcloudService } from '@modules/system';
import { PaypalService, paypalService } from '@modules/billing';
import { NotificationService, notificationService } from '@modules/notifications';
import { BillingPricingService, billingPricingService } from '@modules/billing';
import { sendInvoiceDueEmail } from '@shared/utils/emailService';
import { logger } from '@shared/utils/logger';
import { Subscription, SubscriptionStatus, InvoiceStatus } from '@shared/types';

/**
 * Domain service executing automated subscription renewals, periodic billing invoice creation,
 * Nextcloud account de-provisioning on cancellation, and billing notification dispatching.
 *
 * @see BL-402 (Renewal Scheduler & Hardware Multiplier)
 */
export class SubscriptionRenewalService {
  /**
   * Initializes SubscriptionRenewalService with all necessary domain repositories and external adapters.
   *
   * @param subscriptionRepo - Subscription repository
   * @param planRepo - Plan repository
   * @param invoiceRepo - Invoice repository
   * @param equipmentRepo - Equipment inventory repository
   * @param userRepo - User repository
   * @param nextcloudSvc - Nextcloud user management service
   * @param paypalSvc - PayPal integration service
   * @param notifSvc - Notification service
   * @param pricingSvc - Pricing calculation service
   * @param ncfSvc - NCF issuance service
   * @param tenantRepo - Tenant repository
   */
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private planRepo: PlanRepository = planRepository,
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private equipmentRepo: EquipmentRepository = equipmentRepository,
    private userRepo: UserRepository = userRepository,
    private nextcloudSvc: NextcloudService = nextcloudService,
    private paypalSvc: PaypalService = paypalService,
    private notifSvc: NotificationService = notificationService,
    private pricingSvc: BillingPricingService = billingPricingService,
    private ncfSvc: NcfService = ncfService,
    private tenantRepo: TenantRepository = tenantRepository
  ) {}

  /**
   * Finalizes an expiring subscription at the end of its billing period by cancelling slots and de-provisioning Nextcloud users.
   *
   * @param sub - Expiring subscription entity
   */
  private async finalizeExpiringSubscription(sub: Subscription): Promise<void> {
    logger.info(`Subscription ${sub.id} reached end of paid billing period (${sub.renewal_date}). Finalizing cancellation.`);
    await this.subscriptionRepo.updateStatus(sub.id, SubscriptionStatus.CANCELLED);

    const slots = await this.equipmentRepo.findBySubscription(sub.id);
    for (const slot of slots) {
      if (slot.nextcloud_username) {
        try {
          await this.nextcloudSvc.deleteUser(slot.nextcloud_username);
        } catch (err) {
          logger.error(`Failed to delete Nextcloud user ${slot.nextcloud_username} during scheduler cancellation`, { err });
        }
        await this.equipmentRepo.update(slot.id, {
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

    await this.notifSvc.createInAppNotification({
      userId: sub.client_id,
      title: 'Subscription Cancelled',
      message: `Your subscription to ${sub.service_name} has reached the end of its billing cycle and is now inactive.`,
      link: '/plans',
      type: 'SUBSCRIPTION_CANCELLED',
      tenantId: sub.tenant_id,
    });
  }

  /**
   * Calculates the next periodic renewal date based on billing cycle (monthly vs annual).
   *
   * @param currentRenewalDate - Current expiration date
   * @param billingCycle - 'monthly' or 'annual'
   * @returns Projected next renewal Date
   */
  private calculateNextRenewalDate(currentRenewalDate: Date, billingCycle: 'monthly' | 'annual'): Date {
    const nextDate = new Date(currentRenewalDate);
    if (billingCycle === 'annual') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
  }

  /**
   * Queries PayPal API for active subscription status and next billing timestamp.
   *
   * @param sub - Subscription entity
   * @param billingCycle - Billing cycle
   * @returns Status object containing new renewal date and execution flag
   */
  private async handlePaypalSubscriptionRenewal(sub: Subscription, billingCycle: 'monthly' | 'annual'): Promise<{ newRenewalDate: Date | null; shouldProceed: boolean }> {
    if (sub.paypal_order_id?.startsWith('MOCK-SUB-')) {
      const newRenewalDate = this.calculateNextRenewalDate(new Date(sub.renewal_date), billingCycle);
      logger.info(`[PayPal Mock] Simulating renewal for ${sub.paypal_order_id}, next renewal: ${newRenewalDate.toISOString()}`);
      return { newRenewalDate, shouldProceed: true };
    }

    const payPalSub = await this.paypalSvc.getSubscription(sub.paypal_order_id!);
    if (payPalSub.status !== 'ACTIVE' && payPalSub.status !== 'APPROVED') {
      logger.warn(`PayPal subscription ${sub.paypal_order_id} is no longer active (status: ${payPalSub.status}). Cancelling locally.`);
      await this.subscriptionRepo.updateStatus(sub.id, SubscriptionStatus.CANCELLED);
      await this.notifSvc.createInAppNotification({
        userId: sub.client_id,
        title: 'Subscription Cancelled',
        message: `Your subscription to ${sub.service_name} has been cancelled because of payment failure or cancellation on PayPal.`,
        link: '/plans',
        type: 'SUBSCRIPTION_CANCELLED',
        tenantId: sub.tenant_id,
      });
      return { newRenewalDate: null, shouldProceed: false };
    }

    const newRenewalDate = new Date(payPalSub.nextBillingTime);
    if (newRenewalDate.getTime() <= new Date(sub.renewal_date).getTime()) {
      logger.info(`PayPal next billing time for ${sub.paypal_order_id} is not yet advanced. Retrying in next loop.`);
      return { newRenewalDate: null, shouldProceed: false };
    }

    return { newRenewalDate, shouldProceed: true };
  }

  /**
   * Processes renewal cycle for an active subscription, advancing renewal date, creating a renewal invoice,
   * and notifying client (BL-402).
   *
   * @param sub - Subscription due for renewal
   * @see BL-402
   */
  async renewSubscription(sub: Subscription): Promise<void> {
    logger.info(`Processing renewal for subscription ${sub.id} (client: ${sub.client_id})`);

    if (sub.status === SubscriptionStatus.EXPIRING) {
      await this.finalizeExpiringSubscription(sub);
      return;
    }

    const planDetails = await this.planRepo.findById(sub.plan);
    if (!planDetails) {
      logger.error(`Plan ${sub.plan} not found for subscription ${sub.id}`);
      return;
    }

    const billingCycle = (sub.service_name.includes('Annual') || sub.service_name.includes('Anual')) ? 'annual' : 'monthly';
    let newRenewalDate: Date;

    if (sub.paypal_order_id && (sub.paypal_order_id.startsWith('I-') || sub.paypal_order_id.startsWith('MOCK-SUB-'))) {
      const result = await this.handlePaypalSubscriptionRenewal(sub, billingCycle);
      if (!result.shouldProceed || !result.newRenewalDate) {
        return;
      }
      newRenewalDate = result.newRenewalDate;
    } else {
      newRenewalDate = this.calculateNextRenewalDate(new Date(sub.renewal_date), billingCycle);
    }

    await this.subscriptionRepo.updateRenewal(sub.id, newRenewalDate, SubscriptionStatus.ACTIVE);

    const pricing = this.pricingSvc.calculatePricing(planDetails.price, sub.equipment_count, billingCycle);
    const invoiceNumber = await this.pricingSvc.generateInvoiceNumber();

    const client = await this.userRepo.findById(sub.client_id);
    const tenant = await this.tenantRepo.findById(sub.tenant_id);
    const effectiveRnc = client?.rnc || tenant?.rnc || null;
    const ncf = await this.ncfSvc.assignNcfIfEligible(effectiveRnc);

    const createdInvoice = await this.invoiceRepo.create({
      invoice_number: invoiceNumber,
      client_id: sub.client_id,
      amount: pricing.subtotal,
      tax_amount: pricing.tax,
      total: pricing.total,
      currency: 'USD',
      ncf,
      rnc: effectiveRnc,
      due_date: newRenewalDate,
      tenant_id: sub.tenant_id,
      status: InvoiceStatus.PAID,
    });

    await this.notifSvc.createInAppNotification({
      userId: sub.client_id,
      title: 'Subscription Renewed',
      message: `Your subscription to ${sub.service_name} has been renewed successfully. Next billing date: ${newRenewalDate.toLocaleDateString()}.`,
      link: '/plans',
      type: 'SUBSCRIPTION_RENEWED',
      tenantId: sub.tenant_id,
    });

    try {
      const clientUser = await this.userRepo.findById(sub.client_id);
      if (clientUser && clientUser.email) {
        await sendInvoiceDueEmail(clientUser.email, clientUser.name, createdInvoice, clientUser.language || 'en');
      }
    } catch (err) {
      logger.error(`Failed to send billing email for renewed subscription ${sub.id}`, { err });
    }

    logger.info(`Subscription ${sub.id} renewed successfully. Next renewal: ${newRenewalDate.toISOString()}`);
  }
}

export const subscriptionRenewalService = new SubscriptionRenewalService();
