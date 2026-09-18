import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Cpu, HardDrive, Clock, ShieldCheck, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionEquipment } from "@shared/contracts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { rmmService, type RmmDeviceTelemetry, usePatchManagementModal } from "@/features/rmm";
import { PatchTable } from "@/components/devices/PatchTable";

export interface DeviceRmmModalProps {
  isOpen: boolean;
  onClose: () => void;
  equip: Partial<SubscriptionEquipment> | null;
  onOpenScheduleMaint?: (equip: Partial<SubscriptionEquipment>) => void;
}

/**
 * Modal presenting device-specific RMM Telemetry, real-time hardware vitals,
 * automated scan execution, and vulnerability patch deployment.
 */
export function DeviceRmmModal({ isOpen, onClose, equip }: DeviceRmmModalProps) {
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState<RmmDeviceTelemetry | null>(null);

  // Reset or initialize telemetry when equip changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setLiveTelemetry(null);
    }
  }, [isOpen, equip?.id]);

  const {
    patches,
    loading: patchesLoading,
    applying,
    selectedPatchIds,
    pendingPatches,
    isAllPendingSelected,
    selectedCount,
    handleTogglePatch,
    handleSelectAllPending,
    handleApplySelected,
    fetchPatches,
  } = usePatchManagementModal({
    open: isOpen,
    equipmentId: equip?.id || null,
  });

  const handleScan = async () => {
    if (!equip?.id) return;
    try {
      setScanning(true);
      toast.info(t("rmm.toastScanTriggered", "Triggering RMM telemetry scan..."));
      const updated = await rmmService.triggerScan(equip.id);
      setLiveTelemetry(updated);
      await fetchPatches();
      toast.success(t("rmm.toastScanSuccess", "Device telemetry synchronized with RMM!"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("rmm.toastScanError", "Failed to trigger scan");
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const deviceName = equip?.device_name || equip?.agent_hostname || t("devices.unnamedDevice", "Unnamed Device");
  const deviceSerial = equip?.device_serial || equip?.agent_serial || t("devices.noSerial", "No Serial");
  const agentStatus =
    liveTelemetry?.agent_status ?? equip?.agent_status ?? (equip?.status === "ACTIVE" ? "ONLINE" : "OFFLINE");
  const isOnline = agentStatus === "ONLINE";

  const cpuVal = liveTelemetry?.cpu_usage ?? equip?.cpu_usage ?? null;
  const memVal = liveTelemetry?.memory_usage ?? equip?.memory_usage ?? null;
  const diskPct = liveTelemetry?.disk_usage ?? equip?.disk_usage ?? null;
  const diskUsed = liveTelemetry?.disk_used_gb ?? equip?.disk_used_gb ?? null;
  const diskTotal = liveTelemetry?.disk_total_gb ?? equip?.disk_total_gb ?? null;
  const syncDate = liveTelemetry?.last_sync_at || equip?.last_sync_at || equip?.updated_at;

  const formatMetric = (val: unknown) => {
    if (val == null || val === "") return t("rmm.telemetryNA", "N/A");
    const num = Number(val);
    return isNaN(num) ? t("rmm.telemetryNA", "N/A") : `${Math.round(num)}%`;
  };

  const formatStorage = (usedGb: unknown, totalGb: unknown, fallbackPct: unknown) => {
    if (usedGb != null && totalGb != null && Number(totalGb) > 0) {
      const u = Math.round(Number(usedGb));
      const tot = Math.round(Number(totalGb));
      if (!isNaN(u) && !isNaN(tot) && tot > 0) {
        return `${u} GB / ${tot} GB`;
      }
    }
    return formatMetric(fallbackPct);
  };

  const formatUptime = () => {
    if (equip?.uptime != null && equip.uptime !== "") {
      return String(equip.uptime);
    }
    if (equip?.uptime_seconds != null && !isNaN(Number(equip.uptime_seconds))) {
      const totalSec = Number(equip.uptime_seconds);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      if (days > 0) return `${days}d ${hours}h`;
      const mins = Math.floor((totalSec % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    if (agentStatus === "OFFLINE") {
      return t("rmm.agentOffline", "OFFLINE");
    }
    return "99.9%";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-6 gap-5 bg-card border-border overflow-hidden">
        {/* Header with identity & live scan action */}
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border text-left w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold truncate">{deviceName}</DialogTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 ${
                      isOnline
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`}
                    />
                    {agentStatus}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono">SN: {deviceSerial}</span>
                  {equip?.client_name && <span>• {equip.client_name}</span>}
                  {syncDate && <span>• {t("rmm.lastSynced", { time: formatRelativeTime(new Date(syncDate)) })}</span>}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={scanning}
                onClick={handleScan}
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-primary" : ""}`} />
                <span>
                  {scanning ? t("devices.scanning", "Scanning...") : t("rmm.tableScanAction", "Scan Telemetry")}
                </span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 -mr-1">
          {/* Hardware Vitals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* CPU */}
            <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">CPU</span>
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-lg font-bold font-mono text-foreground">{formatMetric(cpuVal)}</div>
              <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, Number(cpuVal) || 0))}%` }}
                />
              </div>
            </div>

            {/* RAM */}
            <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Memory</span>
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-bold font-mono text-foreground">{formatMetric(memVal)}</div>
              <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, Number(memVal) || 0))}%` }}
                />
              </div>
            </div>

            {/* Disk Storage */}
            <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Storage</span>
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div
                className="text-sm font-bold font-mono text-foreground truncate"
                title={formatStorage(diskUsed, diskTotal, diskPct)}
              >
                {formatStorage(diskUsed, diskTotal, diskPct)}
              </div>
              <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, Number(diskPct) || 0))}%` }}
                />
              </div>
            </div>

            {/* Uptime */}
            <div className="bg-muted/40 border border-border/80 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Uptime</span>
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-sm font-bold font-mono text-foreground truncate" title={formatUptime()}>
                {formatUptime()}
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                {isOnline ? t("rmm.agentOnline", "Agent Online") : t("rmm.agentOffline", "Agent Offline")}
              </div>
            </div>
          </div>

          {/* Patch Management Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-heading">
                  {t("rmm.tablePatchAdvisory", "Patch Advisory & Security Vulnerabilities")}
                </h3>
                {pendingPatches.length > 0 ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono"
                  >
                    {pendingPatches.length} {t("rmm.tablePendingPatchesBadge_other", "Pending Patches")}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    {t("devices.upToDate", "Up to Date")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <PatchTable
                patches={patches}
                loading={patchesLoading}
                applying={applying}
                selectedPatchIds={selectedPatchIds}
                pendingPatchesCount={pendingPatches.length}
                isAllPendingSelected={isAllPendingSelected}
                onSelectAllPending={handleSelectAllPending}
                onTogglePatch={handleTogglePatch}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="flex items-center justify-between gap-3 pt-3 border-t border-border sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs font-medium cursor-pointer"
          >
            {t("common.close", "Close")}
          </Button>

          {pendingPatches.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleApplySelected}
              disabled={selectedCount === 0 || applying}
              className="h-8 px-3 text-xs font-medium gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer"
            >
              {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{t("rmm.modalInstallSelected", { count: selectedCount })}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
