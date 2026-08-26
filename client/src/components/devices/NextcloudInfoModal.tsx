import { useEffect, useState } from "react";
import { X, Cloud, Loader2, Copy, Check, HardDrive, MonitorDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { equipmentService } from "@/services/equipmentService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface NextcloudInfoData {
  nextcloud_username: string | null;
  nextcloud_password: string | null;
  nextcloud_used_bytes: number;
  nextcloud_total_bytes: number;
  device_name: string | null;
  device_serial: string | null;
  status: string;
}

interface NextcloudInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  subId: string | null;
  slotIndex: number | null;
  fallbackUsername?: string | null;
  fallbackDeviceName?: string | null;
}

export function NextcloudInfoModal({
  isOpen,
  onClose,
  subId,
  slotIndex,
  fallbackUsername,
  fallbackDeviceName,
}: NextcloudInfoModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [info, setInfo] = useState<NextcloudInfoData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !subId || slotIndex === null || slotIndex === undefined) {
      setInfo(null);
      setHasError(false);
      return;
    }

    let isMounted = true;
    const fetchNextcloudData = async () => {
      setLoading(true);
      setHasError(false);
      try {
        const data = await equipmentService.getNextcloudInfo(subId, slotIndex);
        if (isMounted) {
          setInfo(data);
        }
      } catch (err) {
        console.error("Failed to load Nextcloud info:", err);
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNextcloudData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, subId, slotIndex]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const used = info?.nextcloud_used_bytes || 0;
  const total = info?.nextcloud_total_bytes || 0;
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const username = info?.nextcloud_username || fallbackUsername || "N/A";
  const deviceName = info?.device_name || fallbackDeviceName || t("devices.unnamedDevice");
  const deviceSerial = info?.device_serial;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-full bg-card border border-border rounded-lg p-0 text-foreground flex flex-col overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border flex flex-row justify-between items-center bg-card space-y-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-md border border-primary/20">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground font-heading">{t("devices.nextcloudModalTitle")}</DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground font-medium">{deviceName}</DialogDescription>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium animate-pulse">{t("devices.nextcloudLoading")}</p>
            </div>
          ) : hasError ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-center text-xs text-destructive">
              {t("devices.nextcloudError")}
            </div>
          ) : (
            <>
              {/* Device Header Details */}
              <div className="bg-muted/40 p-3 rounded-md border border-border space-y-1 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>{t("devices.wizardStep3DeviceName")}</span>
                  <span className="text-foreground font-semibold">{deviceName}</span>
                </div>
                {deviceSerial && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>{t("devices.wizardStep3SerialNumber")}</span>
                    <span className="text-foreground font-mono font-semibold">{deviceSerial}</span>
                  </div>
                )}
              </div>

              {/* Nextcloud Credentials Card */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-heading">
                  {t("devices.nextcloudAccount")}
                </p>
                <div className="bg-card border border-border p-3 rounded-md space-y-2 font-mono text-xs">
                  {/* User */}
                  <div className="flex justify-between items-center bg-muted/40 p-2 rounded border border-border">
                    <div className="truncate mr-2">
                      <span className="text-muted-foreground text-[10px] block font-sans">{t("devices.wizardStep3User")}</span>
                      <span className="text-foreground font-semibold select-all">{username}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(username, "user")}
                      className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      title="Copy username"
                    >
                      {copiedField === "user" ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Password */}
                  {info?.nextcloud_password && (
                    <div className="flex justify-between items-center bg-muted/40 p-2 rounded border border-border">
                      <div className="truncate mr-2">
                        <span className="text-muted-foreground text-[10px] block font-sans">
                          {t("devices.wizardStep3Pass")}
                        </span>
                        <span className="text-foreground font-semibold select-all">
                          {info.nextcloud_password}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(info.nextcloud_password!, "pass")}
                        className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        title="Copy password"
                      >
                        {copiedField === "pass" ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Deploy Client Section */}
              {info?.nextcloud_username && subId && slotIndex !== null && slotIndex !== undefined && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 font-heading">
                    <MonitorDown className="h-3 w-3" />
                    {t("devices.deployClient")}
                  </p>
                  <div className="bg-muted/40 p-3 rounded-md border border-border space-y-2">
                    <p className="text-[10px] text-muted-foreground">{t("devices.deployNote")}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const url = await equipmentService.getDeployScriptUrl(subId!, slotIndex!);
                        navigator.clipboard.writeText(`powershell -Command "irm ${url} | iex"`);
                        setCopiedField("deploy");
                        setTimeout(() => setCopiedField(null), 2000);
                      }}
                      className="h-7 text-xs font-semibold cursor-pointer w-full"
                    >
                      {copiedField === "deploy" ? (
                        <><Check className="h-3.5 w-3.5 mr-1 text-primary" /> {t("devices.deployCommandCopied")}</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5 mr-1" /> {t("devices.deployCopyCommand")}</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Storage Usage Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1 font-heading">
                    <HardDrive className="h-3 w-3" />
                    {t("devices.storageUsage")}
                  </p>
                  {total > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {t("devices.usedLabel", { size: formatSize(used) })} /{" "}
                      {t("devices.totalLabel", { size: formatSize(total), percentage })}
                    </span>
                  )}
                </div>

                {total > 0 ? (
                  <div className="bg-muted/40 p-3 rounded-md border border-border space-y-2">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentage > 90 ? "bg-destructive" : percentage > 75 ? "bg-secondary" : "bg-primary"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>0 B</span>
                      <span className="font-semibold text-foreground">{percentage}% used</span>
                      <span>{formatSize(total)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/40 p-3 rounded-md border border-border text-center text-xs text-muted-foreground">
                    Storage statistics unavailable
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-5 py-3 bg-muted/30 border-t border-border flex justify-end">
          <DialogClose
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-semibold transition-opacity cursor-pointer border-0"
          >
            {t("billing.close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default NextcloudInfoModal;
