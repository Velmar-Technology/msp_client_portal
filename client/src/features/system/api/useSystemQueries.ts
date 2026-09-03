import { useQuery, useMutation } from '@tanstack/react-query';
import { systemService } from './systemService';

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for System.
 */
export const SYSTEM_QUERY_KEYS = {
  all: ['system'] as const,
  storage: () => [...SYSTEM_QUERY_KEYS.all, 'storage'] as const,
  apiStatus: () => [...SYSTEM_QUERY_KEYS.all, 'api-status'] as const,
};

export function useStorageUsage() {
  return useQuery({
    queryKey: SYSTEM_QUERY_KEYS.storage(),
    queryFn: () => systemService.getStorageUsage(),
  });
}

export function useApiStatusQuery() {
  return useQuery({
    queryKey: SYSTEM_QUERY_KEYS.apiStatus(),
    queryFn: () => systemService.getApiStatus(),
  });
}

export function useResetVaultAccessMutation() {
  return useMutation({
    mutationFn: () => systemService.resetVaultAccess(),
  });
}
