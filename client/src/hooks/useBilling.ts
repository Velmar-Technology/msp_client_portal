import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { invoiceService } from "@/services/invoiceService";
import type { Invoice } from "@/services/invoiceService";

export function useBilling() {
  const { t, i18n } = useTranslation();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters (client-side)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoiceToMarkPaid, setSelectedInvoiceToMarkPaid] = useState<Invoice | null>(null);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<Invoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [selectedInvoiceToCancel, setSelectedInvoiceToCancel] = useState<Invoice | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a large batch to enable client-side filtering
      const result = await invoiceService.getAll(1, 200);
      setAllInvoices(result.data);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

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

  const openPayModal = useCallback((inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowPayModal(true);
  }, []);

  const closePayModal = useCallback(() => {
    setShowPayModal(false);
    setSelectedInvoice(null);
  }, []);

  const openMarkPaidModal = useCallback((inv: Invoice) => {
    setSelectedInvoiceToMarkPaid(inv);
    setShowMarkPaidModal(true);
  }, []);

  const closeMarkPaidModal = useCallback(() => {
    setShowMarkPaidModal(false);
    setSelectedInvoiceToMarkPaid(null);
  }, []);

  const openDetailsModal = useCallback((inv: Invoice) => {
    setSelectedInvoiceDetails(inv);
    setShowDetailsModal(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedInvoiceDetails(null);
  }, []);

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

  const openCancelModal = useCallback((inv: Invoice) => {
    setSelectedInvoiceToCancel(inv);
    setShowCancelModal(true);
  }, []);

  const closeCancelModal = useCallback(() => {
    setShowCancelModal(false);
    setSelectedInvoiceToCancel(null);
  }, []);

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

  // Client-side sorted and filtered list
  const sortedInvoices = useMemo(() => {
    return [...allInvoices].sort((a, b) => {
      const dateA = new Date(a.created_at || a.invoice_date).getTime();
      const dateB = new Date(b.created_at || b.invoice_date).getTime();
      return dateB - dateA;
    });
  }, [allInvoices]);

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

  // Paginate the filtered list
  const paginatedInvoices = filteredInvoices.slice(
    (page - 1) * limit,
    page * limit,
  );

  // Reset page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
  }, []);

  return {
    t,
    i18n,
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
