import { Plus } from 'lucide-react';
import { Page } from '@/components/Page';
import { useClientDashboard } from '../hooks/useClientDashboard';
import { StatsGrid } from './ClientDashboard/components/StatsGrid';
import { StorageQuota } from './ClientDashboard/components/StorageQuota';
import { ActiveSubscriptions } from './ClientDashboard/components/ActiveSubscriptions';
import { RecentInvoices } from './ClientDashboard/components/RecentInvoices';

export function ClientDashboard() {
  const {
    t,
    loading,
    subscriptions,
    invoices,
    openTickets,
    totalSlotsCount,
    activeSlotsCount,
    totalStorageQuota,
    activeStorageQuota,
    handleNewTicket,
    getStatusColor,
  } = useClientDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-background">
        <div className="w-6 h-6 border-2 border-zinc-200/80 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Page
      title={t('dashboard.systemOverview')}
      subtitle={t('dashboard.systemStatus')}
      actions={
        <button
          onClick={handleNewTicket}
          className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-3.5 py-1.5 rounded-md flex items-center gap-1.5 hover:opacity-90 transition-opacity text-xs font-semibold cursor-pointer shadow-sm border border-zinc-850 dark:border-zinc-200"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('dashboard.newTicket')}
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Support Status, Maintenance, Backup Status Card grid - spans 8 cols */}
        <div className="md:col-span-8">
          <StatsGrid openTickets={openTickets} />
        </div>

        {/* Cloud Storage quota - spans 4 cols */}
        <div className="md:col-span-4">
          <StorageQuota
            totalSlotsCount={totalSlotsCount}
            activeSlotsCount={activeSlotsCount}
            totalStorageQuota={totalStorageQuota}
            activeStorageQuota={activeStorageQuota}
          />
        </div>

        {/* Active Subscriptions - spans 8 cols */}
        {subscriptions.length > 0 && (
          <div className="md:col-span-8">
            <ActiveSubscriptions
              subscriptions={subscriptions}
              getStatusColor={getStatusColor}
            />
          </div>
        )}

        {/* Recent Invoices - spans 8 cols */}
        <div className="md:col-span-8">
          <RecentInvoices
            invoices={invoices}
            getStatusColor={getStatusColor}
          />
        </div>
      </div>
    </Page>
  );
}
