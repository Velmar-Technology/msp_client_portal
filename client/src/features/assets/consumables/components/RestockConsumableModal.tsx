import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RestockConsumableInputSchema } from '@shared/contracts';
import type { ConsumableContract, RestockConsumableInput } from '@shared/contracts';
import { useRestockConsumableMutation } from '../api/useConsumablesQueries';

interface RestockFormValues {
  quantity: number;
  orderNumber?: string;
  unitCost?: number;
  notes?: string;
}

interface RestockConsumableModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumable: ConsumableContract | null;
}

export function RestockConsumableModal({
  isOpen,
  onClose,
  consumable,
}: RestockConsumableModalProps) {
  const { t } = useTranslation();
  const restockMutation = useRestockConsumableMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RestockFormValues>({
    resolver: zodResolver(RestockConsumableInputSchema) as any,
    defaultValues: {
      quantity: 5,
      orderNumber: '',
      unitCost: consumable?.purchaseCost ?? 0,
      notes: '',
    },
  });

  if (!consumable) return null;

  const currentQuantity = consumable.totalQuantity;
  const addedQuantity = watch('quantity') || 0;
  const newTotal = currentQuantity + addedQuantity;

  const onSubmit = async (data: RestockFormValues) => {
    try {
      const payload: RestockConsumableInput = {
        quantity: Number(data.quantity),
        orderNumber: data.orderNumber?.trim() || null,
        unitCost: data.unitCost !== undefined ? Number(data.unitCost) : null,
        notes: data.notes?.trim() || null,
      };

      await restockMutation.mutateAsync({
        id: consumable.id,
        payload,
      });

      toast.success(
        t('assets.consumables.restockSuccess', 'Restocked {{count}} units. New total: {{total}}', {
          count: payload.quantity,
          total: newTotal,
        })
      );
      onClose();
    } catch {
      toast.error(t('assets.consumables.restockError', 'Failed to restock consumable'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('assets.consumables.restockTitle', 'Restock Consumable')}</DialogTitle>
          <DialogDescription className="text-xs">
            {consumable.name} &bull; {consumable.category}
          </DialogDescription>
        </DialogHeader>

        {/* Stock preview indicator */}
        <div className="rounded-md bg-muted/50 p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">{t('assets.consumables.currentStock', 'Current Stock:')}</span>{' '}
            <strong className="text-foreground">{currentQuantity} units</strong>
          </div>
          <div>
            <span className="text-muted-foreground">{t('assets.consumables.newStock', 'New Stock Level:')}</span>{' '}
            <strong className="text-emerald-500 font-semibold">{newTotal} units</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="restock-quantity" className="text-xs font-medium">
              {t('assets.consumables.quantityToAdd', 'Quantity to Add *')}
            </Label>
            <Input
              id="restock-quantity"
              type="number"
              min="1"
              className="h-8 text-xs"
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-[11px] text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="restock-po" className="text-xs font-medium">
                {t('assets.consumables.poLabel', 'PO / Invoice #')}
              </Label>
              <Input
                id="restock-po"
                placeholder="PO-2026-001"
                className="h-8 text-xs"
                {...register('orderNumber')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="restock-cost" className="text-xs font-medium">
                {t('assets.consumables.costLabel', 'Unit Cost ($)')}
              </Label>
              <Input
                id="restock-cost"
                type="number"
                step="0.01"
                min="0"
                className="h-8 text-xs"
                {...register('unitCost', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="restock-notes" className="text-xs font-medium">
              {t('assets.consumables.notesLabel', 'Notes / Supplier')}
            </Label>
            <Textarea
              id="restock-notes"
              placeholder={t('assets.consumables.restockNotesPlaceholder', 'e.g. Received from Amazon Business batch #44')}
              rows={2}
              className="text-xs resize-none"
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || addedQuantity < 1}
              className="h-7 text-xs"
            >
              {isSubmitting
                ? t('common.saving', 'Processing...')
                : t('assets.consumables.confirmRestock', 'Confirm Restock')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
