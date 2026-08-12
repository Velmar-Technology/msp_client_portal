import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { usePatchManagementModal } from '@/hooks/usePatchManagementModal';
import { PatchTable } from './PatchTable';

export interface PatchManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string | null;
  deviceName: string | null;
  onPatchesUpdated?: () => void;
}

export const PatchManagementModal: React.FC<PatchManagementModalProps> = ({
  open,
  onOpenChange,
  equipmentId,
  deviceName,
  onPatchesUpdated,
}) => {
  const { t } = useTranslation();
  const {
    patches,
    loading,
    applying,
    selectedPatchIds,
    pendingPatches,
    isAllPendingSelected,
    selectedCount,
    handleTogglePatch,
    handleSelectAllPending,
    handleApplySelected,
  } = usePatchManagementModal({
    open,
    equipmentId,
    onPatchesUpdated,
  });

  const displayDeviceName = deviceName || t("rmm.modalEquipmentDevice");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 p-5 shadow-xl sm:rounded-lg">
        <DialogHeader className="space-y-1 pb-1">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{t("rmm.modalTitle", { deviceName: displayDeviceName })}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("rmm.modalSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          <PatchTable
            patches={patches}
            loading={loading}
            applying={applying}
            selectedPatchIds={selectedPatchIds}
            pendingPatchesCount={pendingPatches.length}
            isAllPendingSelected={isAllPendingSelected}
            onSelectAllPending={handleSelectAllPending}
            onTogglePatch={handleTogglePatch}
          />
        </div>

        <DialogFooter className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-medium border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
          >
            {t("rmm.modalClose")}
          </Button>

          <Button
            size="sm"
            onClick={handleApplySelected}
            disabled={selectedCount === 0 || applying}
            className="h-8 text-xs font-medium gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white transition-colors"
          >
            {applying ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{t("rmm.modalInstallSelected", { count: selectedCount })}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
