import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { navCounterService } from './navCounterService';
import type { NavKey } from '@shared/contracts';

/**
 * Query Keys for navigation counters.
 */
export const NAV_COUNTER_QUERY_KEYS = {
  all: ['nav-counters'] as const,
};

/**
 * Query hook for fetching per-destination sidebar counters.
 *
 * @returns TanStack Query result with counter map keyed by nav key.
 */
export function useNavCounters() {
  return useQuery({
    queryKey: NAV_COUNTER_QUERY_KEYS.all,
    queryFn: () => navCounterService.getCounters(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Mutation hook for marking a nav destination as seen.
 * Automatically invalidates counters cache on success.
 *
 * @returns TanStack Query mutation for mark-seen.
 */
export function useMarkNavSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (navKey: NavKey) => navCounterService.markSeen(navKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NAV_COUNTER_QUERY_KEYS.all });
    },
  });
}
