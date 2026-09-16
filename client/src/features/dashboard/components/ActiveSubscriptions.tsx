import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Subscription } from "@/features/subscriptions";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface ActiveSubscriptionsProps {
  subscriptions: Subscription[];
  getStatusColor: (status: string) => string;
}

export function ActiveSubscriptions({ subscriptions }: ActiveSubscriptionsProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es_DO";

  const columns: ColumnDef<Subscription>[] = [
    {
      accessorKey: "service_name",
      header: () => (
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tableService")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground">{row.original.service_name}</span>
      ),
    },
    {
      accessorKey: "plan",
      header: () => (
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tablePlan")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">{row.original.plan}</span>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tableStatus")}
        </span>
      ),
      cell: ({ row }) => {
        const isActive = row.original.status === "ACTIVE";
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border ${
              isActive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <span className={`mr-1 h-1 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
            {row.original.status}
          </span>
        );
      },
    },
    {
      accessorKey: "renewal_date",
      header: () => (
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tableRenewal")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
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
    <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      <div className="p-3.5 border-b border-border flex justify-between items-center bg-muted/40">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("dashboard.activeSubscriptions")}
        </h4>
        <Link
          to="/plans"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("dashboard.manage")}
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={subscriptions}
        noDataMessage={t("dashboard.noActiveSubscriptions") || "No active subscriptions found"}
        className="border-none"
      />
    </div>
  );
}
