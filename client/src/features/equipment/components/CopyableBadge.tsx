import { memo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface CopyableBadgeProps {
  value?: string | null;
  labelPrefix?: string;
  tooltip?: string;
  toastMessage?: string;
  className?: string;
  fallback?: string;
}

/**
 * Reusable inline badge that copies a value to the clipboard with visual checkmark feedback.
 */
export const CopyableBadge = memo(function CopyableBadge({
  value,
  labelPrefix,
  tooltip,
  toastMessage,
  className,
  fallback,
}: CopyableBadgeProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  if (!value) {
    return fallback ? <span className="font-mono text-muted-foreground">{fallback}</span> : null;
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(toastMessage || t("common.copiedToClipboard", "Copied to clipboard"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={tooltip || t("common.clickToCopy", "Click to copy")}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer group/copy select-all px-1.5 py-0.5 rounded text-[10px]",
        className
      )}
    >
      <span>
        {labelPrefix ? `${labelPrefix} ` : ""}{value}
      </span>
      {copied ? (
        <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
      ) : (
        <Copy className="w-2.5 h-2.5 opacity-40 group-hover/copy:opacity-100 shrink-0" />
      )}
    </button>
  );
});

export const CopyableDeviceId = memo(function CopyableDeviceId({
  id,
  labelPrefix,
  className,
}: {
  id?: string | null;
  labelPrefix?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <CopyableBadge
      value={id}
      labelPrefix={labelPrefix}
      tooltip={t("devices.copyDeviceIdTooltip", "Click to copy Device ID")}
      toastMessage={t("devices.copiedDeviceId", "Device ID copied to clipboard")}
      className={className}
    />
  );
});

export const CopyableSerial = memo(function CopyableSerial({
  serial,
  className,
}: {
  serial?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <CopyableBadge
      value={serial}
      fallback={t("devices.noSerial")}
      tooltip={t("devices.copySerialTooltip", "Click to copy serial number")}
      toastMessage={t("devices.copiedSerial", "Serial number copied to clipboard")}
      className={cn("text-foreground font-semibold", className)}
    />
  );
});
