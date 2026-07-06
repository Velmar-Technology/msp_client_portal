import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useNotificationStore } from "@/store/useNotificationStore";
import { subscriptionService } from "@/services/subscriptionService";
import type { Subscription } from "@/services/subscriptionService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";

export function useDevicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("");
  const [subscriptionEquipment, setSubscriptionEquipment] = useState<Record<string, Partial<SubscriptionEquipment>[]>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Admin specific states
  const [adminDevices, setAdminDevices] = useState<SubscriptionEquipment[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

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
        const devices = await equipmentService.getAllDevicesForAdmin();
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
        const subs = await subscriptionService.getAll();
        const active = subs.filter((sub) => sub.status === "ACTIVE");
        setActiveSubscriptions(active);

        if (active.length > 0) {
          setSelectedSubscriptionId((prev) => prev || active[0].id);

          const initialEquip: Record<string, Partial<SubscriptionEquipment>[]> = {};
          await Promise.all(
            active.map(async (sub) => {
              try {
                const slots = await equipmentService.getSlots(sub.id);
                initialEquip[sub.id] = slots;
              } catch (err) {
                console.error(`Failed to load slots for subscription ${sub.id}:`, err);
                const fallbackSlots = [];
                for (let i = 0; i < sub.equipment_count; i++) {
                  fallbackSlots.push({
                    id: `device-slot-${i}`,
                    status: "PENDING_ACTIVATION" as const,
                  });
                }
                initialEquip[sub.id] = fallbackSlots;
              }
            })
          );
          setSubscriptionEquipment(initialEquip);
        }
      }
    } catch (err) {
      console.error("Failed to load active subscriptions", err);
      addToast({
        title: "Error",
        message: "Failed to retrieve active subscriptions for device management.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.role, isAdmin, addToast]);

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

  const handleGenerateOTP = useCallback(async (subId: string, slotIndex: number) => {
    try {
      const updatedSlot = await equipmentService.generateOTP(subId, slotIndex);
      updateDeviceList(subId, slotIndex, updatedSlot);
      addToast({
        title: "OTP Generated",
        message: `Temporary activation code ${updatedSlot.otp} generated for slot #${slotIndex + 1}.`,
        type: "success",
      });
    } catch (err) {
      console.error("Failed to generate OTP:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Error",
        message: error.response?.data?.message || error.message || "Failed to generate OTP.",
        type: "error",
      });
    }
  }, [addToast, updateDeviceList]);

  const handleRevokeEquipment = useCallback(async (subId: string, slotIndex: number) => {
    try {
      const updatedSlot = await equipmentService.deactivateSlot(subId, slotIndex);
      updateDeviceList(subId, slotIndex, updatedSlot);
      addToast({
        title: "Slot Revoked",
        message: "Device slot revoked. Nextcloud account deleted.",
        type: "info",
      });
    } catch (err) {
      console.error("Failed to revoke device:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Error",
        message: error.response?.data?.message || error.message || "Failed to deactivate slot.",
        type: "error",
      });
    }
  }, [addToast, updateDeviceList]);

  const handleStartActivationWizard = useCallback(async (subId: string, slotIndex: number, currentOtp?: string | null) => {
    setActivationWizardSubId(subId);
    setActivationWizardSlotIdx(slotIndex);
    setActivationDeviceName(`Workstation-${slotIndex + 1}`);
    setActivationDeviceSerial(`SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`);
    setActivationWizardStep(1);

    if (!currentOtp) {
      try {
        await handleGenerateOTP(subId, slotIndex);
      } catch (err) {
        console.error("Failed to auto-generate OTP for wizard:", err);
      }
    }
  }, [handleGenerateOTP]);

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
      addToast({
        title: "Device Activated",
        message: `Device ${activationDeviceName} successfully activated. Nextcloud backup account provisioned.`,
        type: "success",
      });
      setActivationWizardStep(3);
    } catch (err) {
      console.error("Failed to activate device in wizard:", err);
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      addToast({
        title: "Error",
        message: error.response?.data?.message || error.message || "Failed to activate device.",
        type: "error",
      });
    } finally {
      setActivationWizardLoading(false);
    }
  }, [activationWizardSubId, activationWizardSlotIdx, activationDeviceName, activationDeviceSerial, addToast, updateDeviceList]);

  const activeSub = useMemo(() => {
    return activeSubscriptions.find((sub) => sub.id === selectedSubscriptionId) || activeSubscriptions[0];
  }, [activeSubscriptions, selectedSubscriptionId]);

  const uniqueClients = useMemo(() => {
    const clients = new Map<string, string>();
    adminDevices.forEach((d) => {
      if (d.tenant_id && d.tenant_name) {
        clients.set(d.tenant_id, d.tenant_name);
      }
    });
    return Array.from(clients.entries()).map(([id, name]) => ({ id, name }));
  }, [adminDevices]);

  const uniquePlans = useMemo(() => {
    const plans = new Set<string>();
    adminDevices.forEach((d) => {
      if (d.plan) plans.add(d.plan);
    });
    return Array.from(plans);
  }, [adminDevices]);

  const filteredEquipment = useMemo(() => {
    if (isAdmin) {
      return adminDevices.filter((device) => {
        const matchSearch = !searchTerm.trim() ||
          device.id?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          device.device_name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          device.device_serial?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          device.nextcloud_username?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          device.client_name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          device.client_email?.toLowerCase().includes(searchTerm.toLowerCase().trim());
        
        const matchClient = selectedClient === "all" || device.tenant_id === selectedClient;
        const matchPlan = selectedPlan === "all" || device.plan === selectedPlan;
        const matchStatus = selectedStatus === "all" || device.status === selectedStatus;
        
        return matchSearch && matchClient && matchPlan && matchStatus;
      });
    } else {
      if (!activeSub) return [];
      const equipList = subscriptionEquipment[activeSub.id] || [];
      if (!searchTerm.trim()) return equipList;
      return equipList.filter((device) =>
        device.id?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        device.device_name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        device.device_serial?.toLowerCase().includes(searchTerm.toLowerCase().trim())
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
    page,
    setPage,
    limit,
    setLimit,
    totalPages,
  };
}
