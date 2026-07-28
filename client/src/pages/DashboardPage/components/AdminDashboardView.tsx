import React from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/Page";
import { Headphones, Wrench, CloudUpload, Cloud, CloudOff, ArrowRight } from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import type { Invoice } from "@/services/invoiceService";
import type { StorageStatus } from "@/services/systemService";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// 1. High-Density Status Summary Card
interface SummaryCardProps {
  icon: React.ReactNode;
  badge?: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  footer?: React.ReactNode;
}

export function SummaryCard({ icon, badge, title, value, subtitle, footer }: SummaryCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="text-zinc-500 dark:text-zinc-400">{icon}</div>
        {badge && <div className="flex items-center">{badge}</div>}
      </div>
      <h3 className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider">{title}</h3>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
          {value}
        </span>
        {subtitle && <span className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>}
      </div>
      {footer && <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800">{footer}</div>}
    </div>
  );
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
      <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col shadow-sm min-h-[220px]">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{t("dashboard.cloudStorage")}</h3>
          <Cloud className="h-4 w-4 text-zinc-400 dark:text-zinc-500 animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!storage) {
    return (
      <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col shadow-sm min-h-[220px]">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{t("dashboard.cloudStorage")}</h3>
          <Cloud className="h-4 w-4 text-red-500 dark:text-red-400" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
            {t("dashboard.storageError") || "Failed to retrieve storage status"}
          </span>
        </div>
      </div>
    );
  }

  const isOffline = storage.status === "offline";

  return (
    <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{t("dashboard.cloudStorage")}</h3>
        <div className="flex items-center gap-1.5">
          {isOffline && (
            <span className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 animate-pulse">
              <span className="w-1 h-1 bg-red-600 dark:bg-red-400 rounded-full animate-ping" />
              {t("dashboard.offline")}
            </span>
          )}
          <Cloud className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center py-2">
        <div
          className="relative w-24 h-24 flex items-center justify-center rounded-full transition-all duration-500 ease-out"
          style={{
            background:
              isOffline || storage.total === "unlimited" || storage.total === "unknown"
                ? "var(--color-surface-container-high)"
                : `conic-gradient(var(--color-primary) ${storage.percentage}%, var(--color-surface-container-high) ${storage.percentage}% 100%)`,
          }}
        >
          <div className="absolute inset-1.5 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center">
            <div className="text-center">
              {isOffline ? (
                <CloudOff className="h-6 w-6 text-zinc-300 dark:text-zinc-700" />
              ) : (
                <span
                  className="block text-lg font-extrabold text-zinc-900 dark:text-zinc-100"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {storage.total === "unlimited"
                    ? "∞"
                    : storage.total === "unknown"
                      ? "?"
                      : `${storage.percentage}%`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mb-1 font-mono">
          <span>
            {t("dashboard.used")}: {isOffline ? t("dashboard.unavailable") : formatBytes(storage.used)}
          </span>
          <span>
            {t("dashboard.total")}:{" "}
            {isOffline
              ? t("dashboard.unavailable")
              : storage.total === "unlimited"
                ? t("dashboard.unlimited")
                : storage.total === "unknown"
                  ? t("dashboard.unknown")
                  : formatBytes(storage.total as number)}
          </span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1">
          <div
            className="bg-zinc-900 dark:bg-zinc-100 h-1 rounded-full transition-all duration-500 ease-out"
            style={{
              width:
                isOffline || storage.total === "unlimited" || storage.total === "unknown" ? "0%" : `${storage.percentage}%`,
            }}
          />
        </div>
      </div>
    </div>
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
  return (
    <div className="md:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{t("dashboard.recentInvoices")}</h3>
        <Link to="/billing" className="text-xs text-zinc-900 dark:text-zinc-100 hover:underline font-semibold">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-800">
              <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t("dashboard.tableInvoiceNo")}
              </th>
              <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t("dashboard.tableDate")}
              </th>
              <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t("dashboard.tableAmount")}
              </th>
              <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t("dashboard.tableStatus")}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors h-10"
              >
                <td className="px-4 py-2 text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100">{inv.invoice_number}</td>
                <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(inv.invoice_date).toLocaleDateString(language === "es_DO" ? "es-DO" : "en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                  ${Number(inv.total).toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusColorClass(inv.status)}`}
                  >
                    {getStatusLabel(inv.status)}
                  </span>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400 italic">
                  {t("dashboard.noInvoices") || "No invoices found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-4">
        {/* Services Summary (Spans 8 cols on desktop) */}
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Support Status */}
          <SummaryCard
            icon={<Headphones className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />}
            badge={
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase flex items-center gap-1">
                <span className="relative flex h-1 w-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500" />
                </span>
                {openTickets} {t("dashboard.tableStatus") === "Estado" ? "ABIERTOS" : "OPEN"}
              </span>
            }
            title={t("dashboard.technicalSupport")}
            value={openTickets}
            subtitle={t("dashboard.activeTickets")}
            footer={
              <Link to="/tickets" className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1">
                <span>{t("dashboard.viewDetails")}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />

          {/* Maintenance */}
          <SummaryCard
            icon={<Wrench className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />}
            badge={
              nextMaintenance ? (
                <span className={`border px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                  nextMaintenance.status === "OVERDUE"
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                    : nextMaintenance.status === "IN_PROGRESS"
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse"
                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                }`}>
                  {t(
                    nextMaintenance.status === "IN_PROGRESS"
                      ? "maintenance.statusInProgress"
                      : nextMaintenance.status === "OVERDUE"
                        ? "maintenance.statusOverdue"
                        : "maintenance.statusScheduled"
                  )}
                </span>
              ) : null
            }
            title={t("dashboard.maintenance")}
            value={
              nextMaintenance
                ? new Date(nextMaintenance.scheduled_date).toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : t("dashboard.noneScheduled")
            }
            footer={
              nextMaintenance ? (
                <Link to="/maintenance" className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1">
                  <span className="truncate max-w-[140px] block" title={nextMaintenance.title}>
                    {nextMaintenance.title}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </Link>
              ) : (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {t("dashboard.noUpcomingMaintenance")}
                </span>
              )
            }
          />

          {/* Backups */}
          <SummaryCard
            icon={<CloudUpload className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />}
            badge={
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
                {t("dashboard.successful")}
              </span>
            }
            title={t("dashboard.lastBackup")}
            value={t("dashboard.twoHoursAgo")}
            footer={<span className="text-[10px] text-zinc-500 dark:text-zinc-400">{t("dashboard.mainDbServer")}</span>}
          />
        </div>

        {/* Resource Usage (Spans 4 cols on desktop) */}
        <StorageOverview storage={storage} loading={storageLoading} t={t} />

        {/* Billing & Invoices (Spans 8 cols on desktop) */}
        <RecentInvoices
          invoices={invoices}
          t={t}
          language={i18n.language}
          getStatusLabel={getStatusLabel}
          getStatusColorClass={getStatusColorClass}
        />
      </div>
    </Page>
  );
}
