import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFilter,
  type DataTableBulkAction,
} from "@/components/ui/data-table";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { Activity, CheckCircle2, Cpu, HardDrive, RefreshCw, ShieldCheck, Clock, Power } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

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
    const { t } = useTranslation();

    const columns = useMemo<ColumnDef<SubscriptionEquipment>[]>(
      () => [
        {
          id: "device_name",
          accessorFn: (row) => row.device_name || t("rmm.tableSlotNum", { num: row.slot_index + 1 }),
          header: ({ column }) => <DataTableColumnHeader column={column} title={t("rmm.tableDeviceSlot")} />,
          cell: ({ row }) => {
            const equip = row.original;
            const deviceName = equip.device_name || t("rmm.tableSlotNum", { num: equip.slot_index + 1 });
            return (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{deviceName}</p>
                <p className="text-[10px] text-zinc-400 font-mono">{t("rmm.tableSlotNum", { num: equip.slot_index + 1 })}</p>
              </div>
            );
          },
        },
        {
          id: "device_serial",
          accessorFn: (row) => row.device_serial || t("rmm.tableUnassigned"),
          header: ({ column }) => <DataTableColumnHeader column={column} title={t("rmm.tableSerialNumber")} />,
          cell: ({ row }) => (
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
              {row.original.device_serial || t("rmm.tableUnassigned")}
            </span>
          ),
        },
        {
          id: "agent_status",
          accessorFn: (row) => row.agent_status || "UNKNOWN",
          header: ({ column }) => <DataTableColumnHeader column={column} title={t("rmm.tableAgentStatus")} />,
          cell: ({ row }) => {
            const status = row.original.agent_status;
            if (!status) {
              return <span className="font-mono text-[10px] text-zinc-400">{t("rmm.telemetryNA")}</span>;
            }
            const isOnline = status === "ONLINE";
            const isOffline = status === "OFFLINE";
            return (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                    : isOffline
                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                }`}
              >
                {isOnline ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : isOffline ? (
                  <Power className="h-3 w-3 shrink-0" />
                ) : (
                  <Activity className="h-3 w-3 shrink-0" />
                )}
                {t(isOnline ? "rmm.agentOnline" : isOffline ? "rmm.agentOffline" : "rmm.agentUnknown")}
              </span>
            );
          },
        },
        {
          id: "last_checked",
          accessorFn: (row) => row.last_sync_at || row.updated_at || row.created_at,
          header: ({ column }) => <DataTableColumnHeader column={column} title={t("rmm.tableLastChecked")} />,
          cell: ({ row }) => {
            const equip = row.original;
            const dateStr = equip.last_sync_at || equip.updated_at || equip.created_at;
            if (!dateStr) {
              return <span className="font-mono text-[10px] text-zinc-400">{t("rmm.telemetryNA")}</span>;
            }
            const dateObj = new Date(dateStr);
            const isValid = !isNaN(dateObj.getTime());
            const relative = isValid ? formatRelativeTime(dateObj) : dateStr;

            return (
              <span className="font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                {relative}
              </span>
            );
          },
        },
        {
          id: "telemetry",
          enableSorting: false,
          header: () => (
            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
              {t("rmm.tableTelemetry")}
            </span>
          ),
          cell: ({ row }) => {
            const equip = row.original;
            const cpu = equip.cpu_usage != null ? `${Math.round(equip.cpu_usage)}%` : t("rmm.telemetryNA");
            const mem = equip.memory_usage != null ? `${Math.round(equip.memory_usage)}%` : t("rmm.telemetryNA");
            const disk = equip.disk_usage != null ? `${Math.round(equip.disk_usage)}%` : t("rmm.telemetryNA");
            const syncTime = equip.last_sync_at || equip.updated_at || equip.created_at;
            const syncedAt = syncTime ? formatRelativeTime(new Date(syncTime)) : t("rmm.telemetryNA");

            return (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    <Cpu className="h-3 w-3 text-blue-500 shrink-0" /> {cpu}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    <Activity className="h-3 w-3 text-emerald-500 shrink-0" /> {mem}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                    <HardDrive className="h-3 w-3 text-amber-500 shrink-0" /> {disk}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span>{t("rmm.lastSynced", { time: syncedAt })}</span>
                </div>
              </div>
            );
          },
        },
        {
          id: "patch_advisory",
          enableSorting: false,
          header: () => (
            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
              {t("rmm.tablePatchAdvisory")}
            </span>
          ),
          cell: ({ row }) => {
            const count = row.original.pending_patch_count ?? 0;
            return (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 shrink-0">
                <ShieldCheck className="h-3 w-3" /> {t("rmm.tablePendingPatchesBadge", { count })}
              </span>
            );
          },
        },
        {
          id: "actions",
          enableSorting: false,
          header: () => (
            <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider flex justify-end">
              {t("rmm.tableActions")}
            </span>
          ),
          cell: ({ row }) => {
            const equip = row.original;
            const deviceName = equip.device_name || t("rmm.tableSlotNum", { num: equip.slot_index + 1 });
            const isScanning = !!scanningMap[equip.id];

            return (
              <div className="flex flex-wrap sm:flex-nowrap justify-end items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  title={t("rmm.tableScanTooltip")}
                  aria-label={t("rmm.tableScanTooltip")}
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
                  title={t("rmm.tablePatchModalTooltip")}
                  aria-label={t("rmm.tablePatchModalTooltip")}
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
      [scanningMap, onScanDevice, onOpenPatchModal, t],
    );

    const searchConfig = useMemo(
      () => ({
        value: searchTerm,
        onChange: onSearchChange,
        placeholder: t("rmm.searchPlaceholder"),
      }),
      [searchTerm, onSearchChange, t],
    );

    const filtersConfig: DataTableFilter[] = useMemo(
      () => [
        {
          id: "status",
          value: statusFilter,
          onChange: onStatusFilterChange,
          placeholder: t("rmm.filterAllStatuses"),
          options: [
            { value: "ONLINE", label: t("rmm.filterOnline") },
            { value: "OFFLINE", label: t("rmm.filterOffline") },
            { value: "PENDING_PATCHES", label: t("rmm.filterPendingPatches") },
          ],
        },
      ],
      [statusFilter, onStatusFilterChange, t],
    );

    const bulkActions: DataTableBulkAction<SubscriptionEquipment>[] = useMemo(
      () => [
        {
          label: t("rmm.bulkScan"),
          onClick: onBulkScan,
          variant: "default",
        },
        {
          label: t("rmm.bulkExportCsv"),
          onClick: onBulkExportCSV,
          variant: "outline",
        },
      ],
      [onBulkScan, onBulkExportCSV, t],
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
      <DataTable
        columns={columns}
        data={devices}
        loading={loading}
        noDataMessage={t("rmm.noDataMessage")}
        search={searchConfig}
        filters={filtersConfig}
        pagination={paginationConfig}
        enableRowSelection={true}
        onSelectedRowsChange={onSelectedDevicesChange}
        bulkActions={bulkActions}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
    );
  },
);

RmmDeviceTable.displayName = "RmmDeviceTable";
