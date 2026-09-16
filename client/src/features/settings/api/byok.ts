import api from '@/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  TenantByokConfigInput,
  TenantByokStatus,
  TestByokConnectionInput,
  TestByokConnectionResponse,
} from '@shared/contracts';

/**
 * TanStack Query Cache Keys for Tenant BYOK AI Credentials.
 */
export const BYOK_QUERY_KEYS = {
  all: ['system', 'byok'] as const,
  status: () => [...BYOK_QUERY_KEYS.all, 'status'] as const,
};

/**
 * API service communicating with /api/v1/system/byok endpoints.
 */
export const byokService = {
  /**
   * Retrieves the sanitized BYOK configuration status for the current tenant.
   */
  async getStatus(): Promise<TenantByokStatus> {
    const response = await api.get<{ success: boolean; data: TenantByokStatus }>(
      '/system/byok/status'
    );
    return response.data.data;
  },

  /**
   * Saves or updates the tenant's encrypted BYOK AI credentials.
   */
  async saveConfig(input: TenantByokConfigInput): Promise<TenantByokStatus> {
    const response = await api.put<{ success: boolean; data: TenantByokStatus }>(
      '/system/byok',
      input
    );
    return response.data.data;
  },

  /**
   * Executes an in-memory connection and model list test without persisting keys.
   */
  async testConnection(
    input: TestByokConnectionInput
  ): Promise<TestByokConnectionResponse> {
    const response = await api.post<{
      success: boolean;
      data: TestByokConnectionResponse;
    }>('/system/byok/test', input);
    return response.data.data;
  },
};

/**
 * Hook to query sanitized BYOK status for the authenticated tenant.
 */
export function useTenantByokStatus() {
  return useQuery({
    queryKey: BYOK_QUERY_KEYS.status(),
    queryFn: () => byokService.getStatus(),
  });
}

/**
 * Hook to persist encrypted BYOK credentials and invalidate query cache.
 */
export function useSaveTenantByok() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TenantByokConfigInput) => byokService.saveConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BYOK_QUERY_KEYS.status() });
    },
  });
}

/**
 * Hook to test candidate BYOK credentials in memory.
 */
export function useTestByokConnection() {
  return useMutation({
    mutationFn: (input: TestByokConnectionInput) =>
      byokService.testConnection(input),
  });
}
