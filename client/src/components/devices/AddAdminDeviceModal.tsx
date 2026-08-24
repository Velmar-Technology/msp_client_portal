import { useState, useEffect } from "react";
import { X, Laptop, Loader2, Plus, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface AddAdminDeviceModalProps {
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: { deviceName: string; deviceSerial: string; tenantId?: string }) => void;
  tenantOptions?: { id: string; name: string }[];
  defaultTenantId?: string;
}

export function AddAdminDeviceModal({
  isOpen,
  loading,
  onClose,
  onSubmit,
  tenantOptions = [],
  defaultTenantId,
}: AddAdminDeviceModalProps) {
  const { t } = useTranslation();
  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState(defaultTenantId || "");

  useEffect(() => {
    if (isOpen) {
      setDeviceName("");
      setDeviceSerial(`SN-ADM-${Math.floor(100000 + Math.random() * 900000)}`);
      setSelectedTenantId(defaultTenantId || (tenantOptions[0]?.id ?? ""));
    }
  }, [isOpen, defaultTenantId, tenantOptions]);

  const canSubmit = deviceName.trim().length > 0 && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      deviceName: deviceName.trim(),
      deviceSerial: deviceSerial.trim(),
      tenantId: selectedTenantId || undefined,
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <AlertDialogContent className="max-w-md w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-0 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <AlertDialogHeader className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-row justify-between items-center bg-white dark:bg-zinc-950 space-y-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-md border border-primary/20">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {t("devices.addAdminDeviceTitle", "Add Managed Device")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] text-zinc-500 font-medium">
                {t("devices.addAdminDeviceSubtitle", "Directly register infrastructure or internal equipment without a subscription.")}
              </AlertDialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors cursor-pointer text-zinc-400 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </AlertDialogHeader>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-zinc-500 leading-normal">
              {t("devices.addAdminDeviceDesc", "This device will be immediately provisioned with cloud backup storage and integrated into automated RMM telemetry.")}
            </p>

            <div className="space-y-3.5">
              <div>
                <label htmlFor="admin-dev-name" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  {t("devices.wizardStep2NameLabel", "Device Name / Label")} *
                </label>
                <Input
                  id="admin-dev-name"
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Primary-Admin-Server, Core-Switch-01"
                  className="w-full bg-card border rounded-md text-xs h-8"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="admin-dev-serial" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  {t("devices.wizardStep2SerialLabel", "Device Serial Number")}
                </label>
                <Input
                  id="admin-dev-serial"
                  type="text"
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                  placeholder="e.g. SN-ADM-123456"
                  className="w-full bg-card border rounded-md text-xs h-8 font-mono"
                />
              </div>

              {tenantOptions.length > 1 && (
                <div>
                  <label htmlFor="admin-dev-tenant" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    {t("devices.tenantLabel", "Target Workspace / Client")}
                  </label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger id="admin-dev-tenant" className="w-full h-8 text-xs bg-card">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="h-3 w-3 text-zinc-400 shrink-0" />
                        <SelectValue placeholder={t("devices.filterAllClients", "Select Workspace")} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {tenantOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} className="text-xs">
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <AlertDialogFooter className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-row justify-end gap-2 bg-zinc-50/50 dark:bg-zinc-950/40">
            <AlertDialogCancel
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer disabled:opacity-50 mt-0"
            >
              {t("devices.cancel", "Cancel")}
            </AlertDialogCancel>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-8 px-4 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("devices.wizardStep2Activating", "Adding...")}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("devices.addAdminDeviceSubmit", "Add & Provision Device")}</span>
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AddAdminDeviceModal;
