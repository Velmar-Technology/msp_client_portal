import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { subscriptionService } from "@/services/subscriptionService";
import type { Subscription } from "@/services/subscriptionService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";

export function useDevicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("");
  const [subscriptionEquipment, setSubscriptionEquipment] = useState<Record<string, Partial<SubscriptionEquipment>[]>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Admin specific states
  const [adminDevices, setAdminDevices] = useState<SubscriptionEquipment[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Activation Wizard State
  const [activationWizardSubId, setActivationWizardSubId] = useState<string | null>(null);
  const [activationWizardSlotIdx, setActivationWizardSlotIdx] = useState<number | null>(null);
  const [activationWizardStep, setActivationWizardStep] = useState<1 | 2 | 3>(1);
  const [activationDeviceName, setActivationDeviceName] = useState("");
  const [activationDeviceSerial, setActivationDeviceSerial] = useState("");
  const [activationWizardLoading, setActivationWizardLoading] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  // Reset page to 1 when filters or search change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [searchTerm, selectedClient, selectedPlan, selectedStatus, selectedSubscriptionId]);

  const fetchActiveSubscriptions = useCallback(async () => {
    if (user?.role !== "CLIENT" && !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isAdmin) {
        const devices = (await equipmentService.getAllDevicesForAdmin()) || [];
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
        const active = subs.filter((sub) => sub.status === "ACTIVE");
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
      toast.error("Error", {
        description: "Failed to retrieve active subscriptions for device management.",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.role, isAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleGenerateOTP = useCallback(async (subId: string, slotIndex: number) => {
    try {
      const updatedSlot = await equipmentService.generateOTP(subId, slotIndex);
      updateDeviceList(subId, slotIndex, updatedSlot);
      toast.success(t("devices.otpGeneratedTitle") || "OTP Generated", {
        description: t("devices.otpGeneratedDesc", { otp: updatedSlot.otp, slot: slotIndex + 1 }) || `Temporary activation code ${updatedSlot.otp} generated for slot #${slotIndex + 1}.`,
      });
    } catch (err) {
      console.error("Failed to generate OTP:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t("common.error") || "Error", {
        description: error.response?.data?.message || error.message || "Failed to generate OTP.",
      });
    }
  }, [updateDeviceList, user?.role, t]);

  const handleRevokeEquipment = useCallback(async (subId: string, slotIndex: number) => {
    try {
      const updatedSlot = await equipmentService.deactivateSlot(subId, slotIndex);
      updateDeviceList(subId, slotIndex, updatedSlot);
      toast.info(t("devices.slotRevokedTitle") || "Slot Revoked", {
        description: t("devices.slotRevokedDesc") || "Device slot revoked. Cloud storage account deleted.",
      });
    } catch (err) {
      console.error("Failed to revoke device:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(t("common.error") || "Error", {
        description: error.response?.data?.message || error.message || t("devices.revokeFailed") || "Failed to deactivate slot.",
      });
    }
  }, [updateDeviceList, t]);

  const handleStartActivationWizard = useCallback(async (subId: string, slotIndex: number, currentOtp?: string | null) => {
    if (!currentOtp && user?.role === "CLIENT") {
      toast.error("Activation Code Required", {
        description: "An administrator must generate an activation code before you can activate this slot.",
      });
      return;
    }
    setActivationWizardSubId(subId);
    setActivationWizardSlotIdx(slotIndex);
    setActivationDeviceName(`Workstation-${slotIndex + 1}`);
    setActivationDeviceSerial(`SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`);
    setActivationWizardStep(1);

    if (!currentOtp && user?.role !== "CLIENT") {
      try {
        await handleGenerateOTP(subId, slotIndex);
      } catch (err) {
        console.error("Failed to auto-generate OTP for wizard:", err);
      }
    }
  }, [handleGenerateOTP, user?.role]);

  const handleWizardActivate = useCallback(async () => {
    if (!activationWizardSubId || activationWizardSlotIdx === null) return;
    setActivationWizardLoading(true);
    try {
      const updatedSlot = await equipmentService.activateSlot(
        activationWizardSubId,
        activationWizardSlotIdx,
        activationDeviceName,
        activationDeviceSerial
      );
      updateDeviceList(activationWizardSubId, activationWizardSlotIdx, updatedSlot);
      toast.success("Device Activated", {
        description: `Device ${activationDeviceName} successfully activated. Nextcloud backup account provisioned.`,
      });
      setActivationWizardStep(3);
    } catch (err) {
      console.error("Failed to activate device in wizard:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error("Error", {
        description: error.response?.data?.message || error.message || "Failed to activate device.",
      });
    } finally {
      setActivationWizardLoading(false);
    }
  }, [activationWizardSubId, activationWizardSlotIdx, activationDeviceName, activationDeviceSerial, updateDeviceList]);

  const activeSub = useMemo(() => {
    return activeSubscriptions.find((sub) => sub.id === selectedSubscriptionId) || activeSubscriptions[0];
  }, [activeSubscriptions, selectedSubscriptionId]);

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
      const hasPlanFilter = Boolean(selectedPlan && selectedPlan !== "all");
      const hasStatusFilter = Boolean(selectedStatus && selectedStatus !== "all");

      if (!hasSearch && !hasClientFilter && !hasPlanFilter && !hasStatusFilter) {
        return adminDevices || [];
      }

      return (adminDevices || []).filter((device) => {
        if (hasClientFilter && device.tenant_id !== selectedClient) return false;
        if (hasPlanFilter && device.plan !== selectedPlan) return false;
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
  }, [adminDevices, subscriptionEquipment, activeSub, searchTerm, isAdmin, selectedClient, selectedPlan, selectedStatus]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredEquipment.length / limit));
  }, [filteredEquipment.length, limit]);

  const paginatedEquipment = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredEquipment.slice(startIndex, startIndex + limit);
  }, [filteredEquipment, page, limit]);

  return {
    t,
    navigate,
    user,
    loading,
    activeSubscriptions,
    selectedSubscriptionId,
    setSelectedSubscriptionId,
    subscriptionEquipment,
    searchTerm,
    setSearchTerm,
    activationWizardSubId,
    setActivationWizardSubId,
    activationWizardSlotIdx,
    setActivationWizardSlotIdx,
    activationWizardStep,
    setActivationWizardStep,
    activationDeviceName,
    setActivationDeviceName,
    activationDeviceSerial,
    setActivationDeviceSerial,
    activationWizardLoading,
    activeSub,
    filteredEquipment,
    paginatedEquipment,
    fetchActiveSubscriptions,
    handleGenerateOTP,
    handleRevokeEquipment,
    handleStartActivationWizard,
    handleWizardActivate,
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
  };
}
