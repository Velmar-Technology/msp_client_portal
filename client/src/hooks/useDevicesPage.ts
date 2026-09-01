import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { SubscriptionEquipment } from "@/services/equipmentService";

import { useDeviceQueries } from "./devices/useDeviceQueries";
import { useDeviceFilters, deriveAdminFilterOptions, deriveUniqueClients, filterEquipment, sortEquipment } from "./devices/useDeviceFilters";
import { useDeviceModals } from "./devices/useDeviceModals";

/**
 * Thin orchestrator composing device queries, URL-synced filters, and modal state.
 * All server state is managed by TanStack Query; URL is the single source of truth for filters.
 *
 * @returns Flat interface consumed by DevicesPage — identical surface area, zero manual fetch logic.
 */
export function useDevicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // ─── Composed hooks ─────────────────────────────────────────
  const queries = useDeviceQueries(isAdmin);
  const filters = useDeviceFilters();
  const modals = useDeviceModals();

  // ─── Boolean open/close passthroughs (compat with old API) ──
  const setActivateOtpModalOpen = useCallback(
    (open: boolean) => {
      if (open) modals.activateOtp.open({ subId: "", slotIndex: 0 });
      else modals.activateOtp.close();
    },
    [modals.activateOtp],
  );
  const setAddDeviceModalOpen = useCallback(
    (open: boolean) => {
      if (open) modals.addDevice.open();
      else modals.addDevice.close();
    },
    [modals.addDevice],
  );
  const setDeviceToDelete = useCallback(
    (equip: Partial<SubscriptionEquipment> | null) => {
      if (equip) modals.deleteDevice.open(equip);
      else modals.deleteDevice.close();
    },
    [modals.deleteDevice],
  );

  // ─── Derived values ─────────────────────────────────────────
  const activeSub = useMemo(
    () => queries.activeSubscriptions.find((s) => s.id === filters.selectedSubscriptionId) || queries.activeSubscriptions[0],
    [queries.activeSubscriptions, filters.selectedSubscriptionId],
  );

  const { clientFilterOptions, planFilterOptions, statusFilterOptions } = useMemo(
    () => deriveAdminFilterOptions(queries.adminDevices, t),
    [queries.adminDevices, t],
  );

  const uniqueClients = useMemo(() => deriveUniqueClients(queries.adminDevices), [queries.adminDevices]);

  const filteredEquipment = useMemo(() => {
    const raw = isAdmin
      ? queries.adminDevices
      : activeSub
        ? (queries.subscriptionEquipment[activeSub.id] || [])
        : [];

    return filterEquipment(raw as SubscriptionEquipment[], {
      search: filters.searchTerm,
      selectedStatus: filters.selectedStatus,
      selectedClient: filters.selectedClient,
      isAdmin,
    });
  }, [queries.adminDevices, queries.subscriptionEquipment, activeSub, filters.searchTerm, filters.selectedStatus, filters.selectedClient, isAdmin]);

  const sortedEquipment = useMemo(() => sortEquipment(filteredEquipment, filters.sorting), [filteredEquipment, filters.sorting]);

  const totalPages = Math.max(1, Math.ceil(sortedEquipment.length / filters.limit));
  const paginatedEquipment = useMemo(() => {
    const start = (filters.page - 1) * filters.limit;
    return sortedEquipment.slice(start, start + filters.limit);
  }, [sortedEquipment, filters.page, filters.limit]);

  // ─── Confirmation handlers (revoke) ─────────────────────────
  const handleRequestRevoke = useCallback((equip: Partial<SubscriptionEquipment>) => modals.revoke.open(equip), [modals.revoke]);

  const confirmRevoke = useCallback(async () => {
    const target = modals.revoke.payload;
    if (!target) return;
    const subId = target.subscription_id || activeSub?.id;
    const slotIndex = target.slot_index;
    if (subId !== undefined && slotIndex !== undefined) {
      await queries.mutations.deactivate.mutateAsync({ subId, slotIndex });
    }
    modals.revoke.close();
  }, [modals.revoke, activeSub, queries.mutations.deactivate]);

  const cancelRevoke = useCallback(() => modals.revoke.close(), [modals.revoke]);

  // ─── Confirmation handlers (repair → opens OTP modal) ───────
  const handleRequestRepair = useCallback((equip: Partial<SubscriptionEquipment>) => modals.repair.open(equip), [modals.repair]);

  const confirmRepair = useCallback(async () => {
    const target = modals.repair.payload;
    if (!target) return;
    const subId = target.subscription_id || activeSub?.id;
    const slotIndex = target.slot_index;
    if (subId !== undefined && slotIndex !== undefined) {
      await queries.mutations.repair.mutateAsync({ subId, slotIndex });
      modals.repair.close();
      modals.activateOtp.open({ subId, slotIndex });
    }
  }, [modals.repair, modals.activateOtp, activeSub, queries.mutations.repair]);

  const cancelRepair = useCallback(() => modals.repair.close(), [modals.repair]);

  // ─── OTP Activation ─────────────────────────────────────────
  const handleOpenActivateWithOtp = useCallback(
    (subId: string, slotIndex: number) => modals.activateOtp.open({ subId, slotIndex }),
    [modals.activateOtp],
  );

  const handleCloseActivateWithOtp = useCallback(() => {
    if (queries.mutations.activate.isPending) return;
    modals.activateOtp.close();
  }, [modals.activateOtp, queries.mutations.activate.isPending]);

  const handleActivateWithOtp = useCallback(
    async (otp: string, deviceName: string, deviceSerial: string) => {
      const payload = modals.activateOtp.payload;
      if (!payload) return;
      await queries.mutations.activate.mutateAsync({
        otp,
        subscriptionId: payload.subId,
        slotIndex: payload.slotIndex,
        deviceName,
        deviceSerial,
      });
      modals.activateOtp.close();
    },
    [modals.activateOtp, queries.mutations.activate],
  );

  // ─── Add Admin Device ───────────────────────────────────────
  const handleOpenAddDevice = useCallback(() => modals.addDevice.open(), [modals.addDevice]);
  const handleCloseAddDevice = useCallback(() => {
    if (queries.mutations.addDevice.isPending) return;
    modals.addDevice.close();
  }, [modals.addDevice, queries.mutations.addDevice.isPending]);

  const handleAddAdminDevice = useCallback(
    async (data: { deviceName: string; deviceSerial?: string; tenantId?: string; otp: string }) => {
      await queries.mutations.addDevice.mutateAsync(data);
      modals.addDevice.close();
    },
    [queries.mutations.addDevice, modals.addDevice],
  );

  // ─── Delete Admin Device ────────────────────────────────────
  const handleDeleteAdminDevice = useCallback(
    async (equipmentId: string) => {
      await queries.mutations.deleteDevice.mutateAsync(equipmentId);
      modals.deleteDevice.close();
    },
    [queries.mutations.deleteDevice, modals.deleteDevice],
  );

  // ─── Bulk Operations ────────────────────────────────────────
  const handleBulkDeactivateClick = useCallback(
    (selected: Partial<SubscriptionEquipment>[]) => {
      const activeSlots = selected.filter(
        (e) => e.status === "ACTIVE" && (e.subscription_id || activeSub?.id) && e.slot_index !== undefined,
      );
      if (activeSlots.length === 0) {
        toast.info(t("common.info") || "Info", {
          description: t("devices.noActiveForDeactivate") || "No active devices selected for deactivation.",
        });
        return;
      }
      filters.setBulkDeactivateTargets(activeSlots);
      filters.setShowBulkDeactivateAlert(true);
    },
    [activeSub, t, filters],
  );

  const confirmBulkDeactivate = useCallback(async () => {
    const targets = filters.bulkDeactivateTargets;
    if (targets.length === 0) return;
    let successCount = 0;
    await Promise.allSettled(
      targets.map(async (slot) => {
        const subId = slot.subscription_id || activeSub?.id;
        if (subId !== undefined && slot.slot_index !== undefined) {
          await queries.mutations.deactivate.mutateAsync({ subId, slotIndex: slot.slot_index });
          successCount++;
        }
      }),
    );
    if (successCount > 0) {
      toast.info(t("devices.slotRevokedTitle") || "Slot Revoked", {
        description: t("devices.bulkDeactivateSuccess", { count: successCount }) || `Deactivated ${successCount} active device(s).`,
      });
    }
    filters.setShowBulkDeactivateAlert(false);
    filters.setBulkDeactivateTargets([]);
  }, [filters.bulkDeactivateTargets, activeSub, queries.mutations.deactivate, t, filters]);

  const handleBulkExportCSV = useCallback(
    (selected: Partial<SubscriptionEquipment>[]) => {
      const rows = selected.length > 0 ? selected : filteredEquipment;
      if (rows.length === 0) return;

      const headers = ["Slot", "Status", "Device Name", "Serial Number", "Nextcloud User", "Client", "Plan", "ID"];
      const csvLines = [headers.join(",")];

      for (const item of rows) {
        const slot = item.slot_index !== undefined ? item.slot_index + 1 : "";
        const status = item.status || "";
        const deviceName = item.device_name ? `"${item.device_name.replace(/"/g, '""')}"` : "";
        const serial = item.device_serial ? `"${item.device_serial.replace(/"/g, '""')}"` : "";
        const ncUser = item.nextcloud_username || "";
        const client = item.client_name ? `"${item.client_name.replace(/"/g, '""')}"` : item.tenant_name || "";
        const plan = item.plan || "";
        const id = item.id || "";
        csvLines.push([slot, status, deviceName, serial, ncUser, client, plan, id].join(","));
      }

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvLines.join("\n"));
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `devices_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t("common.success") || "Success", {
        description: t("devices.bulkExportSuccess") || `Exported ${rows.length} device(s) to CSV.`,
      });
    },
    [filteredEquipment, t],
  );

  // ─── Refetch helper (kept for backwards compat) ─────────────
  const fetchActiveSubscriptions = useCallback(() => {
    queries.queries.adminQuery.refetch();
    queries.queries.subscriptionsQuery.refetch();
    queries.queries.devicesQuery.refetch();
  }, [queries.queries]);

  // ─── Flat return (same surface as original) ─────────────────
  return {
    t,
    navigate,
    user,
    loading: queries.loading,
    activeTab: filters.activeTab,
    setActiveTab: filters.setActiveTab,
    activeSubscriptions: queries.activeSubscriptions,
    selectedSubscriptionId: filters.selectedSubscriptionId,
    setSelectedSubscriptionId: filters.setSelectedSubscriptionId,
    subscriptionEquipment: queries.subscriptionEquipment,
    searchTerm: filters.searchTerm,
    setSearchTerm: filters.setSearchTerm,
    activateTargetSubId: modals.activateOtp.payload?.subId ?? null,
    activateTargetSlotIdx: modals.activateOtp.payload?.slotIndex ?? null,
    activeSub,
    filteredEquipment,
    paginatedEquipment,
    fetchActiveSubscriptions,
    handleRevokeEquipment: queries.mutations.deactivate.mutateAsync,
    handleRepairEquipment: queries.mutations.repair.mutateAsync,
    activateOtpModalOpen: modals.activateOtp.isOpen,
    setActivateOtpModalOpen,

    activateOtpLoading: queries.mutations.activate.isPending,
    setActivateOtpLoading: () => {},
    handleOpenActivateWithOtp,
    handleCloseActivateWithOtp,
    handleActivateWithOtp,
    addDeviceModalOpen: modals.addDevice.isOpen,
    setAddDeviceModalOpen,

    addDeviceLoading: queries.mutations.addDevice.isPending,
    setAddDeviceLoading: () => {},
    handleOpenAddDevice,
    handleCloseAddDevice,
    handleAddAdminDevice,
    deviceToDelete: modals.deleteDevice.payload,
    setDeviceToDelete,
    deleteDeviceLoading: queries.mutations.deleteDevice.isPending,
    setDeleteDeviceLoading: () => {},
    handleDeleteAdminDevice,
    isAdmin,
    adminDevices: queries.adminDevices,
    selectedClient: filters.selectedClient,
    setSelectedClient: filters.setSelectedClient,
    selectedPlan: filters.selectedPlan,
    setSelectedPlan: filters.setSelectedPlan,
    selectedStatus: filters.selectedStatus,
    setSelectedStatus: filters.setSelectedStatus,
    uniqueClients,
    clientFilterOptions,
    planFilterOptions,
    statusFilterOptions,
    page: filters.page,
    setPage: filters.setPage,
    limit: filters.limit,
    setLimit: filters.setLimit,
    totalPages,
    selectedDevices: filters.selectedDevices,
    setSelectedDevices: filters.setSelectedDevices,
    showBulkDeactivateAlert: filters.showBulkDeactivateAlert,
    setShowBulkDeactivateAlert: filters.setShowBulkDeactivateAlert,
    bulkDeactivateTargets: filters.bulkDeactivateTargets,
    setBulkDeactivateTargets: filters.setBulkDeactivateTargets,
    bulkProcessing: queries.mutations.deactivate.isPending,
    setBulkProcessing: () => {},
    handleBulkDeactivateClick,
    confirmBulkDeactivate,
    handleBulkExportCSV,
    // Revoke confirmation
    revokeTarget: modals.revoke.payload,
    setRevokeTarget: modals.revoke.payload ? modals.revoke.close : modals.revoke.open,
    revokeLoading: queries.mutations.deactivate.isPending,
    setRevokeLoading: () => {},
    handleRequestRevoke,
    confirmRevoke,
    cancelRevoke,
    repairTarget: modals.repair.payload,
    setRepairTarget: modals.repair.payload ? modals.repair.close : modals.repair.open,
    repairLoading: queries.mutations.repair.isPending,
    setRepairLoading: () => {},
    handleRequestRepair,
    confirmRepair,
    cancelRepair,
    sorting: filters.sorting,
    setSorting: filters.setSorting,
  };
}
