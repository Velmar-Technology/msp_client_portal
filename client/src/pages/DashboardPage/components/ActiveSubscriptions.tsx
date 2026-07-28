import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Subscription } from "@/services/subscriptionService";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface ActiveSubscriptionsProps {
  subscriptions: Subscription[];
  getStatusColor: (status: string) => string;
}

export function ActiveSubscriptions({ subscriptions, getStatusColor }: ActiveSubscriptionsProps) {
  const { t } = useTranslation();
  const isSpanish = t("dashboard.tableStatus") === "Estado";

  const columns: ColumnDef<Subscription>[] = [
    {
      accessorKey: "service_name",
      header: () => (
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tableService")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
          {row.original.service_name}
        </span>
      ),
    },
    {
      accessorKey: "plan",
      header: () => (
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tablePlan")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {row.original.plan}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tableStatus")}
        </span>
      ),
      cell: ({ row }) => (
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${getStatusColor(
            row.original.status
          )}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "renewal_date",
      header: () => (
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tableRenewal")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {new Date(row.original.renewal_date).toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/20 dark:bg-zinc-900/10 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t("dashboard.activeSubscriptions")}
        </h4>
        <Link
          to="/plans"
          className="text-xs font-medium text-zinc-900 dark:text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-150 transition-colors"
        >
          {t("dashboard.manage")}
        </Link>
      </div>
      <DataTable columns={columns} data={subscriptions} noDataMessage={t("dashboard.noActiveSubscriptions") || "No active subscriptions found"} className="border-none" />
    </div>
  );
}
