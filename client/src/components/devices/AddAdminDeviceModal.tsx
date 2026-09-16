import { useState, useEffect, useMemo } from "react";
import { X, Laptop, Loader2, Plus, Building2, Check, ChevronsUpDown, KeyRound, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { equipmentService } from "@/features/equipment";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
  onSubmit: (data: { deviceName: string; deviceSerial?: string; tenantId?: string; otp: string }) => void;
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
  const [otp, setOtp] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState(defaultTenantId || "");
  const [openTenantCombobox, setOpenTenantCombobox] = useState(false);
  const [detectedIdentity, setDetectedIdentity] = useState<{ hostname: string; serial: string } | null>(null);
  const [identityChecking, setIdentityChecking] = useState(false);

  const sortedTenantOptions = useMemo(
    () => [...tenantOptions].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [tenantOptions],
  );

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setOtp("");
      setDeviceName("");
      setDeviceSerial(`SN-ADM-${Math.floor(100000 + Math.random() * 900000)}`);
      setSelectedTenantId(defaultTenantId || (sortedTenantOptions[0]?.id ?? ""));
      setOpenTenantCombobox(false);
      setDetectedIdentity(null);
      setIdentityChecking(false);
    }
  }

  const isValidOtp = /^\d{6}$/.test(otp);
  const canSubmit = isValidOtp && deviceName.trim().length > 0 && !loading;

  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  };

  useEffect(() => {
    let cancelled = false;
    if (!isValidOtp) {
      setDetectedIdentity(null);
      setIdentityChecking(false);
      return;
    }
    const lookup = equipmentService.getAgentIdentityByOtp;
    if (!lookup) {
      setIdentityChecking(false);
      return;
    }
    setIdentityChecking(true);
    Promise.resolve()
      .then(() => lookup(otp))
      .then((info) => {
        if (cancelled) return;
        const hostname = info?.hostname?.trim() || "";
        const serial = info?.serial?.trim() || "";
        setDetectedIdentity(hostname || serial ? { hostname, serial } : null);
        if (hostname) setDeviceName((prev) => (!prev || prev.startsWith("SN-ADM-") ? hostname : prev));
        if (serial) setDeviceSerial(serial);
      })
      .catch(() => {
        if (!cancelled) setDetectedIdentity(null);
      })
      .finally(() => {
        if (!cancelled) setIdentityChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [otp, isValidOtp]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      deviceName: deviceName.trim(),
      deviceSerial: deviceSerial.trim() || undefined,
      tenantId: selectedTenantId || undefined,
      otp,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
    >
      <DialogContent className="max-w-md w-full bg-card border border-border rounded-lg p-0 text-foreground flex flex-col overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border flex flex-row justify-between items-center bg-card space-y-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-md border border-primary/20">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                {t("devices.addAdminDeviceTitle", "Add New Hardware Asset")}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                {t("devices.addAdminDeviceDesc", "Provision hardware on behalf of a tenant or general inventory")}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground leading-normal">
              {t(
                "devices.addAdminDeviceDesc",
                "This device will be immediately provisioned with cloud backup storage and integrated into automated RMM telemetry.",
              )}
            </p>

            {/* 6-digit OTP pairing code section */}
            <div className="p-3 bg-muted/40 border border-border rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <label
                    htmlFor="admin-dev-otp"
                    className="text-[10px] uppercase font-bold text-muted-foreground"
                  >
                    {t("devices.otpInputLabel", "Pairing Code (OTP)")} *
                  </label>
                </div>
              </div>

              <div className="flex flex-col items-center pt-1">
                <InputOTP
                  id="admin-dev-otp"
                  maxLength={6}
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={loading}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-8 h-8 text-sm font-mono font-bold" />
                    <InputOTPSlot index={1} className="w-8 h-8 text-sm font-mono font-bold" />
                    <InputOTPSlot index={2} className="w-8 h-8 text-sm font-mono font-bold" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="w-8 h-8 text-sm font-mono font-bold" />
                    <InputOTPSlot index={4} className="w-8 h-8 text-sm font-mono font-bold" />
                    <InputOTPSlot index={5} className="w-8 h-8 text-sm font-mono font-bold" />
                  </InputOTPGroup>
                </InputOTP>

                {otp.length > 0 && !isValidOtp && (
                  <p className="text-[10px] text-red-500 mt-1 self-center">
                    {t("devices.otpInputInvalid", "Pairing code must be 6 digits.")}
                  </p>
                )}
                {identityChecking && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground mt-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("devices.detectedIdentityChecking", "Detecting agent identity…")}
                  </div>
                )}
                {detectedIdentity && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1.5">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    {t("devices.detectedIdentityHint", "Device details detected via MSP Agent — confirm below.")}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label htmlFor="admin-dev-name" className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
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
                <label htmlFor="admin-dev-serial" className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
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
                  <label
                    htmlFor="admin-dev-tenant"
                    className="block text-[10px] uppercase font-bold text-muted-foreground mb-1"
                  >
                    {t("devices.tenantLabel", "Target Workspace / Client")}
                  </label>
                  <Popover open={openTenantCombobox} onOpenChange={setOpenTenantCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        id="admin-dev-tenant"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openTenantCombobox}
                        className="w-full justify-between text-xs h-8 bg-card px-3 font-normal border border-border hover:bg-muted"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {selectedTenantId
                              ? sortedTenantOptions.find((opt) => opt.id === selectedTenantId)?.name
                              : t("devices.filterAllClients", "Select Workspace")}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0 bg-card border-border shadow-md"
                      align="start"
                    >
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
                                    selectedTenantId === opt.id ? "opacity-100" : "opacity-0",
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
          <DialogFooter className="p-4 border-t border-border flex flex-row justify-end gap-2 bg-muted/30">
            <DialogClose
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:bg-muted border border-border rounded-md transition-colors cursor-pointer disabled:opacity-50 mt-0"
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
