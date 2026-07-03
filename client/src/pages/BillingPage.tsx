import { useState, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, CreditCard, Loader2 } from 'lucide-react';
import { Page } from '@/components/Page';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useBilling } from '../hooks/useBilling';
import type { Invoice } from '../services/invoiceService';
import { invoiceService } from '../services/invoiceService';

/* --- Sub-Components --- */

const statusColor: Record<string, string> = {
  PENDING: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700',
  PAID: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  OVERDUE: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

const PayModal = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
  t: (key: string, options?: any) => string;
}) => {
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice) return;

    let scriptElement: HTMLScriptElement | null = null;
    let buttonsInstance: any = null;

    async function initializePaypal() {
      const scriptId = 'paypal-js-sdk-script';
      let existingScript = document.getElementById(scriptId) as HTMLScriptElement;

      if (!existingScript) {
        scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';
        scriptElement.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        scriptElement.async = true;
        document.body.appendChild(scriptElement);

        await new Promise((resolve) => {
          if (scriptElement) scriptElement.onload = resolve;
        });
      } else {
        scriptElement = existingScript;
      }

      if (!(window as any).paypal) {
        console.error('PayPal SDK failed to load');
        setPaymentMessage(t('billing.paymentError'));
        return;
      }

      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = '';
        try {
          buttonsInstance = (window as any).paypal.Buttons({
            createOrder: async () => {
              setPaymentMessage(t('billing.paymentProcessing'));
              try {
                const { orderId } = await invoiceService.createPaypalOrder(invoice.id);
                return orderId;
              } catch (err) {
                console.error(err);
                setPaymentMessage(t('billing.paymentError'));
                throw err;
              }
            },
            onApprove: async (data: any) => {
              setPaymentMessage(t('billing.paymentProcessing'));
              try {
                const response = await invoiceService.capturePaypalOrder(invoice.id, data.orderID);
                if (response.success) {
                  setIsSuccess(true);
                  setPaymentMessage(t('billing.paymentSuccess'));
                  onSuccess();
                } else {
                  setPaymentMessage(t('billing.paymentError'));
                }
              } catch (err) {
                console.error(err);
                setPaymentMessage(t('billing.paymentError'));
              }
            },
            onError: (err: any) => {
              console.error(err);
              setPaymentMessage(t('billing.paymentError'));
            }
          });
          buttonsInstance.render('#paypal-button-container');
        } catch (err) {
          console.error('Failed to render PayPal buttons', err);
        }
      }
    }

    initializePaypal();

    return () => {
      if (buttonsInstance && buttonsInstance.close) {
        try {
          buttonsInstance.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isOpen, invoice, t, onSuccess]);

  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-6 text-zinc-900 dark:text-zinc-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <CreditCard className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
            {t('billing.modalPayTitle', { number: invoice.invoice_number })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('billing.modalPayDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col gap-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Amount:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">${Number(invoice.amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Tax (18%):</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">${Number(invoice.tax_amount).toFixed(2)}</span>
          </div>
          <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-2" />
          <div className="flex justify-between items-center text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <span>{t('billing.amountDue')}:</span>
            <span>${Number(invoice.total).toFixed(2)}</span>
          </div>
        </div>

        {paymentMessage && (
          <div className={`p-3 rounded-md mb-4 text-center text-sm font-medium ${
            isSuccess 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700'
              : paymentMessage === t('billing.paymentProcessing')
                ? 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 animate-pulse'
                : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {paymentMessage}
          </div>
        )}

        {!isSuccess && (
          <div id="paypal-button-container" className="my-4 min-h-[150px] flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 border-dashed">
            <div className="flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" />
              <span className="text-sm">Loading payment options...</span>
            </div>
          </div>
        )}

        <AlertDialogFooter className="mt-6 flex justify-end gap-2">
          <AlertDialogCancel 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {t('billing.close')}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const InvoiceRow = ({
  invoice: inv,
  t,
  i18n,
  downloadingId,
  onDownload,
  onPay,
}: {
  invoice: Invoice;
  t: (key: string) => string;
  i18n: any;
  downloadingId: string | null;
  onDownload: (inv: Invoice) => void;
  onPay: (inv: Invoice) => void;
}) => {
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t('tickets.filterAwaitingPayment'),
      PAID: t('tickets.filterResolved'),
      OVERDUE: t('dashboard.tableStatus') === 'Estado' ? 'VENCIDA' : 'OVERDUE',
    };
    return map[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    });
  };

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{inv.invoice_number}</td>
      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{formatDate(inv.due_date)}</td>
      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">${Number(inv.amount).toFixed(2)}</td>
      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">${Number(inv.tax_amount).toFixed(2)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">${Number(inv.total).toFixed(2)}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 inline-flex text-xs font-semibold rounded-md border ${statusColor[inv.status]}`}>
          {getStatusLabel(inv.status)}
        </span>
      </td>
      <td className="px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => onDownload(inv)}
          disabled={downloadingId === inv.id}
          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer disabled:opacity-50"
          title={t('billing.downloadInvoice')}
        >
          {downloadingId === inv.id ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400 dark:text-zinc-500" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
        {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
          <button
            onClick={() => onPay(inv)}
            className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title={t('billing.payNow')}
          >
            <CreditCard className="h-3.5 w-3.5" />
            {t('billing.payNow')}
          </button>
        )}
      </td>
    </tr>
  );
};

const PaginationControl = ({
  page,
  totalPages,
  totalItems,
  onPageChange,
  t,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  t: (key: string) => string;
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {t('billing.page')} {page} {t('tickets.of')} {totalPages} ({totalItems} {t('billing.invoices')})
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/* --- Main Component --- */

export function BillingPage() {
  const {
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
  } = useBilling();

  return (
    <Page title={t('billing.title')} subtitle={t('billing.subtitle')}>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableInvoiceNo')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableDate')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableDueDate')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableAmount')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableTax')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableTotal')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableStatus')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t('billing.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400 dark:text-zinc-600 mx-auto" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {t('billing.noInvoices')}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    t={t}
                    i18n={i18n}
                    downloadingId={downloadingId}
                    onDownload={handleDownload}
                    onPay={openPayModal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControl
          page={page}
          totalPages={totalPages}
          totalItems={total}
          onPageChange={setPage}
          t={t}
        />
      </div>

      <PayModal
        isOpen={showPayModal}
        onClose={closePayModal}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
        t={t}
      />
    </Page>
  );
}
