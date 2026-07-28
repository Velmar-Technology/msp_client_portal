import React from "react";
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
    return (
      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 p-3.5 rounded-lg flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] min-h-[180px]">
        <div className="flex justify-between items-center mb-2">
          <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 rounded">
            <Cloud className="h-4 w-4 text-zinc-500 dark:text-zinc-500 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!storage) {
    return (
      <SummaryCard
        icon={<Cloud className="h-4 w-4 text-red-500 dark:text-red-400" />}
        title={t("dashboard.cloudStorage")}
        value={
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
              {t("dashboard.storageError") || "Failed to retrieve storage status"}
            </span>
          </div>
        }
      />
    );
  }

  const isOffline = storage.status === "offline";
  const hasNoGauge = isOffline || storage.total === "unlimited" || storage.total === "unknown";
  const usagePercentage = hasNoGauge ? 0 : Math.min(100, Math.round(storage.percentage));

  // Circular gauge config
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usagePercentage / 100) * circumference;

  return (
    <SummaryCard
      icon={<Cloud className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
      title={t("dashboard.cloudStorage")}
      value={
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-center py-2.5">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  className="stroke-zinc-100 dark:stroke-zinc-800/80"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  className="stroke-zinc-900 dark:stroke-zinc-100 transition-all duration-550 ease-out"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                {isOffline ? (
                  <CloudOff className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
                ) : (
                  <>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                      {storage.total === "unlimited"
                        ? "∞"
                        : storage.total === "unknown"
                          ? "?"
                          : `${usagePercentage}%`}
                    </span>
                    {storage.total !== "unlimited" && storage.total !== "unknown" && (
                      <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
                        {t("dashboard.used")}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-1.5">
              <span>{t("dashboard.tableStatus")}</span>
              <span className={`font-semibold ${isOffline ? "text-red-600 dark:text-red-400 animate-pulse" : "text-zinc-800 dark:text-zinc-200"}`}>
                {isOffline ? t("dashboard.offline") : t("dashboard.online") || "Online"}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-medium text-zinc-500 dark:text-zinc-400">
                <span>{isOffline ? t("dashboard.unavailable") : formatBytes(storage.used)}</span>
                <span>
                  {isOffline
                    ? t("dashboard.unavailable")
                    : storage.total === "unlimited"
                      ? t("dashboard.unlimited")
                      : storage.total === "unknown"
                        ? t("dashboard.unknown")
                        : formatBytes(storage.total as number)}
                </span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-zinc-900 dark:bg-zinc-100 h-1.5 rounded-full transition-all duration-550"
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
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

export function RecentInvoices({
  invoices,
  t,
  language,
  getStatusLabel,
  getStatusColorClass,
}: RecentInvoicesProps) {
  const isSpanish = language === "es_DO";

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
          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${getStatusColorClass(
            row.original.status
          )}`}
        >
          {getStatusLabel(row.original.status)}
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
      <DataTable
        columns={columns}
        data={invoices}
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

  if (loading) {
    return (
      <Page title={t("dashboard.systemOverview")} subtitle={t("dashboard.systemStatus")}>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
        </div>
      </Page>
    );
  }

  return (
    <Page title={t("dashboard.systemOverview")} subtitle={t("dashboard.systemStatus")}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
        {/* Support Status, Maintenance, Backup Status, and Cloud Storage Card grid - spans 10 cols */}
        <StatsGrid className="md:col-span-10">
          {/* Support Status */}
          <SummaryCard
            icon={<Headphones className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
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
                  {t("dashboard.tableStatus") === "Estado" ? "ABIERTOS" : "OPEN"}
                </span>
              ) : undefined
            }
            footer={
              <Link
                to="/tickets"
                className="flex items-center gap-1 text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
              >
                {t("dashboard.viewDetails")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />

          {/* Maintenance */}
          <SummaryCard
            icon={<Wrench className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
            title={t("dashboard.maintenance")}
            value={
              nextMaintenance
                ? new Date(nextMaintenance.scheduled_date).toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : t("dashboard.noneScheduled")
            }
            badge={
              nextMaintenance ? (
                t(
                  nextMaintenance.status === "IN_PROGRESS"
                    ? "maintenance.statusInProgress"
                    : nextMaintenance.status === "OVERDUE"
                      ? "maintenance.statusOverdue"
                      : "maintenance.statusScheduled"
                )
              ) : undefined
            }
            footer={
              nextMaintenance ? (
                <Link
                  to="/maintenance"
                  className="flex items-center gap-1 text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                >
                  <span className="truncate max-w-[140px] block" title={nextMaintenance.title}>
                    {nextMaintenance.title}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              ) : (
                <span className="text-[11px] text-zinc-450 dark:text-zinc-500 font-normal">
                  {t("dashboard.noUpcomingMaintenance")}
                </span>
              )
            }
          />

          {/* Backups */}
          <SummaryCard
            icon={<CloudUpload className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
            title={t("dashboard.lastBackup")}
            value={t("dashboard.twoHoursAgo")}
            badge={t("dashboard.successful")}
            footer={
              <span className="text-[11px] text-zinc-450 dark:text-zinc-500 font-normal">
                {t("dashboard.mainDbServer")}
              </span>
            }
          />

          {/* Cloud Storage (Resource Usage) */}
          <StorageOverview storage={storage} loading={storageLoading} t={t} />
        </StatsGrid>

        {/* Billing & Invoices - spans 8 cols */}
        <div className="md:col-span-8">
          <RecentInvoices
            invoices={invoices}
            t={t}
            language={i18n.language}
            getStatusLabel={getStatusLabel}
            getStatusColorClass={getStatusColorClass}
          />
        </div>
      </div>
    </Page>
  );
}
