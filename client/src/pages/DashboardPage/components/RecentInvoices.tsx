import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Invoice } from "@/services/invoiceService";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

interface RecentInvoicesProps {
  invoices: Invoice[];
  getStatusColor: (status: string) => string;
}

export function RecentInvoices({ invoices, getStatusColor }: RecentInvoicesProps) {
  const { t } = useTranslation();
  const isSpanish = t("dashboard.tableStatus") === "Estado";

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
  ];

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/20 dark:bg-zinc-900/10 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t("dashboard.recentInvoices")}
        </h4>
        <Link
          to="/billing"
          className="text-xs font-medium text-zinc-900 dark:text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-150 transition-colors"
        >
          {t("dashboard.viewAll")}
        </Link>
      </div>
      <DataTable columns={columns} data={invoices} noDataMessage={t("dashboard.noInvoices")} className="border-none" />
    </div>
  );
}
