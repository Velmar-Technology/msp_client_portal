import { BaseRepository } from './BaseRepository';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../types';

export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor() {
    super('subscriptions');
  }

  async findByClient(clientId: string): Promise<Subscription[]> {
    return this.query<Subscription>(
      'SELECT * FROM subscriptions WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId],
    );
  }

  async create(data: {
    client_id: string;
    service_name: string;
    plan: SubscriptionPlan;
    equipment_count: number;
    renewal_date: Date;
  }): Promise<Subscription> {
    const result = await this.queryOne<Subscription>(
      `INSERT INTO subscriptions (client_id, service_name, plan, equipment_count, renewal_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.client_id, data.service_name, data.plan, data.equipment_count, data.renewal_date],
    );
    return result!;
  }

  async updatePlan(id: string, plan: SubscriptionPlan, equipmentCount?: number): Promise<Subscription | null> {
    if (equipmentCount !== undefined) {
      return this.queryOne<Subscription>(
        'UPDATE subscriptions SET plan = $1, equipment_count = $2 WHERE id = $3 RETURNING *',
        [plan, equipmentCount, id],
      );
    }
    return this.queryOne<Subscription>(
      'UPDATE subscriptions SET plan = $1 WHERE id = $2 RETURNING *',
      [plan, id],
    );
  }

  async updateStatus(id: string, status: SubscriptionStatus): Promise<Subscription | null> {
    return this.queryOne<Subscription>(
      'UPDATE subscriptions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );
  }
}

export const subscriptionRepository = new SubscriptionRepository();
