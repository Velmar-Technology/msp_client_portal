import { useEffect, useState } from "react";
import { X, Cloud, Loader2, Copy, Check, HardDrive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { equipmentService } from "@/services/equipmentService";

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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<NextcloudInfoData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !subId || slotIndex === null || slotIndex === undefined) {
      setInfo(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchNextcloudData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await equipmentService.getNextcloudInfo(subId, slotIndex);
        if (isMounted) {
          setInfo(data);
        }
      } catch (err) {
        console.error("Failed to load Nextcloud info:", err);
        if (isMounted) {
          setError(t("devices.nextcloudError"));
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
  }, [isOpen, subId, slotIndex, t]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-md w-full shadow-xl text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-900/50">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{t("devices.nextcloudModalTitle")}</h3>
              <p className="text-[10px] text-zinc-500 font-medium">{deviceName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors cursor-pointer text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-zinc-500 font-medium animate-pulse">{t("devices.nextcloudLoading")}</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md text-center text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : (
            <>
              {/* Device Header Details */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="flex justify-between items-center text-zinc-500">
                  <span>{t("devices.wizardStep3DeviceName")}</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{deviceName}</span>
                </div>
                {deviceSerial && (
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>{t("devices.wizardStep3SerialNumber")}</span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold">{deviceSerial}</span>
                  </div>
                )}
              </div>

              {/* Nextcloud Credentials Card */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  {t("devices.nextcloudAccount")}
                </p>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-md space-y-2 font-mono text-xs">
                  {/* User */}
                  <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-850">
                    <div className="truncate mr-2">
                      <span className="text-zinc-400 text-[10px] block font-sans">{t("devices.wizardStep3User")}</span>
                      <span className="text-zinc-900 dark:text-zinc-100 font-semibold select-all">{username}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(username, "user")}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-500 cursor-pointer shrink-0"
                      title="Copy username"
                    >
                      {copiedField === "user" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Password */}
                  {info?.nextcloud_password && (
                    <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-850">
                      <div className="truncate mr-2">
                        <span className="text-zinc-400 text-[10px] block font-sans">{t("devices.wizardStep3Pass")}</span>
                        <span className="text-zinc-900 dark:text-zinc-100 font-semibold select-all">
                          {info.nextcloud_password}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(info.nextcloud_password!, "pass")}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-500 cursor-pointer shrink-0"
                        title="Copy password"
                      >
                        {copiedField === "pass" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Storage Usage Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {t("devices.storageUsage")}
                  </p>
                  {total > 0 && (
                    <span className="text-[10px] font-mono text-zinc-500">
                      {t("devices.usedLabel", { size: formatSize(used) })} / {t("devices.totalLabel", { size: formatSize(total), percentage })}
                    </span>
                  )}
                </div>

                {total > 0 ? (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentage > 90 ? "bg-red-500" : percentage > 75 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>0 B</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{percentage}% used</span>
                      <span>{formatSize(total)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                    Storage statistics unavailable
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t("billing.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
