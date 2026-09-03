import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Cloud, CloudOff, ArrowRight } from "lucide-react";
import { formatBytes } from "../hooks/useClientDashboard";
import SummaryCard from "@/components/dashboard/summary-card";
import { Button } from "@/components/ui/button";

interface StorageQuotaProps {
  totalSlotsCount: number;
  activeSlotsCount: number;
  totalStorageQuota: number;
  activeStorageQuota: number;
}

const footerLinkClassName =
  "flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium";

export function StorageQuota({
  totalSlotsCount,
  activeSlotsCount,
  totalStorageQuota,
  activeStorageQuota,
}: StorageQuotaProps) {
  const { t } = useTranslation();

  const usagePercentage =
    totalStorageQuota > 0 ? Math.min(100, Math.round((activeStorageQuota / totalStorageQuota) * 100)) : 0;

  if (totalSlotsCount === 0) {
    return (
      <div className="flex min-h-[120px] flex-col rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("dashboard.cloudStorage")}
          </span>
          <div className="shrink-0 rounded-md bg-zinc-50 p-1.5 text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
            <Cloud className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2 text-center">
          <div className="rounded-full bg-zinc-100 p-2 text-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-500">
            <CloudOff className="h-4 w-4" />
          </div>
          <p className="max-w-52.5 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            {t("dashboard.noActiveSubscriptions")}
          </p>
          <Button asChild size="sm" variant="outline" className="mt-0.5 gap-1 cursor-pointer font-semibold">
            <Link to="/plans">
              {t("dashboard.viewPlanDetails")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SummaryCard
      icon={<Cloud className="h-3.5 w-3.5" />}
      title={t("dashboard.cloudStorage")}
      value={`${usagePercentage}%`}
      trend={
        <span
          className="inline-flex shrink-0 self-center items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
          title={t("dashboard.activeAccounts")}
        >
          <Cloud className="h-2.5 w-2.5" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {activeSlotsCount} / {totalSlotsCount}
          </span>
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
              className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>{formatBytes(activeStorageQuota)}</span>
            <span>{formatBytes(totalStorageQuota)}</span>
          </div>
        </div>
      }
      footer={
        <Link to="/plans" className={footerLinkClassName}>
          {t("dashboard.viewDetails")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    />
  );
}
