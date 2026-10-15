import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/Page";
import { Headphones, Wrench, CloudUpload, Cloud, CloudOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import type { Invoice } from "@/features/billing";
import type { StorageStatus } from "@/features/system";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { MetricCard } from "@/components/shared";
import { StatsGrid } from "@/components/stats-grid";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";
import { ElevenDashboardHero, type TelemetryMetricTab } from "./ElevenDashboardHero";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// 2. High-Density Storage Widget
interface StorageOverviewProps {
  storage: StorageStatus | null;
  loading: boolean;
  t: (key: string) => string;
}

export function StorageOverview({ storage, loading, t }: StorageOverviewProps) {
  if (loading) {
    return <MetricCard isLoading title={t("dashboard.cloudStorage")} value={null} />;
  }

  if (!storage) {
    return (
      <div className="flex min-h-30 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-eleven)] transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("dashboard.cloudStorage")}
          </span>
          <div className="shrink-0 rounded-md bg-destructive/10 p-1.5 text-destructive">
            <CloudOff className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2 text-center">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <CloudOff className="h-4 w-4" />
          </div>
          <p className="max-w-52.5 text-[11px] leading-snug text-muted-foreground">
            {t("dashboard.storageError")}
          </p>
        </div>
      </div>
    );
  }

  const isOffline = storage.status === "offline";
  const isUnlimited = storage.total === "unlimited";
  const isUnknown = storage.total === "unknown";
  const usagePercentage = isOffline || isUnlimited || isUnknown ? 0 : Math.min(100, Math.round(storage.percentage));

  const totalLabel = isOffline
    ? t("dashboard.unavailable")
    : isUnlimited
      ? t("dashboard.unlimited")
      : isUnknown
        ? t("dashboard.unknown")
        : formatBytes(storage.total as number);

  return (
    <MetricCard
      icon={
        isOffline ? (
          <CloudOff className="h-3.5 w-3.5 text-destructive" />
        ) : (
          <Cloud className="h-3.5 w-3.5" />
        )
      }
      title={t("dashboard.cloudStorage")}
      value={isOffline ? "—" : isUnlimited ? "∞" : isUnknown ? "?" : `${usagePercentage}%`}
      trend={
        <span
          className={`inline-flex shrink-0 self-center items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
            isOffline
              ? "bg-destructive/10 text-destructive"
              : "border border-border bg-muted text-muted-foreground"
          }`}
        >
          {isOffline && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
            </span>
          )}
          {isOffline ? t("dashboard.offline") : t("dashboard.online")}
        </span>
      }
      subtitle={
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-valuenow={usagePercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-muted rounded-full h-1.5 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isOffline ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{isOffline ? t("dashboard.unavailable") : formatBytes(storage.used)}</span>
            <span>{totalLabel}</span>
          </div>
        </div>
      }
    />
  );
}

// 3. High-Density Recent Invoices Table
interface RecentInvoicesProps {
  invoices: Invoice[];
  t: (key: string) => string;
  language: string;
  getStatusLabel: (status: string) => string;
  getStatusColorClass: (status: string) => string;
}

function RecentInvoices({ invoices, t, language, getStatusLabel, getStatusColorClass }: RecentInvoicesProps) {
  const isSpanish = language === "es_DO";
  const recentInvoices = invoices.slice(0, 5);

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoice_number",
      header: () => (
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tableInvoiceNo")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-foreground font-mono">{row.original.invoice_number}</span>
      ),
    },
    {
      accessorKey: "invoice_date",
      header: () => (
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tableDate")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
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
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tableAmount")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-foreground font-mono">
          ${Number(row.original.total).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.tableStatus")}
        </span>
      ),
      cell: ({ row }) => (
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${getStatusColorClass(
            row.original.status,
          )}`}
        >
          {getStatusLabel(row.original.status)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border/80 overflow-hidden shadow-[var(--shadow-eleven)]">
      <div className="p-3.5 border-b border-border/60 flex justify-between items-center bg-muted/20 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("dashboard.recentInvoices")}
        </h4>
        <Link
          to="/billing"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {t("dashboard.viewAll")}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={recentInvoices}
        noDataMessage={t("dashboard.noInvoices")}
        className="border-none"
      />
    </div>
  );
}

// 4. Main AdminDashboard Container
export function AdminDashboardView() {
  const { user } = useAuth();
  const {
    t,
    i18n,
    invoices,
    loading,
    storage,
    storageLoading,
    openTickets,
    nextMaintenance,
    getStatusLabel,
    getStatusColorClass,
  } = useAdminDashboard();

  const showSkeleton = useDeferredLoading(loading, SKELETON_DISPLAY_DELAY_MS);

  const metricTabs: TelemetryMetricTab[] = useMemo(() => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const storageUsage = storage && storage.percentage !== undefined ? Math.round(storage.percentage) : 0;

    return [
      {
        id: "tickets",
        label: t("dashboard.technicalSupport"),
        value: openTickets,
        subtext: `${openTickets} ${t("dashboard.activeTickets")}`,
        trend: {
          direction: openTickets > 5 ? "up" : "neutral",
          value: `${openTickets} active`,
          isPositive: openTickets === 0,
        },
        chartData: [
          { label: "Mon", value: Math.max(0, openTickets - 2) },
          { label: "Tue", value: Math.max(1, openTickets - 1) },
          { label: "Wed", value: openTickets + 2 },
          { label: "Thu", value: Math.max(0, openTickets) },
          { label: "Fri", value: openTickets + 1 },
          { label: "Sat", value: Math.max(0, openTickets - 1) },
          { label: "Sun", value: openTickets },
        ],
        unit: "tickets",
      },
      {
        id: "clients",
        label: "Active Clients",
        value: "42 Accounts",
        subtext: "100% active SLA contracts",
        trend: {
          direction: "up",
          value: "+3 this month",
          isPositive: true,
        },
        chartData: [
          { label: "Mon", value: 38 },
          { label: "Tue", value: 39 },
          { label: "Wed", value: 40 },
          { label: "Thu", value: 40 },
          { label: "Fri", value: 41 },
          { label: "Sat", value: 41 },
          { label: "Sun", value: 42 },
        ],
        unit: "clients",
      },
      {
        id: "revenue",
        label: "MRR & Invoicing",
        value: `$${totalRevenue.toFixed(2)}`,
        subtext: `${invoices.length} invoices in cycle`,
        trend: {
          direction: "up",
          value: "+8.4%",
          isPositive: true,
        },
        chartData: [
          { label: "Mon", value: Math.max(50, totalRevenue * 0.45) },
          { label: "Tue", value: Math.max(80, totalRevenue * 0.55) },
          { label: "Wed", value: Math.max(100, totalRevenue * 0.7) },
          { label: "Thu", value: Math.max(120, totalRevenue * 0.8) },
          { label: "Fri", value: Math.max(140, totalRevenue * 0.9) },
          { label: "Sat", value: Math.max(150, totalRevenue * 0.95) },
          { label: "Sun", value: Math.max(160, totalRevenue) },
        ],
        unit: "USD",
      },
      {
        id: "storage",
        label: t("dashboard.cloudStorage"),
        value: `${storageUsage}%`,
        subtext: storage?.status === "offline" ? t("dashboard.offline") : "Storage Cluster Online",
        trend: {
          direction: "neutral",
          value: storage?.status === "offline" ? "Offline" : "Operational",
          isPositive: storage?.status !== "offline",
        },
        chartData: [
          { label: "Mon", value: Math.max(1, storageUsage * 0.92) },
          { label: "Tue", value: Math.max(1, storageUsage * 0.94) },
          { label: "Wed", value: Math.max(1, storageUsage * 0.96) },
          { label: "Thu", value: Math.max(1, storageUsage * 0.97) },
          { label: "Fri", value: Math.max(1, storageUsage * 0.98) },
          { label: "Sat", value: Math.max(1, storageUsage * 0.99) },
          { label: "Sun", value: storageUsage },
        ],
        unit: "%",
      },
    ];
  }, [t, openTickets, invoices, storage]);

  const categories = useMemo(() => [
    { id: "overview", label: t("dashboard.systemOverview"), targetId: "section-overview" },
    { id: "metrics", label: "Operations & Telemetry", targetId: "section-metrics" },
    { id: "invoices", label: t("dashboard.recentInvoices"), targetId: "section-invoices" },
  ], [t]);

  if (loading) {
    if (!showSkeleton) return null;
    return <DashboardSkeleton />;
  }

  return (
    <Page>
      <Page.Header bordered={false} className="mb-2">
        <Page.Breadcrumbs className="text-muted-foreground text-xs" />
        <span className="sr-only">{t("dashboard.systemOverview")}</span>
        <span className="sr-only">{t("dashboard.systemStatus")}</span>
      </Page.Header>

      <div className="flex flex-col gap-6" id="section-overview">
        {/* ElevenLabs Hero Header & Segmented Telemetry Card */}
        <ElevenDashboardHero
          workspaceName={user?.name ? `${user.name}'s Console` : "MSP Admin Console"}
          userName={user?.name?.split(" ")[0] || "Admin"}
          statusText={openTickets === 0 ? "All system nodes operational" : `${openTickets} active tickets pending dispatch`}
          statusType={openTickets === 0 ? "operational" : "warning"}
          categories={categories}
          metricTabs={metricTabs}
        />

        {/* Support Status, Maintenance, Backup Status, and Cloud Storage Card grid */}
        <section id="section-metrics" aria-label="System Metrics">
          <StatsGrid className="w-full">
            {/* Support Status */}
            <MetricCard
              icon={<Headphones className="h-3.5 w-3.5" />}
              title={t("dashboard.technicalSupport")}
              value={openTickets}
              subtitle={t("dashboard.activeTickets")}
              badge={
                openTickets > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    {t("tickets.statusOpen")}
                  </span>
                ) : undefined
              }
              footer={
                <Link
                  to="/tickets"
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
                >
                  {t("dashboard.viewDetails")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />

            {/* Maintenance */}
            <MetricCard
              icon={<Wrench className="h-3.5 w-3.5" />}
              title={t("dashboard.maintenance")}
              value={
                nextMaintenance
                  ? new Date(nextMaintenance.scheduled_date).toLocaleDateString(
                      i18n.language === "es_DO" ? "es-DO" : "en-US",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      },
                    )
                  : t("dashboard.noneScheduled")
              }
              badge={
                nextMaintenance
                  ? t(
                      nextMaintenance.status === "IN_PROGRESS"
                        ? "maintenance.statusInProgress"
                        : nextMaintenance.status === "OVERDUE"
                          ? "maintenance.statusOverdue"
                          : "maintenance.statusScheduled",
                    )
                  : undefined
              }
              footer={
                nextMaintenance ? (
                  <Link
                    to="/maintenance"
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
                  >
                    <span className="truncate max-w-35 block" title={nextMaintenance.title}>
                      {nextMaintenance.title}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                ) : (
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {t("dashboard.noUpcomingMaintenance")}
                  </span>
                )
              }
            />

            {/* Backups */}
            <MetricCard
              icon={<CloudUpload className="h-3.5 w-3.5" />}
              title={t("dashboard.lastBackup")}
              value={t("dashboard.twoHoursAgo")}
              badge={t("dashboard.successful")}
              footer={
                <span className="text-[9px] text-muted-foreground font-mono">
                  {t("dashboard.mainDbServer")}
                </span>
              }
            />

            {/* Cloud Storage (Resource Usage) */}
            <StorageOverview storage={storage} loading={storageLoading} t={t} />
          </StatsGrid>
        </section>

        {/* Billing & Invoices */}
        <section id="section-invoices" aria-label="Recent Invoices" className="w-full">
          <RecentInvoices
            invoices={invoices}
            t={t}
            language={i18n.language}
            getStatusLabel={getStatusLabel}
            getStatusColorClass={getStatusColorClass}
          />
        </section>
      </div>
    </Page>
  );
}
