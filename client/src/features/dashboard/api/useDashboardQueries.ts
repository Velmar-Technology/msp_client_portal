import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '@/features/billing';
import { systemService } from '@/features/system';

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for Dashboard.
 */
export const DASHBOARD_QUERY_KEYS = {
  all: ['dashboard'] as const,
  adminSummary: () => [...DASHBOARD_QUERY_KEYS.all, 'admin-summary'] as const,
};

export function useAdminDashboardMetrics() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.adminSummary(),
    queryFn: async () => {
      const [storage, invoices] = await Promise.all([
        systemService.getStorageUsage(),
        invoiceService.getAll(1, 5),
      ]);
      return { storage, recentInvoices: invoices.data };
    },
  });
}
