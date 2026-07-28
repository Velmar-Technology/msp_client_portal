import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { Subscription } from "@/services/subscriptionService";
import { DataTable } from "@/components/ui/data-table";

interface ActiveSubscriptionsDashboardProps {
  activeSubscriptions: Subscription[];
  columns: ColumnDef<Subscription>[];
}

export function ActiveSubscriptionsDashboard({
  activeSubscriptions,
  columns,
}: ActiveSubscriptionsDashboardProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full text-zinc-900 dark:text-zinc-50 mt-4">
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
          {t('plans.activeSubscriptionsDashboard') || 'Active Subscriptions Dashboard'}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-normal">
          {t('plans.activeSubscriptionsDashboardDesc') || 'View details, active equipment, and renewal dates for all your active plans.'}
        </p>
        <DataTable
          columns={columns}
          data={activeSubscriptions}
          noDataMessage={t('plans.noSubscriptions') || "No active subscriptions found."}
        />
      </div>
    </div>
  );
}
