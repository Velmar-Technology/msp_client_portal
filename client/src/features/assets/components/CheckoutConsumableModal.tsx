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
import { CheckoutConsumableInputSchema } from '@shared/contracts';
import type { ConsumableContract, CheckoutConsumableInput } from '@shared/contracts';
import { useCheckoutConsumableMutation } from '../api/useAssetsQueries';

interface CheckoutFormValues {
  quantity: number;
  assignedUserId?: string;
  assignedEquipmentId?: string;
  ticketId?: string;
  notes?: string;
}

interface CheckoutConsumableModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumable: ConsumableContract | null;
}

export function CheckoutConsumableModal({
  isOpen,
  onClose,
  consumable,
}: CheckoutConsumableModalProps) {
  const { t } = useTranslation();
  const checkoutMutation = useCheckoutConsumableMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutConsumableInputSchema) as any,
    defaultValues: {
      quantity: 1,
      notes: '',
    },
  });

  if (!consumable) return null;

  const currentQuantity = consumable.totalQuantity;
  const requestedQuantity = watch('quantity') || 0;
  const projectedRemaining = currentQuantity - requestedQuantity;

  const onSubmit = async (data: CheckoutFormValues) => {
    try {
      const payload: CheckoutConsumableInput = {
        quantity: Number(data.quantity),
        assignedUserId: data.assignedUserId?.trim() || null,
        assignedEquipmentId: data.assignedEquipmentId?.trim() || null,
        ticketId: data.ticketId?.trim() || null,
        notes: data.notes?.trim() || null,
      };

      await checkoutMutation.mutateAsync({
        id: consumable.id,
        payload,
      });

      toast.success(
        t('assets.consumables.checkoutSuccess', 'Successfully checked out {{count}} units', {
          count: payload.quantity,
        })
      );
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          t('assets.consumables.checkoutError', 'Failed to check out consumable')
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('assets.consumables.checkoutTitle', 'Checkout Consumable')}</DialogTitle>
          <DialogDescription className="text-xs">
            {consumable.name} &bull; {consumable.category}
          </DialogDescription>
        </DialogHeader>

        {/* Stock status indicator */}
        <div className="rounded-md bg-muted/50 p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">{t('assets.consumables.inStock', 'In Stock:')}</span>{' '}
            <strong className="text-foreground">{currentQuantity} units</strong>
          </div>
          <div>
            <span className="text-muted-foreground">{t('assets.consumables.afterCheckout', 'After Checkout:')}</span>{' '}
            <strong className={projectedRemaining < 0 ? 'text-destructive' : projectedRemaining <= consumable.minQuantity ? 'text-amber-500' : 'text-emerald-500'}>
              {projectedRemaining} units
            </strong>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-quantity" className="text-xs font-medium">
              {t('assets.consumables.quantityLabel', 'Quantity to Checkout *')}
            </Label>
            <Input
              id="checkout-quantity"
              type="number"
              min="1"
              max={currentQuantity}
              className="h-8 text-xs"
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-[11px] text-destructive">{errors.quantity.message}</p>
            )}
            {projectedRemaining < 0 && (
              <p className="text-[11px] text-destructive">
                {t('assets.consumables.insufficientStock', 'Cannot checkout more than available stock')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="checkout-notes" className="text-xs font-medium">
              {t('assets.consumables.notesLabel', 'Notes / Recipient')}
            </Label>
            <Textarea
              id="checkout-notes"
              placeholder={t('assets.consumables.checkoutNotesPlaceholder', 'e.g. Dispensed to Sarah for Marketing printer')}
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
              disabled={isSubmitting || currentQuantity <= 0 || projectedRemaining < 0}
              className="h-7 text-xs"
            >
              {isSubmitting
                ? t('common.saving', 'Processing...')
                : t('assets.consumables.checkoutConfirm', 'Confirm Checkout')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
