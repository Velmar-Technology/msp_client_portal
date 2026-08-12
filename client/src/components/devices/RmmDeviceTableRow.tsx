import React, { memo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import type { SubscriptionEquipment } from '@/services/equipmentService';
import { Activity, Cpu, HardDrive, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
  const deviceName = device.device_name || `Device Slot #${device.slot_index}`;
  const deviceSerial = device.device_serial || 'Unassigned';

  return (
    <TableRow className="border-b border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
      <TableCell className="py-3 px-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {deviceName}
          </p>
          <p className="text-[10px] text-zinc-400 font-mono">
            Slot #{device.slot_index + 1}
          </p>
        </div>
      </TableCell>

      <TableCell className="py-3 px-4 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
        {deviceSerial}
      </TableCell>

      <TableCell className="py-3 px-4">
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> ONLINE
        </span>
      </TableCell>

      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
            <Cpu className="h-3 w-3 text-blue-500" /> 18%
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
            <Activity className="h-3 w-3 text-emerald-500" /> 42%
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
            <HardDrive className="h-3 w-3 text-amber-500" /> 35%
          </span>
        </div>
      </TableCell>

      <TableCell className="py-3 px-4">
        <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> 2 Pending Patches
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
            <span>Scan Zabbix</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenPatchModal(device.id, deviceName)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md shadow-xs transition-opacity cursor-pointer"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>Manage Patches</span>
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
});

RmmDeviceTableRow.displayName = 'RmmDeviceTableRow';
