import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Invoice } from "@/features/billing";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface RecentInvoicesProps {
  invoices: Invoice[];
  getStatusColor: (status: string) => string;
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es_DO";

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoice_number",
      header: () => (
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tableInvoiceNo")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-zinc-900 dark:text-zinc-100 font-mono">
          {row.original.invoice_number}
        </span>
      ),
    },
    {
      accessorKey: "invoice_date",
      header: () => (
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tableDate")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {new Date(row.original.invoice_date).toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: () => (
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tableAmount")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
          ${Number(row.original.total).toFixed(2)}
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
      cell: ({ row }) => {
        const isPaid = row.original.status === "PAID";
        const isPending = row.original.status === "PENDING";
        const isOverdue = row.original.status === "OVERDUE";
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border ${
              isPaid
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20"
                : isPending
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-500/20"
                  : isOverdue
                    ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
            }`}
          >
            <span
              className={`mr-1 h-1 w-1 rounded-full ${
                isPaid ? "bg-emerald-500" : isPending ? "bg-amber-500" : isOverdue ? "bg-red-500" : "bg-zinc-400"
              }`}
            />
            {row.original.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/10">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t("dashboard.recentInvoices")}
        </h4>
        <Link
          to="/billing"
          className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          {t("dashboard.viewAll")}
        </Link>
      </div>
      <DataTable columns={columns} data={invoices} noDataMessage={t("dashboard.noInvoices")} className="border-none" />
    </div>
  );
}
