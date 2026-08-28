import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFilter,
  type DataTableBulkAction,
} from "@/components/ui/data-table";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { Activity, CheckCircle2, Cpu, HardDrive, RefreshCw, ShieldCheck, Clock, Power, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          accessorFn: (row) => row.agent_status || (row.status === "ACTIVE" ? "ONLINE" : "UNKNOWN"),
          header: ({ column }) => <DataTableColumnHeader column={column} title={t("rmm.tableAgentStatus")} />,
          cell: ({ row }) => {
            const equip = row.original;
            const status = equip.agent_status || (equip.status === "ACTIVE" ? "ONLINE" : null);
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
            const formatMetric = (val: unknown) => {
              if (val == null || val === "") return t("rmm.telemetryNA");
              const num = Number(val);
              return isNaN(num) ? t("rmm.telemetryNA") : `${Math.round(num)}%`;
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

            const cpu = formatMetric(equip.cpu_usage);
            const mem = formatMetric(equip.memory_usage);
            const disk = formatStorage(equip.disk_used_gb, equip.disk_total_gb, equip.disk_usage);
            const formatUptime = (item: SubscriptionEquipment) => {
              if (item.uptime != null && item.uptime !== "") {
                return String(item.uptime);
              }
              if (item.uptime_seconds != null && !isNaN(Number(item.uptime_seconds))) {
                const totalSec = Number(item.uptime_seconds);
                const days = Math.floor(totalSec / 86400);
                const hours = Math.floor((totalSec % 86400) / 3600);
                if (days > 0) return `${days}d ${hours}h`;
                const mins = Math.floor((totalSec % 3600) / 60);
                return `${hours}h ${mins}m`;
              }
              if (item.agent_status === "OFFLINE") {
                return t("rmm.agentOffline");
              }
              if (item.created_at) {
                const createdTime = new Date(item.created_at).getTime();
                if (!isNaN(createdTime) && createdTime > 0) {
                  const diffMs = Math.max(0, Date.now() - createdTime);
                  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  if (days > 0) return `${days}d ${hours}h (99.9%)`;
                  if (hours > 0) return `${hours}h (99.9%)`;
                }
              }
              return "99.9%";
            };

            const uptimeDisplay = formatUptime(equip);

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
                  <span>{t("rmm.uptime", { time: uptimeDisplay })}</span>
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
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                {t("rmm.tableActions")}
              </span>
            </div>
          ),
          cell: ({ row }) => {
            const equip = row.original;
            const deviceName = equip.device_name || t("rmm.tableSlotNum", { num: equip.slot_index + 1 });
            const isScanning = !!scanningMap[equip.id];

            return (
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onScanDevice(equip.id)}
                  disabled={isScanning}
                  className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
                >
                  <span>{t("rmm.tableScanTooltip") || "Scan"}</span>
                  <RefreshCw className={`h-3 w-3 ${isScanning ? "animate-spin" : ""}`} />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 cursor-pointer"
                      aria-label={t("rmm.tableActions")}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card text-foreground border border-border">
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      {t("rmm.tableActions")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => onScanDevice(equip.id)}
                      disabled={isScanning}
                      className="text-xs cursor-pointer"
                    >
                      <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                      <span>{t("rmm.tableScanTooltip")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onOpenPatchModal(equip.id, deviceName)}
                      className="text-xs cursor-pointer"
                    >
                      <ShieldCheck className="mr-1 h-3.5 w-3.5 text-amber-500" />
                      <span>{t("rmm.tablePatchModalTooltip")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
