import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoiceService } from "../services/invoiceService";
import type { Invoice } from "../services/invoiceService";
import { systemService } from "../services/systemService";
import type { StorageStatus } from "../services/systemService";
import { ticketService } from "../services/ticketService";

export function useAdminDashboard() {
  const { t, i18n } = useTranslation();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [ticketSummary, setTicketSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadInvoices() {
      try {
        const invData = await invoiceService.getAll(1, 5);
        setInvoices(invData.data || []);
      } catch (err) {
        console.error("Failed to load recent invoices:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadStorage() {
      try {
        const data = await systemService.getStorageUsage();
        setStorage(data);
      } catch (err) {
        console.error("Failed to load storage quota:", err);
      } finally {
        setStorageLoading(false);
      }
    }

    async function loadTickets() {
      try {
        const summary = await ticketService.getStatusSummary();
        setTicketSummary(summary);
      } catch (err) {
        console.error("Failed to load ticket summary/DB connection:", err);
      }
    }

    loadInvoices();
    loadStorage();
    loadTickets();
  }, []);

  const openTickets = useMemo(() => {
    return (ticketSummary.OPEN || 0) + (ticketSummary.IN_PROGRESS || 0);
  }, [ticketSummary]);

  const getStatusLabel = useCallback((status: string) => {
    const map: Record<string, string> = {
      PENDING: t("tickets.filterAwaitingPayment"),
      PAID: t("tickets.filterResolved"),
    };
    return map[status] || status;
  }, [t]);

  const getStatusColorClass = useCallback((status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50",
      PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
      OVERDUE: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
    };
    return colors[status] || "bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800";
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
    getStatusLabel,
    getStatusColorClass,
  };
}
