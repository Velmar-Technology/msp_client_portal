import { memo, useCallback, useState, useMemo } from "react";
import { Laptop, Loader2, MoreHorizontal, Cloud, Activity, ChevronRight, Calendar, RefreshCw, Trash2, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDevicesPage } from "@/hooks/useDevicesPage";
import type { Subscription } from "@/services/subscriptionService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { equipmentService } from "@/services/equipmentService";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---- Lazily loaded heavy sub-features and modals ----
const ScheduleMaintenanceModal = lazyWithRetry(() =>
  import("@/components/maintenance/ScheduleMaintenanceModal").then((m) => ({
    default: m.ScheduleMaintenanceModal,
  })),
);
const NextcloudInfoModal = lazyWithRetry(() =>
  import("@/components/devices/NextcloudInfoModal").then((m) => ({
    default: m.NextcloudInfoModal,
  })),
);
const ActivateWithOtpModal = lazyWithRetry(() =>
  import("@/components/devices/ActivateWithOtpModal").then((m) => ({
    default: m.ActivateWithOtpModal,
  })),
);
const AddAdminDeviceModal = lazyWithRetry(() =>
  import("@/components/devices/AddAdminDeviceModal").then((m) => ({
    default: m.AddAdminDeviceModal,
  })),
);
const RmmDashboard = lazyWithRetry(() =>
  import("@/components/devices/RmmDashboard").then((m) => ({
    default: m.RmmDashboard,
  })),
);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 1. High-Density Empty Subscriptions Card Sub-component
interface EmptySubscriptionsCardProps {
  onBrowsePlans: () => void;
}

export const EmptySubscriptionsCard = memo(function EmptySubscriptionsCard({
  onBrowsePlans,
}: EmptySubscriptionsCardProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
      <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
        <Laptop className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t("devices.noActiveSubscriptions")}</h3>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{t("devices.noActiveSubscriptionsDesc")}</p>
      </div>
      <Button type="button" size="sm" onClick={onBrowsePlans} className="h-7 px-3 text-xs font-semibold cursor-pointer">
        {t("devices.browseSupportPlans")}
      </Button>
    </div>
  );
});

// 2. High-Density Subscription Selector Sub-component
interface SubscriptionSelectorProps {
  subscriptions: Subscription[];
  selectedId: string;
  onChange: (id: string) => void;
}

