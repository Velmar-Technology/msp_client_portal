import { Link } from "react-router-dom";
import { Page } from "@/components/Page";
import { Headphones, Wrench, CloudUpload, Cloud, CloudOff, ArrowRight } from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import type { Invoice } from "@/services/invoiceService";
import type { StorageStatus } from "@/services/systemService";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import SummaryCard from "@/components/dashboard/summary-card";
import { StatsGrid } from "@/components/stats-grid";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";

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
    return <SummaryCard isLoading title={t("dashboard.cloudStorage")} value={null} />;
  }

  if (!storage) {
    return (
      <div className="flex min-h-[120px] flex-col rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("dashboard.cloudStorage")}
          </span>
          <div className="shrink-0 rounded-md bg-red-50 p-1.5 text-red-500 dark:bg-red-950/40 dark:text-red-400">
            <CloudOff className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2 text-center">
          <div className="rounded-full bg-red-50 p-2 text-red-500 dark:bg-red-950/40 dark:text-red-400">
            <CloudOff className="h-4 w-4" />
          </div>
          <p className="max-w-[210px] text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            {t("dashboard.storageError")}
          </p>
        </div>
      </div>
    );
  }

  const isOffline = storage.status === "offline";
  const isUnlimited = storage.total === "unlimited";
  const isUnknown = storage.total === "unknown";
  const usagePercentage =
    isOffline || isUnlimited || isUnknown ? 0 : Math.min(100, Math.round(storage.percentage));

  const totalLabel = isOffline
    ? t("dashboard.unavailable")
    : isUnlimited
      ? t("dashboard.unlimited")
      : isUnknown
        ? t("dashboard.unknown")
        : formatBytes(storage.total as number);

  return (
    <SummaryCard
      icon={
        isOffline ? (
          <CloudOff className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
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
              ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
              : "border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400"
          }`}
        >
          {isOffline && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
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
            className="w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-full h-1.5 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isOffline ? "bg-red-500 dark:bg-red-400" : "bg-zinc-900 dark:bg-zinc-100"
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
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

export function RecentInvoices({ invoices, t, language, getStatusLabel, getStatusColorClass }: RecentInvoicesProps) {
  const isSpanish = language === "es_DO";
  const recentInvoices = invoices.slice(0, 5);

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoice_number",
      header: () => (
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("dashboard.tableInvoiceNo")}
        </span>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-zinc-900 dark:text-zinc-100 font-mono">{row.original.invoice_number}</span>
      ),
    },
    {
      accessorKey: "invoice_date",
      header: () => (
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="p-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex justify-between items-center bg-zinc-50/20 dark:bg-zinc-900/10 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t("dashboard.recentInvoices")}
        </h4>
        <Link
          to="/billing"
          className="text-xs font-medium text-zinc-900 dark:text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
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

  if (loading) {
    if (!showSkeleton) return null;
    return <DashboardSkeleton />;
  }

  return (
    <Page title={t("dashboard.systemOverview")} subtitle={t("dashboard.systemStatus")}>
      <div className="flex flex-col gap-4">
        {/* Support Status, Maintenance, Backup Status, and Cloud Storage Card grid */}
        <section aria-label="System Metrics">
          <StatsGrid className="w-full">
            {/* Support Status */}
            <SummaryCard
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
                  className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                >
                  {t("dashboard.viewDetails")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />

            {/* Maintenance */}
            <SummaryCard
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
                    className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                  >
                    <span className="truncate max-w-35 block" title={nextMaintenance.title}>
                      {nextMaintenance.title}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </Link>
                ) : (
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {t("dashboard.noUpcomingMaintenance")}
                  </span>
                )
              }
            />

            {/* Backups */}
            <SummaryCard
              icon={<CloudUpload className="h-3.5 w-3.5" />}
              title={t("dashboard.lastBackup")}
              value={t("dashboard.twoHoursAgo")}
              badge={t("dashboard.successful")}
              footer={
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                  {t("dashboard.mainDbServer")}
                </span>
              }
            />

            {/* Cloud Storage (Resource Usage) */}
            <StorageOverview storage={storage} loading={storageLoading} t={t} />
          </StatsGrid>
        </section>

        {/* Billing & Invoices */}
        <section aria-label="Recent Invoices" className="w-full">
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
