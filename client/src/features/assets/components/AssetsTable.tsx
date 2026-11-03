import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Trash2, ShieldCheck, Wrench, Archive, Server } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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
import type { AssetContract, AssetStatus } from '@shared/contracts';
import { useDeleteAssetMutation } from '../api/useAssetsQueries';

interface AssetsTableProps {
  assets: AssetContract[];
  onEdit: (asset: AssetContract) => void;
}

export function AssetsTable({ assets, onEdit }: AssetsTableProps) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteAssetMutation();
  const [assetToDelete, setAssetToDelete] = useState<AssetContract | null>(null);

  const handleDelete = async () => {
    if (!assetToDelete) return;
    try {
      await deleteMutation.mutateAsync(assetToDelete.id);
      toast.success(t('assets.messages.deleteSuccess', 'Asset deleted successfully'));
    } catch {
      toast.error(t('assets.messages.deleteError', 'Failed to delete asset'));
    } finally {
      setAssetToDelete(null);
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="outline" className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
            <ShieldCheck className="h-3 w-3" />
            {t('assets.status.active', 'Active')}
          </Badge>
        );
      case 'MAINTENANCE':
        return (
          <Badge variant="outline" className="h-5 gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">
            <Wrench className="h-3 w-3" />
            {t('assets.status.maintenance', 'Maintenance')}
          </Badge>
        );
      case 'IN_STORAGE':
        return (
          <Badge variant="outline" className="h-5 gap-1 border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px]">
            <Archive className="h-3 w-3" />
            {t('assets.status.inStorage', 'In Storage')}
          </Badge>
        );
      case 'DECOMMISSIONED':
      default:
        return (
          <Badge variant="secondary" className="h-5 gap-1 text-[10px]">
            {t('assets.status.decommissioned', 'Decommissioned')}
          </Badge>
        );
    }
  };

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border rounded-lg bg-card/50">
        <Server className="h-8 w-8 mb-2 stroke-1 text-muted-foreground/60" />
        <p className="text-sm font-medium">{t('assets.empty.title', 'No IT assets found')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('assets.empty.description', 'Get started by registering hardware, software, or network assets.')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 text-xs">{t('assets.headers.name', 'Asset')}</TableHead>
              <TableHead className="h-8 text-xs">{t('assets.headers.type', 'Type')}</TableHead>
              <TableHead className="h-8 text-xs">{t('assets.headers.status', 'Status')}</TableHead>
              <TableHead className="h-8 text-xs">{t('assets.headers.makeModel', 'Make / Model')}</TableHead>
              <TableHead className="h-8 text-xs">{t('assets.headers.serial', 'Serial Number')}</TableHead>
              <TableHead className="h-8 text-xs">{t('assets.headers.assigned', 'Assigned To')}</TableHead>
              <TableHead className="h-8 text-xs w-[50px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id} className="text-xs">
                <TableCell className="py-2 font-medium">{asset.name}</TableCell>
                <TableCell className="py-2">
                  <Badge variant="secondary" className="h-5 text-[10px] font-normal">
                    {asset.assetType}
                  </Badge>
                </TableCell>
                <TableCell className="py-2">{getStatusBadge(asset.status)}</TableCell>
                <TableCell className="py-2 text-muted-foreground">
                  {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || '—'}
                </TableCell>
                <TableCell className="py-2 font-mono text-[11px] text-muted-foreground">
                  {asset.serialNumber || '—'}
                </TableCell>
                <TableCell className="py-2 text-muted-foreground">
                  {asset.assignedClientName || asset.assignedEquipmentName || '—'}
                </TableCell>
                <TableCell className="py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem onClick={() => onEdit(asset)} className="gap-2 cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                        {t('common.edit', 'Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setAssetToDelete(asset)}
                        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('common.delete', 'Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={Boolean(assetToDelete)} onOpenChange={(open) => !open && setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('assets.deleteConfirm.title', 'Delete Asset?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'assets.deleteConfirm.description',
                'This will soft-delete {{name}} from the active inventory. Linked device mappings will be detached.',
                { name: assetToDelete?.name }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
