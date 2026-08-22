import { Plus } from "lucide-react";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { useClientDashboard } from "@/hooks/useClientDashboard";
import { DashboardSummaryStats } from "@/pages/DashboardPage/components/DashboardSummaryStats";
import { ActiveSubscriptions } from "@/pages/DashboardPage/components/ActiveSubscriptions";
import { RecentInvoices } from "@/pages/DashboardPage/components/RecentInvoices";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";

export function ClientDashboardView() {
  const { t, loading, subscriptions, invoices, handleNewTicket, getStatusColor } = useClientDashboard();
  const showSkeleton = useDeferredLoading(loading, SKELETON_DISPLAY_DELAY_MS);

  if (loading) {
    if (!showSkeleton) return null;
    return (
      <Page
        title={
          <div>
            <Skeleton className="w-60 h-8" />
          </div>
        }
        subtitle={
          <div>
            <Skeleton className="w-28 h-8" />
          </div>
        }
        actions={
          <div>
            <Skeleton className="w-32 h-7" />
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 w-full">
            <Skeleton className="w-60 h-36" />
            <Skeleton className="w-60 h-36" />
            <Skeleton className="w-60 h-36" />
            <Skeleton className="w-60 h-36" />
          </div>
          <div className="grid grid-cols-1">
            <Skeleton className="w-full h-48" />
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={t("dashboard.systemOverview")}
      subtitle={t("dashboard.systemStatus")}
      actions={
        <Button
          type="button"
          size="sm"
          onClick={handleNewTicket}
          className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t("dashboard.newTicket")}</span>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* 1. Summary Metrics */}
        <section aria-label="Support & System Overview">
          <DashboardSummaryStats />
        </section>

        {/* 2. Subscriptions */}
        {subscriptions.length > 0 && (
          <section aria-label="Active Subscriptions">
            <ActiveSubscriptions subscriptions={subscriptions} getStatusColor={getStatusColor} />
          </section>
        )}

        {/* 3. Invoices */}
        <section aria-label="Recent Invoices">
          <RecentInvoices invoices={invoices} getStatusColor={getStatusColor} />
        </section>
      </div>
    </Page>
  );
}
