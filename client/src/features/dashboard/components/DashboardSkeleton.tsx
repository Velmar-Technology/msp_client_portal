import { PageShell } from "@/components/layout/PageShell";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

export function DashboardSkeleton() {
  const { t } = useTranslation();

  return (
    <PageShell title={t("dashboard.systemOverview")} subtitle={t("dashboard.systemStatus")}>
      <div className="space-y-6 mb-6">
        <StatsGrid className="w-full">
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-64" />
          <Skeleton className="w-full h-64" />
        </StatsGrid>
        <div className="w-full">
          <div className="flex justify-between gap-6 mb-6">
            <Skeleton className="w-64 h-10" />
            <Skeleton className="w-24 h-10" />
          </div>
          <Skeleton className="w-full h-64" />
        </div>
      </div>
    </PageShell>
  );
}

export default DashboardSkeleton;
