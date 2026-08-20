import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";
import type { DateRange } from "@/hooks/useFinancialDashboard";
import { KpiCards } from "@/components/financial/KpiCards";
import { TransactionsTable } from "@/components/financial/TransactionsTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { LogExpenseDialog } from "@/components/financial/LogExpenseDialog";
import { Page } from "@/components/Page";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";

// ---- Lazily loaded heavy chart components ----
const RevenueChart = lazyWithRetry(() =>
  import("@/components/financial/RevenueChart").then((m) => ({ default: m.RevenueChart }))
);
const ExpenseDoughnut = lazyWithRetry(() =>
  import("@/components/financial/ExpenseDoughnut").then((m) => ({ default: m.ExpenseDoughnut }))
);

function ChartSkeletonPlaceholder({ className }: { className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between ${className || "h-72"}`}>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}

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

  const totalExpensesFormatted = expenseKpi ? expenseKpi.value : "$0.00";
  const showSkeleton = useDeferredLoading(isLoading, SKELETON_DISPLAY_DELAY_MS);

  if (isLoading) {
    if (!showSkeleton) return null;
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
            <ChunkErrorBoundary fallback={<ChartSkeletonPlaceholder className="h-72" />}>
              <Suspense fallback={<ChartSkeletonPlaceholder className="h-72" />}>
                <RevenueChart
                  data={monthlyData}
                  hoveredIndex={hoveredMonthIndex}
                  setHoveredIndex={setHoveredMonthIndex}
                />
              </Suspense>
            </ChunkErrorBoundary>
          </div>

          {/* Right: Expense Breakdown (Col-span 1) */}
          <div className="lg:col-span-1">
            <ChunkErrorBoundary fallback={<ChartSkeletonPlaceholder className="h-72" />}>
              <Suspense fallback={<ChartSkeletonPlaceholder className="h-72" />}>
                <ExpenseDoughnut
                  categories={expenseCategories}
                  hoveredIndex={hoveredCategoryIndex}
                  setHoveredIndex={setHoveredCategoryIndex}
                  totalExpenses={totalExpensesFormatted}
                />
              </Suspense>
            </ChunkErrorBoundary>
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
