import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";
import type { DateRange } from "@/hooks/useFinancialDashboard";
import { KpiCards } from "@/components/financial/KpiCards";
import { RevenueChart } from "@/components/financial/RevenueChart";
import { ExpenseDoughnut } from "@/components/financial/ExpenseDoughnut";
import { TransactionsTable } from "@/components/financial/TransactionsTable";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogExpenseDialog } from "@/components/financial/LogExpenseDialog";
import { Page } from "@/components/Page";

export function FinancialPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const {
    dateRange,
    setDateRange,
    refresh,
    hoveredMonthIndex,
    setHoveredMonthIndex,
    hoveredCategoryIndex,
    setHoveredCategoryIndex,
    isExporting,
    handleExport,
    isLoading,
    kpis,
    monthlyData,
    expenseCategories,
    transactions,
  } = useFinancialDashboard();

  // Find dynamic total expenses value from KPI data to display inside doughnut hole
  const expenseKpi = kpis.find((k) => k.key === "expenses");
  const totalExpensesFormatted = expenseKpi ? expenseKpi.value : "$0.00";

  if (isLoading) {
    return (
      <Page title={t("financial.title")} subtitle={t("financial.subtitle")} isLoading={true}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={t("financial.title")}
      subtitle={t("financial.subtitle")}
      actions={
        <>
          {/* Date Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-xs outline-none transition-all hover:border-zinc-300 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:focus:border-zinc-650 cursor-pointer"
          >
            <option value="30_days">{t("financial.last30Days")}</option>
            <option value="quarter">{t("financial.thisQuarter")}</option>
            <option value="year">{t("financial.yearToDate")}</option>
          </select>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="h-7 flex items-center gap-1 px-3 text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 cursor-pointer dark:border-zinc-800 dark:bg-zinc-900 hover:text-zinc-900 dark:hover:bg-zinc-800/80 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <Download className={`h-3 w-3 text-zinc-500 dark:text-zinc-400 ${isExporting ? "animate-spin" : ""}`} />
            {isExporting ? t("financial.exporting") : t("financial.export")}
          </Button>

          {/* Log Expense Button (ADMIN only) */}
          {isAdmin && <LogExpenseDialog onExpenseLogged={refresh} />}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* KPI Summary Cards (Top Row) */}
        <section aria-label="KPI Metrics">
          <KpiCards kpis={kpis} />
        </section>

        {/* Interactive Charts Section (Middle Grid) */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Financial Trends">
          {/* Left: Revenue vs Expenses (Col-span 2) */}
          <div className="lg:col-span-2">
            <RevenueChart data={monthlyData} hoveredIndex={hoveredMonthIndex} setHoveredIndex={setHoveredMonthIndex} />
          </div>

          {/* Right: Expense Breakdown (Col-span 1) */}
          <div className="lg:col-span-1">
            <ExpenseDoughnut
              categories={expenseCategories}
              hoveredIndex={hoveredCategoryIndex}
              setHoveredIndex={setHoveredCategoryIndex}
              totalExpenses={totalExpensesFormatted}
            />
          </div>
        </section>

        {/* Recent Transactions Section (Bottom Table) */}
        <section aria-label="Ledger Movements" className="mt-1">
          <TransactionsTable transactions={transactions} />
        </section>
      </div>
    </Page>
  );
}

export default FinancialPage;
