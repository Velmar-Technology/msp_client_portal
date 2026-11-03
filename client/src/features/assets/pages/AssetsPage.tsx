import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Boxes,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  XCircle,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { MetricCard } from '@/components/shared/MetricCard';
import type { AssetContract, AssetType, ConsumableContract } from '@shared/contracts';
import {
  useAssetsQuery,
  useConsumablesQuery,
  useDeleteConsumableMutation,
} from '../api/useAssetsQueries';
import { useAssetsFilters } from '../hooks/useAssetsFilters';
import { useAssetsModals } from '../hooks/useAssetsModals';
import { AssetsTable } from '../components/AssetsTable';
import { AssetsModal } from '../components/AssetsModal';
import { ConsumablesTable } from '../components/ConsumablesTable';
import { CreateConsumableModal } from '../components/CreateConsumableModal';
import { CheckoutConsumableModal } from '../components/CheckoutConsumableModal';
import { RestockConsumableModal } from '../components/RestockConsumableModal';
import { ConsumableHistoryModal } from '../components/ConsumableHistoryModal';

export function AssetsPage() {
  const { t } = useTranslation();
  const [activeMainTab, setActiveMainTab] = useState<'it_assets' | 'consumables'>('it_assets');

  // IT Assets state
  const { search, type, status, setSearch, setType, setStatus } = useAssetsFilters();
  const { isCreateOpen, openCreate, closeCreate } = useAssetsModals();
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<AssetContract | null>(null);

  const { data: assetsData, isLoading: isAssetsLoading } = useAssetsQuery({
    search: search || undefined,
    type: type || undefined,
    status: status || undefined,
  });

  // Consumables state
  const [consumableSearch, setConsumableSearch] = useState('');
  const { data: consumablesData, isLoading: isConsumablesLoading } = useConsumablesQuery(
    consumableSearch || undefined
  );
  const deleteConsumableMutation = useDeleteConsumableMutation();

  const [isCreateConsumableOpen, setIsCreateConsumableOpen] = useState(false);
  const [selectedConsumableForEdit, setSelectedConsumableForEdit] = useState<ConsumableContract | null>(null);
  const [selectedConsumableForCheckout, setSelectedConsumableForCheckout] = useState<ConsumableContract | null>(null);
  const [selectedConsumableForRestock, setSelectedConsumableForRestock] = useState<ConsumableContract | null>(null);
  const [selectedConsumableForHistory, setSelectedConsumableForHistory] = useState<ConsumableContract | null>(null);
  const [consumableToDelete, setConsumableToDelete] = useState<ConsumableContract | null>(null);

  const handleEditAsset = (asset: AssetContract) => {
    setSelectedAssetForEdit(asset);
  };

  const handleDeleteConsumableConfirm = async () => {
    if (!consumableToDelete) return;
    try {
      await deleteConsumableMutation.mutateAsync(consumableToDelete.id);
      toast.success(t('assets.consumables.deletedSuccess', 'Consumable item deleted'));
      setConsumableToDelete(null);
    } catch {
      toast.error(t('assets.consumables.actionError', 'Failed to delete consumable'));
    }
  };

  const mainTabs = useMemo(
    () => [
      { id: 'it_assets', label: t('assets.tabs.itAssets', 'IT Assets') },
      { id: 'consumables', label: t('assets.tabs.consumables', 'Consumables & Supplies') },
    ],
    [t]
  );

  const assetTypeTabs = useMemo(
    () => [
      { id: 'ALL', label: t('assets.tabs.all', 'All') },
      { id: 'HARDWARE', label: t('assets.tabs.hardware', 'Hardware') },
      { id: 'NETWORK', label: t('assets.tabs.network', 'Network') },
      { id: 'SOFTWARE', label: t('assets.tabs.software', 'Software') },
      { id: 'PERIPHERAL', label: t('assets.tabs.peripheral', 'Peripherals') },
    ],
    [t]
  );

  return (
    <Page className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Page.Header>
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t('assets.title', 'Asset & Inventory Management')}</Page.Title>
            <Page.Description>
              {t(
                'assets.description',
                'Track physical assets, network devices, software licenses, and consumables with low-stock alerts.'
              )}
            </Page.Description>
          </Page.TitleGroup>
          <Page.Actions>
            {activeMainTab === 'it_assets' ? (
              <Button onClick={openCreate} size="sm" className="h-7 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                {t('assets.newAsset', 'New Asset')}
              </Button>
            ) : (
              <Button
                onClick={() => setIsCreateConsumableOpen(true)}
                size="sm"
                className="h-7 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('assets.consumables.newConsumable', 'Add Consumable')}
              </Button>
            )}
          </Page.Actions>
        </Page.HeaderRow>

        <div className="pt-2">
          <Page.Tabs
            tabs={mainTabs}
            activeTab={activeMainTab}
            onTabChange={(id) => setActiveMainTab(id as 'it_assets' | 'consumables')}
            variant="bubble"
          />
        </div>
      </Page.Header>

      {/* IT ASSETS TAB CONTENT */}
      {activeMainTab === 'it_assets' && (
        <div className="space-y-6">
          {/* Summary KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title={t('assets.metrics.total', 'Total Assets')}
              value={isAssetsLoading ? <Skeleton className="h-7 w-16" /> : assetsData?.total ?? 0}
              icon={Boxes}
            />
            <MetricCard
              title={t('assets.metrics.active', 'Active & Deployed')}
              value={isAssetsLoading ? <Skeleton className="h-7 w-16" /> : assetsData?.activeCount ?? 0}
              icon={ShieldCheck}
            />
            <MetricCard
              title={t('assets.metrics.maintenance', 'Under Maintenance')}
              value={isAssetsLoading ? <Skeleton className="h-7 w-16" /> : assetsData?.maintenanceCount ?? 0}
              icon={Wrench}
            />
          </div>

          {/* Filter Toolbar and Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Page.Tabs
                tabs={assetTypeTabs}
                activeTab={type || 'ALL'}
                onTabChange={(id: string) => setType(id as AssetType | 'ALL')}
                variant="bubble"
              />

              <div className="flex items-center gap-2">
                <Input
                  placeholder={t('assets.searchPlaceholder', 'Search by name, model, serial...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-7 w-48 sm:w-64 text-xs"
                />
                <Select
                  value={status || 'ALL'}
                  onValueChange={(val: any) => setStatus(val)}
                >
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue placeholder={t('assets.statusFilter', 'Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('assets.status.all', 'All Statuses')}</SelectItem>
                    <SelectItem value="ACTIVE">{t('assets.status.active', 'Active')}</SelectItem>
                    <SelectItem value="MAINTENANCE">{t('assets.status.maintenance', 'Maintenance')}</SelectItem>
                    <SelectItem value="IN_STORAGE">{t('assets.status.inStorage', 'In Storage')}</SelectItem>
                    <SelectItem value="DECOMMISSIONED">{t('assets.status.decommissioned', 'Decommissioned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Table */}
            {isAssetsLoading ? (
              <div className="space-y-2 border rounded-md p-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <AssetsTable assets={assetsData?.assets ?? []} onEdit={handleEditAsset} />
            )}
          </div>
        </div>
      )}

      {/* CONSUMABLES & SUPPLIES TAB CONTENT */}
      {activeMainTab === 'consumables' && (
        <div className="space-y-6">
          {/* Consumable KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title={t('assets.consumables.kpiTotal', 'Total Inventory Items')}
              value={isConsumablesLoading ? <Skeleton className="h-7 w-16" /> : consumablesData?.total ?? 0}
              icon={Package}
            />
            <MetricCard
              title={t('assets.consumables.kpiLowStock', 'Low Stock Alerts')}
              value={isConsumablesLoading ? <Skeleton className="h-7 w-16" /> : consumablesData?.lowStockCount ?? 0}
              icon={AlertTriangle}
            />
            <MetricCard
              title={t('assets.consumables.kpiOutOfStock', 'Out of Stock')}
              value={isConsumablesLoading ? <Skeleton className="h-7 w-16" /> : consumablesData?.outOfStockCount ?? 0}
              icon={XCircle}
            />
          </div>

          {/* Consumable Search Toolbar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Input
                placeholder={t('assets.consumables.searchPlaceholder', 'Search consumables by name, category, SKU, model...')}
                value={consumableSearch}
                onChange={(e) => setConsumableSearch(e.target.value)}
                className="h-7 max-w-sm text-xs"
              />
            </div>

            {/* Consumables Table */}
            {isConsumablesLoading ? (
              <div className="space-y-2 border rounded-md p-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <ConsumablesTable
                consumables={consumablesData?.consumables ?? []}
                onCheckout={(item) => setSelectedConsumableForCheckout(item)}
                onRestock={(item) => setSelectedConsumableForRestock(item)}
                onHistory={(item) => setSelectedConsumableForHistory(item)}
                onEdit={(item) => setSelectedConsumableForEdit(item)}
                onDelete={(item) => setConsumableToDelete(item)}
              />
            )}
          </div>
        </div>
      )}

      {/* Asset Creation & Edit Modals */}
      {isCreateOpen && <AssetsModal isOpen={isCreateOpen} onClose={closeCreate} />}
      {selectedAssetForEdit && (
        <AssetsModal
          isOpen={Boolean(selectedAssetForEdit)}
          onClose={() => setSelectedAssetForEdit(null)}
          asset={selectedAssetForEdit}
        />
      )}

      {/* Consumable Modals */}
      {isCreateConsumableOpen && (
        <CreateConsumableModal
          isOpen={isCreateConsumableOpen}
          onClose={() => setIsCreateConsumableOpen(false)}
        />
      )}

      {selectedConsumableForEdit && (
        <CreateConsumableModal
          isOpen={Boolean(selectedConsumableForEdit)}
          onClose={() => setSelectedConsumableForEdit(null)}
          consumable={selectedConsumableForEdit}
        />
      )}

      {selectedConsumableForCheckout && (
        <CheckoutConsumableModal
          isOpen={Boolean(selectedConsumableForCheckout)}
          onClose={() => setSelectedConsumableForCheckout(null)}
          consumable={selectedConsumableForCheckout}
        />
      )}

      {selectedConsumableForRestock && (
        <RestockConsumableModal
          isOpen={Boolean(selectedConsumableForRestock)}
          onClose={() => setSelectedConsumableForRestock(null)}
          consumable={selectedConsumableForRestock}
        />
      )}

      {selectedConsumableForHistory && (
        <ConsumableHistoryModal
          isOpen={Boolean(selectedConsumableForHistory)}
          onClose={() => setSelectedConsumableForHistory(null)}
          consumable={selectedConsumableForHistory}
        />
      )}

      {/* Delete Consumable Confirmation */}
      <AlertDialog
        open={Boolean(consumableToDelete)}
        onOpenChange={(open) => !open && setConsumableToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('assets.consumables.deleteConfirmTitle', 'Delete Consumable Item?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'assets.consumables.deleteConfirmDesc',
                'This will remove "{{name}}" from the active consumable inventory. Checkout history will be retained.',
                { name: consumableToDelete?.name }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConsumableConfirm}
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
export default AssetsPage;
