import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Transaction } from "../hooks/useFinancialDashboard";

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
    <div className="rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[11px] leading-normal">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-3.5 py-2">{t("financial.date")}</th>
              <th className="px-3.5 py-2">{t("financial.description")}</th>
              <th className="px-3.5 py-2">{t("financial.category")}</th>
              <th className="px-3.5 py-2">{t("financial.status")}</th>
              <th className="px-3.5 py-2 text-right">{t("financial.amount")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTransactions.map((txn) => {
              const isPositive = txn.amount > 0;
              const formattedAmount = isPositive
                ? `+$${txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `-$${Math.abs(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              return (
                <tr key={txn.id} className="transition-colors duration-150 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-3.5 py-2 font-mono text-muted-foreground">{txn.date}</td>
                  <td className="px-3.5 py-2 font-medium text-foreground">
                    <div>{txn.description}</div>
                    {txn.expense_identifier && (
                      <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                        Ref: {txn.expense_identifier}
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-muted-foreground">
                    {t(`financial.${txn.categoryKey}`) || txn.categoryKey}
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-2">{getStatusBadge(txn.status)}</td>
                  <td
                    className={`whitespace-nowrap px-3.5 py-2 text-right font-mono font-bold ${
                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
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
        <div className="flex items-center justify-between pt-2.5 border-t border-border bg-muted/30 px-3.5 pb-2.5 rounded-b-lg">
          <span className="text-[10px] font-medium text-muted-foreground font-mono">
            {t("financial.pageOf").replace("{page}", String(currentPage)).replace("{total}", String(totalPages))}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
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
