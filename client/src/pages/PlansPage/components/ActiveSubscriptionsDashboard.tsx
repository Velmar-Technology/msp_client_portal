import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef } from "@tanstack/react-table";
import type { Subscription } from "@/services/subscriptionService";
import { DataTable, type DataTablePagination } from "@/components/ui/data-table";

interface ActiveSubscriptionsDashboardProps {
  activeSubscriptions: Subscription[];
  columns: ColumnDef<Subscription>[];
  pagination?: DataTablePagination;
}

export function ActiveSubscriptionsDashboard({
  activeSubscriptions,
  columns,
  pagination: externalPagination,
}: ActiveSubscriptionsDashboardProps) {
  const { t } = useTranslation();
  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState(10);

  const totalItems = activeSubscriptions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / internalLimit));
  const currentPage = Math.min(internalPage, totalPages);

  const paginatedData = useMemo(() => {
    if (externalPagination) {
      return activeSubscriptions;
    }
    const start = (currentPage - 1) * internalLimit;
    return activeSubscriptions.slice(start, start + internalLimit);
  }, [activeSubscriptions, currentPage, internalLimit, externalPagination]);

  const handleLimitChange = (newLimit: number) => {
    setInternalLimit(newLimit);
    setInternalPage(1);
  };

  const paginationConfig: DataTablePagination = externalPagination || {
    page: currentPage,
    totalPages,
    totalItems,
    limit: internalLimit,
    onPageChange: setInternalPage,
    onLimitChange: handleLimitChange,
  };

  return (
    <div className="w-full text-foreground">
      <h3 className="text-sm font-semibold tracking-tight text-foreground font-heading mb-1">
        {t("plans.activeSubscriptionsDashboard") || "Active Subscriptions Dashboard"}
      </h3>
      <p className="text-xs text-muted-foreground mb-4 leading-normal">
        {t("plans.activeSubscriptionsDashboardDesc") ||
          "View details, active equipment, and renewal dates for all your active plans."}
      </p>
      <DataTable
        columns={columns}
        data={paginatedData}
        pagination={paginationConfig}
        noDataMessage={t("plans.noSubscriptions") || "No active subscriptions found."}
      />
    </div>
  );
}

export default ActiveSubscriptionsDashboard;
