import api from "@/services/api";

import { PLAN_CLIENT_TYPES, type PlanClientType } from "@/constants/subscriptions";
export { PLAN_CLIENT_TYPES, type PlanClientType };


export interface PlanFeature {
  code?: string;
  params?: Record<string, string | number | boolean>;
  text?: string | Record<string, string>;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string | Record<string, string>;
  description: string | Record<string, string> | null;
  price: number;
  features: PlanFeature[];
  recommended: boolean;
  client_type: PlanClientType;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanFilters {
  search?: string;
  clientType?: PlanClientType;
  page?: number;
  limit?: number;
}

export const planService = {
  async getAll(filters: PlanFilters = {}): Promise<Plan[]> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.clientType) params.set("clientType", filters.clientType);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    const response = await api.get(`/plans${qs ? `?${qs}` : ""}`);
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

  async delete(id: string): Promise<Plan> {
    const response = await api.delete(`/plans/${id}`);
    return response.data.data;
  },
};
