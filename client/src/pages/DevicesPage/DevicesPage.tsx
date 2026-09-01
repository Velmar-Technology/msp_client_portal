import { memo, useCallback, useState, useMemo } from "react";
import {
  Laptop,
  Loader2,
  MoreHorizontal,
  Cloud,
  Activity,
  ChevronRight,
  Calendar,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Terminal,
  ToolCase,
  Plus,
  Search,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDevicesPage } from "@/hooks/useDevicesPage";
import type { Subscription } from "@/services/subscriptionService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { equipmentService } from "@/services/equipmentService";
import { Page } from "@/components/Page";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewToggle } from "@/components/ui/view-toggle";
import { cn } from "@/lib/utils";

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
const DeployAgentModal = lazyWithRetry(() =>
  import("@/components/devices/DeployAgentModal").then((m) => ({
    default: m.DeployAgentModal,
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
    <Card className="p-8 shadow-xs border-border flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
      <span className="p-3 bg-muted text-muted-foreground rounded-full border border-border inline-flex">
        <Laptop className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground font-heading">{t("devices.noActiveSubscriptions")}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("devices.noActiveSubscriptionsDesc")}</p>
      </div>
      <Button
        type="button"
        size="default"
        onClick={onBrowsePlans}
        className="h-8 px-4 text-xs font-semibold cursor-pointer"
      >
        {t("devices.browseSupportPlans")}
      </Button>
    </Card>
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
    <div className="flex items-center gap-2">
      <label
        htmlFor="active-sub-select-devices"
        className="text-[10px] uppercase font-bold text-muted-foreground select-none shrink-0"
      >
        {t("nav.subscriptions", "Subscription")}
      </label>
      <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
        <Select value={selectedId} onValueChange={onChange}>
          <SelectTrigger
            id="active-sub-select-devices"
            aria-label={t("devices.selectSubscription")}
            size="default"
            className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5 w-48 sm:w-56"
          >
            <SelectValue placeholder={t("devices.selectSubscription")} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
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
  onDeployAgent?: (equip: Partial<SubscriptionEquipment>) => void;
}

const DeviceActionsCell = memo(function DeviceActionsCell({
  equip,
  onOpenNcModal,
  onOpenScheduleMaint,
  onRequestRevoke,
  onRequestRepair,
  onOpenActivateWithOtp,
  onDeployClient,
  onDeployAgent,
}: DeviceActionsCellProps) {
  const { t } = useTranslation();

  const isActive = equip.status === "ACTIVE";

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {isActive ? (
        <Button
          type="button"
          variant="outline"
          title={t("maintenance.scheduleBtn")}
          size="sm"
          onClick={() => onOpenScheduleMaint(equip)}
          className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
        >
          <ToolCase className="h-3 w-3" />
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
        <DropdownMenuContent align="end" className="w-52 bg-card text-foreground border border-border">
          <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t("devices.actionsLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />

          {/* Quick Deploy Agent Action Available on all valid slots */}
          {equip.subscription_id && equip.slot_index !== undefined && onDeployAgent && (
            <DropdownMenuItem onClick={() => onDeployAgent(equip)} className="text-xs cursor-pointer text-foreground">
              <Terminal className="h-3.5 w-3.5 mr-1" />
              {t("devices.deployMspAgent", "Deploy MSP Agent")}
            </DropdownMenuItem>
          )}

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

// 4. High-End Tiled Card Component (Matching ResourcesPage design pattern)
interface DeviceCardProps {
  equip: Partial<SubscriptionEquipment>;
  onOpenNcModal: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenScheduleMaint: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRevoke: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRepair: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenActivateWithOtp: (subId: string, slotIndex: number) => void;
  onDeployClient?: (equip: Partial<SubscriptionEquipment>) => void;
  onDeployAgent?: (equip: Partial<SubscriptionEquipment>) => void;
}

function DeviceCard({
  equip,
  onOpenNcModal,
  onOpenScheduleMaint,
  onRequestRevoke,
  onRequestRepair,
  onOpenActivateWithOtp,
  onDeployClient,
  onDeployAgent,
}: DeviceCardProps) {
  const { t } = useTranslation();
  const isActive = equip.status === "ACTIVE";
  const slotNum = equip.slot_index !== undefined ? equip.slot_index + 1 : 1;

  return (
    <Card className="p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 bg-muted text-muted-foreground rounded-md border border-border shrink-0">
            <Laptop className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground truncate font-heading">
                {isActive ? equip.device_name || t("devices.unnamedDevice") : t("devices.pendingUnboundSlot")}
              </h3>
              {isActive && equip.agent_last_seen_at && (
                <span
                  title={t("devices.agentVerifiedTooltip")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {t("devices.slotNumber", { num: slotNum })}
              </p>
              {equip.plan && (
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border uppercase font-mono">
                  {equip.plan}
                </span>
              )}
              {equip.tenant_name && (
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border truncate max-w-28">
                  {equip.tenant_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border",
            isActive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          )}
        >
          {isActive ? "ACTIVE" : t("devices.statusPendingActivation")}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1.5 flex-1">
        {isActive ? (
          <>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">{t("devices.tableDeviceDetails")}:</span>
              <span className="font-mono text-foreground font-semibold">
                {equip.device_serial || t("devices.noSerial")}
              </span>
            </div>
            {equip.nextcloud_username && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">{t("devices.tableCloudBackup")}:</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Cloud className="h-3 w-3" />
                  {t("devices.configured")}
                </span>
              </div>
            )}
            {equip.client_name && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">{t("devices.tableClientTenant")}:</span>
                <span className="text-foreground truncate max-w-35 font-medium">{equip.client_name}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic leading-relaxed">{t("devices.pendingUnboundSlot")}</p>
        )}
      </div>

      <CardFooter className="p-0 border-none flex items-center justify-between gap-2 pt-2 border-t border-border text-[10px] text-muted-foreground mt-auto">
        <span className="font-mono truncate max-w-28 text-muted-foreground">
          {equip.id ? `${t("devices.idLabel")} ${equip.id.slice(0, 8)}...` : ""}
        </span>
        <DeviceActionsCell
          equip={equip}
          onOpenNcModal={onOpenNcModal}
          onOpenScheduleMaint={onOpenScheduleMaint}
          onRequestRevoke={onRequestRevoke}
          onRequestRepair={onRequestRepair}
          onOpenActivateWithOtp={onOpenActivateWithOtp}
          onDeployClient={onDeployClient}
          onDeployAgent={onDeployAgent}
        />
      </CardFooter>
    </Card>
  );
}

// 5. Parent Dashboard Page
export function DevicesPage() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"list" | "tiled">("list");
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
    selectedClient,
    setSelectedClient,
    selectedPlan,
    setSelectedPlan,
    clientFilterOptions,
    planFilterOptions,
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
      (e) =>
        (e.status === "PENDING_ACTIVATION" || !e.status || e.status !== "ACTIVE") &&
        e.subscription_id &&
        e.slot_index !== undefined,
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
  const [deployAgentEquip, setDeployAgentEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isDeployAgentOpen, setIsDeployAgentOpen] = useState(false);

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

  const handleOpenDeployAgent = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setDeployAgentEquip(equip);
    setIsDeployAgentOpen(true);
  }, []);

  const handleCloseDeployAgent = useCallback(() => {
    setIsDeployAgentOpen(false);
    setDeployAgentEquip(null);
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
              <p className="text-xs font-bold text-foreground font-heading">
                {equip.client_name || t("devices.unknownClient")}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {equip.tenant_name || t("devices.unknownTenant")}
              </p>
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
            <span className="text-xs font-bold text-foreground">
              {t("devices.slotNumber", {
                num: equip.slot_index !== undefined ? equip.slot_index + 1 : row.index + 1,
              })}
            </span>
            {equip.id && (
              <p className="text-[9px] text-muted-foreground font-mono truncate max-w-25" title={equip.id}>
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
              <span className="inline-block bg-muted text-foreground border border-border px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
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
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold">
            ACTIVE
          </span>
        ) : (
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold">
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
                <p className="text-xs font-medium text-foreground font-heading">
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
              <p className="text-[10px] text-muted-foreground font-mono">
                {equip.device_serial || t("devices.noSerial")}
              </p>
            </div>
          );
        }
        return <p className="text-xs text-muted-foreground italic">{t("devices.pendingUnboundSlot")}</p>;
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
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                <Cloud className="h-3 w-3" />
                {t("devices.configured")}
              </span>
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    });

    // Add Actions
    cols.push({
      id: "actions",
      enableSorting: false,
      header: () => (
        <div className="text-right">
          <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">
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
            onDeployAgent={handleOpenDeployAgent}
          />
        );
      },
    });
    return cols;
  }, [
    t,
    handleDeployClient,
    handleOpenDeployAgent,
    handleOpenScheduleMaint,
    handleOpenNcModal,
    handleRequestRevoke,
    handleRequestRepair,
    handleOpenActivateWithOtp,
    isAdmin,
    setDeviceToDelete,
  ]);

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

  // Main Page Body with Skeletons matching ResourcesPage design pattern
  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Skeleton className="w-full sm:w-72 h-8" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-28 h-8" />
              <Skeleton className="w-24 h-8" />
            </div>
          </div>
          {viewMode === "tiled" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-44 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-14 rounded-lg" />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Navigation Section Switcher: Device Inventory vs RMM Monitoring & Patches */}
        <div className="border-b border-border pb-2">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "devices" | "rmm")} className="w-full">
            <TabsList className="bg-muted p-0.5 rounded-md border border-border">
              <TabsTrigger
                value="devices"
                className="gap-2 text-xs font-semibold px-3 py-1 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>{t("rmm.tabInventory")}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] font-mono px-1.5 py-0 min-w-5 inline-flex justify-center"
                >
                  {totalInventoryCount}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="rmm"
                className="gap-2 text-xs font-semibold px-3 py-1 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
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
            {activeSubscriptions.length === 0 && !isAdmin ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptySubscriptionsCard onBrowsePlans={handleBrowsePlans} />
              </div>
            ) : (
              <div className="space-y-4 text-foreground animate-fade-in">
                {/* Unified Toolbar (ResourcesPage pattern) */}
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
                  <InputGroup className="w-full sm:w-72 h-8">
                    <InputGroupInput
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={isAdmin ? t("devices.adminSearchPlaceholder") : t("devices.searchPlaceholder")}
                    />
                    <InputGroupAddon>
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </InputGroupAddon>
                  </InputGroup>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Subscription Selector for Multi-Subscription Clients */}
                      {activeSubscriptions.length > 1 && !isAdmin && (
                        <SubscriptionSelector
                          subscriptions={activeSubscriptions}
                          selectedId={selectedSubscriptionId}
                          onChange={setSelectedSubscriptionId}
                        />
                      )}

                      {/* Client Filter for Admins */}
                      {isAdmin && uniqueClients.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="devices-client-filter"
                            className="text-[10px] uppercase font-bold text-muted-foreground select-none"
                          >
                            {t("devices.tableClientTenant")}
                          </label>
                          <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                            <Select value={selectedClient || "all"} onValueChange={setSelectedClient}>
                              <SelectTrigger
                                id="devices-client-filter"
                                aria-label={t("devices.filterAllClients")}
                                size="default"
                                className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                              >
                                <SelectValue placeholder={t("devices.filterAllClients")} />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                                  {t("devices.filterAllClients")}
                                </SelectItem>
                                {clientFilterOptions.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    className="text-xs font-medium cursor-pointer"
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Plan Filter for Admins */}
                      {isAdmin && planFilterOptions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="devices-plan-filter"
                            className="text-[10px] uppercase font-bold text-muted-foreground select-none"
                          >
                            {t("devices.tablePlanService")}
                          </label>
                          <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                            <Select value={selectedPlan || "all"} onValueChange={setSelectedPlan}>
                              <SelectTrigger
                                id="devices-plan-filter"
                                aria-label={t("devices.filterAllPlans")}
                                size="default"
                                className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                              >
                                <SelectValue placeholder={t("devices.filterAllPlans")} />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                                  {t("devices.filterAllPlans")}
                                </SelectItem>
                                {planFilterOptions.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    className="text-xs font-medium cursor-pointer"
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Status Filter */}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="devices-status-filter"
                          className="text-[10px] uppercase font-bold text-muted-foreground select-none"
                        >
                          {t("devices.tableStatus")}
                        </label>
                        <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                          <Select value={selectedStatus || "all"} onValueChange={setSelectedStatus}>
                            <SelectTrigger
                              id="devices-status-filter"
                              aria-label={t("devices.tableStatus")}
                              size="default"
                              className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                            >
                              <SelectValue placeholder={t("devices.filterAllStatuses")} />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                                {t("devices.filterAllStatuses")}
                              </SelectItem>
                              {statusFilterOptions.map((opt) => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  className="text-xs font-medium cursor-pointer"
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* View Mode Toggle & Primary Actions */}
                    <div className="flex items-center gap-2">
                      

                      {isAdmin ? (
                        <Button
                          type="button"
                          size="default"
                          onClick={handleOpenAddDevice}
                          className="h-8 px-3 text-xs font-semibold gap-1 cursor-pointer shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t("devices.addDevice", "Add Device")}</span>
                        </Button>
                      ) : (firstAvailableSlot && (
                        <Button
                          type="button"
                          size="default"
                          variant="outline"
                          onClick={() =>
                            handleOpenActivateWithOtp(firstAvailableSlot.subscription_id, firstAvailableSlot.slot_index)
                          }
                          className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Laptop className="h-3.5 w-3.5" />
                          <span>{t("devices.activateDevice", "Activate Device")}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Device Content: Empty / Grid Cards / DataTable List */}
                {filteredEquipment.length === 0 ? (
                  <Card className="p-8 text-center space-y-2">
                    <Laptop className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-sm font-semibold text-foreground">{t("devices.noSlotsFound")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("devices.noSlotsFoundDesc", "No devices or slots match your search criteria.")}
                    </p>
                  </Card>
                ) : viewMode === "tiled" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedEquipment.map((equip, idx) => (
                        <DeviceCard
                          key={equip.id || `slot-card-${equip.subscription_id}-${equip.slot_index ?? idx}`}
                          equip={equip}
                          onOpenNcModal={handleOpenNcModal}
                          onOpenScheduleMaint={handleOpenScheduleMaint}
                          onRequestRevoke={equip.client_role === "ADMIN" ? setDeviceToDelete : handleRequestRevoke}
                          onRequestRepair={handleRequestRepair}
                          onOpenActivateWithOtp={handleOpenActivateWithOtp}
                          onDeployClient={handleDeployClient}
                          onDeployAgent={handleOpenDeployAgent}
                        />
                      ))}
                    </div>

                    {/* Pagination Bar for Tiled Grid Mode */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                        <span>
                          {t("devices.paginationShowing", {
                            start: filteredEquipment.length === 0 ? 0 : (page - 1) * limit + 1,
                            end: Math.min(page * limit, filteredEquipment.length),
                            total: filteredEquipment.length,
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="h-8 px-3 text-xs font-semibold cursor-pointer"
                          >
                            {t("devices.paginationPrev", "Previous")}
                          </Button>
                          <span className="text-xs font-medium">
                            {page} / {totalPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="h-8 px-3 text-xs font-semibold cursor-pointer"
                          >
                            {t("devices.paginationNext", "Next")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <div className="lg:col-span-3 space-y-4">
                      {/* Device List Data Table */}
                      <DataTable
                        columns={equipmentColumns}
                        data={paginatedEquipment}
                        noDataMessage={t("devices.noSlotsFound")}
                        loading={loading}
                        className="border-none rounded-none"
                        pagination={paginationConfig}
                        enableRowSelection={true}
                        onSelectedRowsChange={setSelectedDevices}
                        bulkActions={bulkActions}
                        sorting={sorting}
                        onSortingChange={setSorting}
                      />
                    </div>
                  </div>
                )}
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
    );
  }, [
    loading,
    viewMode,
    activeTab,
    setActiveTab,
    totalInventoryCount,
    activeSubscriptions,
    isAdmin,
    handleBrowsePlans,
    searchTerm,
    setSearchTerm,
    selectedSubscriptionId,
    setSelectedSubscriptionId,
    uniqueClients,
    selectedClient,
    setSelectedClient,
    clientFilterOptions,
    planFilterOptions,
    selectedPlan,
    setSelectedPlan,
    selectedStatus,
    setSelectedStatus,
    statusFilterOptions,
    firstAvailableSlot,
    handleOpenActivateWithOtp,
    handleOpenAddDevice,
    filteredEquipment,
    paginatedEquipment,
    handleOpenNcModal,
    handleOpenScheduleMaint,
    setDeviceToDelete,
    handleRequestRevoke,
    handleRequestRepair,
    handleDeployClient,
    handleOpenDeployAgent,
    totalPages,
    page,
    limit,
    setPage,
    setLimit,
    equipmentColumns,
    paginationConfig,
    setSelectedDevices,
    bulkActions,
    sorting,
    setSorting,
    t,
  ]);

  return (
    <Page
      title={t("nav.devices")}
      subtitle={t("devices.subtitle")}
      isLoading={false}
      actions={<ViewToggle value={viewMode} onChange={setViewMode} />}
    >
      {body}

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

      {/* Deploy MSP Agent Modal */}
      {isDeployAgentOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <DeployAgentModal isOpen={isDeployAgentOpen} onClose={handleCloseDeployAgent} equip={deployAgentEquip} />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Bulk Deactivation Confirmation Modal */}
      <AlertDialog open={showBulkDeactivateAlert} onOpenChange={setShowBulkDeactivateAlert}>
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.bulkDeactivateConfirmTitle") || "Deactivate Selected Devices"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("devices.bulkDeactivateConfirmDesc", { count: bulkDeactivateTargets.length }) ||
                `Are you sure you want to deactivate ${bulkDeactivateTargets.length} active device(s)? This action will revoke cloud backup accounts.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
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
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.revokeConfirmTitle") || "Deactivate Device"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("devices.revokeConfirmDesc", {
                name: revokeTarget?.device_name || revokeTarget?.nextcloud_username || t("devices.unnamedDevice"),
              }) || "This will revoke the cloud backup account and disconnect the device."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={revokeLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={revokeLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
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
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.repairConfirmTitle") || "Re-pair Device"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("devices.repairConfirmDesc", {
                name: repairTarget?.device_name || repairTarget?.nextcloud_username || t("devices.unnamedDevice"),
              }) ||
                "This will unbind the current agent so a replacement device can be linked. Cloud backup data is preserved but the access password will be reset."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={repairLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border-border hover:bg-muted"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={repairLoading}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground border-0"
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
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.deleteDeviceConfirmTitle", "Delete Managed Device")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground mt-2">
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
              className="h-8 px-3 text-xs border-border hover:bg-muted"
            >
              {t("devices.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => deviceToDelete?.id && handleDeleteAdminDevice(deviceToDelete.id)}
              disabled={deleteDeviceLoading}
              className="h-8 px-3 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1.5"
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
