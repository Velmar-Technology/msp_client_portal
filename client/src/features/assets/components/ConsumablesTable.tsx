import { useTranslation } from 'react-i18next';
import {
  PackageMinus,
  PackagePlus,
  History,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ConsumableContract } from '@shared/contracts';

interface ConsumablesTableProps {
  consumables: ConsumableContract[];
  onCheckout: (consumable: ConsumableContract) => void;
  onRestock: (consumable: ConsumableContract) => void;
  onHistory: (consumable: ConsumableContract) => void;
  onEdit: (consumable: ConsumableContract) => void;
  onDelete: (consumable: ConsumableContract) => void;
}

export function ConsumablesTable({
  consumables,
  onCheckout,
  onRestock,
  onHistory,
  onEdit,
  onDelete,
}: ConsumablesTableProps) {
  const { t } = useTranslation();

  if (consumables.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-xs text-muted-foreground">
        {t('assets.consumables.emptyList', 'No consumable items found.')}
      </div>
    );
  }

  const renderStockBadge = (item: ConsumableContract) => {
    if (item.totalQuantity === 0 || item.alertState === 'OUT_OF_STOCK_NOTIFIED') {
      return (
        <Badge variant="destructive" className="gap-1 text-[11px] font-normal">
          <XCircle className="h-3 w-3" />
          {t('assets.consumables.outOfStock', 'Out of Stock')}
        </Badge>
      );
    }
    if (item.totalQuantity <= item.minQuantity || item.alertState === 'LOW_STOCK_NOTIFIED') {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/50 text-amber-500 bg-amber-500/10 gap-1 text-[11px] font-normal"
        >
          <AlertTriangle className="h-3 w-3" />
          {t('assets.consumables.lowStock', 'Low Stock')}
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10 gap-1 text-[11px] font-normal"
      >
        <CheckCircle2 className="h-3 w-3" />
        {t('assets.consumables.inStock', 'In Stock')}
      </Badge>
    );
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="text-xs bg-muted/40">
            <TableHead className="font-semibold">{t('assets.consumables.colItem', 'Item / Name')}</TableHead>
            <TableHead className="font-semibold">{t('assets.consumables.colCategory', 'Category')}</TableHead>
            <TableHead className="font-semibold">{t('assets.consumables.colStock', 'Stock Level')}</TableHead>
            <TableHead className="font-semibold">{t('assets.consumables.colStatus', 'Status')}</TableHead>
            <TableHead className="font-semibold">{t('assets.consumables.colLocation', 'Location')}</TableHead>
            <TableHead className="font-semibold text-right">{t('assets.consumables.colCost', 'Unit Cost')}</TableHead>
            <TableHead className="text-right font-semibold">{t('common.actions', 'Actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consumables.map((item) => {
            const percentage =
              item.minQuantity > 0
                ? Math.min(100, Math.round((item.totalQuantity / (item.minQuantity * 2.5)) * 100))
                : 100;

            return (
              <TableRow key={item.id} className="text-xs hover:bg-muted/30">
                <TableCell>
                  <div className="font-medium text-foreground">{item.name}</div>
                  {(item.modelNumber || item.itemNumber || item.manufacturer) && (
                    <div className="text-[11px] text-muted-foreground space-x-1">
                      {item.manufacturer && <span>{item.manufacturer}</span>}
                      {item.modelNumber && <span>&bull; Mod: {item.modelNumber}</span>}
                      {item.itemNumber && <span>&bull; SKU: {item.itemNumber}</span>}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.category}</TableCell>
                <TableCell>
                  <div className="space-y-1 w-28">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">{item.totalQuantity}</span>
                      <span className="text-muted-foreground text-[10px]">Min: {item.minQuantity}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          item.totalQuantity === 0
                            ? 'bg-destructive'
                            : item.totalQuantity <= item.minQuantity
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(item.totalQuantity > 0 ? 5 : 0, percentage)}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell>{renderStockBadge(item)}</TableCell>
                <TableCell className="text-muted-foreground">{item.location || '-'}</TableCell>
                <TableCell className="text-right font-mono">
                  {item.purchaseCost != null ? `$${Number(item.purchaseCost).toFixed(2)}` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCheckout(item)}
                      disabled={item.totalQuantity <= 0}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <PackageMinus className="h-3.5 w-3.5" />
                      {t('assets.consumables.checkoutBtn', 'Checkout')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestock(item)}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <PackagePlus className="h-3.5 w-3.5" />
                      {t('assets.consumables.restockBtn', 'Restock')}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onHistory(item)} className="text-xs gap-2">
                          <History className="h-3.5 w-3.5" />
                          {t('assets.consumables.viewHistory', 'Checkout History')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(item)} className="text-xs gap-2">
                          <Pencil className="h-3.5 w-3.5" />
                          {t('common.edit', 'Edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(item)}
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('common.delete', 'Delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
