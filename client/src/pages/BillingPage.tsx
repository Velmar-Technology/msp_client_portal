import { useState, useEffect } from 'react';
import { invoiceService } from '../services/invoiceService';
import type { Invoice } from '../services/invoiceService';
import { Download, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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


const statusColor: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  PAID: 'bg-success/10 text-success',
  OVERDUE: 'bg-error/10 text-error',
};

export function BillingPage() {
  const { t, i18n } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function loadInvoices() {
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
    }
    loadInvoices();
  }, [page]);

  useEffect(() => {
    if (!showPayModal || !selectedInvoice) return;
    const invoice = selectedInvoice;

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
                  const result = await invoiceService.getAll(page, limit);
                  setInvoices(result.data);
                  setTotal(result.pagination.total);
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
      // Clean up buttons instance if needed
    };
  }, [showPayModal, selectedInvoice, page]);


  const totalPages = Math.ceil(total / limit);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t('tickets.filterAwaitingPayment'),
      PAID: t('tickets.filterResolved'),
      OVERDUE: t('dashboard.tableStatus') === 'Estado' ? 'VENCIDA' : 'OVERDUE',
    };
    return map[status] || status;
  };

  return (
    <Page
      title={t('billing.title')}
      subtitle={t('billing.subtitle')}
    >

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm text-on-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableInvoiceNo')}</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableDate')}</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableDueDate')}</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableAmount')}</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableTax')}</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableTotal')}</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableStatus')}</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">{t('billing.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-body-md text-on-surface-variant">
                    {t('billing.noInvoices')}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors h-14">
                    <td className="px-4 py-3 text-mono font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {new Date(inv.invoice_date).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {new Date(inv.due_date).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-body-md">${Number(inv.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">${Number(inv.tax_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-body-md font-medium">${Number(inv.total).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor[inv.status]}`}>
                        {getStatusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2 items-center">
                      <button
                        className="p-1.5 rounded hover:bg-surface-container transition-colors cursor-pointer"
                        title={t('billing.downloadInvoice')}
                      >
                        <Download className="h-4 w-4 text-on-surface-variant" />
                      </button>
                      {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setShowPayModal(true);
                          }}
                          className="px-3 py-1 rounded bg-primary text-on-primary hover:bg-primary/95 text-label-sm font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title={t('billing.payNow')}
                        >
                          <CreditCard className="h-3 w-3" />
                          {t('billing.payNow')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-outline-variant">
            <span className="text-label-sm text-on-surface-variant">
              {t('billing.page')} {page} {t('tickets.of')} {totalPages} ({total} {t('billing.invoices')})
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-on-surface" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-on-surface" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showPayModal && selectedInvoice && (
        <AlertDialog open={showPayModal} onOpenChange={setShowPayModal}>
          <AlertDialogContent className="sm:max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-6 text-on-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-title-lg font-bold text-on-surface flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {t('billing.modalPayTitle', { number: selectedInvoice.invoice_number })}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-body-md text-on-surface-variant mt-2">
                {t('billing.modalPayDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-6 p-4 bg-surface-container border border-outline-variant rounded-xl flex flex-col gap-2">
              <div className="flex justify-between items-center text-body-md">
                <span className="text-on-surface-variant">Amount:</span>
                <span>${Number(selectedInvoice.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-body-md">
                <span className="text-on-surface-variant">Tax (18%):</span>
                <span>${Number(selectedInvoice.tax_amount).toFixed(2)}</span>
              </div>
              <div className="h-px bg-outline-variant my-1" />
              <div className="flex justify-between items-center text-title-md font-bold">
                <span>{t('billing.amountDue')}:</span>
                <span className="text-primary">${Number(selectedInvoice.total).toFixed(2)}</span>
              </div>
            </div>

            {paymentMessage && (
              <div className={`p-3 rounded-lg mb-4 text-center text-body-sm font-medium ${
                isSuccess 
                  ? 'bg-success/15 text-success border border-success/30'
                  : paymentMessage === t('billing.paymentProcessing')
                    ? 'bg-primary/10 text-primary border border-primary/20 animate-pulse'
                    : 'bg-error/15 text-error border border-error/30'
              }`}>
                {paymentMessage}
              </div>
            )}

            {!isSuccess && (
              <div id="paypal-button-container" className="my-4 min-h-[150px] flex items-center justify-center bg-surface rounded-xl p-4 border border-outline-variant border-dashed">
                <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="text-label-md">Loading payment options...</span>
                </div>
              </div>
            )}

            <AlertDialogFooter className="mt-6 flex justify-end gap-2">
              <AlertDialogCancel 
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedInvoice(null);
                  setPaymentMessage(null);
                  setIsSuccess(false);
                }}
                className="px-4 py-2 text-label-md font-bold rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                {t('billing.close')}
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Page>
  );
}
