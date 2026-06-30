import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/Page";
import { Headphones, Wrench, CloudUpload, Cloud, CloudOff, ArrowRight } from "lucide-react";
import { invoiceService } from "../services/invoiceService";
import type { Invoice } from "../services/invoiceService";
import { systemService } from "../services/systemService";
import type { StorageStatus } from "../services/systemService";
import { ticketService } from "../services/ticketService";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function AdminDashboard() {
  const { t, i18n } = useTranslation();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [ticketSummary, setTicketSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadInvoices() {
      try {
        const invData = await invoiceService.getAll(1, 5);
        setInvoices(invData.data || []);
      } catch (err) {
        console.error("Failed to load recent invoices:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadStorage() {
      try {
        const data = await systemService.getStorageUsage();
        setStorage(data);
      } catch (err) {
        console.error("Failed to load storage quota:", err);
      } finally {
        setStorageLoading(false);
      }
    }

    async function loadTickets() {
      try {
        const summary = await ticketService.getStatusSummary();
        setTicketSummary(summary);
      } catch (err) {
        console.error("Failed to load ticket summary/DB connection:", err);
      }
    }

    loadInvoices();
    loadStorage();
    loadTickets();
  }, []);

  const openTickets = (ticketSummary.OPEN || 0) + (ticketSummary.IN_PROGRESS || 0);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t("tickets.filterAwaitingPayment"),
      PAID: t("tickets.filterResolved"),
    };
    return map[status] || status;
  };

  const getStatusColorClass = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-[#F59E0B]/10 text-[#F59E0B]",
      PAID: "bg-[#10B981]/10 text-[#10B981]",
      OVERDUE: "bg-error/10 text-error",
    };
    return colors[status] || "bg-surface-container text-on-surface-variant";
  };

  if (loading) {
    return (
      <Page title={t("dashboard.systemOverview")} subtitle={t("dashboard.systemStatus")}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </Page>
    );
  }

  return (
    <Page title={t("dashboard.systemOverview")} subtitle={t("dashboard.systemStatus")}>
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
        {/* Services Summary (Spans 8 cols on desktop) */}
        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Support Status */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <Headphones className="h-6 w-6 text-secondary" />
              <div className="flex items-center gap-1.5">
                <span className="bg-success/10 text-success px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                  </span>
                  {openTickets} {t("dashboard.tableStatus") === "Estado" ? "ABIERTOS" : "OPEN"}
                </span>
              </div>
            </div>
            <h3 className="text-label-sm text-on-surface-variant">{t("dashboard.technicalSupport")}</h3>

            <div className="mt-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-h2 font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                  {openTickets}
                </span>
                <span className="text-[13px] text-on-surface-variant">{t("dashboard.activeTickets")}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-outline-variant/30">
              <Link to="/tickets" className="text-label-sm text-primary hover:underline flex items-center gap-1">
                <span>{t("dashboard.viewDetails")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Maintenance */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <Wrench className="h-6 w-6 text-secondary" />
              <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                {t("dashboard.scheduled")}
              </span>
            </div>
            <h3 className="text-label-sm text-on-surface-variant">{t("dashboard.maintenance")}</h3>
            <p className="text-h2 mt-1" style={{ fontFamily: "var(--font-heading)" }}>
              {new Date("2024-10-15").toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="mt-auto pt-4 border-t border-outline-variant/30">
              <span className="text-[11px] text-on-surface-variant">{t("dashboard.preventiveNetworkReview")}</span>
            </div>
          </div>

          {/* Backups */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <CloudUpload className="h-6 w-6 text-secondary" />
              <span className="bg-[#10B981]/10 text-[#10B981] px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                {t("dashboard.successful")}
              </span>
            </div>
            <h3 className="text-label-sm text-on-surface-variant">{t("dashboard.lastBackup")}</h3>
            <p className="text-h2 mt-1" style={{ fontFamily: "var(--font-heading)" }}>
              {t("dashboard.twoHoursAgo")}
            </p>
            <div className="mt-auto pt-4 border-t border-outline-variant/30">
              <span className="text-[11px] text-on-surface-variant">{t("dashboard.mainDbServer")}</span>
            </div>
          </div>
        </div>

        {/* Resource Usage (Spans 4 cols on desktop) */}
        {storageLoading ? (
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-label-lg font-bold text-on-surface">{t("dashboard.cloudStorage")}</h3>
              <Cloud className="h-5 w-5 text-on-surface-variant animate-pulse" />
            </div>
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
        ) : !storage ? (
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-label-lg font-bold text-on-surface">{t("dashboard.cloudStorage")}</h3>
              <Cloud className="h-5 w-5 text-error" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <span className="text-[11px] text-error font-semibold">
                {t("dashboard.storageError", "Failed to retrieve storage status")}
              </span>
            </div>
          </div>
        ) : (
          <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-label-lg font-bold text-on-surface">{t("dashboard.cloudStorage")}</h3>
              <div className="flex items-center gap-1.5">
                {storage.status === "offline" && (
                  <span className="bg-error/10 text-error px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-error rounded-full" />
                    {t("dashboard.offline")}
                  </span>
                )}
                <Cloud className="h-5 w-5 text-on-surface-variant" />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center py-4">
              <div
                className="relative w-32 h-32 flex items-center justify-center rounded-full transition-all duration-500 ease-out"
                style={{
                  background:
                    storage.status === "offline" || storage.total === "unlimited" || storage.total === "unknown"
                      ? "var(--color-surface-container-high)"
                      : `conic-gradient(var(--color-primary) ${storage.percentage}%, var(--color-surface-container-high) ${storage.percentage}% 100%)`,
                }}
              >
                <div className="absolute inset-2 bg-surface-container-lowest rounded-full flex items-center justify-center">
                  <div className="text-center">
                    {storage.status === "offline" ? (
                      <CloudOff className="h-8 w-8 text-on-surface-variant/40 animate-fade-in" />
                    ) : (
                      <span
                        className="block text-h1 text-primary animate-fade-in"
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
            <div className="mt-auto">
              <div className="flex justify-between text-[11px] text-on-surface-variant mb-1">
                <span>
                  {t("dashboard.used")}: {storage.status === "offline" ? t("dashboard.unavailable") : formatBytes(storage.used)}
                </span>
                <span>
                  {t("dashboard.total")}:{" "}
                  {storage.status === "offline"
                    ? t("dashboard.unavailable")
                    : storage.total === "unlimited"
                      ? t("dashboard.unlimited")
                      : storage.total === "unknown"
                        ? t("dashboard.unknown")
                        : formatBytes(storage.total as number)}
                </span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width:
                      storage.status === "offline" || storage.total === "unlimited" || storage.total === "unknown" ? "0%" : `${storage.percentage}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Billing & Invoices (Spans 8 cols on desktop) */}
        <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-label-lg font-bold text-on-surface">{t("dashboard.recentInvoices")}</h3>
            <Link to="/billing" className="text-label-sm text-primary hover:underline font-semibold">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">
                    {t("dashboard.tableInvoiceNo")}
                  </th>
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">
                    {t("dashboard.tableDate")}
                  </th>
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">
                    {t("dashboard.tableAmount")}
                  </th>
                  <th className="px-5 py-3 text-[11px] font-bold text-on-surface-variant uppercase">
                    {t("dashboard.tableStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-outline-variant/30 hover:bg-surface-container-low/30 transition-colors h-12"
                  >
                    <td className="px-5 py-3 text-label-sm font-mono text-on-surface">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-label-sm text-on-surface-variant">
                      {new Date(inv.invoice_date).toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-label-sm font-semibold text-on-surface">
                      ${Number(inv.total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${getStatusColorClass(inv.status)}`}
                      >
                        {getStatusLabel(inv.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-label-sm text-on-surface-variant">
                      {t("dashboard.noInvoices") || "No invoices found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Promotional Banner (Spans 4 cols on desktop) */}
        {/* <div className="md:col-span-4 relative rounded-xl border border-outline-variant overflow-hidden group shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] to-[#1E293B] z-0"></div>
          {/* Decorative gradients */}
        {/*<div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/5 rounded-full blur-2xl z-0 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-white/5 rounded-full blur-2xl z-0 pointer-events-none"></div>
          
          <div className="relative z-10 p-6 h-full flex flex-col">
            <div className="mb-4 inline-block bg-white/15 text-white/90 px-2.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border border-white/25 self-start">
              {t('dashboard.recommendedUpdate')}
            </div>
            <h3 className="text-label-lg font-bold text-white mb-1">{t('dashboard.enterprisePlan')}</h3>
            <p className="text-label-sm text-slate-300 mb-6 flex-1">
              {t('dashboard.enterpriseDesc')}
            </p>
            <button
              onClick={() => navigate('/plans')}
              className="bg-white text-[#0F172A] w-full py-2.5 rounded-lg text-label-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>{t('dashboard.viewPlanDetails')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>*/}
      </div>
    </Page>
  );
}
