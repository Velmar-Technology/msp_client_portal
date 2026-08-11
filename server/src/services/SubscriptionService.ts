import { subscriptionRepository, SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { userRepository, UserRepository } from '../repositories/UserRepository';
import { planRepository, PlanRepository } from '../repositories/PlanRepository';
import { invoiceRepository, InvoiceRepository } from '../repositories/InvoiceRepository';
import { equipmentRepository, EquipmentRepository } from '../repositories/EquipmentRepository';
import { nextcloudService, NextcloudService } from './NextcloudService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { TAX_RATE } from '../config/constants';
import { Subscription, SubscriptionPlan, SubscriptionStatus, InvoiceStatus, UserRole } from '../types';
import { CreateSubscriptionInput, UpdateSubscriptionInput, SendQuoteInput } from '../dtos/subscription.dto';
import { paypalService, PaypalService } from './PaypalService';
import { env } from '../config/env';
import { notificationService, NotificationService } from './NotificationService';
import { subscriptionQuotationService, SubscriptionQuotationService } from './SubscriptionQuotationService';

function getLocalizedValue(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val.en_US) return val.en_US;
  if (val.es_DO) return val.es_DO;
  const keys = Object.keys(val);
  if (keys.length > 0) return val[keys[0]];
  return '';
}

export class SubscriptionService {
  constructor(
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private userRepo: UserRepository = userRepository,
    private planRepo: PlanRepository = planRepository,
    private invoiceRepo: InvoiceRepository = invoiceRepository,
    private equipmentRepo: EquipmentRepository = equipmentRepository,
    private nextcloudSvc: NextcloudService = nextcloudService,
    private paypalSvc: PaypalService = paypalService,
    private notifSvc: NotificationService = notificationService,
    private quotationSvc: SubscriptionQuotationService = subscriptionQuotationService,
  ) {}

  async getClientTenantId(clientId: string): Promise<string> {
    const clientUser = await this.userRepo.findById(clientId);
    if (!clientUser) {
      throw AppError.notFound('Client user not found');
    }
    return clientUser.tenant_id;
  }

  async getClientSubscriptions(tenantId: string): Promise<Subscription[]> {
    return this.subscriptionRepo.findByTenant(tenantId);
  }

  async getSubscriptionById(id: string, tenantId: string): Promise<Subscription> {
    const sub = await this.subscriptionRepo.findById(id);
    if (!sub) throw AppError.notFound('Subscription not found');
    if (sub.tenant_id !== tenantId) throw AppError.forbidden('Access denied');
    return sub;
  }

  async createPaypalOrderForSubscription(data: { plan: string; equipmentCount: number; billingCycle?: 'monthly' | 'annual'; currentSubscriptionId?: string }): Promise<{ orderId: string }> {
    const planDetails = await this.planRepo.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const price = planDetails.price;
    const equipmentCount = data.equipmentCount ?? 1;
    const billingCycle = data.billingCycle || 'monthly';
    const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
    let total = 0;
    let description = '';

    if (data.currentSubscriptionId) {
      const existingSub = await this.subscriptionRepo.findById(data.currentSubscriptionId);
      if (!existingSub) throw AppError.notFound('Subscription not found');

      const additionalCount = equipmentCount - existingSub.equipment_count;
      if (additionalCount <= 0) {
        throw AppError.badRequest('New equipment count must be greater than current count for an upgrade payment');
      }

      description = `Upgrade for ${planDetails.name} - Adding ${additionalCount} Equipment`;
      const subtotal = Math.round(price * priceMultiplier * additionalCount * 100) / 100;
      const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
      total = Math.round((subtotal + tax) * 100) / 100;
    } else {
      const subtotal = Math.round(price * priceMultiplier * equipmentCount * 100) / 100;
      const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
      total = Math.round((subtotal + tax) * 100) / 100;
      description = `${planDetails.name} Subscription - ${equipmentCount} Equipment (${billingCycle === 'annual' ? 'Annually' : 'Monthly'})`;
    }

    const referenceId = `SUB-${planDetails.id}-${Date.now()}`;
    const order = await this.paypalSvc.createOrderForAmount(total, description, referenceId);

    return { orderId: order.id };
  }

