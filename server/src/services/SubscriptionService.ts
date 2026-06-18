import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { AppError } from '../utils/AppError';
import { Subscription } from '../types';
import { CreateSubscriptionInput, UpdateSubscriptionInput } from '../dtos/subscription.dto';

export class SubscriptionService {
  async getClientSubscriptions(clientId: string): Promise<Subscription[]> {
    return subscriptionRepository.findByClient(clientId);
  }

  async getSubscriptionById(id: string, clientId: string): Promise<Subscription> {
    const sub = await subscriptionRepository.findById(id);
    if (!sub) throw AppError.notFound('Subscription not found');
    if (sub.client_id !== clientId) throw AppError.forbidden('Access denied');
    return sub;
  }

  async createSubscription(data: CreateSubscriptionInput, clientId: string): Promise<Subscription> {
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    return subscriptionRepository.create({
      client_id: clientId,
      service_name: data.serviceName,
      plan: data.plan,
      equipment_count: data.equipmentCount,
      renewal_date: renewalDate,
    });
  }

  async updateSubscription(id: string, data: UpdateSubscriptionInput, clientId: string): Promise<Subscription> {
    const sub = await this.getSubscriptionById(id, clientId);

    if (data.plan) {
      const updated = await subscriptionRepository.updatePlan(sub.id, data.plan, data.equipmentCount);
      if (!updated) throw AppError.internal('Failed to update subscription');
      return updated;
    }

    return sub;
  }
}

export const subscriptionService = new SubscriptionService();
