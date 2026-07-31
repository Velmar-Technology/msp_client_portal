import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/hooks/useFinancialDashboard";

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [prevTransactions, setPrevTransactions] = useState(transactions);
  if (prevTransactions !== transactions) {
    setPrevTransactions(transactions);
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(transactions.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const getStatusBadge = (status: Transaction["status"]) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="mr-1 h-1 w-1 rounded-full bg-emerald-500" />
            {t("financial.statusPaid")}
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <span className="mr-1 h-1 w-1 rounded-full bg-amber-500" />
            {t("financial.statusPending")}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <span className="mr-1 h-1 w-1 rounded-full bg-red-500" />
            {t("financial.statusFailed")}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 px-3.5 py-3 dark:border-zinc-900">
        <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">{t("financial.transactions")}</h3>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{t("financial.transactionsDesc")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[11px] leading-normal">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-900 dark:bg-zinc-900/10">
              <th className="px-3.5 py-2">{t("financial.date")}</th>
              <th className="px-3.5 py-2">{t("financial.description")}</th>
              <th className="px-3.5 py-2">{t("financial.category")}</th>
              <th className="px-3.5 py-2">{t("financial.status")}</th>
              <th className="px-3.5 py-2 text-right">{t("financial.amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {paginatedTransactions.map((txn) => {
              const isPositive = txn.amount > 0;
              const formattedAmount = isPositive
                ? `+$${txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `-$${Math.abs(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              return (
                <tr
                  key={txn.id}
                  className="transition-colors duration-150 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30"
                >
                  <td className="whitespace-nowrap px-3.5 py-2 font-mono text-zinc-500 dark:text-zinc-400">
                    {txn.date}
                  </td>
                  <td className="px-3.5 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <div>{txn.description}</div>
                    {txn.expense_identifier && (
                      <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                        Ref: {txn.expense_identifier}
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-zinc-500 dark:text-zinc-400">
                    {t(`financial.${txn.categoryKey}`) || txn.categoryKey}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-2">{getStatusBadge(txn.status)}</td>
                  <td
                    className={`whitespace-nowrap px-3.5 py-2 text-right font-mono font-bold ${
                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {formattedAmount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-900/10 px-3.5 pb-2.5 rounded-b-lg">
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 font-mono">
            {t("financial.pageOf").replace("{page}", String(currentPage)).replace("{total}", String(totalPages))}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
