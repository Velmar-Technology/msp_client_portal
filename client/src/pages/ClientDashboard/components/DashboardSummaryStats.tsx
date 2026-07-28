import { useTranslation } from "react-i18next";
import { Headphones, Wrench, CloudUpload, ArrowRight, Cloud } from "lucide-react";
import SummaryCard from "@/components/dashboard/summary-card";
import { Link } from "react-router-dom";
import { StorageQuota } from "./StorageQuota";
import { useClientDashboard } from "@/hooks/useClientDashboard";
import { StatsGrid } from "@/components/stats-grid";

export function DashboardSummaryStats() {
  const { t } = useTranslation();
  const { totalSlotsCount, activeSlotsCount, totalStorageQuota, activeStorageQuota, openTickets } =
    useClientDashboard();

  return (
    <StatsGrid className="md:col-span-10">
      {/* Support Status Card */}
      <SummaryCard
        icon={<Headphones className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
        title={t("dashboard.technicalSupport")}
        subtitle={t("dashboard.activeTickets")}
        value={openTickets}
        footer={
          <Link
            to="/tickets"
            className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t("dashboard.viewDetails")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {/* Maintenance Card */}
      <SummaryCard
        icon={<Wrench className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
        title={t("dashboard.maintenance")}
        value="15 Oct 2024"
        badge={t("dashboard.scheduled")}
        footer={
          <Link
            to="/maintenance"
            className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t("dashboard.viewDetails")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {/* Backups Card */}
      <SummaryCard
        icon={<CloudUpload className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />}
        title={t("dashboard.lastBackup")}
        value="15 Oct 2024"
        badge={t("dashboard.successful")}
        footer={
          <Link
            to="/backups"
            className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {t("dashboard.viewDetails")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {/* Cloud Storage Card*/}
      <StorageQuota
        totalSlotsCount={totalSlotsCount}
        activeSlotsCount={activeSlotsCount}
        totalStorageQuota={totalStorageQuota}
        activeStorageQuota={activeStorageQuota}
      />
    </StatsGrid>
  );
}
