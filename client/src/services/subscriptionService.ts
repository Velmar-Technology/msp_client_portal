import api from './api';

export interface Subscription {
  id: string;
  client_id: string;
  service_name: string;
  plan: 'BASIC' | 'STANDARD' | 'PREMIUM';
  status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CANCELLED';
  renewal_date: string;
  equipment_count: number;
  created_at: string;
}

export const subscriptionService = {
  async getAll(): Promise<Subscription[]> {
    const response = await api.get('/subscriptions');
    return response.data.data;
  },

  async create(data: { serviceName: string; plan: string; equipmentCount: number; clientId?: string; billingCycle?: 'monthly' | 'annual' }): Promise<Subscription> {
    const response = await api.post('/subscriptions', data);
    return response.data.data;
  },

  async update(id: string, data: { plan?: string; equipmentCount?: number; status?: string }): Promise<Subscription> {
    const response = await api.patch(`/subscriptions/${id}`, data);
    return response.data.data;
  },

  async sendQuote(data: { plan: string; equipmentCount: number; clientId?: string; unregisteredEmail?: string; unregisteredName?: string; billingCycle: 'monthly' | 'annual' }): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/subscriptions/quote', data);
    return response.data;
  },
};

