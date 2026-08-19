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
    <div className="w-full text-foreground mt-4">
      <div className="bg-card border border-border rounded-lg p-4 shadow-xs">
        <h3 className="text-sm font-semibold tracking-tight text-foreground font-heading mb-1">
          {t('plans.activeSubscriptionsDashboard') || 'Active Subscriptions Dashboard'}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-normal">
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

export default ActiveSubscriptionsDashboard;
