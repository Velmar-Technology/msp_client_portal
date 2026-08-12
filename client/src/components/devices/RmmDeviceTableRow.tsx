import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from '@/components/ui/table';
import type { SubscriptionEquipment } from '@/services/equipmentService';
import { Activity, CheckCircle2, Cpu, HardDrive, Power, RefreshCw, ShieldCheck } from 'lucide-react';

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

  const agentStatus = device.agent_status || null;
  const isOnline = agentStatus === 'ONLINE';
  const isOffline = agentStatus === 'OFFLINE';
  const cpu = device.cpu_usage != null ? `${Math.round(device.cpu_usage)}%` : t('rmm.telemetryNA');
  const mem = device.memory_usage != null ? `${Math.round(device.memory_usage)}%` : t('rmm.telemetryNA');
  const disk = device.disk_usage != null ? `${Math.round(device.disk_usage)}%` : t('rmm.telemetryNA');
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
        <div className="flex justify-end items-center gap-2">
          <button
            type="button"
            onClick={() => onScanDevice(device.id)}
            disabled={isScanning}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{t('rmm.tableScanTooltip')}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenPatchModal(device.id, deviceName)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md shadow-xs transition-opacity cursor-pointer"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>{t('rmm.tablePatchModalTooltip')}</span>
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
});

RmmDeviceTableRow.displayName = 'RmmDeviceTableRow';
