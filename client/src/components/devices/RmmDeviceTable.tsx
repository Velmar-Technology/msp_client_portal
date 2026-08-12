import React, { memo, useMemo } from "react";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFilter,
  type DataTableBulkAction,
} from "@/components/ui/data-table";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { Activity, Cpu, HardDrive, RefreshCw, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface RmmDeviceTableProps {
  devices: SubscriptionEquipment[];
  filteredCount: number;
  loading: boolean;
  scanningMap: Record<string, boolean>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSelectedDevicesChange: (selected: SubscriptionEquipment[]) => void;
  onScanDevice: (equipmentId: string) => void;
  onBulkScan: (selected: SubscriptionEquipment[]) => void;
  onBulkExportCSV: (selected: SubscriptionEquipment[]) => void;
  onOpenPatchModal: (equipmentId: string, deviceName: string) => void;
}

export const RmmDeviceTable: React.FC<RmmDeviceTableProps> = memo(
  ({
    devices,
    filteredCount,
    loading,
    scanningMap,
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    sorting,
    onSortingChange,
    page,
    totalPages,
    limit,
    onPageChange,
    onLimitChange,
    onSelectedDevicesChange,
    onScanDevice,
    onBulkScan,
    onBulkExportCSV,
    onOpenPatchModal,
  }) => {
    const columns = useMemo<ColumnDef<SubscriptionEquipment>[]>(
      () => [
        {
          id: "device_name",
          accessorFn: (row) => row.device_name || `Device Slot #${row.slot_index + 1}`,
          header: ({ column }) => <DataTableColumnHeader column={column} title="Device / Slot" />,
          cell: ({ row }) => {
            const equip = row.original;
            const deviceName = equip.device_name || `Device Slot #${equip.slot_index + 1}`;
            return (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{deviceName}</p>
                <p className="text-[10px] text-zinc-400 font-mono">Slot #{equip.slot_index + 1}</p>
              </div>
            );
          },
        },
        {
          id: "device_serial",
          accessorFn: (row) => row.device_serial || "Unassigned",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Serial Number" />,
          cell: ({ row }) => (
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
              {row.original.device_serial || "Unassigned"}
            </span>
          ),
        },
        {
          id: "status",
          accessorKey: "status",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Zabbix Agent" />,
          cell: () => (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> ONLINE
            </span>
          ),
        },
        {
          id: "telemetry",
          enableSorting: false,
          header: () => (
            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
              Telemetry (CPU / RAM / Disk)
            </span>
          ),
          cell: () => (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                <Cpu className="h-3 w-3 text-blue-500 shrink-0" /> 18%
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                <Activity className="h-3 w-3 text-emerald-500 shrink-0" /> 42%
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                <HardDrive className="h-3 w-3 text-amber-500 shrink-0" /> 35%
              </span>
            </div>
          ),
        },
        {
          id: "patch_advisory",
          enableSorting: false,
          header: () => (
            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
              Patch Advisory
            </span>
          ),
          cell: () => (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 shrink-0">
              <ShieldCheck className="h-3 w-3" /> 2 Pending Patches
            </span>
          ),
        },
        {
          id: "actions",
          enableSorting: false,
          header: () => (
            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex justify-end">
              Actions
            </span>
          ),
          cell: ({ row }) => {
            const equip = row.original;
            const deviceName = equip.device_name || `Slot #${equip.slot_index + 1}`;
            const isScanning = !!scanningMap[equip.id];

            return (
              <div className="flex flex-wrap sm:flex-nowrap justify-end items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onScanDevice(equip.id);
                  }}
                  disabled={isScanning}
                  className="inline-flex items-center gap-1 h-7 px-2 sm:px-2.5 text-xs font-semibold bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`h-3 w-3 shrink-0 ${isScanning ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPatchModal(equip.id, deviceName);
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2 sm:px-2.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md shadow-xs transition-opacity cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                </button>
              </div>
            );
          },
        },
      ],
      [scanningMap, onScanDevice, onOpenPatchModal],
    );

    const searchConfig = useMemo(
      () => ({
        value: searchTerm,
        onChange: onSearchChange,
        placeholder: "Filter telemetry by device name or serial...",
      }),
      [searchTerm, onSearchChange],
    );

    const filtersConfig: DataTableFilter[] = useMemo(
      () => [
        {
          id: "status",
          value: statusFilter,
          onChange: onStatusFilterChange,
          placeholder: "All Telemetry Statuses",
          options: [
            { value: "ONLINE", label: "Online Agent" },
            { value: "OFFLINE", label: "Offline Agent" },
            { value: "PENDING_PATCHES", label: "Has Pending Patches" },
          ],
        },
      ],
      [statusFilter, onStatusFilterChange],
    );

    const bulkActions: DataTableBulkAction<SubscriptionEquipment>[] = useMemo(
      () => [
        {
          label: "Scan Selected Zabbix",
          onClick: onBulkScan,
          variant: "default",
        },
        {
          label: "Export Telemetry CSV",
          onClick: onBulkExportCSV,
          variant: "outline",
        },
      ],
      [onBulkScan, onBulkExportCSV],
    );

    const paginationConfig = useMemo(
      () => ({
        page,
        totalPages,
        totalItems: filteredCount,
        limit,
        onPageChange,
        onLimitChange,
      }),
      [page, totalPages, filteredCount, limit, onPageChange, onLimitChange],
    );

    return (
      <div className="w-full max-w-full min-w-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 sm:p-4 shadow-sm space-y-3">
        {/* Full-featured Canonical DataTable */}
        <DataTable
          columns={columns}
          data={devices}
          loading={loading}
          noDataMessage="No telemetry records match your search query."
          search={searchConfig}
          filters={filtersConfig}
          pagination={paginationConfig}
          enableRowSelection={true}
          onSelectedRowsChange={onSelectedDevicesChange}
          bulkActions={bulkActions}
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      </div>
    );
  },
);

RmmDeviceTable.displayName = "RmmDeviceTable";