export const SubscriptionSelector = memo(function SubscriptionSelector({
  subscriptions,
  selectedId,
  onChange,
}: SubscriptionSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-sm max-w-sm">
      <label htmlFor="active-sub-select-devices" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
        {t("devices.selectSubscription")}
      </label>
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
        <Select value={selectedId} onValueChange={onChange}>
          <SelectTrigger
            id="active-sub-select-devices"
            aria-label={t("devices.selectSubscription")}
            size="lg"
            className="w-full px-2.5 rounded text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5 justify-between"
          >
            <SelectValue placeholder={t("devices.selectSubscription")} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            {subscriptions.map((sub) => (
              <SelectItem key={sub.id} value={sub.id} className="text-xs font-medium cursor-pointer">
                {t("devices.subOptionLabel", {
                  name: sub.service_name,
                  devicesStr: t("plans.devicesCount", { count: sub.equipment_count }),
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

// 3. Memoized Actions Cell to prevent cross-row re-renders on dropdown open/close
interface DeviceActionsCellProps {
  equip: Partial<SubscriptionEquipment>;
  onOpenNcModal: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenScheduleMaint: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRevoke: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRepair: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenActivateWithOtp: (subId: string, slotIndex: number) => void;
  onDeleteAdminDevice?: (equip: Partial<SubscriptionEquipment>) => void;
  onDeployClient?: (equip: Partial<SubscriptionEquipment>) => void;
}

const DeviceActionsCell = memo(function DeviceActionsCell({
  equip,
  onOpenNcModal,
  onOpenScheduleMaint,
  onRequestRevoke,
  onRequestRepair,
  onOpenActivateWithOtp,
  onDeployClient,
}: DeviceActionsCellProps) {
  const { t } = useTranslation();

  const isActive = equip.status === "ACTIVE";

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {isActive ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenScheduleMaint(equip)}
          className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
        >
          <span>{t("maintenance.scheduleBtn") || "Schedule"}</span>
          <ChevronRight className="h-3 w-3" />
        </Button>
      ) : (
        equip.subscription_id !== undefined &&
        equip.slot_index !== undefined && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenActivateWithOtp(equip.subscription_id!, equip.slot_index!)}
            className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
          >
            <span>{t("devices.activateDevice") || "Activate"}</span>
            <ChevronRight className="h-3 w-3" />
          </Button>
        )
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("common.actions", "Actions")}
            className="h-7 w-7 cursor-pointer"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 bg-card text-foreground border border-border"
        >
          <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t("devices.actionsLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          {isActive ? (
            <>
              {equip.nextcloud_username && (
                <DropdownMenuItem onClick={() => onOpenNcModal(equip)} className="text-xs cursor-pointer">
                  <Cloud className="h-3.5 w-3.5 mr-1" />
                  {t("devices.actionNextcloudInfo")}
                </DropdownMenuItem>
              )}
              {equip.nextcloud_username &&
                equip.subscription_id &&
                equip.slot_index !== undefined &&
                onDeployClient && (
                  <DropdownMenuItem onClick={() => onDeployClient(equip)} className="text-xs cursor-pointer">
                    <Laptop className="h-3.5 w-3.5 mr-1" />
                    {t("devices.deployClient")}
                  </DropdownMenuItem>
                )}
              <DropdownMenuItem onClick={() => onOpenScheduleMaint(equip)} className="text-xs cursor-pointer">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {t("maintenance.scheduleBtn")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRequestRepair(equip)} className="text-xs cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                {t("devices.actionRepair", "Re-pair Device")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => onRequestRevoke(equip)}
                className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                {equip.client_role === "ADMIN"
                  ? t("devices.actionDelete", "Delete Device")
                  : t("devices.actionDeactivate", "Deactivate Device")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {equip.subscription_id !== undefined && equip.slot_index !== undefined && (
                <DropdownMenuItem
                  onClick={() => onOpenActivateWithOtp(equip.subscription_id!, equip.slot_index!)}
                  className="text-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {t("devices.activateDevice")}
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// 6. Parent Dashboard Page
export function DevicesPage() {
  const { t } = useTranslation();
  const {
    navigate,
    loading,
    activeTab,
    setActiveTab,
    activeSubscriptions,
    selectedSubscriptionId,
    setSelectedSubscriptionId,
    subscriptionEquipment,
    searchTerm,
    setSearchTerm,
    activateTargetSubId,
    activateTargetSlotIdx,
    activeSub,
    filteredEquipment,
    paginatedEquipment,
    handleRequestRevoke,
    revokeTarget,
    revokeLoading,
    confirmRevoke,
    cancelRevoke,
    repairTarget,
    repairLoading,
    confirmRepair,
    cancelRepair,
    handleRequestRepair,
    activateOtpModalOpen,
    activateOtpLoading,
    handleOpenActivateWithOtp,
    handleCloseActivateWithOtp,
    handleActivateWithOtp,
    addDeviceModalOpen,
    addDeviceLoading,
    handleOpenAddDevice,
    handleCloseAddDevice,
    handleAddAdminDevice,
    deviceToDelete,
    setDeviceToDelete,
    deleteDeviceLoading,
    handleDeleteAdminDevice,
    uniqueClients,
    isAdmin,
    adminDevices,
    selectedStatus,
    setSelectedStatus,
    statusFilterOptions,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    setSelectedDevices,
    showBulkDeactivateAlert,
    setShowBulkDeactivateAlert,
    bulkDeactivateTargets,
    bulkProcessing,
    handleBulkDeactivateClick,
    confirmBulkDeactivate,
    handleBulkExportCSV,
    sorting,
    setSorting,
  } = useDevicesPage();

  const totalInventoryCount = useMemo(() => {
    if (isAdmin) {
      return (adminDevices && adminDevices.length) || filteredEquipment.length;
    }
    if (!activeSub) return 0;
    return activeSub.equipment_count || (subscriptionEquipment[activeSub.id] || []).length;
  }, [isAdmin, adminDevices, filteredEquipment.length, activeSub, subscriptionEquipment]);

  const firstAvailableSlot = useMemo(() => {
    const unactive = filteredEquipment.find(
      (e) => (e.status === "PENDING_ACTIVATION" || !e.status || e.status !== "ACTIVE") && e.subscription_id && e.slot_index !== undefined,
    );
    if (unactive && unactive.subscription_id && unactive.slot_index !== undefined) {
      return { subscription_id: unactive.subscription_id, slot_index: unactive.slot_index };
    }

    const subId = selectedSubscriptionId || activeSub?.id;
    if (subId) {
      const existing = subscriptionEquipment[subId] || [];
      return { subscription_id: subId, slot_index: existing.length };
    }
    return null;
  }, [filteredEquipment, selectedSubscriptionId, activeSub, subscriptionEquipment]);

  const [maintModalEquip, setMaintModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [ncModalEquip, setNcModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isNcModalOpen, setIsNcModalOpen] = useState(false);

  const bulkActions = useMemo(
    () => [
      {
        label: t("devices.bulkDeactivate") || "Deactivate Devices",
        onClick: handleBulkDeactivateClick,
        variant: "destructive" as const,
      },
      {
        label: t("devices.bulkExport") || "Export CSV",
        onClick: handleBulkExportCSV,
        variant: "outline" as const,
      },
    ],
    [t, handleBulkDeactivateClick, handleBulkExportCSV],
  );

  const handleOpenScheduleMaint = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setMaintModalEquip(equip);
    setIsMaintModalOpen(true);
  }, []);

  const handleOpenNcModal = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setNcModalEquip(equip);
    setIsNcModalOpen(true);
  }, []);

  const handleCloseMaintModal = useCallback(() => {
    setIsMaintModalOpen(false);
    setMaintModalEquip(null);
  }, []);

  const handleMaintSuccess = useCallback(() => {
    handleCloseMaintModal();
  }, [handleCloseMaintModal]);

  const handleCloseNcModal = useCallback(() => {
    setIsNcModalOpen(false);
    setNcModalEquip(null);
  }, []);

  const handleDeployClient = useCallback(
    async (equip: Partial<SubscriptionEquipment>) => {
      if (!equip.subscription_id || equip.slot_index === undefined) return;
      try {
        const url = await equipmentService.getDeployScriptUrl(equip.subscription_id, equip.slot_index);
        navigator.clipboard.writeText(`powershell -Command "irm ${url} | iex"`);
        toast.success(t("devices.deployCommandCopied"));
      } catch {
        toast.error(t("devices.deployCommandFailed") || "Failed to generate deploy command");
      }
    },
    [t],
  );

  const handleBrowsePlans = useCallback(() => {
    navigate("/plans");
  }, [navigate]);

  const equipmentColumns = useMemo<ColumnDef<Partial<SubscriptionEquipment>>[]>(() => {
    const cols: ColumnDef<Partial<SubscriptionEquipment>>[] = [];

    // Add Client/Tenant column if Admin
    if (isAdmin) {
      cols.push({
        id: "clientInfo",
        accessorFn: (row) => row.client_name || row.tenant_name || "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableClientTenant")} />,
        cell: ({ row }) => {
          const equip = row.original;
          return (
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {equip.client_name || t("devices.unknownClient")}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono">{equip.tenant_name || t("devices.unknownTenant")}</p>
              {equip.client_email && (
                <p className="text-[9px] text-muted-foreground truncate max-w-35" title={equip.client_email}>
                  {equip.client_email}
                </p>
              )}
            </div>
          );
        },
      });
    }

    // Add Slot number
    cols.push({
      id: "slotNumber",
      accessorFn: (row) => (row.slot_index !== undefined ? row.slot_index + 1 : 0),
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableSlot")} />,
      cell: ({ row }) => {
        const equip = row.original;
        return (
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {t("devices.slotNumber", {
                num: equip.slot_index !== undefined ? equip.slot_index + 1 : row.index + 1,
              })}
            </span>
            {equip.id && (
              <p className="text-[9px] text-zinc-400 font-mono truncate max-w-25" title={equip.id}>
                {t("devices.idLabel")} {equip.id}
              </p>
            )}
          </div>
        );
      },
    });

    // Add Plan column if Admin
    if (isAdmin) {
      cols.push({
        id: "planInfo",
        accessorFn: (row) => row.plan || "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tablePlanService")} />,
        cell: ({ row }) => {
          const equip = row.original;
          return (
            <div className="space-y-0.5">
              <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-1 rounded text-[9px] font-mono font-bold uppercase">
                {equip.plan || t("devices.notAvailable")}
              </span>
            </div>
          );
        },
      });
    }

    // Add Status
    cols.push({
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableStatus")} />,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return status === "ACTIVE" ? (
          <span className="bg-emerald-55 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-mono uppercase">
            ACTIVE
          </span>
        ) : (
          <span className="bg-amber-55 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-mono uppercase">
            {t("devices.statusPendingActivation")}
          </span>
        );
      },
    });

    // Add Device Details
    cols.push({
      id: "deviceDetails",
      accessorFn: (row) => row.device_name || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableDeviceDetails")} />,
      cell: ({ row }) => {
        const equip = row.original;
        if (equip.status === "ACTIVE") {
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {equip.device_name || t("devices.unnamedDevice")}
                </p>
                {equip.agent_last_seen_at && (
                  <span
                    title={t("devices.agentVerifiedTooltip")}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide"
                  >
                    <BadgeCheck className="w-3 h-3" />
                    {t("devices.agentVerified")}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">{equip.device_serial || t("devices.noSerial")}</p>
            </div>
          );
        }
        return <p className="text-xs text-zinc-455 italic">{t("devices.pendingUnboundSlot")}</p>;
      },
    });

    // Add Cloud Backup Account
    cols.push({
      id: "backupAccount",
      accessorFn: (row) => (row.status === "ACTIVE" && row.nextcloud_username ? 1 : 0),
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableCloudBackup")} />,
      cell: ({ row }) => {
        const equip = row.original;
        if (equip.status === "ACTIVE" && equip.nextcloud_username) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 px-2 py-0.5 rounded text-[10px] font-medium">
                <Cloud className="h-3 w-3" />
                {t("devices.configured")}
              </span>
            </div>
          );
        }
        return <span className="text-xs text-zinc-400">—</span>;
      },
    });

    // Add Actions
    cols.push({
      id: "actions",
      enableSorting: false,
      header: () => (
        <div className="text-right">
          <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
            {t("devices.tableActions")}
          </span>
        </div>
      ),
      cell: ({ row }) => {
        const equip = row.original;

        return (
          <DeviceActionsCell
            equip={equip}
            onOpenNcModal={handleOpenNcModal}
            onOpenScheduleMaint={handleOpenScheduleMaint}
            onRequestRevoke={equip.client_role === "ADMIN" ? setDeviceToDelete : handleRequestRevoke}
            onRequestRepair={handleRequestRepair}
            onOpenActivateWithOtp={handleOpenActivateWithOtp}
            onDeployClient={handleDeployClient}
          />
        );
      },
    });
    return cols;
  }, [
    t,
    handleDeployClient,
    handleOpenScheduleMaint,
    handleOpenNcModal,
    handleRequestRevoke,
    handleRequestRepair,
    handleOpenActivateWithOtp,
    isAdmin,
    setDeviceToDelete,
  ]);

  const searchConfig = useMemo(
    () => ({
      value: searchTerm,
      onChange: setSearchTerm,
      placeholder: isAdmin ? t("devices.adminSearchPlaceholder") : t("devices.searchPlaceholder"),
    }),
    [searchTerm, setSearchTerm, isAdmin, t],
  );

  const filtersConfig = useMemo(() => {
    return [
      {
        id: "status",
        value: selectedStatus,
        onChange: setSelectedStatus,
        options: statusFilterOptions,
        placeholder: t("devices.filterAllStatuses"),
      },
    ];
  }, [selectedStatus, setSelectedStatus, statusFilterOptions, t]);

  const paginationConfig = useMemo(
    () => ({
      page,
      totalPages,
      totalItems: filteredEquipment.length,
      limit,
      onPageChange: setPage,
      onLimitChange: setLimit,
      showingText: t("devices.paginationShowing", {
        start: filteredEquipment.length === 0 ? 0 : (page - 1) * limit + 1,
        end: Math.min(page * limit, filteredEquipment.length),
        total: filteredEquipment.length,
      }),
    }),
    [page, totalPages, filteredEquipment.length, limit, setPage, setLimit, t],
  );

  return (
    <Page
      title={t("nav.devices")}
      subtitle={t("devices.subtitle")}
      isLoading={loading}
      actions={
        isAdmin ? (
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAddDevice}
            className="h-7 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("devices.addDevice", "Add Device")}</span>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Navigation Section Switcher: Device Inventory vs RMM Monitoring & Patches */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "devices" | "rmm")} className="w-full">
            <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
              <TabsTrigger
                value="devices"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>{t("rmm.tabInventory")}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] font-mono px-1.5 py-0 min-w-5 inline-flex justify-center"
                >
                  {loading ? <Skeleton className="h-3 w-4" /> : totalInventoryCount}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="rmm"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                <Activity className="h-3.5 w-3.5 text-blue-500" />
                <span>{t("rmm.tabRmm")}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* SECTION 1: DEVICE INVENTORY */}
        {activeTab === "devices" && (
          <div className="space-y-4">
            {activeSubscriptions.length === 0 && !loading && !isAdmin ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptySubscriptionsCard onBrowsePlans={handleBrowsePlans} />
              </div>
            ) : (
              <div className="space-y-4 text-foreground animate-fade-in">
                {activeSubscriptions.length > 1 && !isAdmin && (
                  <SubscriptionSelector
                    subscriptions={activeSubscriptions}
                    selectedId={selectedSubscriptionId}
                    onChange={setSelectedSubscriptionId}
                  />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  <div className="lg:col-span-3 space-y-4">
                    {/* Toolbar: Actions */}
                    <div className="flex items-center justify-end gap-2">
                      {firstAvailableSlot && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            handleOpenActivateWithOtp(
                              firstAvailableSlot.subscription_id,
                              firstAvailableSlot.slot_index,
                            )
                          }
                          className="h-7 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Laptop className="h-3.5 w-3.5" />
                          <span>{t("devices.activateDevice", "Activate Device")}</span>
                        </Button>
                      )}
                    </div>

                    {/* Device List Data Table */}
                    <DataTable
                      columns={equipmentColumns}
                      data={paginatedEquipment}
                      noDataMessage={t("devices.noSlotsFound")}
                      loading={loading}
                      className="border-none rounded-none"
                      search={searchConfig}
                      filters={filtersConfig}
                      pagination={paginationConfig}
                      enableRowSelection={true}
                      onSelectedRowsChange={setSelectedDevices}
                      bulkActions={bulkActions}
                      sorting={sorting}
                      onSortingChange={setSorting}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: RMM MONITORING & PATCHES */}
        {activeTab === "rmm" && (
          <div className="space-y-6 min-w-0 w-full max-w-full">
            <ChunkErrorBoundary>
              <Suspense
                fallback={
                  <div className="p-8 flex items-center justify-center min-h-75">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
              >
                <RmmDashboard />
              </Suspense>
            </ChunkErrorBoundary>
          </div>
        )}
      </div>

      {/* Schedule Maintenance Modal */}
      {isMaintModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <ScheduleMaintenanceModal
              equipment={maintModalEquip}
              isOpen={isMaintModalOpen}
              onClose={handleCloseMaintModal}
              onSuccess={handleMaintSuccess}
              isAdminOrTech={isAdmin}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Standalone Activate with Code Modal */}
      {activateOtpModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <ActivateWithOtpModal
              isOpen={activateOtpModalOpen}
              loading={activateOtpLoading}
              onClose={handleCloseActivateWithOtp}
              onActivate={handleActivateWithOtp}
              subscriptionId={activateTargetSubId}
              slotIndex={activateTargetSlotIdx}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Admin Add Device Modal */}
      {isAdmin && addDeviceModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <AddAdminDeviceModal
              isOpen={addDeviceModalOpen}
              loading={addDeviceLoading}
              onClose={handleCloseAddDevice}
              onSubmit={handleAddAdminDevice}
              tenantOptions={uniqueClients}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Nextcloud Info Modal */}
      {isNcModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <NextcloudInfoModal
              isOpen={isNcModalOpen}
              onClose={handleCloseNcModal}
              subId={ncModalEquip?.subscription_id || activeSub?.id || selectedSubscriptionId || null}
              slotIndex={ncModalEquip?.slot_index ?? null}
              fallbackUsername={ncModalEquip?.nextcloud_username}
              fallbackDeviceName={ncModalEquip?.device_name}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Bulk Deactivation Confirmation Modal */}
      <AlertDialog open={showBulkDeactivateAlert} onOpenChange={setShowBulkDeactivateAlert}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.bulkDeactivateConfirmTitle") || "Deactivate Selected Devices"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              {t("devices.bulkDeactivateConfirmDesc", { count: bulkDeactivateTargets.length }) ||
                `Are you sure you want to deactivate ${bulkDeactivateTargets.length} active device(s)? This action will revoke cloud backup accounts.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={confirmBulkDeactivate}
            >
              {t("devices.bulkDeactivate") || "Deactivate Devices"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Deactivation Confirmation Modal */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open && !revokeLoading) cancelRevoke();
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.revokeConfirmTitle") || "Deactivate Device"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              {t("devices.revokeConfirmDesc", {
                name: revokeTarget?.device_name || revokeTarget?.nextcloud_username || t("devices.unnamedDevice"),
              }) || "This will revoke the cloud backup account and disconnect the device."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={revokeLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={revokeLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={confirmRevoke}
            >
              {revokeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t("devices.revokeConfirmAction") || "Yes, Deactivate"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-pair Confirmation Modal (non-destructive unbind for replacement agent) */}
      <AlertDialog
        open={!!repairTarget}
        onOpenChange={(open) => {
          if (!open && !repairLoading) cancelRepair();
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.repairConfirmTitle") || "Re-pair Device"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              {t("devices.repairConfirmDesc", {
                name: repairTarget?.device_name || repairTarget?.nextcloud_username || t("devices.unnamedDevice"),
              }) ||
                "This will unbind the current agent so a replacement device can be linked. Cloud backup data is preserved but the access password will be reset."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={repairLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={repairLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-blue-600 hover:bg-blue-700 text-white border-0"
              onClick={confirmRepair}
            >
              {repairLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t("devices.repairConfirmAction") || "Yes, Re-pair"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Admin Device Confirmation Modal */}
      <AlertDialog
        open={!!deviceToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteDeviceLoading) setDeviceToDelete(null);
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.deleteDeviceConfirmTitle", "Delete Managed Device")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 mt-2">
              {t(
                "devices.deleteDeviceConfirmDesc",
                "Are you sure you want to permanently delete this device? Associated cloud backup storage and telemetry monitoring will be removed.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-row justify-end gap-2">
            <AlertDialogCancel
              type="button"
              onClick={() => setDeviceToDelete(null)}
              disabled={deleteDeviceLoading}
              className="h-8 px-3 text-xs"
            >
              {t("devices.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => deviceToDelete?.id && handleDeleteAdminDevice(deviceToDelete.id)}
              disabled={deleteDeviceLoading}
              className="h-8 px-3 text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {deleteDeviceLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t("devices.actionDelete", "Delete Device")}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
export default DevicesPage;
