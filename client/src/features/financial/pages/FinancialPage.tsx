import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Download, BarChart3, Users } from "lucide-react";
import { useFinancialDashboard } from "../hooks/useFinancialDashboard";
import type { DateRange } from "../hooks/useFinancialDashboard";
import { useUrlState } from "@/hooks/useUrlState";
import { KpiCards } from "../components/KpiCards";
import { TransactionsTable } from "../components/TransactionsTable";
import { TechnicianPayrollTable } from "../components/TechnicianPayrollTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { LogExpenseDialog } from "../components/LogExpenseDialog";
import { Page } from "@/components/Page";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";

// ---- Lazily loaded heavy chart components ----
const RevenueChart = lazyWithRetry(() =>
  import("../components/RevenueChart").then((m) => ({ default: m.RevenueChart })),
);
const ExpenseDoughnut = lazyWithRetry(() =>
  import("../components/ExpenseDoughnut").then((m) => ({ default: m.ExpenseDoughnut })),
);

function ChartSkeletonPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between ${className || "h-72"}`}
    >
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

  const { getParam, setParam } = useUrlState();
  const activeTab = getParam("tab", "overview");

  const totalExpensesFormatted = kpis.find((kpi) => kpi.key === "expenses")?.value ?? "$0.00";
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

  const isPayroll = activeTab === "payroll";

  return (
    <Page<"dashboard" | "payroll">
      defaultView="dashboard"
      activeView={isPayroll ? "payroll" : "dashboard"}
      onViewChange={(view) => setParam("tab", view === "dashboard" ? "overview" : view)}
      availableViews={[
        {
          value: "dashboard",
          label: "Overview & Charts",
          icon: BarChart3,
          title: "Overview & Charts",
        },
        {
          value: "payroll",
          label: "Technician Commissions",
          icon: Users,
          title: "Technician Commissions",
          className: "text-emerald-600 dark:text-emerald-400",
        },
      ]}
    >
      <Page.ControlPanel
        title={t("financial.title")}
        subtitle={t("financial.subtitle")}
        actions={
          !isPayroll ? (
            <div className="flex items-center gap-2">
              {/* Date Selector */}
              <Select value={dateRange} onValueChange={(val) => setDateRange(val as DateRange)}>
                <SelectTrigger size="default" className="h-7 w-36 text-xs font-medium bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30_days">{t("financial.last30Days")}</SelectItem>
                  <SelectItem value="quarter">{t("financial.thisQuarter")}</SelectItem>
                  <SelectItem value="year">{t("financial.yearToDate")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="h-7 flex items-center gap-1 px-3 text-xs font-medium cursor-pointer shadow-xs"
              >
                <Download className={`h-3 w-3 text-muted-foreground ${isExporting ? "animate-spin" : ""}`} />
                {isExporting ? t("financial.exporting") : t("financial.export")}
              </Button>

              {/* Log Expense Button (ADMIN only) */}
              {isAdmin && <LogExpenseDialog onExpenseLogged={refresh} />}
            </div>
          ) : undefined
        }
        viewsSlot={<Page.ViewSwitcher size="sm" />}
        searchSlot={null}
        pagerSlot={null}
      />

      {/* Dashboard Analytical View */}
      <Page.View type="dashboard" className="space-y-5">
        {/* KPI Summary Cards (Top Row) */}
        <section aria-label="KPI Metrics">
          <KpiCards kpis={kpis} />
        </section>

        {/* Interactive Charts Section (Middle Grid) */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-stretch" aria-label="Financial Trends">
          {/* Left: Revenue vs Expenses (Col-span 2) */}
          <div className="lg:col-span-2 h-full flex flex-col">
            <ChunkErrorBoundary fallback={<ChartSkeletonPlaceholder className="h-full min-h-[320px]" />}>
              <Suspense fallback={<ChartSkeletonPlaceholder className="h-full min-h-[320px]" />}>
                <RevenueChart
                  data={monthlyData}
                  hoveredIndex={hoveredMonthIndex}
                  setHoveredIndex={setHoveredMonthIndex}
                />
              </Suspense>
            </ChunkErrorBoundary>
          </div>

          {/* Right: Expense Breakdown (Col-span 1) */}
          <div className="lg:col-span-1 h-full flex flex-col">
            <ChunkErrorBoundary fallback={<ChartSkeletonPlaceholder className="h-full min-h-[320px]" />}>
              <Suspense fallback={<ChartSkeletonPlaceholder className="h-full min-h-[320px]" />}>
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
      </Page.View>

      {/* Technician Payroll Table View */}
      <Page.View type="payroll">
        <TechnicianPayrollTable />
      </Page.View>
    </Page>
  );
}

export default FinancialPage;
