import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { userRepository } from '../repositories/UserRepository';
import { planRepository } from '../repositories/PlanRepository';
import { invoiceRepository } from '../repositories/InvoiceRepository';
import { AppError } from '../utils/AppError';
import { TAX_RATE } from '../config/constants';
import { Subscription } from '../types';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from '../dtos/subscription.dto';

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

  async createSubscription(data: CreateSubscriptionInput, clientId: string, tenantId: string, byAdmin = false): Promise<Subscription> {
    const clientUser = await userRepository.findById(clientId);
    if (!clientUser) throw AppError.notFound('Client user not found');
    if (clientUser.tenant_id !== tenantId) throw AppError.forbidden('Client does not belong to this tenant');
    if (clientUser.role !== 'CLIENT') throw AppError.badRequest('Target user must have CLIENT role');

    const billingCycle = data.billingCycle || 'monthly';
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
      plan: data.plan,
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
    }

    return subscription;
  }

  async updateSubscription(id: string, data: UpdateSubscriptionInput, tenantId: string): Promise<Subscription> {
    const sub = await this.getSubscriptionById(id, tenantId);
    let updated = sub;

    if (data.plan) {
      const res = await subscriptionRepository.updatePlan(sub.id, data.plan, data.equipmentCount);
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
}

export const subscriptionService = new SubscriptionService();
