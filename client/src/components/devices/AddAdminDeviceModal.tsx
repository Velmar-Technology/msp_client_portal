import { useState, useEffect, useMemo } from "react";
import { X, Laptop, Loader2, Plus, Building2, Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  const [openTenantCombobox, setOpenTenantCombobox] = useState(false);

  const sortedTenantOptions = useMemo(
    () => [...tenantOptions].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [tenantOptions]
  );

  useEffect(() => {
    if (isOpen) {
      setDeviceName("");
      setDeviceSerial(`SN-ADM-${Math.floor(100000 + Math.random() * 900000)}`);
      setSelectedTenantId(defaultTenantId || (sortedTenantOptions[0]?.id ?? ""));
      setOpenTenantCombobox(false);
    }
  }, [isOpen, defaultTenantId, sortedTenantOptions]);

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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent className="max-w-md w-full bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-0 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-row justify-between items-center bg-white dark:bg-card space-y-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-md border border-primary/20">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                {t("devices.addAdminDeviceTitle", "Add New Hardware Asset")}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t("devices.addAdminDeviceDesc", "Provision hardware on behalf of a tenant or general inventory")}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-zinc-500 leading-normal">
              {t("devices.addAdminDeviceDesc", "This device will be immediately provisioned with cloud backup storage and integrated into automated RMM telemetry.")}
            </p>

            <div className="space-y-3.5">
              <div>
                <label htmlFor="admin-dev-name" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                  {t("devices.deviceNameLabel", "Device Name / Label")} *
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
                  {t("devices.deviceSerialLabel", "Device Serial Number")}
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

              {sortedTenantOptions.length > 1 && (
                <div>
                  <label htmlFor="admin-dev-tenant" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    {t("devices.tenantLabel", "Target Workspace / Client")}
                  </label>
                  <Popover open={openTenantCombobox} onOpenChange={setOpenTenantCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        id="admin-dev-tenant"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openTenantCombobox}
                        className="w-full justify-between text-xs h-8 bg-card px-3 font-normal border border-border hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">
                            {selectedTenantId
                              ? sortedTenantOptions.find((opt) => opt.id === selectedTenantId)?.name
                              : t("devices.filterAllClients", "Select Workspace")}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border shadow-md" align="start">
                      <Command>
                        <CommandInput placeholder={t("devices.searchTenantPlaceholder", "Search client...")} />
                        <CommandList>
                          <CommandEmpty>{t("devices.noTenantFound", "No client found.")}</CommandEmpty>
                          <CommandGroup>
                            {sortedTenantOptions.map((opt) => (
                              <CommandItem
                                key={opt.id}
                                value={opt.name}
                                onSelect={() => {
                                  setSelectedTenantId(opt.id);
                                  setOpenTenantCombobox(false);
                                }}
                                className="text-xs flex items-center justify-between cursor-pointer"
                              >
                                <span className="truncate">{opt.name}</span>
                                <Check
                                  className={cn(
                                    "ml-auto h-3.5 w-3.5",
                                    selectedTenantId === opt.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <DialogFooter className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-row justify-end gap-2 bg-zinc-50/50 dark:bg-zinc-950/40">
            <DialogClose
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer disabled:opacity-50 mt-0"
            >
              {t("devices.cancel", "Cancel")}
            </DialogClose>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-8 px-4 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("devices.activating", "Adding...")}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("devices.addAdminDeviceSubmit", "Add & Provision Device")}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddAdminDeviceModal;
