import { useState, useEffect } from 'react';
import { invoiceService } from '../services/invoiceService';
import type { Invoice } from '../services/invoiceService';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';

const statusColor: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  PAID: 'bg-success/10 text-success',
  OVERDUE: 'bg-error/10 text-error',
};

export function BillingPage() {
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

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
          Billing History
        </h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          View and manage your invoices and payment history
        </p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Invoice No.</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Date</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Due Date</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Amount</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Tax</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Total</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Status</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" /></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-body-md text-on-surface-variant">No invoices found</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors h-14">
                    <td className="px-4 py-3 text-mono font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {new Date(inv.invoice_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {new Date(inv.due_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-body-md">${inv.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">${inv.tax_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-body-md font-medium">${inv.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded hover:bg-surface-container transition-colors" title="Download Invoice">
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
              Page {page} of {totalPages} ({total} invoices)
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
