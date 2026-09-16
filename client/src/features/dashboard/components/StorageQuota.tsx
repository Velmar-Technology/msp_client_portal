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
      <div className="flex min-h-[120px] flex-col rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("dashboard.cloudStorage")}
          </span>
          <div className="shrink-0 rounded-md bg-muted p-1.5 text-muted-foreground">
            <Cloud className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2 text-center">
          <div className="rounded-full bg-muted p-2 text-muted-foreground">
            <CloudOff className="h-4 w-4" />
          </div>
          <p className="max-w-52.5 text-[11px] leading-snug text-muted-foreground">
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
          className="inline-flex shrink-0 self-center items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
          title={t("dashboard.activeAccounts")}
        >
          <Cloud className="h-2.5 w-2.5" />
          <span className="font-semibold text-foreground">
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
            className="w-full bg-muted rounded-full h-1.5 overflow-hidden"
          >
            <div
              className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
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
