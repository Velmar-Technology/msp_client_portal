import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Subscription } from '../../../services/subscriptionService';

interface ActiveSubscriptionsProps {
  subscriptions: Subscription[];
  getStatusColor: (status: string) => string;
}

export function ActiveSubscriptions({
  subscriptions,
  getStatusColor,
}: ActiveSubscriptionsProps) {
  const { t } = useTranslation();
  const isSpanish = t('dashboard.tableStatus') === 'Estado';

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/20 dark:bg-zinc-900/10">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t('dashboard.activeSubscriptions')}
        </h4>
        <Link
          to="/plans"
          className="text-xs font-medium text-zinc-900 dark:text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-150 transition-colors"
        >
          {t('dashboard.manage')}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-250/60 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/40">
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tableService')}
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tablePlan')}
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tableStatus')}
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('dashboard.tableRenewal')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
            {subscriptions.map((sub) => (
              <tr
                key={sub.id}
                className="hover:bg-zinc-100/30 dark:hover:bg-zinc-800/20 transition-colors"
              >
                <td className="px-3 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {sub.service_name}
                </td>
                <td className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {sub.plan}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${getStatusColor(
                      sub.status
                    )}`}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {new Date(sub.renewal_date).toLocaleDateString(
                    isSpanish ? 'es-DO' : 'en-US',
                    { day: '2-digit', month: 'short', year: 'numeric' }
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
