import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SubscriptionEquipment } from '@/services/equipmentService';
import { Activity, CheckCircle2, Cpu, HardDrive, Power, RefreshCw, ShieldCheck, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RmmDeviceTableRowProps {
  device: SubscriptionEquipment;
  isScanning: boolean;
  onScanDevice: (equipmentId: string) => void;
  onOpenPatchModal: (equipmentId: string, deviceName: string) => void;
}

export const RmmDeviceTableRow: React.FC<RmmDeviceTableRowProps> = memo(({
  device,
  isScanning,
  onScanDevice,
  onOpenPatchModal,
}) => {
  const { t } = useTranslation();
  const deviceName = device.device_name || t('rmm.tableSlotNum', { num: device.slot_index + 1 });
  const deviceSerial = device.device_serial || t('rmm.tableUnassigned');

  const agentStatus = device.agent_status || (device.status === 'ACTIVE' ? 'ONLINE' : null);
  const isOnline = agentStatus === 'ONLINE';
  const isOffline = agentStatus === 'OFFLINE';
  const formatMetric = (val: unknown) => {
    if (val == null || val === '') return t('rmm.telemetryNA');
    const num = Number(val);
    return isNaN(num) ? t('rmm.telemetryNA') : `${Math.round(num)}%`;
  };
  const formatStorage = (usedGb: unknown, totalGb: unknown, fallbackPct: unknown) => {
    if (usedGb != null && totalGb != null && Number(totalGb) > 0) {
      const u = Math.round(Number(usedGb));
      const t = Math.round(Number(totalGb));
      if (!isNaN(u) && !isNaN(t) && t > 0) {
        return `${u} GB / ${t} GB`;
      }
    }
    return formatMetric(fallbackPct);
  };
  const cpu = formatMetric(device.cpu_usage);
  const mem = formatMetric(device.memory_usage);
  const disk = formatStorage(device.disk_used_gb, device.disk_total_gb, device.disk_usage);
  const pendingPatches = device.pending_patch_count ?? 0;

  return (
    <TableRow className="border-b border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
      <TableCell className="py-3 px-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {deviceName}
          </p>
          <p className="text-[10px] text-zinc-400 font-mono">
            {t('rmm.tableSlotNum', { num: device.slot_index + 1 })}
          </p>
        </div>
      </TableCell>

      <TableCell className="py-3 px-4 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
        {deviceSerial}
      </TableCell>

      <TableCell className="py-3 px-4">
        {agentStatus ? (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                : isOffline
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
            }`}
          >
            {isOnline ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : isOffline ? (
              <Power className="h-3 w-3" />
            ) : (
              <Activity className="h-3 w-3" />
            )}
            {t(isOnline ? 'rmm.agentOnline' : isOffline ? 'rmm.agentOffline' : 'rmm.agentUnknown')}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-zinc-400">{t('rmm.telemetryNA')}</span>
        )}
      </TableCell>

      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
            <Cpu className="h-3 w-3 text-blue-500" /> {cpu}
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
            <Activity className="h-3 w-3 text-emerald-500" /> {mem}
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
            <HardDrive className="h-3 w-3 text-amber-500" /> {disk}
          </span>
        </div>
      </TableCell>

      <TableCell className="py-3 px-4">
        <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> {t('rmm.tablePendingPatchesBadge', { count: pendingPatches })}
        </span>
      </TableCell>

      <TableCell className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onScanDevice(device.id)}
            disabled={isScanning}
            className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
          >
            <span>{t('rmm.tableScanTooltip') || 'Scan'}</span>
            <RefreshCw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 cursor-pointer"
                aria-label={t('rmm.tableActions')}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card text-foreground border border-border">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {t('rmm.tableActions')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => onScanDevice(device.id)}
                disabled={isScanning}
                className="text-xs cursor-pointer"
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{t('rmm.tableScanTooltip')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onOpenPatchModal(device.id, deviceName)}
                className="text-xs cursor-pointer"
              >
                <ShieldCheck className="mr-1 h-3.5 w-3.5 text-amber-500" />
                <span>{t('rmm.tablePatchModalTooltip')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
});

RmmDeviceTableRow.displayName = 'RmmDeviceTableRow';
