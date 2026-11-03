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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateConsumableInputSchema } from '@shared/contracts';
import type { ConsumableContract, CreateConsumableInput } from '@shared/contracts';
import {
  useCreateConsumableMutation,
  useUpdateConsumableMutation,
} from '../api/useConsumablesQueries';

interface ConsumableFormValues {
  name: string;
  category: string;
  modelNumber?: string;
  itemNumber?: string;
  manufacturer?: string;
  totalQuantity: number;
  minQuantity: number;
  location?: string;
  purchaseCost?: number;
}

interface CreateConsumableModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumable?: ConsumableContract | null;
}

export function CreateConsumableModal({ isOpen, onClose, consumable }: CreateConsumableModalProps) {
  const { t } = useTranslation();
  const createMutation = useCreateConsumableMutation();
  const updateMutation = useUpdateConsumableMutation();
  const isEditing = Boolean(consumable);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConsumableFormValues>({
    resolver: zodResolver(CreateConsumableInputSchema) as any,
    defaultValues: {
      name: consumable?.name ?? '',
      category: consumable?.category ?? 'Toner / Ink',
      modelNumber: consumable?.modelNumber ?? '',
      itemNumber: consumable?.itemNumber ?? '',
      manufacturer: consumable?.manufacturer ?? '',
      totalQuantity: consumable?.totalQuantity ?? 10,
      minQuantity: consumable?.minQuantity ?? 3,
      location: consumable?.location ?? '',
      purchaseCost: consumable?.purchaseCost ?? 0,
    },
  });

  const selectedCategory = watch('category');

  const onSubmit = async (data: ConsumableFormValues) => {
    try {
      const payload: CreateConsumableInput = {
        name: data.name.trim(),
        category: data.category.trim(),
        modelNumber: data.modelNumber?.trim() || null,
        itemNumber: data.itemNumber?.trim() || null,
        manufacturer: data.manufacturer?.trim() || null,
        totalQuantity: Number(data.totalQuantity) || 0,
        minQuantity: Number(data.minQuantity) || 0,
        location: data.location?.trim() || null,
        purchaseCost: data.purchaseCost !== undefined ? Number(data.purchaseCost) : null,
      };

      if (isEditing && consumable) {
        await updateMutation.mutateAsync({ id: consumable.id, payload });
        toast.success(t('assets.consumables.updatedSuccess', 'Consumable item updated'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('assets.consumables.createdSuccess', 'Consumable item registered'));
      }
      onClose();
    } catch {
      toast.error(t('assets.consumables.actionError', 'Failed to save consumable'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('assets.consumables.editTitle', 'Edit Consumable')
              : t('assets.consumables.createTitle', 'Add Consumable & Supply')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="consumable-name" className="text-xs font-medium">
              {t('assets.consumables.nameLabel', 'Item Name *')}
            </Label>
            <Input
              id="consumable-name"
              placeholder="e.g. HP 58A Black Toner, Cat6 Cable 10ft"
              className="h-8 text-xs"
              {...register('name')}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="consumable-category" className="text-xs font-medium">
                {t('assets.consumables.categoryLabel', 'Category *')}
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => setValue('category', val, { shouldValidate: true })}
              >
                <SelectTrigger id="consumable-category" className="h-8 text-xs">
                  <SelectValue placeholder={t('assets.consumables.selectCategory', 'Category')} />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-1.5">
              <Label htmlFor="consumable-manufacturer" className="text-xs font-medium">
                {t('assets.consumables.manufacturerLabel', 'Manufacturer')}
              </Label>
              <Input
                id="consumable-manufacturer"
                placeholder="e.g. HP, Logitech, Monoprice"
                className="h-8 text-xs"
                {...register('manufacturer')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="consumable-model" className="text-xs font-medium">
                {t('assets.consumables.modelLabel', 'Model Number')}
              </Label>
              <Input
                id="consumable-model"
                placeholder="CF258A"
                className="h-8 text-xs"
                {...register('modelNumber')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consumable-itemNumber" className="text-xs font-medium">
                {t('assets.consumables.skuLabel', 'SKU / Item #')}
              </Label>
              <Input
                id="consumable-itemNumber"
                placeholder="SKU-8821"
                className="h-8 text-xs"
                {...register('itemNumber')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="consumable-quantity" className="text-xs font-medium">
                {t('assets.consumables.quantityLabel', 'Stock Quantity *')}
              </Label>
              <Input
                id="consumable-quantity"
                type="number"
                min="0"
                className="h-8 text-xs"
                {...register('totalQuantity', { valueAsNumber: true })}
              />
              {errors.totalQuantity && (
                <p className="text-[11px] text-destructive">{errors.totalQuantity.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consumable-minQuantity" className="text-xs font-medium">
                {t('assets.consumables.minQuantityLabel', 'Min Alert Threshold *')}
              </Label>
              <Input
                id="consumable-minQuantity"
                type="number"
                min="0"
                className="h-8 text-xs"
                {...register('minQuantity', { valueAsNumber: true })}
              />
              {errors.minQuantity && (
                <p className="text-[11px] text-destructive">{errors.minQuantity.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="consumable-location" className="text-xs font-medium">
                {t('assets.consumables.locationLabel', 'Storage Location')}
              </Label>
              <Input
                id="consumable-location"
                placeholder="Shelf B-3, IT Storage"
                className="h-8 text-xs"
                {...register('location')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consumable-purchaseCost" className="text-xs font-medium">
                {t('assets.consumables.costLabel', 'Unit Cost ($)')}
              </Label>
              <Input
                id="consumable-purchaseCost"
                type="number"
                step="0.01"
                min="0"
                className="h-8 text-xs"
                {...register('purchaseCost', { valueAsNumber: true })}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-7 text-xs"
            >
              {isSubmitting
                ? t('common.saving', 'Saving...')
                : isEditing
                ? t('common.save', 'Save Changes')
                : t('assets.consumables.addButton', 'Add Item')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
