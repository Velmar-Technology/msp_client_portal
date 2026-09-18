import { useState, useMemo, useCallback, Suspense } from "react";
import { Laptop, Loader2, Activity, List, LayoutGrid, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { SubscriptionEquipment } from "@shared/contracts";
import { useDevicesPage } from "../hooks/useDevicesPage";
import { useEntitlements } from "@/hooks/useEntitlements";
import { equipmentService } from "../api/equipmentService";
import { Page } from "@/components/Page";
import { useUrlState } from "@/hooks/useUrlState";
import type { PageViewOption, PageGraphDataPoint } from "@/components/page/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";

// Sub-components
import { EmptySubscriptionsCard } from "../components/EmptySubscriptionsCard";
import { DeviceCard } from "../components/DeviceCard";
import { DeviceToolbar } from "../components/DeviceToolbar";
import { useDeviceTableColumns } from "../components/useDeviceTableColumns";
import { DeviceConfirmationDialogs } from "../components/DeviceConfirmationDialogs";
import { DeviceModals } from "../components/DeviceModals";

// Re-exports for backwards compatibility
export { CopyableBadge, CopyableDeviceId, CopyableSerial } from "../components/CopyableBadge";
export { EmptySubscriptionsCard } from "../components/EmptySubscriptionsCard";
export { SubscriptionSelector } from "../components/SubscriptionSelector";

export type DeviceViewMode = "list" | "tiled" | "rmm" | "graph";

const RmmDashboard = lazyWithRetry(() =>
  import("@/components/devices/RmmDashboard").then((m) => ({
    default: m.RmmDashboard,
  })),
);

/**
 * Devices & Equipment Management Page.
 * Orchestrates device inventory, activation slots, telemetry monitoring, and endpoint operations.
 */
export function DevicesPage() {
  const { t } = useTranslation();
  const { hasPlanFeature } = useEntitlements();
  const { getParam, setParams } = useUrlState();
  const rawView = getParam("view");
  const rawTab = getParam("tab");

  // Support canonical ?view= with backwards compatibility for legacy ?tab=rmm
  const currentView: DeviceViewMode = useMemo(() => {
    if (rawView === "list" || rawView === "tiled" || rawView === "rmm" || rawView === "graph") {
      return rawView;
    }
    if (rawTab === "rmm") {
      return "rmm";
    }
    return "list";
  }, [rawView, rawTab]);

  const handleViewChange = useCallback(
    (view: string) => {
      const mode =
        view === "list" || view === "tiled" || view === "rmm" || view === "graph" ? (view as DeviceViewMode) : "list";

      setParams({
        view: mode === "list" ? null : mode,
        tab: mode === "rmm" ? "rmm" : null,
      });
    },
    [setParams],
  );

  const {
    navigate,
    loading,
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

  // Local state for modal triggers
  const [maintModalEquip, setMaintModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [ncModalEquip, setNcModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isNcModalOpen, setIsNcModalOpen] = useState(false);
  const [vaultModalEquip, setVaultModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [deployAgentEquip, setDeployAgentEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isDeployAgentOpen, setIsDeployAgentOpen] = useState(false);

  // Modal handlers
  const handleOpenScheduleMaint = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setMaintModalEquip(equip);
    setIsMaintModalOpen(true);
  }, []);

  const handleCloseMaintModal = useCallback(() => {
    setIsMaintModalOpen(false);
    setMaintModalEquip(null);
  }, []);

  const handleMaintSuccess = useCallback(() => {
    handleCloseMaintModal();
  }, [handleCloseMaintModal]);

  const handleOpenNcModal = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setNcModalEquip(equip);
    setIsNcModalOpen(true);
  }, []);

  const handleCloseNcModal = useCallback(() => {
    setIsNcModalOpen(false);
    setNcModalEquip(null);
  }, []);

  const handleOpenVaultModal = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setVaultModalEquip(equip);
    setIsVaultModalOpen(true);
  }, []);

  const handleCloseVaultModal = useCallback(() => {
    setIsVaultModalOpen(false);
    setVaultModalEquip(null);
  }, []);

  const handleOpenDeployAgent = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setDeployAgentEquip(equip);
    setIsDeployAgentOpen(true);
  }, []);

  const handleCloseDeployAgent = useCallback(() => {
    setIsDeployAgentOpen(false);
    setDeployAgentEquip(null);
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

  // Column definitions via extracted hook
  const equipmentColumns = useDeviceTableColumns({
    isAdmin,
    onOpenNcModal: handleOpenNcModal,
    onOpenVaultModal: handleOpenVaultModal,
    onOpenScheduleMaint: handleOpenScheduleMaint,
    onRequestRevoke: handleRequestRevoke,
    onRequestRepair: handleRequestRepair,
    onOpenActivateWithOtp: handleOpenActivateWithOtp,
    onDeployClient: handleDeployClient,
    onDeployAgent: handleOpenDeployAgent,
    setDeviceToDelete,
  });

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

  // Status breakdown data for fleet analytics graph
  const statusGraphData = useMemo((): PageGraphDataPoint[] => {
    const counts: Record<string, number> = {
      ACTIVE: 0,
      PENDING_ACTIVATION: 0,
      LOCKED: 0,
      OTHER: 0,
    };
    filteredEquipment.forEach((eq) => {
      const s = eq.status ?? "PENDING_ACTIVATION";
      if (s === "ACTIVE") counts.ACTIVE++;
      else if (s === "PENDING_ACTIVATION") counts.PENDING_ACTIVATION++;
      else if (s === "LOCKED") counts.LOCKED++;
      else counts.OTHER++;
    });

    return [
      {
        label: t("devices.statusActive", "Active"),
        value: counts.ACTIVE,
        color: "hsl(142.1 76.2% 36.3%)",
      },
      {
        label: t("devices.statusPending", "Pending"),
        value: counts.PENDING_ACTIVATION,
        color: "hsl(38 92% 50%)",
      },
      {
        label: "Locked / Inactive",
        value: counts.LOCKED,
        color: "hsl(346.8 77.2% 49.8%)",
      },
      ...(counts.OTHER > 0
        ? [
            {
              label: "Other",
              value: counts.OTHER,
              color: "hsl(var(--muted-foreground))",
            },
          ]
        : []),
    ];
  }, [filteredEquipment, t]);

  // Agent connectivity telemetry data for fleet analytics graph
  const agentGraphData = useMemo((): PageGraphDataPoint[] => {
    const counts: Record<string, number> = {
      ONLINE: 0,
      OFFLINE: 0,
      AWAITING_PAIRING: 0,
    };
    filteredEquipment.forEach((eq) => {
      if (eq.agent_status === "ONLINE") counts.ONLINE++;
      else if (eq.agent_status === "OFFLINE") counts.OFFLINE++;
      else counts.AWAITING_PAIRING++;
    });

    return [
      {
        label: "Online Agent",
        value: counts.ONLINE,
        color: "hsl(var(--primary))",
      },
      {
        label: "Offline Agent",
        value: counts.OFFLINE,
        color: "hsl(var(--destructive))",
      },
      {
        label: "Awaiting Pairing",
        value: counts.AWAITING_PAIRING,
        color: "hsl(var(--muted-foreground))",
      },
    ];
  }, [filteredEquipment]);

  const deviceViews = useMemo(
    (): PageViewOption<DeviceViewMode>[] => [
      {
        value: "list",
        label: t("devices.views.list", "Inventory Table"),
        icon: List,
        title: t("devices.views.list", "Inventory Table"),
      },
      {
        value: "tiled",
        label: t("devices.views.tiled", "Equipment Cards"),
        icon: LayoutGrid,
        title: t("devices.views.tiled", "Equipment Cards"),
      },
      {
        value: "rmm",
        label: t("devices.views.rmm", "RMM Telemetry"),
        icon: Activity,
        title: t("devices.views.rmm", "RMM Telemetry"),
        className: "text-blue-500",
      },
      {
        value: "graph",
        label: t("devices.views.graph", "Fleet Analytics"),
        icon: BarChart3,
        title: t("devices.views.graph", "Fleet Analytics"),
      },
    ],
    [t],
  );

  return (
    <Page<DeviceViewMode>
      defaultView="list"
      activeView={currentView}
      onViewChange={handleViewChange}
      availableViews={deviceViews}
      syncUrl={false}
    >
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t("nav.devices")}</Page.Title>
            <Page.Description>{t("devices.subtitle")}</Page.Description>
          </Page.TitleGroup>
        </Page.HeaderRow>
        <Page.Toolbar>
          <Page.Filters />
          <Page.Controls>
            <Page.ViewSwitcher size="sm" />
          </Page.Controls>
        </Page.Toolbar>
      </Page.Header>

      {loading ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Skeleton className="w-full sm:w-72 h-8" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-28 h-8" />
              <Skeleton className="w-24 h-8" />
            </div>
          </div>
          {currentView === "tiled" ? (
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
      ) : (
        <>
          {/* View 1: List (DataTable) */}
          <Page.View type="list" className="space-y-4">
            {activeSubscriptions.length === 0 && !isAdmin ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptySubscriptionsCard onBrowsePlans={handleBrowsePlans} />
              </div>
            ) : (
              <div className="space-y-4 text-foreground animate-fade-in">
                <DeviceToolbar
                  isAdmin={isAdmin}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  activeSubscriptions={activeSubscriptions}
                  selectedSubscriptionId={selectedSubscriptionId}
                  activeSubId={activeSub?.id}
                  onSelectSubscription={setSelectedSubscriptionId}
                  uniqueClients={uniqueClients}
                  selectedClient={selectedClient}
                  onSelectClient={setSelectedClient}
                  clientFilterOptions={clientFilterOptions}
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                  planFilterOptions={planFilterOptions}
                  selectedStatus={selectedStatus}
                  onSelectStatus={setSelectedStatus}
                  statusFilterOptions={statusFilterOptions}
                  firstAvailableSlot={firstAvailableSlot}
                  onOpenAddDevice={handleOpenAddDevice}
                  onOpenActivateWithOtp={handleOpenActivateWithOtp}
                />

                {filteredEquipment.length === 0 ? (
                  <Card className="p-8 text-center space-y-2">
                    <Laptop className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-sm font-semibold text-foreground">{t("devices.noSlotsFound")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("devices.noSlotsFoundDesc", "No devices or slots match your search criteria.")}
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <div className="lg:col-span-3 space-y-4">
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
          </Page.View>

          {/* View 2: Tiled (Cards Grid) */}
          <Page.View type="tiled" className="space-y-4">
            {activeSubscriptions.length === 0 && !isAdmin ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptySubscriptionsCard onBrowsePlans={handleBrowsePlans} />
              </div>
            ) : (
              <div className="space-y-4 text-foreground animate-fade-in">
                <DeviceToolbar
                  isAdmin={isAdmin}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  activeSubscriptions={activeSubscriptions}
                  selectedSubscriptionId={selectedSubscriptionId}
                  activeSubId={activeSub?.id}
                  onSelectSubscription={setSelectedSubscriptionId}
                  uniqueClients={uniqueClients}
                  selectedClient={selectedClient}
                  onSelectClient={setSelectedClient}
                  clientFilterOptions={clientFilterOptions}
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                  planFilterOptions={planFilterOptions}
                  selectedStatus={selectedStatus}
                  onSelectStatus={setSelectedStatus}
                  statusFilterOptions={statusFilterOptions}
                  firstAvailableSlot={firstAvailableSlot}
                  onOpenAddDevice={handleOpenAddDevice}
                  onOpenActivateWithOtp={handleOpenActivateWithOtp}
                />

                {filteredEquipment.length === 0 ? (
                  <Card className="p-8 text-center space-y-2">
                    <Laptop className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-sm font-semibold text-foreground">{t("devices.noSlotsFound")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("devices.noSlotsFoundDesc", "No devices or slots match your search criteria.")}
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedEquipment.map((equip, idx) => (
                        <DeviceCard
                          key={equip.id || `slot-card-${equip.subscription_id}-${equip.slot_index ?? idx}`}
                          equip={equip}
                          onOpenNcModal={handleOpenNcModal}
                          onOpenVaultModal={handleOpenVaultModal}
                          onOpenScheduleMaint={handleOpenScheduleMaint}
                          onRequestRevoke={equip.client_role === "ADMIN" ? setDeviceToDelete : handleRequestRevoke}
                          onRequestRepair={handleRequestRepair}
                          onOpenActivateWithOtp={handleOpenActivateWithOtp}
                          onDeployClient={handleDeployClient}
                          onDeployAgent={handleOpenDeployAgent}
                        />
                      ))}
                    </div>

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
                )}
              </div>
            )}
          </Page.View>

          {/* View 3: RMM Telemetry & Health */}
          <Page.View type="rmm" className="space-y-6 min-w-0 w-full max-w-full">
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
          </Page.View>

          {/* View 4: Fleet Analytics */}
          <Page.View type="graph" className="space-y-5">
            <section aria-label="Fleet Analytics" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Page.Graph
                title={t("devices.analytics.statusAllocation", "Device Status Distribution")}
                subtitle={t(
                  "devices.analytics.statusSubtitle",
                  "Active, pending activation, and locked endpoint breakdown",
                )}
                data={statusGraphData}
                defaultType="donut"
              />
              <Page.Graph
                title={t("devices.analytics.osDistribution", "Operating System Distribution")}
                subtitle={t(
                  "devices.analytics.osSubtitle",
                  "Workstation and server platform distribution across fleet",
                )}
                data={agentGraphData}
                defaultType="bar"
              />
            </section>
          </Page.View>
        </>
      )}

      {/* Extracted Feature Modals */}
      <DeviceModals
        isAdmin={isAdmin}
        hasPlanFeature={hasPlanFeature}
        isMaintModalOpen={isMaintModalOpen}
        maintModalEquip={maintModalEquip}
        onCloseMaintModal={handleCloseMaintModal}
        onMaintSuccess={handleMaintSuccess}
        activateOtpModalOpen={activateOtpModalOpen}
        activateOtpLoading={activateOtpLoading}
        onCloseActivateWithOtp={handleCloseActivateWithOtp}
        onActivateWithOtp={handleActivateWithOtp}
        activateTargetSubId={activateTargetSubId}
        activateTargetSlotIdx={activateTargetSlotIdx}
        addDeviceModalOpen={addDeviceModalOpen}
        addDeviceLoading={addDeviceLoading}
        onCloseAddDevice={handleCloseAddDevice}
        onAddAdminDevice={handleAddAdminDevice}
        uniqueClients={uniqueClients}
        isNcModalOpen={isNcModalOpen}
        ncModalEquip={ncModalEquip}
        onCloseNcModal={handleCloseNcModal}
        activeSub={activeSub}
        selectedSubscriptionId={selectedSubscriptionId}
        isVaultModalOpen={isVaultModalOpen}
        vaultModalEquip={vaultModalEquip}
        onCloseVaultModal={handleCloseVaultModal}
        isDeployAgentOpen={isDeployAgentOpen}
        deployAgentEquip={deployAgentEquip}
        onCloseDeployAgent={handleCloseDeployAgent}
      />

      {/* Extracted Confirmation Alert Dialogs */}
      <DeviceConfirmationDialogs
        showBulkDeactivateAlert={showBulkDeactivateAlert}
        setShowBulkDeactivateAlert={setShowBulkDeactivateAlert}
        bulkDeactivateTargets={bulkDeactivateTargets}
        bulkProcessing={bulkProcessing}
        confirmBulkDeactivate={confirmBulkDeactivate}
        revokeTarget={revokeTarget}
        revokeLoading={revokeLoading}
        cancelRevoke={cancelRevoke}
        confirmRevoke={confirmRevoke}
        repairTarget={repairTarget}
        repairLoading={repairLoading}
        cancelRepair={cancelRepair}
        confirmRepair={confirmRepair}
        deviceToDelete={deviceToDelete}
        setDeviceToDelete={setDeviceToDelete}
        deleteDeviceLoading={deleteDeviceLoading}
        handleDeleteAdminDevice={handleDeleteAdminDevice}
      />
    </Page>
  );
}

export default DevicesPage;
