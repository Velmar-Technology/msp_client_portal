import { Suspense, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Download, BarChart3, Users, Receipt, PieChart } from "lucide-react";
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
import type { PageViewOption, PageGraphDataPoint } from "@/components/page/types";

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

type FinancialViewMode = "dashboard" | "ledger" | "payroll" | "graph";

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

  const { getParam, setParams } = useUrlState();
  const rawView = getParam("view");
  const rawTab = getParam("tab");

  // Support canonical ?view= with fallback/alias for legacy ?tab=
  const currentView: FinancialViewMode = useMemo(() => {
    if (rawView === "ledger" || rawView === "payroll" || rawView === "graph" || rawView === "dashboard") {
      return rawView;
    }
    if (rawTab === "payroll") {
      return "payroll";
    }
    return "dashboard";
  }, [rawView, rawTab]);

  const handleViewChange = useCallback(
    (view: string) => {
      const mode =
        view === "dashboard" || view === "ledger" || view === "payroll" || view === "graph"
          ? (view as FinancialViewMode)
          : "dashboard";

      setParams({
        view: mode === "dashboard" ? null : mode,
        tab: mode === "payroll" ? "payroll" : null,
      });
    },
    [setParams],
  );

  const financialViews: PageViewOption<FinancialViewMode>[] = useMemo(
    () => [
      {
        value: "dashboard",
        label: t("financial.views.dashboard", "Overview & Charts"),
        icon: BarChart3,
        title: t("financial.views.dashboard", "Overview & Charts"),
      },
      {
        value: "ledger",
        label: t("financial.views.ledger", "Transactions Ledger"),
        icon: Receipt,
        title: t("financial.views.ledger", "Transactions Ledger"),
      },
      {
        value: "payroll",
        label: t("financial.views.payroll", "Technician Commissions"),
        icon: Users,
        title: t("financial.views.payroll", "Technician Commissions"),
        className: "text-emerald-600 dark:text-emerald-400",
      },
      {
        value: "graph",
        label: t("financial.views.graph", "Financial Analytics"),
        icon: PieChart,
        title: t("financial.views.graph", "Financial Analytics"),
      },
    ],
    [t],
  );

  const expenseGraphData: PageGraphDataPoint[] = useMemo(() => {
    return expenseCategories.map((cat) => ({
      label: t(`financial.categories.${cat.nameKey}`, cat.nameKey),
      value: cat.value,
      color: cat.color,
      formattedValue: `$${cat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${cat.percentage}%)`,
    }));
  }, [expenseCategories, t]);

  const monthlyRevenueGraphData: PageGraphDataPoint[] = useMemo(() => {
    return monthlyData.map((d) => ({
      label: d.month,
      value: d.revenue,
      color: "hsl(var(--primary))",
      formattedValue: `$${d.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    }));
  }, [monthlyData]);

  const totalExpensesFormatted = kpis.find((kpi) => kpi.key === "expenses")?.value ?? "$0.00";
  const showSkeleton = useDeferredLoading(isLoading, SKELETON_DISPLAY_DELAY_MS);

  if (isLoading) {
    if (!showSkeleton) return null;
    return (
      <Page>
        <Page.Header>
          <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
          <Page.HeaderRow>
            <Page.TitleGroup>
              <Page.Title>{t("financial.title")}</Page.Title>
              <Page.Description>{t("financial.subtitle")}</Page.Description>
            </Page.TitleGroup>
          </Page.HeaderRow>
        </Page.Header>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </Page>
    );
  }

  const isPayroll = currentView === "payroll";

  return (
    <Page<FinancialViewMode>
      defaultView="dashboard"
      activeView={currentView}
      onViewChange={handleViewChange}
      availableViews={financialViews}
    >
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t("financial.title")}</Page.Title>
            <Page.Description>{t("financial.subtitle")}</Page.Description>
          </Page.TitleGroup>
          {!isPayroll && (
            <Page.Actions maxVisible={3}>
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
            </Page.Actions>
          )}
        </Page.HeaderRow>
        <Page.Toolbar>
          <Page.Filters />
          <Page.Controls>
            <Page.ViewSwitcher size="sm" />
          </Page.Controls>
        </Page.Toolbar>
      </Page.Header>

      {/* View 1: Dashboard Analytical View */}
      <Page.View type="dashboard" className="space-y-5">
        {/* KPI Summary Cards (Top Row) */}
        <section aria-label="KPI Metrics">
          <KpiCards kpis={kpis} />
        </section>

        {/* Interactive Charts Section (Middle Grid) */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-stretch" aria-label="Financial Trends">
          {/* Left: Revenue vs Expenses (Col-span 2) */}
          <div className="lg:col-span-2 h-full flex flex-col">
            <ChunkErrorBoundary fallback={<ChartSkeletonPlaceholder className="h-full min-h-80" />}>
              <Suspense fallback={<ChartSkeletonPlaceholder className="h-full min-h-80" />}>
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
            <ChunkErrorBoundary fallback={<ChartSkeletonPlaceholder className="h-full min-h-80" />}>
              <Suspense fallback={<ChartSkeletonPlaceholder className="h-full min-h-80" />}>
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

      {/* View 2: Dedicated Transactions Ledger View */}
      <Page.View type="ledger" className="space-y-4">
        <section aria-label="Dedicated Transactions Ledger">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground font-heading">
                {t("financial.views.ledger", "Transactions Ledger")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("financial.subtitle")}</p>
            </div>
            <TransactionsTable transactions={transactions} />
          </div>
        </section>
      </Page.View>

      {/* View 3: Technician Payroll Table View */}
      <Page.View type="payroll">
        <TechnicianPayrollTable />
      </Page.View>

      {/* View 4: Financial Visual Analytics View */}
      <Page.View type="graph" className="space-y-5">
        <section aria-label="Financial Visual Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Page.Graph
            title={t("financial.analytics.expenseByCategory", "Expense Allocation by Category")}
            subtitle={t("financial.analytics.categorySubtitle", "Operational cost distribution across current period")}
            data={expenseGraphData}
            valuePrefix="$"
            defaultType="donut"
          />
          <Page.Graph
            title={t("financial.analytics.monthlyTrends", "Monthly Revenue Trends")}
            subtitle={t("financial.analytics.trendsSubtitle", "Comparative monthly cashflow ledger trends")}
            data={monthlyRevenueGraphData}
            valuePrefix="$"
            defaultType="bar"
          />
        </section>
      </Page.View>
    </Page>
  );
}

export default FinancialPage;
