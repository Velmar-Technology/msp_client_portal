import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ticketService } from "@/features/tickets";
import { subscriptionService } from "@/features/subscriptions";
import type { Subscription } from "@/features/subscriptions";
import { invoiceService, type Invoice } from "@/features/billing";
import { equipmentService } from "@/features/equipment";

/**
 * Calculates Nextcloud storage quota in Gigabytes (GB) allocated for a given subscription plan ID.
 *
 * @param planId - Plan code or identifier string.
 * @returns Allocated storage quota in gigabytes.
 */
export const getPlanStorageQuotaGB = (planId: string): number => {
  if (planId.includes('PL-001')) return 25;
  if (planId.includes('PL-002')) return 50;
  if (planId.includes('PL-003')) return 250;
  if (planId.includes('PL-004')) return 1000;
  if (planId.includes('PL-005')) return 5000;
  if (planId.includes('PL-006')) return 50;
  if (planId === 'BASIC') return 25;
  if (planId === 'STANDARD') return 50;
  if (planId === 'PREMIUM') return 100;
  return 25;
};

/**
 * Formats a raw numeric byte value into a localized human-readable file size string (e.g. "250 GB").
 *
 * @param bytes - Size in raw bytes.
 * @param decimals - Decimal points to format. Defaults to 1.
 * @returns Human-readable size string.
 */
export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Custom hook providing overview metrics and summary data for the Client Dashboard.
 * Coordinates ticket status counters, active subscriptions, recent invoices, and storage utilization.
 *
 * @returns Client dashboard metrics, recent subscription/invoice records, and navigation actions.
 */
export function useClientDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [statusSummary, setStatusSummary] = useState<Record<string, number>>({});
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Storage and account quota state
  const [totalSlotsCount, setTotalSlotsCount] = useState<number>(0);
  const [activeSlotsCount, setActiveSlotsCount] = useState<number>(0);
  const [totalStorageQuota, setTotalStorageQuota] = useState<number>(0); // in bytes
  const [activeStorageQuota, setActiveStorageQuota] = useState<number>(0); // in bytes

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [summary, subs, invData] = await Promise.all([
          ticketService.getStatusSummary(),
          subscriptionService.getAll(),
          invoiceService.getAll(1, 3),
        ]);

        if (!isMounted) return;

        setStatusSummary(summary);
        setSubscriptions(subs);
        setInvoices(invData.data || []);

        // Fetch slots for active subscriptions
        const activeSubs = subs.filter((sub) => sub.status === 'ACTIVE');
        let totalSlots = 0;
        let activeSlots = 0;
        let totalStorage = 0;
        let activeStorage = 0;

        await Promise.all(
          activeSubs.map(async (sub) => {
            try {
              const slots = await equipmentService.getSlots(sub.id);
              const planQuotaBytes = getPlanStorageQuotaGB(sub.plan) * 1024 * 1024 * 1024;
              
              totalSlots += sub.equipment_count;
              
              const activeInSub = slots.filter((s) => s.status === 'ACTIVE').length;
              activeSlots += activeInSub;

              slots.forEach((slot) => {
                if (slot.status === 'ACTIVE') {
                  if (slot.nextcloud_used_bytes !== undefined && slot.nextcloud_total_bytes !== undefined) {
                    activeStorage += slot.nextcloud_used_bytes;
                    totalStorage += slot.nextcloud_total_bytes;
                  } else {
                    totalStorage += planQuotaBytes;
                  }
                } else {
                  totalStorage += planQuotaBytes;
                }
              });
            } catch (err) {
              console.error(`Failed to load slots for subscription ${sub.id}`, err);
              // Fallback: count total licensed slots, assume 0 active
              totalSlots += sub.equipment_count;
              const planQuotaBytes = getPlanStorageQuotaGB(sub.plan) * 1024 * 1024 * 1024;
              totalStorage += sub.equipment_count * planQuotaBytes;
            }
          })
        );

        if (!isMounted) return;

        setTotalSlotsCount(totalSlots);
        setActiveSlotsCount(activeSlots);
        setTotalStorageQuota(totalStorage);
        setActiveStorageQuota(activeStorage);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Derive computed values during render (React 19 compiler-friendly)
  const openTickets = (statusSummary.OPEN || 0) + (statusSummary.IN_PROGRESS || 0);

  const handleNewTicket = useCallback(() => {
    navigate('/tickets?action=new');
  }, [navigate]);

  const getStatusColor = useCallback((status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-zinc-100 text-zinc-900 border border-zinc-200/60 dark:bg-zinc-800/80 dark:text-zinc-50 dark:border-zinc-700/80',
      EXPIRING: 'bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40',
      EXPIRED: 'bg-red-50 text-red-800 border border-red-200/60 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/40',
      PENDING: 'bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40',
      PAID: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40',
      OVERDUE: 'bg-red-50 text-red-800 border border-red-200/60 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/40',
    };
    return colors[status] || 'bg-zinc-50 text-zinc-800 border border-zinc-200/60 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800/60';
  }, []);

  return {
    t,
    loading,
    subscriptions,
    invoices,
    openTickets,
    totalSlotsCount,
    activeSlotsCount,
    totalStorageQuota,
    activeStorageQuota,
    handleNewTicket,
    getStatusColor,
  };
}
