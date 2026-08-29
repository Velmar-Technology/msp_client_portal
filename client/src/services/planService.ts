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

/**
 * Service tier and subscription plan catalog service.
 * Manages plan definitions, features, pricing, and client type targeting.
 */
export const planService = {
  /**
   * Retrieves all available service plans according to filter parameters.
   *
   * @param filters - Query filters (search keyword, clientType, pagination).
   * @returns Promise resolving to array of Plan objects.
   */
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

  /**
   * Admin: Creates a new service subscription plan tier.
   *
   * @param data - Plan definition payload (name, description, price, features, recommended, client_type, active).
   * @returns Promise resolving to created Plan entity.
   */
  async create(
    data: Omit<Plan, 'created_at' | 'updated_at'>
  ): Promise<Plan> {
    const response = await api.post('/plans', data);
    return response.data.data;
  },

  /**
   * Admin: Modifies an existing service subscription plan.
   *
   * @param id - Plan UUID.
   * @param data - Partial plan attributes to update.
   * @returns Promise resolving to updated Plan entity.
   */
  async update(
    id: string,
    data: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Plan> {
    const response = await api.patch(`/plans/${id}`, data);
    return response.data.data;
  },

  /**
   * Admin: Deactivates or removes a service plan.
   *
   * @param id - Plan UUID.
   * @returns Promise resolving to deleted/deactivated Plan entity.
   */
  async delete(id: string): Promise<Plan> {
    const response = await api.delete(`/plans/${id}`);
    return response.data.data;
  },
};
