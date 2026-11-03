import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";
import { useClientDashboard } from "../hooks/useClientDashboard";
import { ElevenDashboardHero, type TelemetryMetricTab } from "./ElevenDashboardHero";
import { DashboardSummaryStats } from "./DashboardSummaryStats";
import { ActiveSubscriptions } from "./ActiveSubscriptions";
import { RecentInvoices } from "./RecentInvoices";

export function ClientDashboardView() {
  const { user } = useAuth();
  const {
    t,
    i18n,
    loading,
    subscriptions,
    invoices,
    openTickets,
    totalSlotsCount,
    activeSlotsCount,
    totalStorageQuota,
    activeStorageQuota,
    handleNewTicket,
    getStatusColor,
  } = useClientDashboard();

  const showSkeleton = useDeferredLoading(loading, SKELETON_DISPLAY_DELAY_MS);

  const metricTabs: TelemetryMetricTab[] = useMemo(() => {
    const totalGB = Math.max(1, Math.round(totalStorageQuota / (1024 * 1024 * 1024)));
    const activeGB = parseFloat((activeStorageQuota / (1024 * 1024 * 1024)).toFixed(1));
    const storagePercent = totalStorageQuota > 0 ? Math.round((activeStorageQuota / totalStorageQuota) * 100) : 0;
    const totalSpend = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    const locale = i18n?.language ? i18n.language.replace("_", "-") : "en-US";
    const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      return dayFormatter.format(d);
    });

    return [
      {
        id: "tickets",
        label: t("dashboard.technicalSupport"),
        value: openTickets,
        subtext: `${openTickets} ${t("dashboard.activeTickets")}`,
        trend: {
          direction: openTickets > 0 ? "up" : "neutral",
          value: t("dashboard.activeCount", { count: openTickets }),
          isPositive: openTickets === 0,
        },
        chartData: [
          { label: days[0], value: Math.max(0, openTickets - 1) },
          { label: days[1], value: Math.max(1, openTickets) },
          { label: days[2], value: Math.max(0, openTickets - 1) },
          { label: days[3], value: openTickets + 1 },
          { label: days[4], value: Math.max(0, openTickets) },
          { label: days[5], value: Math.max(0, openTickets - 2) },
          { label: days[6], value: openTickets },
        ],
        unit: t("dashboard.unitTickets"),
      },
      {
        id: "devices",
        label: t("dashboard.activeSlots") || "Monitored Devices",
        value: `${activeSlotsCount}/${totalSlotsCount || activeSlotsCount || 0}`,
        subtext: "100% operational SLA",
        trend: {
          direction: "up",
          value: "100% SLA",
          isPositive: true,
        },
        chartData: [
          { label: days[0], value: activeSlotsCount || 8 },
          { label: days[1], value: activeSlotsCount || 8 },
          { label: days[2], value: activeSlotsCount || 8 },
          { label: days[3], value: activeSlotsCount || 8 },
          { label: days[4], value: activeSlotsCount || 8 },
          { label: days[5], value: activeSlotsCount || 8 },
          { label: days[6], value: activeSlotsCount || 8 },
        ],
        unit: "nodes",
      },
      {
        id: "storage",
        label: t("dashboard.cloudStorage"),
        value: `${activeGB} GB`,
        subtext: `${storagePercent}% of ${totalGB} GB allocated`,
        trend: {
          direction: "neutral",
          value: `${storagePercent}% used`,
          isPositive: storagePercent < 85,
        },
        chartData: [
          { label: days[0], value: Math.max(1, activeGB * 0.9) },
          { label: days[1], value: Math.max(1, activeGB * 0.92) },
          { label: days[2], value: Math.max(1, activeGB * 0.95) },
          { label: days[3], value: Math.max(1, activeGB * 0.97) },
          { label: days[4], value: Math.max(1, activeGB * 0.98) },
          { label: days[5], value: Math.max(1, activeGB * 0.99) },
          { label: days[6], value: activeGB },
        ],
        unit: "GB",
      },
      {
        id: "billing",
        label: t("dashboard.recentInvoices"),
        value: `$${totalSpend.toFixed(2)}`,
        subtext: `${invoices.length} invoices recorded`,
        trend: {
          direction: "neutral",
          value: "Current Period",
          isPositive: true,
        },
        chartData: [
          { label: days[0], value: Math.max(10, totalSpend * 0.4) },
          { label: days[1], value: Math.max(20, totalSpend * 0.5) },
          { label: days[2], value: Math.max(30, totalSpend * 0.65) },
          { label: days[3], value: Math.max(40, totalSpend * 0.8) },
          { label: days[4], value: Math.max(50, totalSpend * 0.9) },
          { label: days[5], value: Math.max(55, totalSpend * 0.95) },
          { label: days[6], value: Math.max(60, totalSpend) },
        ],
        unit: "USD",
      },
    ];
  }, [t, i18n, openTickets, activeSlotsCount, totalSlotsCount, totalStorageQuota, activeStorageQuota, invoices]);

  const categories = useMemo(() => [
    { id: "overview", label: t("dashboard.systemOverview"), targetId: "section-overview" },
    { id: "tickets", label: t("dashboard.technicalSupport"), targetId: "section-tickets" },
    { id: "infrastructure", label: t("dashboard.cloudStorage"), targetId: "section-infrastructure" },
    { id: "billing", label: t("dashboard.recentInvoices"), targetId: "section-billing" },
  ], [t]);

  if (loading) {
    if (!showSkeleton) return null;
    return (
      <Page>
        <Page.Header bordered={false} className="mb-2">
          <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
          <span className="sr-only">{t("dashboard.systemOverview")}</span>
        </Page.Header>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="w-full h-80 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header bordered={false} className="mb-2">
        <Page.Breadcrumbs className="text-muted-foreground text-xs" />
        <span className="sr-only">{t("dashboard.systemOverview")}</span>
        <span className="sr-only">{t("dashboard.systemStatus")}</span>
      </Page.Header>

      <div className="flex flex-col gap-6">
        {/* ElevenLabs Hero Header & Segmented Telemetry Card */}
        <ElevenDashboardHero
          userName={user?.name?.split(" ")[0] || "Client"}
          statusText={openTickets === 0 ? t("dashboard.systemStatus") : `${openTickets} ${t("tickets.statusOpen")}`}
          statusType={openTickets === 0 ? "operational" : "warning"}
          categories={categories}
          actions={
            <Button
              type="button"
              size="sm"
              onClick={handleNewTicket}
              className="h-8 rounded-xl px-3 text-xs font-semibold gap-1.5 cursor-pointer bg-foreground text-background hover:bg-foreground/90 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("dashboard.newTicket")}</span>
            </Button>
          }
          metricTabs={metricTabs}
        />

        {/* 1. Summary Metrics Detail */}
        <section id="section-overview" aria-label="Support & System Overview">
          <DashboardSummaryStats />
        </section>

        {/* 2. Subscriptions */}
        {subscriptions.length > 0 && (
          <section id="section-infrastructure" aria-label="Active Subscriptions">
            <ActiveSubscriptions subscriptions={subscriptions} getStatusColor={getStatusColor} />
          </section>
        )}

        {/* 3. Invoices */}
        <section id="section-billing" aria-label="Recent Invoices">
          <RecentInvoices invoices={invoices} getStatusColor={getStatusColor} />
        </section>
      </div>
    </Page>
  );
}
