import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Cloud } from "lucide-react";
import { formatBytes } from "@/hooks/useClientDashboard";
import SummaryCard from "@/components/dashboard/summary-card";

interface StorageQuotaProps {
  totalSlotsCount: number;
  activeSlotsCount: number;
  totalStorageQuota: number;
  activeStorageQuota: number;
}

export function StorageQuota({
  totalSlotsCount,
  activeSlotsCount,
  totalStorageQuota,
  activeStorageQuota,
}: StorageQuotaProps) {
  const { t } = useTranslation();

  const usagePercentage =
    totalStorageQuota > 0 ? Math.min(100, Math.round((activeStorageQuota / totalStorageQuota) * 100)) : 0;

  // Circular gauge config
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usagePercentage / 100) * circumference;

  return (
    <SummaryCard
      icon={<Cloud className="h-3.5 w-3.5" />}
      title={t("dashboard.cloudStorage")}
      value={
        totalSlotsCount + 1 > 0 ? (
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
                    className="stroke-zinc-900 dark:stroke-zinc-100 transition-all duration-500 ease-out"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    {usagePercentage}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
                    {t("dashboard.used")}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-1.5">
                <span>{t("dashboard.activeAccounts")}</span>
                <span className="font-semibold text-zinc-850 dark:text-zinc-200">
                  {activeSlotsCount} / {totalSlotsCount}
                </span>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 font-medium text-zinc-500 dark:text-zinc-400">
                  <span>{formatBytes(activeStorageQuota)}</span>
                  <span>{formatBytes(totalStorageQuota)}</span>
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
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center py-6">
            <p className="text-xs text-zinc-450 dark:text-zinc-500 mb-2.5 font-normal">
              {t("dashboard.noActiveSubscriptions")}
            </p>
            <Link
              to="/plans"
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline transition-all"
            >
              {t("dashboard.viewPlanDetails")}
            </Link>
          </div>
        )
      }
    />
  );
}
