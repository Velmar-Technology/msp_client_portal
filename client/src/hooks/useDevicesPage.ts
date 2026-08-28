import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUrlState } from "@/hooks/useUrlState";
import { toast } from "sonner";
import { subscriptionService } from "@/services/subscriptionService";
import type { Subscription } from "@/services/subscriptionService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import type { SortingState } from "@tanstack/react-table";

export function useDevicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getParam, setParam } = useUrlState();

  const [loading, setLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("");
  const [subscriptionEquipment, setSubscriptionEquipment] = useState<Record<string, Partial<SubscriptionEquipment>[]>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Active Tab state ("devices" | "rmm")
  const urlTab = getParam("tab", "devices");
  const [activeTab, setActiveTabInternal] = useState<"devices" | "rmm">(() =>
    urlTab === "rmm" ? "rmm" : "devices"
  );

  useEffect(() => {
    const currentTabParam = getParam("tab", "devices");
    const resolvedTab = currentTabParam === "rmm" ? "rmm" : "devices";
    setActiveTabInternal(resolvedTab);
  }, [getParam]);

  const setActiveTab = useCallback(
    (tab: "devices" | "rmm") => {
      setActiveTabInternal(tab);
      setParam("tab", tab === "devices" ? null : tab);
    },
    [setParam]
  );

  // Admin specific states
  const [adminDevices, setAdminDevices] = useState<SubscriptionEquipment[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  // Revoke confirmation state
  const [revokeTarget, setRevokeTarget] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Activation (slot binding) State
  const [activateTargetSubId, setActivateTargetSubId] = useState<string | null>(null);
  const [activateTargetSlotIdx, setActivateTargetSlotIdx] = useState<number | null>(null);

  const isAdmin = user?.role === "ADMIN";

  // Reset page to 1 when filters or search change
  useEffect(() => {
      
    setPage(1);
  }, [searchTerm, selectedClient, selectedStatus, selectedSubscriptionId]);

  const fetchActiveSubscriptions = useCallback(async () => {
    if (user?.role !== "CLIENT" && !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isAdmin) {
        const rawDevices = (await equipmentService.getAllDevicesForAdmin()) || [];
        const devices = rawDevices.filter(
          (d) =>
            (!d.subscription_status || d.subscription_status === "ACTIVE" || d.subscription_status === "EXPIRING") &&
            (!d.client_role || d.client_role === "CLIENT" || d.client_role === "ADMIN")
        );
        setAdminDevices(devices);

        // Group by subscription_id for compatibility with activation wizard / other operations
        const grouped: Record<string, Partial<SubscriptionEquipment>[]> = {};
        devices.forEach((d) => {
          if (!grouped[d.subscription_id]) {
            grouped[d.subscription_id] = [];
          }
          grouped[d.subscription_id][d.slot_index] = d;
        });

        // Ensure array has no empty holes (in case a slot was not loaded/missing)
        Object.keys(grouped).forEach((subId) => {
          const arr = grouped[subId];
          for (let i = 0; i < arr.length; i++) {
            if (!arr[i]) {
              arr[i] = {
                id: `device-slot-${i}`,
                subscription_id: subId,
                slot_index: i,
                status: "PENDING_ACTIVATION",
              };
            }
          }
        });

        setSubscriptionEquipment(grouped);
      } else {
        // Fetch subscriptions and all devices in parallel (2 calls instead of 1+N)
        const [subs, allDevices] = await Promise.all([
          subscriptionService.getAll(),
          equipmentService.getMyDevices(),
        ]);
        const active = subs.filter((sub) => sub.status === "ACTIVE" || sub.status === "EXPIRING");
        setActiveSubscriptions(active);

        if (active.length > 0) {
          setSelectedSubscriptionId((prev) => prev || active[0].id);

          // Group devices by subscription_id in-memory
          const activeSubIds = new Set(active.map((s) => s.id));
          const grouped: Record<string, Partial<SubscriptionEquipment>[]> = {};

          for (const device of allDevices) {
            if (!activeSubIds.has(device.subscription_id)) continue;
            if (!grouped[device.subscription_id]) {
              grouped[device.subscription_id] = [];
            }
            grouped[device.subscription_id][device.slot_index] = device;
          }

          // Fill empty slots for subscriptions with no devices or gaps
          for (const sub of active) {
            if (!grouped[sub.id]) {
              grouped[sub.id] = [];
            }
            const arr = grouped[sub.id];
            for (let i = 0; i < sub.equipment_count; i++) {
              if (!arr[i]) {
                arr[i] = {
                  id: `device-slot-${i}`,
                  subscription_id: sub.id,
                  slot_index: i,
                  status: "PENDING_ACTIVATION" as const,
                };
              }
            }
          }

          setSubscriptionEquipment(grouped);
        }
      }
    } catch (err) {
      console.error("Failed to load active subscriptions", err);
      toast.error(t("common.error"), {
        description: t("devices.fetchFailed") || "Failed to retrieve active subscriptions for device management.",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.role, isAdmin, t]);

  useEffect(() => {
      
    fetchActiveSubscriptions();
  }, [fetchActiveSubscriptions]);

  // Update helper for admin and client
  const updateDeviceList = useCallback((subId: string, slotIndex: number, updatedSlot: SubscriptionEquipment) => {
    setSubscriptionEquipment((prev) => {
      const current = [...(prev[subId] || [])];
      current[slotIndex] = updatedSlot;
      return { ...prev, [subId]: current };
    });

    setAdminDevices((prev) =>
      prev.map((d) =>
        d.subscription_id === subId && d.slot_index === slotIndex ? { ...d, ...updatedSlot } : d
      )
    );
  }, []);

  const handleRevokeEquipment = useCallback(async (subId: string, slotIndex: number) => {
    try {
      const updatedSlot = await equipmentService.deactivateSlot(subId, slotIndex);
      updateDeviceList(subId, slotIndex, updatedSlot);
      toast.info(t("devices.slotRevokedTitle"), {
        description: t("devices.slotRevokedDesc") || "Device slot revoked. Cloud storage account deleted.",
      });
    } catch (err) {
      console.error("Failed to revoke device:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t("common.error"), {
        description: error.response?.data?.message || error.message || t("devices.revokeFailed") || "Failed to deactivate slot.",
      });
    }
  }, [updateDeviceList, t]);

  // Slot-binding "Activate with Code" (pairing code) flow state
  const [activateOtpModalOpen, setActivateOtpModalOpen] = useState(false);
  const [activateOtpLoading, setActivateOtpLoading] = useState(false);

  const handleOpenActivateWithOtp = useCallback((subId: string, slotIndex: number) => {
    setActivateTargetSubId(subId);
    setActivateTargetSlotIdx(slotIndex);
    setActivateOtpModalOpen(true);
  }, []);

  const handleCloseActivateWithOtp = useCallback(() => {
    if (activateOtpLoading) return;
    setActivateOtpModalOpen(false);
  }, [activateOtpLoading]);

  const handleActivateWithOtp = useCallback(
    async (otp: string, deviceName: string, deviceSerial: string) => {
      if (!activateTargetSubId || activateTargetSlotIdx === null) return;
      setActivateOtpLoading(true);
      try {
        const updatedSlot = await equipmentService.activateWithOtp({
          otp,
          subscriptionId: activateTargetSubId,
          slotIndex: activateTargetSlotIdx,
          deviceName,
          deviceSerial,
        });
        updateDeviceList(activateTargetSubId, activateTargetSlotIdx, updatedSlot);
        setActivateOtpModalOpen(false);
        toast.success(t("devices.activateWithCodeSuccessTitle"), {
          description:
            t("devices.activateWithCodeSuccessDesc", { name: deviceName }) ||
            `Device ${deviceName} successfully activated with activation code.`,
        });
      } catch (err) {
        console.error("Failed to activate device with code:", err);
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(t("common.error"), {
          description: error.response?.data?.message || error.message || t("devices.activateWithCodeFailed") || "Failed to activate device with the provided code.",
        });
      } finally {
        setActivateOtpLoading(false);
      }
    },
    [activateTargetSubId, activateTargetSlotIdx, updateDeviceList, t]
  );

  // Standalone "Add Admin Device" flow state
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [addDeviceLoading, setAddDeviceLoading] = useState(false);

  const handleOpenAddDevice = useCallback(() => {
    setAddDeviceModalOpen(true);
  }, []);

  const handleCloseAddDevice = useCallback(() => {
    if (addDeviceLoading) return;
    setAddDeviceModalOpen(false);
  }, [addDeviceLoading]);

  const handleAddAdminDevice = useCallback(
    async (data: { deviceName: string; deviceSerial?: string; tenantId?: string }) => {
      setAddDeviceLoading(true);
      try {
        await equipmentService.addAdminDevice(data);
        await fetchActiveSubscriptions();
        setAddDeviceModalOpen(false);
        toast.success(t("devices.addAdminDeviceSuccess", { name: data.deviceName }) || "Device added successfully", {
          description: t("devices.addAdminDeviceSuccessDesc") || `Device ${data.deviceName} has been registered and provisioned.`,
        });
      } catch (err) {
        console.error("Failed to add admin device:", err);
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(t("common.error"), {
          description: error.response?.data?.message || error.message || "Failed to add device.",
        });
      } finally {
        setAddDeviceLoading(false);
      }
    },
    [fetchActiveSubscriptions, t]
  );

  const [deviceToDelete, setDeviceToDelete] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [deleteDeviceLoading, setDeleteDeviceLoading] = useState(false);

  const handleDeleteAdminDevice = useCallback(
    async (equipmentId: string) => {
      setDeleteDeviceLoading(true);
      try {
        await equipmentService.deleteAdminDevice(equipmentId);
        await fetchActiveSubscriptions();
        setDeviceToDelete(null);
        toast.success(t("devices.deleteSuccess") || "Device deleted successfully");
      } catch (err) {
        console.error("Failed to delete admin device:", err);
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(t("common.error"), {
          description: error.response?.data?.message || error.message || "Failed to delete device.",
        });
      } finally {
        setDeleteDeviceLoading(false);
      }
    },
    [fetchActiveSubscriptions, t]
  );

  const activeSub = useMemo(() => {
    return activeSubscriptions.find((sub) => sub.id === selectedSubscriptionId) || activeSubscriptions[0];
  }, [activeSubscriptions, selectedSubscriptionId]);

  // Revoke confirmation handlers
  const handleRequestRevoke = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setRevokeTarget(equip);
  }, []);

  const confirmRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      const subId = revokeTarget.subscription_id || activeSub?.id;
      const slotIndex = revokeTarget.slot_index;
      if (subId !== undefined && slotIndex !== undefined) {
        await handleRevokeEquipment(subId, slotIndex);
      }
    } finally {
      setRevokeLoading(false);
      setRevokeTarget(null);
    }
  }, [revokeTarget, activeSub, handleRevokeEquipment]);

  const cancelRevoke = useCallback(() => {
    setRevokeTarget(null);
  }, []);

  const uniqueClients = useMemo(() => {
    const clients = new Map<string, string>();
    (adminDevices || []).forEach((d) => {
      if (d.tenant_id && d.tenant_name) {
        clients.set(d.tenant_id, d.tenant_name);
      }
    });
    return Array.from(clients.entries()).map(([id, name]) => ({ id, name }));
  }, [adminDevices]);

  const uniquePlans = useMemo(() => {
    const plans = new Set<string>();
    (adminDevices || []).forEach((d) => {
      if (d.plan) plans.add(d.plan);
    });
    return Array.from(plans);
  }, [adminDevices]);

  const clientFilterOptions = useMemo(() => {
    return uniqueClients.map((c) => ({ value: c.id, label: c.name }));
  }, [uniqueClients]);

  const planFilterOptions = useMemo(() => {
    return uniquePlans.map((p) => ({ value: p, label: p }));
  }, [uniquePlans]);

  const statusFilterOptions = useMemo(() => {
    return [
      { value: "ACTIVE", label: t("devices.statusActive") },
      { value: "PENDING_ACTIVATION", label: t("devices.statusPending") },
    ];
  }, [t]);

  const filteredEquipment = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (isAdmin) {
      const hasSearch = search.length > 0;
      const hasClientFilter = Boolean(selectedClient && selectedClient !== "all");
      const hasStatusFilter = Boolean(selectedStatus && selectedStatus !== "all");

      if (!hasSearch && !hasClientFilter && !hasStatusFilter) {
        return adminDevices || [];
      }

      return (adminDevices || []).filter((device) => {
        if (hasClientFilter && device.tenant_id !== selectedClient) return false;
        if (hasStatusFilter && device.status !== selectedStatus) return false;

        if (hasSearch) {
          const matchSearch =
            (device.id && device.id.toLowerCase().includes(search)) ||
            (device.device_name && device.device_name.toLowerCase().includes(search)) ||
            (device.device_serial && device.device_serial.toLowerCase().includes(search)) ||
            (device.nextcloud_username && device.nextcloud_username.toLowerCase().includes(search)) ||
            (device.client_name && device.client_name.toLowerCase().includes(search)) ||
            (device.client_email && device.client_email.toLowerCase().includes(search));

          if (!matchSearch) return false;
        }

        return true;
      });
    } else {
      if (!activeSub) return [];
      const equipList = subscriptionEquipment[activeSub.id] || [];
      if (!search) return equipList;
      return equipList.filter(
        (device) =>
          (device.id && device.id.toLowerCase().includes(search)) ||
          (device.device_name && device.device_name.toLowerCase().includes(search)) ||
          (device.device_serial && device.device_serial.toLowerCase().includes(search))
      );
    }
  }, [adminDevices, subscriptionEquipment, activeSub, searchTerm, isAdmin, selectedClient, selectedStatus]);

  // Datatable Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);

  const sortedEquipment = useMemo(() => {
    if (sorting.length === 0) return filteredEquipment;
    const result = [...filteredEquipment];
    const sort = sorting[0];
    const { id, desc } = sort;

    result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      if (id === "clientInfo") {
        valA = a.client_name || a.tenant_name || "";
        valB = b.client_name || b.tenant_name || "";
      } else if (id === "slotNumber") {
        valA = a.slot_index !== undefined ? a.slot_index + 1 : 0;
        valB = b.slot_index !== undefined ? b.slot_index + 1 : 0;
      } else if (id === "planInfo") {
        valA = a.plan || "";
        valB = b.plan || "";
      } else if (id === "status") {
        valA = a.status || "";
        valB = b.status || "";
      } else if (id === "deviceDetails") {
        valA = a.device_name || a.otp || "";
        valB = b.device_name || b.otp || "";
      } else if (id === "backupAccount") {
        valA = a.status === "ACTIVE" && a.nextcloud_username ? 1 : 0;
        valB = b.status === "ACTIVE" && b.nextcloud_username ? 1 : 0;
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return desc ? valB - valA : valA - valB;
      }

      const comp = String(valA).localeCompare(String(valB));
      return desc ? -comp : comp;
    });

    return result;
  }, [filteredEquipment, sorting]);

  // Bulk Operations State
  const [selectedDevices, setSelectedDevices] = useState<Partial<SubscriptionEquipment>[]>([]);
  const [showBulkDeactivateAlert, setShowBulkDeactivateAlert] = useState(false);
  const [bulkDeactivateTargets, setBulkDeactivateTargets] = useState<Partial<SubscriptionEquipment>[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedEquipment.length / limit));
  }, [sortedEquipment.length, limit]);

  const paginatedEquipment = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return sortedEquipment.slice(startIndex, startIndex + limit);
  }, [sortedEquipment, page, limit]);

  const handleBulkDeactivateClick = useCallback(
    (selected: Partial<SubscriptionEquipment>[]) => {
      const activeSlots = selected.filter(
        (equip) => equip.status === "ACTIVE" && (equip.subscription_id || activeSub?.id) && equip.slot_index !== undefined
      );
      if (activeSlots.length === 0) {
        toast.info(t("common.info") || "Info", {
          description: t("devices.noActiveForDeactivate") || "No active devices selected for deactivation.",
        });
        return;
      }
      setBulkDeactivateTargets(activeSlots);
      setShowBulkDeactivateAlert(true);
    },
    [activeSub, t]
  );

  const confirmBulkDeactivate = useCallback(async () => {
    if (bulkDeactivateTargets.length === 0) return;
    setBulkProcessing(true);
    let successCount = 0;
    try {
      await Promise.allSettled(
        bulkDeactivateTargets.map(async (slot) => {
          const subId = slot.subscription_id || activeSub?.id;
          if (subId !== undefined && slot.slot_index !== undefined) {
            const updatedSlot = await equipmentService.deactivateSlot(subId, slot.slot_index);
            updateDeviceList(subId, slot.slot_index, updatedSlot);
            successCount++;
          }
        })
      );
      if (successCount > 0) {
        toast.info(t("devices.slotRevokedTitle") || "Slot Revoked", {
          description:
            t("devices.bulkDeactivateSuccess", { count: successCount }) ||
            `Deactivated ${successCount} active device(s).`,
        });
      }
    } catch (err) {
      console.error("Bulk deactivation failed:", err);
    } finally {
      setBulkProcessing(false);
      setShowBulkDeactivateAlert(false);
      setBulkDeactivateTargets([]);
    }
  }, [bulkDeactivateTargets, activeSub, updateDeviceList, t]);

  const handleBulkExportCSV = useCallback(
    (selected: Partial<SubscriptionEquipment>[]) => {
      const rowsToExport = selected.length > 0 ? selected : filteredEquipment;
      if (rowsToExport.length === 0) return;

      const headers = ["Slot", "Status", "Device Name", "Serial Number", "Nextcloud User", "Client", "Plan", "ID"];
      const csvLines = [headers.join(",")];

      rowsToExport.forEach((item) => {
        const slot = item.slot_index !== undefined ? item.slot_index + 1 : "";
        const status = item.status || "";
        const deviceName = item.device_name ? `"${item.device_name.replace(/"/g, '""')}"` : "";
        const serial = item.device_serial ? `"${item.device_serial.replace(/"/g, '""')}"` : "";
        const ncUser = item.nextcloud_username || "";
        const client = item.client_name ? `"${item.client_name.replace(/"/g, '""')}"` : item.tenant_name || "";
        const plan = item.plan || "";
        const id = item.id || "";

        csvLines.push([slot, status, deviceName, serial, ncUser, client, plan, id].join(","));
      });

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvLines.join("\n"));
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `devices_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t("common.success") || "Success", {
        description: t("devices.bulkExportSuccess") || `Exported ${rowsToExport.length} device(s) to CSV.`,
      });
    },
    [filteredEquipment, t]
  );

  return {
    t,
    navigate,
    user,
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
    fetchActiveSubscriptions,
    handleRevokeEquipment,
    activateOtpModalOpen,
    setActivateOtpModalOpen,
    activateOtpLoading,
    setActivateOtpLoading,
    handleOpenActivateWithOtp,
    handleCloseActivateWithOtp,
    handleActivateWithOtp,
    addDeviceModalOpen,
    setAddDeviceModalOpen,
    addDeviceLoading,
    setAddDeviceLoading,
    handleOpenAddDevice,
    handleCloseAddDevice,
    handleAddAdminDevice,
    deviceToDelete,
    setDeviceToDelete,
    deleteDeviceLoading,
    setDeleteDeviceLoading,
    handleDeleteAdminDevice,
    isAdmin,
    adminDevices,
    selectedClient,
    setSelectedClient,
    selectedPlan,
    setSelectedPlan,
    selectedStatus,
    setSelectedStatus,
    uniqueClients,
    uniquePlans,
    clientFilterOptions,
    planFilterOptions,
    statusFilterOptions,
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
    selectedDevices,
    setSelectedDevices,
    showBulkDeactivateAlert,
    setShowBulkDeactivateAlert,
    bulkDeactivateTargets,
    setBulkDeactivateTargets,
    bulkProcessing,
    setBulkProcessing,
    handleBulkDeactivateClick,
    confirmBulkDeactivate,
    handleBulkExportCSV,
    // Revoke confirmation
    revokeTarget,
    setRevokeTarget,
    revokeLoading,
    setRevokeLoading,
    handleRequestRevoke,
    confirmRevoke,
    cancelRevoke,
    sorting,
    setSorting,
  };
}