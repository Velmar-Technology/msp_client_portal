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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateAssetInputSchema } from '@shared/contracts';
import type { CreateAssetInput, AssetContract } from '@shared/contracts';
import {
  useCreateAssetMutation,
  useUpdateAssetMutation,
} from '../api/useAssetsQueries';

interface AssetFormValues {
  name: string;
  assetType: 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'PERIPHERAL' | 'OTHER';
  status: 'ACTIVE' | 'MAINTENANCE' | 'IN_STORAGE' | 'DECOMMISSIONED';
  model?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  notes?: string | null;
}

interface AssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: AssetContract | null;
}

export function AssetsModal({ isOpen, onClose, asset }: AssetsModalProps) {
  const { t } = useTranslation();
  const createMutation = useCreateAssetMutation();
  const updateMutation = useUpdateAssetMutation();

  const isEditing = Boolean(asset);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(CreateAssetInputSchema) as any,
    defaultValues: {
      name: asset?.name ?? '',
      assetType: asset?.assetType ?? 'HARDWARE',
      status: asset?.status ?? 'ACTIVE',
      model: asset?.model ?? '',
      serialNumber: asset?.serialNumber ?? '',
      manufacturer: asset?.manufacturer ?? '',
      notes: asset?.notes ?? '',
    },
  });

  const selectedType = watch('assetType');
  const selectedStatus = watch('status');

  const onSubmit = async (data: AssetFormValues) => {
    try {
      const payload: CreateAssetInput = {
        name: data.name,
        assetType: data.assetType,
        status: data.status,
        model: data.model || undefined,
        serialNumber: data.serialNumber || undefined,
        manufacturer: data.manufacturer || undefined,
        notes: data.notes || undefined,
      };

      if (isEditing && asset) {
        await updateMutation.mutateAsync({ id: asset.id, payload });
        toast.success(t('assets.messages.updateSuccess', 'Asset updated successfully'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('assets.messages.createSuccess', 'Asset registered successfully'));
      }
      reset();
      onClose();
    } catch {
      toast.error(t('assets.messages.error', 'Failed to save asset. Please try again.'));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('assets.modal.editTitle', 'Edit IT Asset')
              : t('assets.modal.createTitle', 'Register New IT Asset')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="asset-name">{t('assets.fields.name', 'Asset Name')}</Label>
            <Input
              id="asset-name"
              {...register('name')}
              placeholder={t('assets.placeholders.name', 'e.g., Core Router, Dev Laptop')}
              className="h-7 text-xs"
            />
            {errors.name && (
              <p className="text-[11px] text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="asset-type">{t('assets.fields.type', 'Type')}</Label>
              <Select
                value={selectedType}
                onValueChange={(val: any) => setValue('assetType', val)}
              >
                <SelectTrigger id="asset-type" className="h-7 text-xs">
                  <SelectValue placeholder={t('assets.fields.type', 'Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HARDWARE">Hardware</SelectItem>
                  <SelectItem value="SOFTWARE">Software</SelectItem>
                  <SelectItem value="NETWORK">Network</SelectItem>
                  <SelectItem value="PERIPHERAL">Peripheral</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="asset-status">{t('assets.fields.status', 'Status')}</Label>
              <Select
                value={selectedStatus}
                onValueChange={(val: any) => setValue('status', val)}
              >
                <SelectTrigger id="asset-status" className="h-7 text-xs">
                  <SelectValue placeholder={t('assets.fields.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="IN_STORAGE">In Storage</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="asset-manufacturer">{t('assets.fields.manufacturer', 'Manufacturer')}</Label>
              <Input
                id="asset-manufacturer"
                {...register('manufacturer')}
                placeholder="e.g., Dell, Cisco, Apple"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="asset-model">{t('assets.fields.model', 'Model')}</Label>
              <Input
                id="asset-model"
                {...register('model')}
                placeholder="e.g., Latitude 5430"
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="asset-serial">{t('assets.fields.serialNumber', 'Serial / Tag')}</Label>
            <Input
              id="asset-serial"
              {...register('serialNumber')}
              placeholder="e.g., SN-8923481"
              className="h-7 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="asset-notes">{t('assets.fields.notes', 'Notes & Runbook')}</Label>
            <Textarea
              id="asset-notes"
              {...register('notes')}
              placeholder={t('assets.placeholders.notes', 'Optional deployment details or locations')}
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-7 text-xs"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className="h-7 text-xs"
            >
              {isEditing ? t('common.save', 'Save Changes') : t('assets.newAsset', 'Register Asset')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