  async createPaypalSubscription(data: { plan: string; equipmentCount: number; billingCycle?: 'monthly' | 'annual' }): Promise<{ subscriptionId: string; approveUrl: string }> {
    const planDetails = await this.planRepo.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const billingCycle = data.billingCycle || 'monthly';
    const equipmentCount = data.equipmentCount ?? 1;

    // 1. Get or create the PayPal Catalog Product
    await this.paypalSvc.createProduct(
      'MSP Helpdesk Support Service',
      'Premium technical support and device slots monitoring service'
    );

    // 2. Resolve/Create PayPal Billing Plan
    let paypalPlanId = billingCycle === 'annual' ? planDetails.paypal_plan_id_annual : planDetails.paypal_plan_id_monthly;

    if (!paypalPlanId) {
      const price = planDetails.price;
      const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
      const subtotal = Math.round(price * priceMultiplier * 100) / 100;
      const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
      const unitPriceWithTax = Math.round((subtotal + tax) * 100) / 100;

      const planName = `${getLocalizedValue(planDetails.name)} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`;
      const planDesc = `${getLocalizedValue(planDetails.description) || 'Recurring subscription plan'}`;

      paypalPlanId = await this.paypalSvc.createPlan(
        'MSP-HELPDESK-SUPPORT',
        planName,
        planDesc,
        unitPriceWithTax,
        billingCycle
      );

      // Cache the PayPal Plan ID in our database
      if (billingCycle === 'annual') {
        await this.planRepo.update(planDetails.id, { paypal_plan_id_annual: paypalPlanId });
      } else {
        await this.planRepo.update(planDetails.id, { paypal_plan_id_monthly: paypalPlanId });
      }
    }

    // 3. Create Subscription in PayPal
    const returnUrl = `${env.CORS_ORIGIN}/plans?success=true`;
    const cancelUrl = `${env.CORS_ORIGIN}/plans?cancel=true`;

    const paypalSubscription = await this.paypalSvc.createSubscription(
      paypalPlanId!,
      equipmentCount,
      returnUrl,
      cancelUrl
    );

    return {
      subscriptionId: paypalSubscription.id,
      approveUrl: paypalSubscription.approveUrl,
    };
  }

