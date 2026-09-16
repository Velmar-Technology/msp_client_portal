import { useState, useEffect } from "react";
import { X, KeyRound, Loader2, Laptop, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { equipmentService } from "@/features/equipment";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface ActivateWithOtpModalProps {
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onActivate: (otp: string, deviceName: string, deviceSerial: string) => void;
  subscriptionId?: string | null;
  slotIndex?: number | null;
}

export function ActivateWithOtpModal({
  isOpen,
  loading,
  onClose,
  onActivate,
  subscriptionId,
  slotIndex,
}: ActivateWithOtpModalProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [detectedIdentity, setDetectedIdentity] = useState<{ hostname: string; serial: string } | null>(null);
  const [identityChecking, setIdentityChecking] = useState(false);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setOtp("");
      setDeviceName("");
      setDeviceSerial("");
      setDetectedIdentity(null);
      setIdentityChecking(false);
    }
  }

  const isValidOtp = /^\d{6}$/.test(otp);
  const canSubmit = isValidOtp && deviceName.trim().length > 0 && deviceSerial.trim().length > 0 && !loading;

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
        if (hostname) setDeviceName((prev) => prev || hostname);
        if (serial) setDeviceSerial((prev) => prev || serial);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-full bg-card border border-border rounded-lg p-0 text-foreground flex flex-col overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border flex flex-row justify-between items-center bg-card space-y-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-muted text-muted-foreground rounded-md border border-border">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">{t("devices.activateWithCodeTitle")}</DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground font-medium">{t("devices.activateWithCodeSubtitle")}</DialogDescription>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {subscriptionId && slotIndex !== null && slotIndex !== undefined && (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/40 border border-border rounded-md px-2.5 py-1.5 self-start">
              <Laptop className="w-3 h-3 text-muted-foreground" />
              {t("devices.bindingSlotContext", { slot: slotIndex + 1 })}
            </div>
          )}
          <p className="text-xs text-muted-foreground leading-normal">{t("devices.activateWithCodeDesc")}</p>

          <div className="flex flex-col items-center">
            <label htmlFor="activate-otp-code" className="block text-[10px] uppercase font-bold text-muted-foreground mb-2 self-start">
              {t("devices.otpInputLabel")}
            </label>
            <InputOTP
              id="activate-otp-code"
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              disabled={loading}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-9 h-10 text-base font-mono font-bold" />
                <InputOTPSlot index={1} className="w-9 h-10 text-base font-mono font-bold" />
                <InputOTPSlot index={2} className="w-9 h-10 text-base font-mono font-bold" />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className="w-9 h-10 text-base font-mono font-bold" />
                <InputOTPSlot index={4} className="w-9 h-10 text-base font-mono font-bold" />
                <InputOTPSlot index={5} className="w-9 h-10 text-base font-mono font-bold" />
              </InputOTPGroup>
            </InputOTP>
            {otp.length > 0 && !isValidOtp && (
              <p className="text-[10px] text-red-500 mt-1.5 self-start">{t("devices.otpInputInvalid")}</p>
            )}
          </div>

          <div className="space-y-3.5">
            {identityChecking && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("devices.detectedIdentityChecking")}
              </div>
            )}
            {detectedIdentity && (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="w-3.5 h-3.5" />
                {t("devices.detectedIdentityHint")}
              </div>
            )}

            <div>
              <label htmlFor="activate-otp-dev-name" className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                {t("devices.deviceNameLabel")}
              </label>
              <Input
                id="activate-otp-dev-name"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={t("devices.deviceNamePlaceholder")}
                className="w-full bg-card border rounded-md text-xs h-8"
              />
            </div>

            <div>
              <label htmlFor="activate-otp-dev-serial" className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">
                {t("devices.deviceSerialLabel")}
              </label>
              <Input
                id="activate-otp-dev-serial"
                type="text"
                value={deviceSerial}
                onChange={(e) => setDeviceSerial(e.target.value)}
                placeholder={t("devices.deviceSerialPlaceholder")}
                className="w-full bg-card border rounded-md text-xs h-8"
              />
            </div>
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
            {t("devices.cancel")}
          </DialogClose>
          <button
            type="button"
            onClick={() => onActivate(otp, deviceName.trim(), deviceSerial.trim())}
            disabled={!canSubmit}
            className="h-8 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-opacity cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("devices.activating")}</span>
              </>
            ) : (
              <>
                <Laptop className="w-3.5 h-3.5" />
                <span>{t("devices.activateWithCodeSubmit")}</span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
