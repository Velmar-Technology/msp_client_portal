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

  async createPaypalOrderForSubscription(data: { plan: string; equipmentCount: number; billingCycle?: 'monthly' | 'annual' }): Promise<{ orderId: string }> {
    const planDetails = await planRepository.findById(data.plan);
    if (!planDetails) {
      throw AppError.notFound('Plan not found');
    }

    const price = planDetails.price;
    const equipmentCount = data.equipmentCount ?? 1;
    const billingCycle = data.billingCycle || 'monthly';
    const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
    const subtotal = Math.round(price * priceMultiplier * equipmentCount * 100) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const description = `${planDetails.name} Subscription - ${equipmentCount} Equipment (${billingCycle === 'annual' ? 'Annually' : 'Monthly'})`;
    const referenceId = `SUB-${planDetails.id}-${Date.now()}`;
    const order = await paypalService.createOrderForAmount(total, description, referenceId);

    return { orderId: order.id };
  }

  async createSubscription(data: CreateSubscriptionInput, clientId: string, tenantId: string, byAdmin = false): Promise<Subscription> {
    const clientUser = await userRepository.findById(clientId);
    if (!clientUser) throw AppError.notFound('Client user not found');
    if (clientUser.tenant_id !== tenantId) throw AppError.forbidden('Client does not belong to this tenant');
    if (clientUser.role !== 'CLIENT') throw AppError.badRequest('Target user must have CLIENT role');

    const billingCycle = data.billingCycle || 'monthly';

    // Validate PayPal payment if not done by Admin
    if (!byAdmin) {
      if (!data.paypalOrderId) {
        throw AppError.badRequest('PayPal order ID is required for checkout');
      }

      // 1. Get order details from PayPal
      const order = await paypalService.getOrder(data.paypalOrderId);
      
      // 2. Capture the order if it's approved
      if (order.status === 'APPROVED') {
        const capture = await paypalService.captureOrder(data.paypalOrderId);
        order.status = capture.status;
      }

      if (order.status !== 'COMPLETED') {
        throw AppError.badRequest('PayPal payment was not completed');
      }

      // 3. Verify total paid matches expected total
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

      // Extract amount paid from PayPal order purchase units
      const purchaseUnit = order.purchase_units?.[0];
      const paidAmount = Number(purchaseUnit?.amount?.value);
      if (isNaN(paidAmount) || Math.abs(paidAmount - expectedTotal) > 0.05) {
        throw AppError.badRequest(`Paid amount $${paidAmount} does not match expected subscription cost $${expectedTotal}`);
      }
    }

    const renewalDate = new Date();
    if (billingCycle === 'annual') {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
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

    return subscription;
  }

  async updateSubscription(id: string, data: UpdateSubscriptionInput, tenantId: string): Promise<Subscription> {
    const sub = await this.getSubscriptionById(id, tenantId);
    let updated = sub;

    if (data.plan) {
      const res = await subscriptionRepository.updatePlan(sub.id, data.plan as SubscriptionPlan, data.equipmentCount);
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
