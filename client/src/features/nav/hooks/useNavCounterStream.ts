import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/useNotificationStore';
import { NAV_COUNTER_QUERY_KEYS } from '../api/useNavCounterQueries';

/**
 * Subscribes to SSE nav:invalidate events via the notification store
 * and automatically invalidates the nav counters query for live sidebar updates.
 */
export function useNavCounterStream() {
  const queryClient = useQueryClient();
  const navInvalidationAt = useNotificationStore((s) => s.navInvalidationAt);

  useEffect(() => {
    if (navInvalidationAt > 0) {
      queryClient.invalidateQueries({ queryKey: NAV_COUNTER_QUERY_KEYS.all });
    }
  }, [navInvalidationAt, queryClient]);
}
