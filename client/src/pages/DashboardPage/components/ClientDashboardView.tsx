import { Plus } from "lucide-react";
import { Page } from "@/components/Page";
import { useClientDashboard } from "@/hooks/useClientDashboard";
import { DashboardSummaryStats } from "@/pages/DashboardPage/components/DashboardSummaryStats";
import { ActiveSubscriptions } from "@/pages/DashboardPage/components/ActiveSubscriptions";
import { RecentInvoices } from "@/pages/DashboardPage/components/RecentInvoices";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientDashboardView() {
  const { t, loading, subscriptions, invoices, handleNewTicket, getStatusColor } = useClientDashboard();

  if (loading) {
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
            <Skeleton className="w-32 h-8" />
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 w-full">
            <Skeleton className="w-60 h-48" />
            <Skeleton className="w-60 h-48" />
            <Skeleton className="w-60 h-48" />
            <Skeleton className="w-60 h-48" />
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
        <button
          onClick={handleNewTicket}
          className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 px-3.5 py-1.5 rounded-md flex items-center gap-1.5 hover:opacity-90 transition-opacity text-xs font-semibold cursor-pointer shadow-sm border border-zinc-900 dark:border-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("dashboard.newTicket")}
        </button>
      }
    >
      <div className="space-y-6 mb-6">
        <DashboardSummaryStats />

        {subscriptions.length > 0 && (
          <ActiveSubscriptions subscriptions={subscriptions} getStatusColor={getStatusColor} />
        )}

        <RecentInvoices invoices={invoices} getStatusColor={getStatusColor} />
      </div>
    </Page>
  );
}
