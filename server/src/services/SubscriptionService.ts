import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { userRepository } from '../repositories/UserRepository';
import { planRepository } from '../repositories/PlanRepository';
import { invoiceRepository } from '../repositories/InvoiceRepository';
import { AppError } from '../utils/AppError';
import { TAX_RATE } from '../config/constants';
import { Subscription, SubscriptionPlan, InvoiceStatus } from '../types';
import { CreateSubscriptionInput, UpdateSubscriptionInput, SendQuoteInput } from '../dtos/subscription.dto';
import { sendQuotationEmail } from '../utils/emailService';
import { paypalService } from './PaypalService';
import { env } from '../config/env';
import { notificationService } from './NotificationService';

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
  async getClientSubscriptions(tenantId: string): Promise<Subscription[]> {
    return subscriptionRepository.findByTenant(tenantId);
  }

  async getSubscriptionById(id: string, tenantId: string): Promise<Subscription> {
    const sub = await subscriptionRepository.findById(id);
    if (!sub) throw AppError.notFound('Subscription not found');
    if (sub.tenant_id !== tenantId) throw AppError.forbidden('Access denied');
    return sub;
  }

  async createPaypalOrderForSubscription(data: { plan: string; equipmentCount: number; billingCycle?: 'monthly' | 'annual'; currentSubscriptionId?: string }): Promise<{ orderId: string }> {
    const planDetails = await planRepository.findById(data.plan);
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
      const existingSub = await subscriptionRepository.findById(data.currentSubscriptionId);
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
    const order = await paypalService.createOrderForAmount(total, description, referenceId);

    return { orderId: order.id };
  }

  async createPaypalSubscription(data: { plan: string; equipmentCount: number; billingCycle?: 'monthly' | 'annual' }): Promise<{ subscriptionId: string; approveUrl: string }> {
    const planDetails = await planRepository.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const billingCycle = data.billingCycle || 'monthly';
    const equipmentCount = data.equipmentCount ?? 1;

    // 1. Get or create the PayPal Catalog Product
    await paypalService.createProduct(
      'MSP Helpdesk Support Service',
      'Premium technical support and device slots monitoring service'
    );

    // 2. Resolve/Create PayPal Billing Plan
    let paypalPlanId = billingCycle === 'annual' ? planDetails.paypal_plan_id_annual : planDetails.paypal_plan_id_monthly;

    if (!paypalPlanId) {
      const price = planDetails.price;
      const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
      const unitPrice = Math.round(price * priceMultiplier * 100) / 100;
      
      const planName = `${getLocalizedValue(planDetails.name)} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`;
      const planDesc = `${getLocalizedValue(planDetails.description) || 'Recurring subscription plan'}`;

      paypalPlanId = await paypalService.createPlan(
        'MSP-HELPDESK-SUPPORT',
        planName,
        planDesc,
        unitPrice,
        billingCycle
      );

      // Cache the PayPal Plan ID in our database
      if (billingCycle === 'annual') {
        await planRepository.update(planDetails.id, { paypal_plan_id_annual: paypalPlanId });
      } else {
        await planRepository.update(planDetails.id, { paypal_plan_id_monthly: paypalPlanId });
      }
    }

    // 3. Create Subscription in PayPal
    const returnUrl = `${env.CORS_ORIGIN}/plans?success=true`;
    const cancelUrl = `${env.CORS_ORIGIN}/plans?cancel=true`;

    const paypalSubscription = await paypalService.createSubscription(
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
    const clientUser = await userRepository.findById(clientId);
    if (!clientUser) throw AppError.notFound('Client user not found');
    if (clientUser.tenant_id !== tenantId) throw AppError.forbidden('Client does not belong to this tenant');
    if (clientUser.role !== 'CLIENT') throw AppError.badRequest('Target user must have CLIENT role');

    // Idempotency: Check if this PayPal order was already processed
    if (data.paypalOrderId) {
      const existingSub = await subscriptionRepository.findByPaypalOrderId(data.paypalOrderId);
      if (existingSub) {
        return existingSub;
      }
    }

    // Double plan check: Ensure client doesn't buy the same plan twice
    const existingSubs = await subscriptionRepository.findByClient(clientId);
    const hasActivePlan = existingSubs.some((sub) => sub.plan === data.plan && sub.status === 'ACTIVE');
    if (hasActivePlan) {
      throw AppError.badRequest(`You already have an active subscription for the ${data.plan} plan. Please modify your existing subscription instead.`);
    }

    const billingCycle = data.billingCycle || 'monthly';

    // Validate PayPal payment if not done by Admin
    let renewalDate = new Date();
    if (billingCycle === 'annual') {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    if (!byAdmin) {
      if (!data.paypalOrderId) {
        throw AppError.badRequest('PayPal order ID is required for checkout');
      }

      if (data.paypalOrderId.startsWith('I-') || data.paypalOrderId.startsWith('MOCK-SUB-')) {
        // PayPal Subscription Flow
        const subDetails = await paypalService.getSubscription(data.paypalOrderId);
        if (subDetails.status !== 'ACTIVE' && subDetails.status !== 'APPROVED') {
          throw AppError.badRequest(`PayPal subscription is not active (status: ${subDetails.status})`);
        }
        if (subDetails.nextBillingTime) {
          renewalDate = new Date(subDetails.nextBillingTime);
        }
      } else {
        // Legacy checkout/order payment verification
        const order = await paypalService.getOrder(data.paypalOrderId);
        if (order.status === 'APPROVED') {
          const capture = await paypalService.captureOrder(data.paypalOrderId);
          order.status = capture.status;
        }

        if (order.status !== 'COMPLETED') {
          throw AppError.badRequest('PayPal payment was not completed');
        }

        const planDetails = await planRepository.findById(data.plan);
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

    const subscription = await subscriptionRepository.create({
      client_id: clientId,
      service_name: formattedServiceName,
      plan: data.plan as SubscriptionPlan,
      equipment_count: data.equipmentCount,
      renewal_date: renewalDate,
      tenant_id: tenantId,
      paypal_order_id: data.paypalOrderId,
    });

    if (byAdmin) {
      const planDetails = await planRepository.findById(data.plan);
      if (!planDetails) {
        throw AppError.notFound('Plan not found');
      }

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
        const existing = await invoiceRepository.findByInvoiceNumber(invoiceNumber);
        if (!existing) break;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await invoiceRepository.create({
        invoice_number: invoiceNumber,
        client_id: clientId,
        amount: subtotal,
        tax_amount: tax,
        total: total,
        due_date: dueDate,
        tenant_id: tenantId,
      });
    } else {
      // Create PAID invoice record for the client's PayPal checkout payment
      const planDetails = await planRepository.findById(data.plan);
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
          const existing = await invoiceRepository.findByInvoiceNumber(invoiceNumber);
          if (!existing) break;
        }

        const dueDate = new Date();
        await invoiceRepository.create({
          invoice_number: invoiceNumber,
          client_id: clientId,
          amount: subtotal,
          tax_amount: tax,
          total: total,
          due_date: dueDate,
          tenant_id: tenantId,
          status: InvoiceStatus.PAID,
        });
      }
    }

    // Trigger in-app notification for subscription activation
    await notificationService.createInAppNotification({
      userId: clientId,
      title: 'Subscription Activated',
      message: `Your subscription to ${subscription.service_name} is now active.`,
      type: 'SUBSCRIPTION_ACTIVATED_SUCCESS',
      link: '/billing',
      tenantId,
    }).catch((err) => {
      console.error('Failed to create in-app notification for subscription activation:', err);
    });

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
          await paypalService.updateSubscriptionQuantity(sub.paypal_order_id, newCount);
        } else if (newCount > sub.equipment_count) {
          // Legacy check for one-time order upgrades
          if (!data.paypalOrderId) {
            throw AppError.badRequest('PayPal order ID is required to add more devices');
          }

          const order = await paypalService.getOrder(data.paypalOrderId);
          if (order.status === 'APPROVED') {
            const capture = await paypalService.captureOrder(data.paypalOrderId);
            order.status = capture.status;
          }

          if (order.status !== 'COMPLETED') {
            throw AppError.badRequest('PayPal payment for device upgrade was not completed');
          }

          const planDetails = await planRepository.findById(newPlan);
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

      const res = await subscriptionRepository.updatePlan(sub.id, newPlan as SubscriptionPlan, newCount);
      if (!res) throw AppError.internal('Failed to update subscription');
      updated = res;
    }

    if (data.status) {
      const res = await subscriptionRepository.updateStatus(sub.id, data.status);
      if (!res) throw AppError.internal('Failed to update subscription status');
      updated = res;
    }

    return updated;
  }

  async sendQuotation(data: SendQuoteInput, senderUserId: string, senderTenantId: string, role: string): Promise<void> {
    let recipientEmail = '';
    let recipientName = '';
    let recipientLanguage = 'en_US';

    if (data.unregisteredEmail) {
      recipientEmail = data.unregisteredEmail;
      recipientName = data.unregisteredName || 'Valued Customer';
      
      const senderUser = await userRepository.findById(senderUserId);
      if (senderUser) {
        recipientLanguage = senderUser.language || 'en_US';
      }
    } else {
      let targetClientId = senderUserId;
      if (role === 'ADMIN' && data.clientId) {
        targetClientId = data.clientId;
      }
      const clientUser = await userRepository.findById(targetClientId);
      if (!clientUser) {
        throw AppError.notFound('Client user not found');
      }
      if (clientUser.tenant_id !== senderTenantId && role !== 'ADMIN') {
        throw AppError.forbidden('Client does not belong to this tenant');
      }
      recipientEmail = clientUser.email;
      recipientName = clientUser.name;
      recipientLanguage = clientUser.language || 'en_US';
    }

    const planDetails = await planRepository.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const billingCycle = data.billingCycle || 'monthly';
    const price = planDetails.price;
    const equipmentCount = data.equipmentCount;
    const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
    const subtotal = Math.round(price * priceMultiplier * equipmentCount * 100) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    await sendQuotationEmail(
      recipientEmail,
      recipientName,
      planDetails,
      billingCycle,
      equipmentCount,
      subtotal,
      tax,
      total,
      recipientLanguage
    );
  }
}

export const subscriptionService = new SubscriptionService();
