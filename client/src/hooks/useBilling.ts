import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoiceService } from '../services/invoiceService';
import type { Invoice } from '../services/invoiceService';

export function useBilling() {
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoiceService.getAll(page, limit);
      setInvoices(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInvoices();
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

  const totalPages = Math.ceil(total / limit);

  return {
    t,
    i18n,
    invoices,
    total,
    page,
    totalPages,
    loading,
    selectedInvoice,
    showPayModal,
    downloadingId,
    setPage,
    handleDownload,
    openPayModal,
    closePayModal,
    fetchInvoices,
  };
}
