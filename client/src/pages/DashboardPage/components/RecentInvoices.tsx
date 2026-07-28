import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Invoice } from "@/services/invoiceService";

interface RecentInvoicesProps {
  invoices: Invoice[];
  getStatusColor: (status: string) => string;
}

export function RecentInvoices({
  invoices,
  getStatusColor,
}: RecentInvoicesProps) {
  const { t } = useTranslation();
  const isSpanish = t('dashboard.tableStatus') === 'Estado';

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/20 dark:bg-zinc-900/10">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('dashboard.recentInvoices')}
        </h4>
        <Link
          to="/billing"
          className="text-xs font-medium text-zinc-900 dark:text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-150 transition-colors"
        >
          {t('dashboard.viewAll')}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-250/60 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/40">
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tableInvoiceNo')}
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tableDate')}
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tableAmount')}
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tableStatus')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-zinc-100/30 dark:hover:bg-zinc-800/20 transition-colors"
              >
                <td className="px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono">
                  {inv.invoice_number}
                </td>
                <td className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {new Date(inv.invoice_date).toLocaleDateString(
                    isSpanish ? 'es-DO' : 'en-US',
                    { day: '2-digit', month: 'short', year: 'numeric' }
                  )}
                </td>
                <td className="px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                  ${Number(inv.total).toFixed(2)}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${getStatusColor(
                      inv.status
                    )}`}
                  >
                    {inv.status}
                  </span>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-xs text-zinc-450 dark:text-zinc-500"
                >
                  {t('dashboard.noInvoices')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
