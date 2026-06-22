import api from './api';

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: PlanFeature[];
  recommended: boolean;
  created_at: string;
  updated_at: string;
}

export const planService = {
  async getAll(): Promise<Plan[]> {
    const response = await api.get('/plans');
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