  async createSubscription(data: CreateSubscriptionInput, clientId: string, tenantId: string, byAdmin = false): Promise<Subscription> {
    const clientUser = await this.userRepo.findById(clientId);
    if (!clientUser) throw AppError.notFound('Client user not found');
    if (clientUser.tenant_id !== tenantId) throw AppError.forbidden('Client does not belong to this tenant');
    if (clientUser.role !== 'CLIENT') throw AppError.badRequest('Target user must have CLIENT role');

    // Idempotency: Check if this PayPal order was already processed
    if (data.paypalOrderId) {
      const existingSub = await this.subscriptionRepo.findByPaypalOrderId(data.paypalOrderId);
      if (existingSub) {
        return existingSub;
      }
    }

    // Double plan check: Ensure client doesn't buy the same plan twice
    const existingSubs = await this.subscriptionRepo.findByClient(clientId, tenantId);
    const hasActivePlan = existingSubs.some((sub) => sub.plan === data.plan && sub.status === 'ACTIVE');
    if (hasActivePlan) {
      throw AppError.badRequest(`You already have an active subscription for the ${data.plan} plan. Please modify your existing subscription instead.`);
    }

    const billingCycle = data.billingCycle || 'monthly';
    const isBankTransfer = data.paymentMethod === 'transfer';

    // Validate PayPal payment if not done by Admin or Bank Transfer
    let renewalDate = new Date();
    if (billingCycle === 'annual') {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    if (!byAdmin && !isBankTransfer) {
      if (!data.paypalOrderId) {
        throw AppError.badRequest('PayPal order ID is required for checkout');
      }

      if (data.paypalOrderId.startsWith('I-') || data.paypalOrderId.startsWith('MOCK-SUB-')) {
        // PayPal Subscription Flow
        const subDetails = await this.paypalSvc.getSubscription(data.paypalOrderId);
        if (subDetails.status !== 'ACTIVE' && subDetails.status !== 'APPROVED') {
          throw AppError.badRequest(`PayPal subscription is not active (status: ${subDetails.status})`);
        }
        if (subDetails.nextBillingTime) {
          renewalDate = new Date(subDetails.nextBillingTime);
        }
      } else {
        // Legacy checkout/order payment verification
        const order = await this.paypalSvc.getOrder(data.paypalOrderId);
        if (order.status === 'APPROVED') {
          const capture = await this.paypalSvc.captureOrder(data.paypalOrderId);
          order.status = capture.status;
        }

        if (order.status !== 'COMPLETED') {
          throw AppError.badRequest('PayPal payment was not completed');
        }

        const planDetails = await this.planRepo.findById(data.plan);
        if (!planDetails) {
          throw AppError.notFound('Plan not found');
        }

        const price = planDetails.price;
        const equipmentCount = data.equipmentCount ?? 1;
        const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
        const subtotal = Math.round(price * priceMultiplier * equipmentCount * 100) / 100;
        const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
        const expectedTotal = Math.round((subtotal + tax) * 100) / 100;

        const purchaseUnit = order.purchase_units?.[0];
        const paidAmount = Number(purchaseUnit?.amount?.value);
        if (isNaN(paidAmount) || Math.abs(paidAmount - expectedTotal) > 0.05) {
          throw AppError.badRequest(`Paid amount $${paidAmount} does not match expected subscription cost $${expectedTotal}`);
        }
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
      plan: data.plan as SubscriptionPlan,
      equipment_count: data.equipmentCount,
      renewal_date: renewalDate,
      tenant_id: tenantId,
      paypal_order_id: data.paypalOrderId,
      status: isBankTransfer ? SubscriptionStatus.EXPIRED : SubscriptionStatus.ACTIVE,
    });

    // Initialize equipment slots for the subscription
    for (let i = 0; i < data.equipmentCount; i++) {
      await this.equipmentRepo.create({
        subscription_id: subscription.id,
        slot_index: i,
        status: 'PENDING_ACTIVATION',
        tenant_id: tenantId,
      });
    }

    // Create Invoice record (PENDING for admin/bank transfer, PAID for completed card checkout)
    const planDetails = await this.planRepo.findById(data.plan);
    if (planDetails) {
      const price = planDetails.price;
      const equipmentCount = data.equipmentCount ?? 1;
      const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
      const subtotal = Math.round(price * priceMultiplier * equipmentCount * 100) / 100;
      const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      let invoiceNumber = '';
      while (true) {
        const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        invoiceNumber = `INV-${new Date().getFullYear()}-${rand}`;
        const existing = await this.invoiceRepo.findByInvoiceNumber(invoiceNumber);
        if (!existing) break;
      }

      const dueDate = new Date();
      if (isBankTransfer || byAdmin) {
        dueDate.setDate(dueDate.getDate() + 30);
      }

      const invoiceStatus = (byAdmin || isBankTransfer) ? InvoiceStatus.PENDING : InvoiceStatus.PAID;

      await this.invoiceRepo.create({
        invoice_number: invoiceNumber,
        client_id: clientId,
        amount: subtotal,
        tax_amount: tax,
        total: total,
        due_date: dueDate,
        tenant_id: tenantId,
        status: invoiceStatus,
      });
    }

    // Trigger in-app notification for subscription or bank transfer intent
    const notifTitle = isBankTransfer ? 'Bank Transfer Intent Received' : 'Subscription Activated';
    const notifMsg = isBankTransfer
      ? `Your bank transfer request for ${subscription.service_name} was received and an invoice is awaiting payment confirmation.`
      : `Your subscription to ${subscription.service_name} is now active.`;

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

    // Notify all Admin users about subscription activation or bank transfer intent
    if (!byAdmin) {
      try {
        const adminUsers = await this.userRepo.findByRole(UserRole.ADMIN);
        const clientUser = await this.userRepo.findById(clientId);
        const clientName = clientUser?.name || 'A customer';

        const adminNotifTitle = isBankTransfer ? 'New Bank Transfer Intent' : 'Subscription Payment Received';
        const adminNotifMsg = isBankTransfer
          ? `${clientName} registered a bank transfer intent for ${subscription.service_name}. Awaiting payment confirmation.`
          : `${clientName} completed payment for subscription ${subscription.service_name}.`;

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

    return subscription;
  }

  async updateSubscription(id: string, data: UpdateSubscriptionInput, tenantId: string, byAdmin = false): Promise<Subscription> {
    const sub = await this.getSubscriptionById(id, tenantId);
    let updated = sub;

    if (data.plan || data.equipmentCount !== undefined) {
      const newPlan = data.plan || sub.plan;
      const newCount = data.equipmentCount !== undefined ? data.equipmentCount : sub.equipment_count;

      if (!byAdmin && newCount !== sub.equipment_count) {
        if (sub.paypal_order_id && (sub.paypal_order_id.startsWith('I-') || sub.paypal_order_id.startsWith('MOCK-SUB-'))) {
          // PayPal Subscription quantity update (supports upgrades and downgrades)
          await this.paypalSvc.updateSubscriptionQuantity(sub.paypal_order_id, newCount);
        } else if (newCount > sub.equipment_count) {
          // Legacy check for one-time order upgrades
          if (!data.paypalOrderId) {
            throw AppError.badRequest('PayPal order ID is required to add more devices');
          }

          const order = await this.paypalSvc.getOrder(data.paypalOrderId);
          if (order.status === 'APPROVED') {
            const capture = await this.paypalSvc.captureOrder(data.paypalOrderId);
            order.status = capture.status;
          }

          if (order.status !== 'COMPLETED') {
            throw AppError.badRequest('PayPal payment for device upgrade was not completed');
          }

          const planDetails = await this.planRepo.findById(newPlan);
          if (!planDetails) throw AppError.notFound('Plan not found');

          const billingCycle = (sub.service_name.includes('Annual') || sub.service_name.includes('Anual')) ? 'annual' : 'monthly';
          const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
          const additionalCount = newCount - sub.equipment_count;
          const subtotal = Math.round(planDetails.price * priceMultiplier * additionalCount * 100) / 100;
          const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
          const expectedUpgradeTotal = Math.round((subtotal + tax) * 100) / 100;

          const purchaseUnit = order.purchase_units?.[0];
          const paidAmount = Number(purchaseUnit?.amount?.value);
          if (isNaN(paidAmount) || Math.abs(paidAmount - expectedUpgradeTotal) > 0.05) {
            throw AppError.badRequest(`Paid upgrade amount $${paidAmount} does not match expected upgrade cost $${expectedUpgradeTotal}`);
          }
        }
      }

      if (newCount < sub.equipment_count) {
        // Clean up excess slots if downgraded
        const slots = await this.equipmentRepo.findBySubscription(sub.id);
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

      const res = await this.subscriptionRepo.updatePlan(sub.id, newPlan as SubscriptionPlan, newCount);
      if (!res) throw AppError.internal('Failed to update subscription');
      updated = res;
    }

    if (data.status) {
      let targetStatus = data.status;

      if (data.status === SubscriptionStatus.CANCELLED) {
        const now = new Date();
        // Keep subscription active through renewal_date to avoid partial period refunds
        if (sub.renewal_date && new Date(sub.renewal_date) > now && !byAdmin) {
          targetStatus = SubscriptionStatus.EXPIRING;
        } else {
          // If immediately transitioning to CANCELLED, clean up all equipment Nextcloud accounts
          const slots = await this.equipmentRepo.findBySubscription(sub.id);
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

        // Cancel PayPal recurring billing if linked
        if (sub.paypal_order_id && (sub.paypal_order_id.startsWith('I-') || sub.paypal_order_id.startsWith('MOCK-SUB-'))) {
          try {
            await this.paypalSvc.cancelSubscription(sub.paypal_order_id, 'Cancelled by user request at end of billing period');
          } catch (err) {
            logger.error(`Failed to cancel PayPal subscription ${sub.paypal_order_id}:`, { err });
          }
        }
      }

      const res = await this.subscriptionRepo.updateStatus(sub.id, targetStatus);
      if (!res) throw AppError.internal('Failed to update subscription status');
      updated = res;
    }

    return updated;
  }

  async sendQuotation(data: SendQuoteInput, senderUserId: string, senderTenantId: string, role: string): Promise<void> {
    return this.quotationSvc.sendQuotation(data, senderUserId, senderTenantId, role);
  }
}

export const subscriptionService = new SubscriptionService();
