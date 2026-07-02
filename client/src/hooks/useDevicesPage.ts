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

  // Activation Wizard State
  const [activationWizardSubId, setActivationWizardSubId] = useState<string | null>(null);
  const [activationWizardSlotIdx, setActivationWizardSlotIdx] = useState<number | null>(null);
  const [activationWizardStep, setActivationWizardStep] = useState<1 | 2 | 3>(1);
  const [activationDeviceName, setActivationDeviceName] = useState("");
  const [activationDeviceSerial, setActivationDeviceSerial] = useState("");
  const [activationWizardLoading, setActivationWizardLoading] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const fetchActiveSubscriptions = useCallback(async () => {
    if (user?.role !== "CLIENT" && !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
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
              // Fallback slots
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

  const handleGenerateOTP = useCallback(async (subId: string, slotIndex: number) => {
    try {
      const updatedSlot = await equipmentService.generateOTP(subId, slotIndex);
      setSubscriptionEquipment((prev) => {
        const current = [...(prev[subId] || [])];
        current[slotIndex] = updatedSlot;
        return { ...prev, [subId]: current };
      });
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
  }, [addToast]);

  const handleRevokeEquipment = useCallback(async (subId: string, slotIndex: number) => {
    try {
      const updatedSlot = await equipmentService.deactivateSlot(subId, slotIndex);
      setSubscriptionEquipment((prev) => {
        const current = [...(prev[subId] || [])];
        current[slotIndex] = updatedSlot;
        return { ...prev, [subId]: current };
      });
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
  }, [addToast]);

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
      setSubscriptionEquipment((prev) => {
        const current = [...(prev[activationWizardSubId] || [])];
        current[activationWizardSlotIdx] = updatedSlot;
        return { ...prev, [activationWizardSubId]: current };
      });
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
  }, [activationWizardSubId, activationWizardSlotIdx, activationDeviceName, activationDeviceSerial, addToast]);

  const activeSub = useMemo(() => {
    return activeSubscriptions.find((sub) => sub.id === selectedSubscriptionId) || activeSubscriptions[0];
  }, [activeSubscriptions, selectedSubscriptionId]);

  const filteredEquipment = useMemo(() => {
    if (!activeSub) return [];
    const equipList = subscriptionEquipment[activeSub.id] || [];
    if (!searchTerm.trim()) return equipList;
    return equipList.filter((device) =>
      device.id?.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [subscriptionEquipment, activeSub, searchTerm]);

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
    fetchActiveSubscriptions,
    handleGenerateOTP,
    handleRevokeEquipment,
    handleStartActivationWizard,
    handleWizardActivate,
  };
}
