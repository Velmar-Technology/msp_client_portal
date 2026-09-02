import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { invoiceService } from "@/services/invoiceService";
import type { Invoice } from "@/services/invoiceService";
import { useUrlState } from "@/hooks/useUrlState";

/**
 * Custom hook orchestrating the Billing & Invoices page.
 * Handles invoice pagination, URL synchronization, payment modal flows, PayPal capture, and PDF downloads.
 *
 * @see BL-401 (Subscription Reactivation)
 * @returns Object providing invoices data, filter state, pagination handlers, and modal action controllers.
 */
export function useBilling() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { getParam, getNumberParam, setParam, setParams, removeParams } = useUrlState();

  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [page, setPageInternal] = useState(() => getNumberParam("page", 1));
  const [limit, setLimitInternal] = useState(() => getNumberParam("limit", 10));
  const [loading, setLoading] = useState(true);

  // Active tab state ("invoices" | "plans") derived directly during render (React 19 compiler-friendly)
  const activeTab = getParam("tab", "invoices");

  const setActiveTab = useCallback(
    (tab: string) => {
      setParam("tab", tab === "invoices" ? null : tab);
    },
    [setParam]
  );

  // Filters
  const [search, setSearchInternal] = useState(() => getParam("search", ""));
  const [statusFilter, setStatusFilterInternal] = useState(() => getParam("status", ""));

  const [markingPaid, setMarkingPaid] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoiceService.getAll(1, 200);
      setAllInvoices(result.data);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (isMounted) {
        await fetchInvoices();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchInvoices]);

  // Derive active modal & selected invoice directly from URL parameters (Single Source of Truth)
  const openModalParam = getParam("openModal");
  const invoiceIdParam = getParam("invoiceId") || (location.state as { invoiceId?: string })?.invoiceId;

  const selectedInvoiceFromUrl = invoiceIdParam
    ? allInvoices.find((i) => i.id === invoiceIdParam) || null
    : null;

  const showPayModal = openModalParam === "pay-invoice" && !!selectedInvoiceFromUrl;
  const showMarkPaidModal = openModalParam === "mark-paid" && !!selectedInvoiceFromUrl;
  const showCancelModal = openModalParam === "cancel-invoice" && !!selectedInvoiceFromUrl;
  const showDetailsModal = (openModalParam === "invoice-details" || (!openModalParam && !!invoiceIdParam)) && !!selectedInvoiceFromUrl;

  const selectedInvoice = showPayModal ? selectedInvoiceFromUrl : null;
  const selectedInvoiceToMarkPaid = showMarkPaidModal ? selectedInvoiceFromUrl : null;
  const selectedInvoiceToCancel = showCancelModal ? selectedInvoiceFromUrl : null;
  const selectedInvoiceDetails = showDetailsModal ? selectedInvoiceFromUrl : null;

  const openPayModal = useCallback(
    (inv: Invoice) => {
      setParams({ openModal: "pay-invoice", invoiceId: inv.id });
    },
    [setParams]
  );

  const closePayModal = useCallback(() => {
    removeParams(["openModal", "invoiceId"]);
  }, [removeParams]);

  const openMarkPaidModal = useCallback(
    (inv: Invoice) => {
      setParams({ openModal: "mark-paid", invoiceId: inv.id });
    },
    [setParams]
  );

  const closeMarkPaidModal = useCallback(() => {
    removeParams(["openModal", "invoiceId"]);
  }, [removeParams]);

  const openDetailsModal = useCallback(
    (inv: Invoice) => {
      setParams({ openModal: "invoice-details", invoiceId: inv.id });
    },
    [setParams]
  );

  const closeDetailsModal = useCallback(() => {
    removeParams(["openModal", "invoiceId"]);
  }, [removeParams]);

  const openCancelModal = useCallback(
    (inv: Invoice) => {
      setParams({ openModal: "cancel-invoice", invoiceId: inv.id });
    },
    [setParams]
  );

  const closeCancelModal = useCallback(() => {
    removeParams(["openModal", "invoiceId"]);
  }, [removeParams]);

  const handleDownload = useCallback(async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      const blob = await invoiceService.downloadInvoice(inv.id, i18n.language);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${inv.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download invoice', err);
    } finally {
      setDownloadingId(null);
    }
  }, [i18n.language]);

  const handleMarkAsPaid = useCallback(async () => {
    if (!selectedInvoiceToMarkPaid) return;
    setMarkingPaid(true);
    try {
      await invoiceService.markAsPaid(selectedInvoiceToMarkPaid.id);
      await fetchInvoices();
      closeMarkPaidModal();
    } catch (err) {
      console.error('Failed to mark invoice as paid', err);
    } finally {
      setMarkingPaid(false);
    }
  }, [selectedInvoiceToMarkPaid, fetchInvoices, closeMarkPaidModal]);

  const handleCancelInvoice = useCallback(async (reason?: string) => {
    if (!selectedInvoiceToCancel) return;
    setCancelling(true);
    try {
      await invoiceService.cancelInvoice(selectedInvoiceToCancel.id, reason);
      await fetchInvoices();
      closeCancelModal();
    } catch (err) {
      console.error('Failed to cancel invoice', err);
    } finally {
      setCancelling(false);
    }
  }, [selectedInvoiceToCancel, fetchInvoices, closeCancelModal]);

  // Client-side sorted and filtered list (derived directly during render for React 19 compiler)
  const sortedInvoices = [...allInvoices].sort((a, b) => {
    const dateA = new Date(a.created_at || a.invoice_date).getTime();
    const dateB = new Date(b.created_at || b.invoice_date).getTime();
    return dateB - dateA;
  });

  const filteredInvoices = sortedInvoices.filter((inv) => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredTotal = filteredInvoices.length;
  const totalPages = Math.ceil(filteredTotal / limit);

  const paginatedInvoices = filteredInvoices.slice(
    (page - 1) * limit,
    page * limit,
  );

  const setPage = useCallback(
    (newPage: number) => {
      setPageInternal(newPage);
      setParam("page", newPage === 1 ? null : newPage);
    },
    [setParam]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInternal(value);
      setParams({ search: value || null, page: null });
    },
    [setParams]
  );

  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilterInternal(value);
      setParams({ status: value || null, page: null });
    },
    [setParams]
  );

  const handleLimitChange = useCallback(
    (value: number) => {
      setLimitInternal(value);
      setPageInternal(1);
      setParams({ limit: value === 10 ? null : value, page: null });
    },
    [setParams]
  );

  return {
    t,
    i18n,
    activeTab,
    setActiveTab,
    invoices: paginatedInvoices,
    total: filteredTotal,
    page,
    totalPages,
    limit,
    loading,
    selectedInvoice,
    showPayModal,
    downloadingId,
    search,
    statusFilter,
    setPage,
    handleSearchChange,
    handleStatusFilterChange,
    handleLimitChange,
    handleDownload,
    openPayModal,
    closePayModal,
    selectedInvoiceToMarkPaid,
    showMarkPaidModal,
    markingPaid,
    openMarkPaidModal,
    closeMarkPaidModal,
    handleMarkAsPaid,
    selectedInvoiceToCancel,
    showCancelModal,
    cancelling,
    openCancelModal,
    closeCancelModal,
    handleCancelInvoice,
    allInvoices,
    selectedInvoiceDetails,
    showDetailsModal,
    openDetailsModal,
    closeDetailsModal,
    fetchInvoices,
  };
}

