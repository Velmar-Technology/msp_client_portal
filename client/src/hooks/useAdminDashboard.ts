import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoiceService } from "@/services/invoiceService";
import type { Invoice } from "@/services/invoiceService";
import { systemService } from "@/services/systemService";
import type { StorageStatus } from "@/services/systemService";
import { ticketService } from "@/services/ticketService";
import { maintenanceService } from "@/services/maintenanceService";
import type { DeviceMaintenance } from "@/services/maintenanceService";

/**
 * Custom hook providing overview metrics and aggregate data for the Admin Dashboard.
 * Loads recent invoices, system storage telemetry, ticket status summaries, and upcoming maintenance tasks.
 *
 * @returns Aggregated metrics, recent entity records, localized table columns, and loading indicators.
 */
export function useAdminDashboard() {
  const { t, i18n } = useTranslation();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [ticketSummary, setTicketSummary] = useState<Record<string, number>>({});
  const [maintenances, setMaintenances] = useState<DeviceMaintenance[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadInvoices() {
      try {
        const invData = await invoiceService.getAll(1, 5);
        if (isMounted) setInvoices(invData.data || []);
      } catch (err) {
        console.error("Failed to load recent invoices:", err);
      }
    }

    async function loadStorage() {
      try {
        const data = await systemService.getStorageUsage();
        if (isMounted) setStorage(data);
      } catch (err) {
        console.error("Failed to load storage quota:", err);
      } finally {
        if (isMounted) setStorageLoading(false);
      }
    }

    async function loadTickets() {
      try {
        const summary = await ticketService.getStatusSummary();
        if (isMounted) setTicketSummary(summary);
      } catch (err) {
        console.error("Failed to load ticket summary/DB connection:", err);
      }
    }

    async function loadMaintenances() {
      try {
        const data = await maintenanceService.getMaintenances();
        if (isMounted) setMaintenances(data || []);
      } catch (err) {
        console.error("Failed to load maintenances:", err);
      } finally {
        if (isMounted) setMaintenanceLoading(false);
      }
    }

    Promise.all([
      loadInvoices(),
      loadTickets(),
      loadMaintenances(),
    ]).finally(() => {
      if (isMounted) setLoading(false);
    });

    loadStorage();

    return () => {
      isMounted = false;
    };
  }, []);

  // Derive values directly during render (React 19 compiler-friendly)
  const openTickets = (ticketSummary.OPEN || 0) + (ticketSummary.IN_PROGRESS || 0);

  const activeMaintenances = maintenances.filter(
    (m) => m.status === "SCHEDULED" || m.status === "IN_PROGRESS" || m.status === "OVERDUE"
  );
  const nextMaintenance =
    activeMaintenances.length > 0
      ? [...activeMaintenances].sort(
          (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
        )[0]
      : null;

  const getStatusLabel = useCallback((status: string) => {
    const map: Record<string, string> = {
      PENDING: t("tickets.filterAwaitingPayment"),
      PAID: t("tickets.filterResolved"),
    };
    return map[status] || status;
  }, [t]);

  const getStatusColorClass = useCallback((status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-50 text-amber-800 border border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40",
      PAID: "bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40",
      OVERDUE: "bg-red-50 text-red-800 border border-red-200/60 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/40",
    };
    return colors[status] || "bg-zinc-50 text-zinc-800 border border-zinc-200/60 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800/60";
  }, []);

  return {
    t,
    i18n,
    invoices,
    loading,
    storage,
    storageLoading,
    ticketSummary,
    openTickets,
    nextMaintenance,
    maintenanceLoading,
    getStatusLabel,
    getStatusColorClass,
  };
}
