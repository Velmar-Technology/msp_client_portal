import api from './api';

export interface PlanFeature {
  text: string | Record<string, string>;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string | Record<string, string>;
  description: string | Record<string, string> | null;
  price: number;
  features: PlanFeature[];
  recommended: boolean;
  client_type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const planService = {
  async getAll(): Promise<Plan[]> {
    const response = await api.get('/plans');
    return response.data.data;
  },

  async create(
    data: Omit<Plan, 'created_at' | 'updated_at'>
  ): Promise<Plan> {
    const response = await api.post('/plans', data);
    return response.data.data;
  },

  async update(
    id: string,
    data: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Plan> {
    const response = await api.patch(`/plans/${id}`, data);
    return response.data.data;
  },
};
