import api from '@/services/api';
import type { NavKey, NavCounterContract } from '@shared/contracts';

/**
 * API service for sidebar navigation counters and seen-state management.
 */
export const navCounterService = {
  async getCounters(): Promise<Record<NavKey, NavCounterContract>> {
    const response = await api.get('/nav/counters');
    return response.data.data;
  },

  async markSeen(navKey: NavKey): Promise<void> {
    await api.post('/nav/seen', { navKey });
  },
};
