import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Plus,
  AlertTriangle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { ConsumableContract } from '@shared/contracts';
import {
  useConsumablesQuery,
  useDeleteConsumableMutation,
} from '../api/useConsumablesQueries';
import {
  ConsumablesTable,
  CreateConsumableModal,
  CheckoutConsumableModal,
  RestockConsumableModal,
  ConsumableHistoryModal,
} from '../components';

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'amber' | 'rose';
}

function MetricCard({ title, value, icon: Icon, tone = 'default' }: MetricCardProps) {
  const toneClasses = {
    default: 'text-primary bg-primary/10',
    amber: 'text-amber-500 bg-amber-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-xs">
      <div className={`p-2 rounded-md ${toneClasses}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="text-xl font-bold tracking-tight">{value}</div>
      </div>
    </div>
  );
}

export function ConsumablesPage() {
  const { t } = useTranslation();

  // Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConsumable, setEditingConsumable] = useState<ConsumableContract | null>(null);
  const [checkingOutConsumable, setCheckingOutConsumable] = useState<ConsumableContract | null>(null);
  const [restockingConsumable, setRestockingConsumable] = useState<ConsumableContract | null>(null);
  const [historyConsumable, setHistoryConsumable] = useState<ConsumableContract | null>(null);
  const [deletingConsumable, setDeletingConsumable] = useState<ConsumableContract | null>(null);

  // Queries & Mutations
  const { data: consumablesData, isLoading } = useConsumablesQuery(search);
  const deleteConsumableMutation = useDeleteConsumableMutation();

  // Filter by category client-side
  const filteredConsumables = useMemo(() => {
    const list = consumablesData?.consumables ?? [];
    if (categoryFilter === 'ALL') return list;
    return list.filter((c) => c.category === categoryFilter);
  }, [consumablesData?.consumables, categoryFilter]);

  // Handlers
  const handleDeleteConfirm = async () => {
    if (!deletingConsumable) return;
    try {
      await deleteConsumableMutation.mutateAsync(deletingConsumable.id);
      toast.success(t('assets.consumables.deletedSuccess', 'Consumable deleted successfully'));
      setDeletingConsumable(null);
    } catch {
      toast.error(t('assets.consumables.actionError', 'Failed to delete consumable'));
    }
  };

  return (
    <Page className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Page.Header>
        <Page.HeaderRow>
          <Page.TitleGroup>
            <div className="flex items-center gap-2">
              <Page.Title>{t('assets.tabs.consumables', 'Consumables & Supplies')}</Page.Title>
            </div>
            <Page.Description>
              {t(
                'assets.consumables.description',
                'Track toner, cables, accessories, and supplies with automated low-stock and out-of-stock alerts.'
              )}
            </Page.Description>
          </Page.TitleGroup>
          <Page.Actions>
            <Button asChild variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <Link to="/assets">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('assets.tabs.itAssets', 'IT Assets')}
              </Link>
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="h-7 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('assets.consumables.newConsumable', 'Add Consumable')}
            </Button>
          </Page.Actions>
        </Page.HeaderRow>
      </Page.Header>

      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title={t('assets.consumables.kpiTotal', 'Total Inventory Items')}
            value={isLoading ? <Skeleton className="h-7 w-16" /> : consumablesData?.total ?? 0}
            icon={Package}
            tone="default"
          />
          <MetricCard
            title={t('assets.consumables.kpiLowStock', 'Low Stock Alerts')}
            value={isLoading ? <Skeleton className="h-7 w-16" /> : consumablesData?.lowStockCount ?? 0}
            icon={AlertTriangle}
            tone="amber"
          />
          <MetricCard
            title={t('assets.consumables.kpiOutOfStock', 'Out of Stock')}
            value={isLoading ? <Skeleton className="h-7 w-16" /> : consumablesData?.outOfStockCount ?? 0}
            icon={XCircle}
            tone="rose"
          />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder={t('assets.consumables.searchPlaceholder', 'Search consumables by name, category, SKU, model...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-64 sm:w-80 text-xs"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-7 w-40 text-xs">
                <SelectValue placeholder={t('assets.consumables.selectCategory', 'Category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('assets.status.all', 'All Categories')}</SelectItem>
                <SelectItem value="Toner / Ink">{t('assets.consumables.categories.toner', 'Toner & Ink')}</SelectItem>
                <SelectItem value="Cables / Adapters">{t('assets.consumables.categories.cables', 'Cables & Adapters')}</SelectItem>
                <SelectItem value="Peripherals">{t('assets.consumables.categories.peripherals', 'Peripherals')}</SelectItem>
                <SelectItem value="Batteries">{t('assets.consumables.categories.batteries', 'Batteries')}</SelectItem>
                <SelectItem value="Paper / Media">{t('assets.consumables.categories.paper', 'Paper & Media')}</SelectItem>
                <SelectItem value="Tools / Cleaning">{t('assets.consumables.categories.tools', 'Tools & Cleaning')}</SelectItem>
                <SelectItem value="Other">{t('assets.consumables.categories.other', 'Other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Consumables Table */}
        {isLoading ? (
          <div className="space-y-2 border rounded-md p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <ConsumablesTable
            consumables={filteredConsumables}
            onCheckout={setCheckingOutConsumable}
            onRestock={setRestockingConsumable}
            onHistory={setHistoryConsumable}
            onEdit={setEditingConsumable}
            onDelete={setDeletingConsumable}
          />
        )}
      </div>

      {/* Consumable Modals */}
      {isCreateOpen && (
        <CreateConsumableModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {editingConsumable && (
        <CreateConsumableModal
          isOpen={Boolean(editingConsumable)}
          onClose={() => setEditingConsumable(null)}
          consumable={editingConsumable}
        />
      )}

      {checkingOutConsumable && (
        <CheckoutConsumableModal
          isOpen={Boolean(checkingOutConsumable)}
          onClose={() => setCheckingOutConsumable(null)}
          consumable={checkingOutConsumable}
        />
      )}

      {restockingConsumable && (
        <RestockConsumableModal
          isOpen={Boolean(restockingConsumable)}
          onClose={() => setRestockingConsumable(null)}
          consumable={restockingConsumable}
        />
      )}

      {historyConsumable && (
        <ConsumableHistoryModal
          isOpen={Boolean(historyConsumable)}
          onClose={() => setHistoryConsumable(null)}
          consumable={historyConsumable}
        />
      )}

      <AlertDialog open={Boolean(deletingConsumable)} onOpenChange={() => setDeletingConsumable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('assets.consumables.deleteConfirmTitle', 'Delete Consumable Item?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'assets.consumables.deleteConfirmDesc',
                'This will soft-delete "{{name}}" from active inventory. Historic checkout audit logs will be preserved.',
                { name: deletingConsumable?.name }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
export default ConsumablesPage;
