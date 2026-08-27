import { SubscriptionRepository, subscriptionRepository } from '@modules/subscriptions/repositories/SubscriptionRepository';
import { UserRepository, userRepository } from '@modules/auth';
import { PlanRepository, planRepository } from '@modules/subscriptions';
import { InvoiceRepository, invoiceRepository } from '@modules/billing';
import { EquipmentRepository, equipmentRepository } from '@modules/equipment';
import { NextcloudService, nextcloudService } from '@modules/system';
import { PaypalService, paypalService } from '@modules/billing';
import { NotificationService, notificationService } from '@modules/notifications';
import { BillingPricingService, billingPricingService } from '@modules/billing';
import { SubscriptionPaymentService, subscriptionPaymentService } from '@modules/subscriptions/services/SubscriptionPaymentService';
import { NotFoundError, ForbiddenError, ValidationError, InternalServerError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { Subscription, SubscriptionStatus, InvoiceStatus, UserRole } from '@shared/types';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from '@shared/dtos/subscription.dto';

export class SubscriptionLifecycleService {
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private userRepo: UserRepository = userRepository,
    private planRepo: PlanRepository = planRepository,
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private equipmentRepo: EquipmentRepository = equipmentRepository,
    private nextcloudSvc: NextcloudService = nextcloudService,
    private paypalSvc: PaypalService = paypalService,
    private notifSvc: NotificationService = notificationService,
    private pricingSvc: BillingPricingService = billingPricingService,
    private subPaymentSvc: SubscriptionPaymentService = subscriptionPaymentService
  ) {}

  private async validateClientUser(clientId: string, tenantId: string): Promise<void> {
    const clientUser = await this.userRepo.findById(clientId);
    if (!clientUser) throw new NotFoundError('Client user not found');
    if (clientUser.tenant_id !== tenantId) throw new ForbiddenError('Client does not belong to this tenant');
    if (clientUser.role !== 'CLIENT') throw new ValidationError('Target user must have CLIENT role');
  }

  private async checkDuplicateActivePlan(clientId: string, tenantId: string, plan: string): Promise<void> {
    const existingSubs = await this.subscriptionRepo.findByClient(clientId, tenantId);
    const hasActivePlan = existingSubs.some((sub) => sub.plan === plan && sub.status === 'ACTIVE');
    if (hasActivePlan) {
      throw new ValidationError(`You already have an active subscription for the ${plan} plan. Please modify your existing subscription instead.`);
    }
  }

  private calculateRenewalDate(billingCycle: 'monthly' | 'annual'): Date {
    const renewalDate = new Date();
    if (billingCycle === 'annual') {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }
    return renewalDate;
  }

  private async initializeEquipmentSlots(subscriptionId: string, equipmentCount: number, tenantId: string): Promise<void> {
    for (let i = 0; i < equipmentCount; i++) {
      await this.equipmentRepo.create({
        subscription_id: subscriptionId,
        slot_index: i,
        status: 'PENDING_ACTIVATION',
        tenant_id: tenantId,
      });
    }
  }

  private async createInitialInvoice(
    plan: string,
    equipmentCount: number,
    billingCycle: 'monthly' | 'annual',
    clientId: string,
    tenantId: string,
    isBankTransfer: boolean,
    byAdmin: boolean
  ): Promise<void> {
    const planDetails = await this.planRepo.findById(plan);
    if (!planDetails) return;

    const pricing = this.pricingSvc.calculatePricing(planDetails.price, equipmentCount, billingCycle);
    const invoiceNumber = await this.pricingSvc.generateInvoiceNumber();

    const dueDate = new Date();
    if (isBankTransfer || byAdmin) {
      dueDate.setDate(dueDate.getDate() + 30);
    }

    const invoiceStatus = (byAdmin || isBankTransfer) ? InvoiceStatus.PENDING : InvoiceStatus.PAID;

    await this.invoiceRepo.create({
      invoice_number: invoiceNumber,
      client_id: clientId,
      amount: pricing.subtotal,
      tax_amount: pricing.tax,
      total: pricing.total,
      due_date: dueDate,
      tenant_id: tenantId,
      status: invoiceStatus,
    });
  }

  private async notifySubscriptionCreation(
    clientId: string,
    tenantId: string,
    serviceName: string,
    isBankTransfer: boolean,
    byAdmin: boolean
  ): Promise<void> {
    const notifTitle = isBankTransfer ? 'Bank Transfer Intent Received' : 'Subscription Activated';
    const notifMsg = isBankTransfer
      ? `Your bank transfer request for ${serviceName} was received and an invoice is awaiting payment confirmation.`
      : `Your subscription to ${serviceName} is now active.`;

    await this.notifSvc.createInAppNotification({
      userId: clientId,
      title: notifTitle,
      message: notifMsg,
      type: isBankTransfer ? 'INVOICE_CREATED' : 'SUBSCRIPTION_ACTIVATED_SUCCESS',
      link: '/billing',
      tenantId,
    }).catch((err) => {
      logger.error('Failed to create in-app notification for subscription activation:', { err });
    });

    if (!byAdmin) {
      try {
        const adminUsers = await this.userRepo.findByRole(UserRole.ADMIN);
        const clientUser = await this.userRepo.findById(clientId);
        const clientName = clientUser?.name || 'A customer';

        const adminNotifTitle = isBankTransfer ? 'New Bank Transfer Intent' : 'Subscription Payment Received';
        const adminNotifMsg = isBankTransfer
          ? `${clientName} registered a bank transfer intent for ${serviceName}. Awaiting payment confirmation.`
          : `${clientName} completed payment for subscription ${serviceName}.`;

        for (const admin of adminUsers) {
          await this.notifSvc.createInAppNotification({
            userId: admin.id,
            title: adminNotifTitle,
            message: adminNotifMsg,
            link: '/billing',
            type: isBankTransfer ? 'BANK_TRANSFER_INTENT_ADMIN' : 'SUBSCRIPTION_PAID_ADMIN',
            tenantId,
          });
        }
      } catch (err) {
        logger.error('Failed to notify admin of subscription payment:', err);
      }
    }
  }

  async createSubscription(data: CreateSubscriptionInput, clientId: string, tenantId: string, byAdmin = false): Promise<Subscription> {
    await this.validateClientUser(clientId, tenantId);

    if (data.paypalOrderId) {
      const existingSub = await this.subscriptionRepo.findByPaypalOrderId(data.paypalOrderId);
      if (existingSub) {
        return existingSub;
      }
    }

    await this.checkDuplicateActivePlan(clientId, tenantId, data.plan);

    const billingCycle = data.billingCycle || 'monthly';
    const isBankTransfer = data.paymentMethod === 'transfer';
    let renewalDate = this.calculateRenewalDate(billingCycle);

    if (!byAdmin && !isBankTransfer) {
      if (!data.paypalOrderId) {
        throw new ValidationError('PayPal order ID is required for checkout');
      }

      if (data.paypalOrderId.startsWith('I-') || data.paypalOrderId.startsWith('MOCK-SUB-')) {
        const subDetails = await this.paypalSvc.getSubscription(data.paypalOrderId);
        if (subDetails.status !== 'ACTIVE' && subDetails.status !== 'APPROVED') {
          throw new ValidationError(`PayPal subscription is not active (status: ${subDetails.status})`);
        }
        if (subDetails.nextBillingTime) {
          renewalDate = new Date(subDetails.nextBillingTime);
        }
      } else {
        const planDetails = await this.planRepo.findById(data.plan);
        if (!planDetails) throw new NotFoundError('Plan not found');

        const pricing = this.pricingSvc.calculatePricing(planDetails.price, data.equipmentCount ?? 1, billingCycle);
        await this.subPaymentSvc.verifyPaypalOrderPayment(data.paypalOrderId, pricing.total);
      }
    }

    const suffix = billingCycle === 'annual' ? ' (Annual)' : ' (Monthly)';
    let formattedServiceName = data.serviceName;
    if (!formattedServiceName.endsWith(suffix)) {
      formattedServiceName = `${formattedServiceName}${suffix}`;
    }

    const subscription = await this.subscriptionRepo.create({
      client_id: clientId,
      service_name: formattedServiceName,
      plan: data.plan,
      equipment_count: data.equipmentCount,
      renewal_date: renewalDate,
      tenant_id: tenantId,
      paypal_order_id: data.paypalOrderId,
      status: isBankTransfer ? SubscriptionStatus.EXPIRED : SubscriptionStatus.ACTIVE,
    });

    await this.initializeEquipmentSlots(subscription.id, data.equipmentCount, tenantId);
    await this.createInitialInvoice(data.plan, data.equipmentCount, billingCycle, clientId, tenantId, isBankTransfer, byAdmin);
    await this.notifySubscriptionCreation(clientId, tenantId, formattedServiceName, isBankTransfer, byAdmin);

    return subscription;
  }

  private async handleDowngradeEquipmentCleanup(subscriptionId: string, newCount: number): Promise<void> {
    const slots = await this.equipmentRepo.findBySubscription(subscriptionId);
    for (const slot of slots) {
      if (slot.slot_index >= newCount && slot.nextcloud_username) {
        try {
          await this.nextcloudSvc.deleteUser(slot.nextcloud_username);
        } catch (err) {
          logger.error(`Failed to delete Nextcloud user ${slot.nextcloud_username} during downgrade`, { err });
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
  }

  private async handleCancellationEquipmentCleanup(subscriptionId: string): Promise<void> {
    const slots = await this.equipmentRepo.findBySubscription(subscriptionId);
    for (const slot of slots) {
      if (slot.nextcloud_username) {
        try {
          await this.nextcloudSvc.deleteUser(slot.nextcloud_username);
        } catch (err) {
          logger.error(`Failed to delete Nextcloud user ${slot.nextcloud_username} during cancellation`, { err });
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
  }

  async updateSubscription(id: string, data: UpdateSubscriptionInput, tenantId: string, byAdmin = false): Promise<Subscription> {
    const sub = await this.subscriptionRepo.findById(id);
    if (!sub) throw new NotFoundError('Subscription not found');
    if (sub.tenant_id !== tenantId) throw new ForbiddenError('Access denied');

    let updated = sub;

    if (data.plan || data.equipmentCount !== undefined) {
      const newPlan = data.plan || sub.plan;
      const newCount = data.equipmentCount !== undefined ? data.equipmentCount : sub.equipment_count;

      if (!byAdmin && newCount !== sub.equipment_count) {
        if (sub.paypal_order_id && (sub.paypal_order_id.startsWith('I-') || sub.paypal_order_id.startsWith('MOCK-SUB-'))) {
          await this.paypalSvc.updateSubscriptionQuantity(sub.paypal_order_id, newCount);
        } else if (newCount > sub.equipment_count) {
          if (!data.paypalOrderId) {
            throw new ValidationError('PayPal order ID is required to add more devices');
          }
          const planDetails = await this.planRepo.findById(newPlan);
          if (!planDetails) throw new NotFoundError('Plan not found');

          const billingCycle = (sub.service_name.includes('Annual') || sub.service_name.includes('Anual')) ? 'annual' : 'monthly';
          const additionalCount = newCount - sub.equipment_count;
          const upgradePricing = this.pricingSvc.calculateUpgradePricing(planDetails.price, additionalCount, billingCycle);

          await this.subPaymentSvc.verifyPaypalUpgradePayment(data.paypalOrderId, upgradePricing.total);
        }
      }

      if (newCount < sub.equipment_count) {
        await this.handleDowngradeEquipmentCleanup(sub.id, newCount);
      }

      const res = await this.subscriptionRepo.updatePlan(sub.id, newPlan, newCount);
      if (!res) throw new InternalServerError('Failed to update subscription');
      updated = res;
    }

    if (data.status) {
      let targetStatus = data.status;

      if (data.status === SubscriptionStatus.CANCELLED) {
        const now = new Date();
        if (sub.renewal_date && new Date(sub.renewal_date) > now && !byAdmin) {
          targetStatus = SubscriptionStatus.EXPIRING;
        } else {
          await this.handleCancellationEquipmentCleanup(sub.id);
        }

        if (sub.paypal_order_id && (sub.paypal_order_id.startsWith('I-') || sub.paypal_order_id.startsWith('MOCK-SUB-'))) {
          try {
            await this.paypalSvc.cancelSubscription(sub.paypal_order_id, 'Cancelled by user request at end of billing period');
          } catch (err) {
            logger.error(`Failed to cancel PayPal subscription ${sub.paypal_order_id}:`, { err });
          }
        }
      }

      const res = await this.subscriptionRepo.updateStatus(sub.id, targetStatus);
      if (!res) throw new InternalServerError('Failed to update subscription status');
      updated = res;
    }

    return updated;
  }
}

export const subscriptionLifecycleService = new SubscriptionLifecycleService();
