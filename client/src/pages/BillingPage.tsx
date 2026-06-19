import { useState, useEffect } from 'react';
import { invoiceService } from '../services/invoiceService';
import type { Invoice } from '../services/invoiceService';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';

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
                    <td className="px-4 py-3">
                      <button
                        className="p-1.5 rounded hover:bg-surface-container transition-colors cursor-pointer"
                        title={t('billing.downloadInvoice')}
                      >
                        <Download className="h-4 w-4 text-on-surface-variant" />
                      </button>
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
    </Page>
  );
}
