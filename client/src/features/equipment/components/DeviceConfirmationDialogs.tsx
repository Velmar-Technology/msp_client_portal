import { memo } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SubscriptionEquipment } from "@shared/contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface DeviceConfirmationDialogsProps {
  showBulkDeactivateAlert: boolean;
  setShowBulkDeactivateAlert: (open: boolean) => void;
  bulkDeactivateTargets: any[];
  bulkProcessing: boolean;
  confirmBulkDeactivate: () => void;
  revokeTarget: Partial<SubscriptionEquipment> | null;
  revokeLoading: boolean;
  cancelRevoke: () => void;
  confirmRevoke: () => void;
  repairTarget: Partial<SubscriptionEquipment> | null;
  repairLoading: boolean;
  cancelRepair: () => void;
  confirmRepair: () => void;
  deviceToDelete: Partial<SubscriptionEquipment> | null;
  setDeviceToDelete: (equip: Partial<SubscriptionEquipment> | null) => void;
  deleteDeviceLoading: boolean;
  handleDeleteAdminDevice: (id: string) => void;
}

/**
 * Encapsulates the 4 confirmation Alert Dialogs for the DevicesPage:
 * - Bulk Deactivation
 * - Single Slot Revoke
 * - Device Re-pair
 * - Admin Device Permanent Deletion
 */
export const DeviceConfirmationDialogs = memo(function DeviceConfirmationDialogs({
  showBulkDeactivateAlert,
  setShowBulkDeactivateAlert,
  bulkDeactivateTargets,
  bulkProcessing,
  confirmBulkDeactivate,
  revokeTarget,
  revokeLoading,
  cancelRevoke,
  confirmRevoke,
  repairTarget,
  repairLoading,
  cancelRepair,
  confirmRepair,
  deviceToDelete,
  setDeviceToDelete,
  deleteDeviceLoading,
  handleDeleteAdminDevice,
}: DeviceConfirmationDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Bulk Deactivation Confirmation Modal */}
      <AlertDialog open={showBulkDeactivateAlert} onOpenChange={setShowBulkDeactivateAlert}>
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.bulkDeactivateConfirmTitle") || "Deactivate Selected Devices"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("devices.bulkDeactivateConfirmDesc", { count: bulkDeactivateTargets.length }) ||
                `Are you sure you want to deactivate ${bulkDeactivateTargets.length} active device(s)? This action will revoke cloud backup accounts.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
              onClick={confirmBulkDeactivate}
            >
              {t("devices.bulkDeactivate") || "Deactivate Devices"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Deactivation Confirmation Modal */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open && !revokeLoading) cancelRevoke();
        }}
      >
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.revokeConfirmTitle") || "Deactivate Device"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("devices.revokeConfirmDesc", {
                name: revokeTarget?.device_name || revokeTarget?.nextcloud_username || t("devices.unnamedDevice"),
              }) || "This will revoke the cloud backup account and disconnect the device."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={revokeLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={revokeLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
              onClick={confirmRevoke}
            >
              {revokeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t("devices.revokeConfirmAction") || "Yes, Deactivate"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-pair Confirmation Modal (non-destructive unbind for replacement agent) */}
      <AlertDialog
        open={!!repairTarget}
        onOpenChange={(open) => {
          if (!open && !repairLoading) cancelRepair();
        }}
      >
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.repairConfirmTitle") || "Re-pair Device"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("devices.repairConfirmDesc", {
                name: repairTarget?.device_name || repairTarget?.nextcloud_username || t("devices.unnamedDevice"),
              }) ||
                "This will unbind the current agent so a replacement device can be linked. Cloud backup data is preserved but the access password will be reset."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={repairLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={repairLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              onClick={confirmRepair}
            >
              {repairLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t("devices.repairConfirmAction") || "Yes, Re-pair"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Admin Device Confirmation Modal */}
      <AlertDialog
        open={!!deviceToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteDeviceLoading) setDeviceToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.deleteDeviceConfirmTitle", "Delete Managed Device")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-2">
              {t(
                "devices.deleteDeviceConfirmDesc",
                "Are you sure you want to permanently delete this device? Associated cloud backup storage and telemetry monitoring will be removed.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-row justify-end gap-2">
            <AlertDialogCancel
              type="button"
              onClick={() => setDeviceToDelete(null)}
              disabled={deleteDeviceLoading}
              className="h-8 px-3 text-xs border-border hover:bg-muted"
            >
              {t("devices.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => deviceToDelete?.id && handleDeleteAdminDevice(deviceToDelete.id)}
              disabled={deleteDeviceLoading}
              className="h-8 px-3 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
            >
              {deleteDeviceLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t("devices.actionDelete", "Delete Device")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
