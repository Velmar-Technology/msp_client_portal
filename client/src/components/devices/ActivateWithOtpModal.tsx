import { useState } from "react";
import { X, KeyRound, Loader2, Laptop } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

interface ActivateWithOtpModalProps {
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onActivate: (otp: string, deviceName: string, deviceSerial: string) => void;
}

export function ActivateWithOtpModal({ isOpen, loading, onClose, onActivate }: ActivateWithOtpModalProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setOtp("");
      setDeviceName("");
      setDeviceSerial("");
    }
  }

  if (!isOpen) return null;

  const isValidOtp = /^\d{6}$/.test(otp);
  const canSubmit = isValidOtp && deviceName.trim().length > 0 && deviceSerial.trim().length > 0 && !loading;

  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-md w-full shadow-xl text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-md border border-zinc-200 dark:border-zinc-800">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t("devices.activateWithCodeTitle")}</h3>
              <p className="text-[10px] text-zinc-500 font-medium">{t("devices.activateWithCodeSubtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors cursor-pointer text-zinc-400 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500 leading-normal">{t("devices.activateWithCodeDesc")}</p>

          <div className="flex flex-col items-center">
            <label htmlFor="activate-otp-code" className="block text-[10px] uppercase font-bold text-zinc-400 mb-2 self-start">
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
            <div>
              <label htmlFor="activate-otp-dev-name" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                {t("devices.wizardStep2NameLabel")}
              </label>
              <Input
                id="activate-otp-dev-name"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={t("devices.wizardStep2NamePlaceholder")}
                className="w-full bg-card border rounded-md text-xs h-8"
              />
            </div>

            <div>
              <label htmlFor="activate-otp-dev-serial" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                {t("devices.wizardStep2SerialLabel")}
              </label>
              <Input
                id="activate-otp-dev-serial"
                type="text"
                value={deviceSerial}
                onChange={(e) => setDeviceSerial(e.target.value)}
                placeholder={t("devices.wizardStep2SerialPlaceholder")}
                className="w-full bg-card border rounded-md text-xs h-8"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {t("devices.cancel")}
            </button>
            <button
              type="button"
              onClick={() => onActivate(otp, deviceName.trim(), deviceSerial.trim())}
              disabled={!canSubmit}
              className="h-8 px-4 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md transition-opacity cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("devices.wizardStep2Activating")}</span>
                </>
              ) : (
                <>
                  <Laptop className="w-3.5 h-3.5" />
                  <span>{t("devices.activateWithCodeSubmit")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
