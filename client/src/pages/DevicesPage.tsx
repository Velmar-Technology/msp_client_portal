import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Laptop, Loader2, MoreHorizontal, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationStore } from "@/store/useNotificationStore";
import { subscriptionService } from "@/services/subscriptionService";
import type { Subscription } from "@/services/subscriptionService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DevicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>("");
  const [subscriptionEquipment, setSubscriptionEquipment] = useState<Record<string, Partial<SubscriptionEquipment>[]>>(
    {},
  );
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
        // Pre-select first subscription if none is selected
        setSelectedSubscriptionId((prev) => prev || active[0].id);

        // Fetch equipment slots for each active subscription
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
          }),
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
  }, [user?.role, user?.id, isAdmin, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchActiveSubscriptions();
  }, [fetchActiveSubscriptions]);

  const handleGenerateOTP = async (subId: string, slotIndex: number) => {
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
  };

  const handleRevokeEquipment = async (subId: string, slotIndex: number) => {
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
  };

  const handleStartActivationWizard = async (subId: string, slotIndex: number, currentOtp?: string | null) => {
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
  };

  const handleWizardActivate = async () => {
    if (!activationWizardSubId || activationWizardSlotIdx === null) return;
    setActivationWizardLoading(true);
    try {
      const updatedSlot = await equipmentService.activateSlot(
        activationWizardSubId,
        activationWizardSlotIdx,
        activationDeviceName,
        activationDeviceSerial,
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
  };

  const activeSub = activeSubscriptions.find((sub) => sub.id === selectedSubscriptionId) || activeSubscriptions[0];

  const filteredEquipment = useMemo(() => {
    if (!activeSub) return [];
    const equipList = subscriptionEquipment[activeSub.id] || [];
    if (!searchTerm.trim()) return equipList;
    return equipList.filter((device) =>
      device.id?.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [subscriptionEquipment, activeSub, searchTerm]);

  const equipmentColumns = useCallback(
    (sub?: Subscription): ColumnDef<Partial<SubscriptionEquipment>>[] => [
      {
        id: "slotNumber",
        header: () => (
          <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t("devices.tableSlot")}</span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          return (
            <div className="space-y-0.5">
              <span className="text-label-sm font-semibold text-on-surface">Slot #{row.index + 1}</span>
              {equip.id && (
                <p className="text-[10px] text-on-surface-variant font-mono truncate max-w-[120px]" title={equip.id}>
                  ID: {equip.id}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t("devices.tableStatus")}</span>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return status === "ACTIVE" ? (
            <span className="bg-success/15 text-success border border-success/30 px-2 py-0.5 rounded text-[10px] font-bold">
              ACTIVE
            </span>
          ) : (
            <span className="bg-warning/15 text-warning border border-warning/30 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
              PENDING ACTIVATION
            </span>
          );
        },
      },
      {
        id: "deviceDetails",
        header: () => (
          <span className="uppercase text-label-sm text-on-surface-variant font-bold">
            {t("devices.tableDeviceDetails")}
          </span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          if (equip.status === "ACTIVE") {
            return (
              <div className="space-y-0.5">
                <p className="text-body-sm font-medium text-on-surface">{equip.device_name || "Unnamed Device"}</p>
                <p className="text-label-sm text-on-surface-variant font-mono">{equip.device_serial || "No Serial"}</p>
              </div>
            );
          }
          if (equip.otp) {
            return (
              <div className="bg-surface-container p-2 rounded border border-outline-variant/50 max-w-[200px]">
                <p className="text-body-sm font-bold text-primary font-mono select-all">OTP: {equip.otp}</p>
                <p className="text-[9px] text-on-surface-variant mt-0.5 font-medium">
                  Expires: {equip.otp_expires_at ? new Date(equip.otp_expires_at).toLocaleString() : ""}
                </p>
              </div>
            );
          }
          return <p className="text-body-sm text-on-surface-variant">Empty license slot</p>;
        },
      },
      {
        id: "backupAccount",
        header: () => (
          <span className="uppercase text-label-sm text-on-surface-variant font-bold">
            {t("devices.tableCloudBackup")}
          </span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          if (equip.status === "ACTIVE" && equip.nextcloud_username) {
            const used = equip.nextcloud_used_bytes || 0;
            const total = equip.nextcloud_total_bytes || 0;
            const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

            const formatSize = (bytes: number) => {
              if (bytes === 0) return "0 B";
              const k = 1024;
              const sizes = ["B", "KB", "MB", "GB", "TB"];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
            };

            return (
              <div className="space-y-2 max-w-[240px]">
                <div className="bg-surface-container/60 p-2 rounded border border-outline-variant/30 text-label-sm space-y-1">
                  <p className="font-semibold text-primary">☁️ Nextcloud Account:</p>
                  <p className="text-on-surface-variant font-mono truncate">User: {equip.nextcloud_username}</p>
                  <p className="text-on-surface-variant font-mono truncate">Pass: {equip.nextcloud_password}</p>
                </div>
                {total > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-on-surface-variant font-medium">
                      <span>Used: {formatSize(used)}</span>
                      <span>
                        Total: {formatSize(total)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage > 90 ? "bg-error" : percentage > 75 ? "bg-warning" : "bg-success"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return <span className="text-label-sm text-on-surface-variant">—</span>;
        },
      },
      {
        id: "actions",
        header: () => (
          <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t("devices.tableActions")}</span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          const idx = row.index;

          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={t("devices.tableActions")}
                    className="p-2 hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4 text-on-surface-variant" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface-container-lowest border border-outline-variant">
                  <DropdownMenuLabel>{t("devices.actionsLabel")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {equip.status === "ACTIVE" ? (
                    <DropdownMenuItem
                      onClick={() => sub && handleRevokeEquipment(sub.id, idx)}
                      className="text-error focus:text-error cursor-pointer"
                    >
                      Deactivate Device
                    </DropdownMenuItem>
                  ) : equip.otp ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => sub && handleStartActivationWizard(sub.id, idx, equip.otp)}
                        className="cursor-pointer"
                      >
                        Simulate Agent Activation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => sub && handleGenerateOTP(sub.id, idx)}
                        className="cursor-pointer"
                      >
                        Regenerate OTP
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => sub && handleStartActivationWizard(sub.id, idx, null)}
                      className="cursor-pointer"
                    >
                      Generate Activation OTP
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, handleRevokeEquipment, handleStartActivationWizard, handleGenerateOTP],
  );

  return (
    <Page
      title={t("nav.devices")}
      subtitle="Manage your active device licenses, generate activation OTPs, and provision client storage."
      isLoading={false}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {activeSubscriptions.length === 0 && !loading ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full border border-primary/20 text-primary">
              <Laptop className="h-10 w-10" />
            </div>
            <div className="max-w-md">
              <h3 className="text-h3 font-bold text-on-surface">No Active Subscriptions</h3>
              <p className="text-body-sm text-on-surface-variant mt-2">
                You currently do not have any active subscriptions. A managed support service plan is required to
                activate and manage devices.
              </p>
            </div>
            <button
              onClick={() => navigate("/plans")}
              className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-body-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer font-semibold"
            >
              Browse Support Plans
            </button>
          </div>
        ) : (
          <div className="space-y-6 text-on-surface animate-fade-in">
            {activeSubscriptions.length > 1 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm">
                <label
                  htmlFor="active-sub-select-devices"
                  className="block text-label-md text-on-surface mb-1.5 font-medium"
                >
                  Select Subscription to Manage Devices
                </label>
                <select
                  id="active-sub-select-devices"
                  value={selectedSubscriptionId}
                  onChange={(e) => setSelectedSubscriptionId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
                >
                  {activeSubscriptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.service_name} ({sub.equipment_count} Devices)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Licensed Devices table */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
                  {/* Table Header / Filters */}
                  <div className="p-4 border-b border-outline-variant bg-surface-container-low/40 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant opacity-60" />
                      <Input
                        id="devices-search"
                        type="text"
                        placeholder={t("devices.searchPlaceholder") || "Search by Device ID..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:border-primary text-on-surface"
                      />
                    </div>
                  </div>
                  <DataTable
                    columns={equipmentColumns(activeSub)}
                    data={filteredEquipment}
                    noDataMessage="No device slots found."
                    loading={loading}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Device Activation Wizard Modal */}
      {activationWizardSubId && activationWizardSlotIdx !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-lg w-full shadow-xl text-on-surface flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest rounded-t-xl">
              <h3 className="text-h3 font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                Device Activation Wizard
              </h3>
              <button
                onClick={() => {
                  setActivationWizardSubId(null);
                  setActivationWizardSlotIdx(null);
                }}
                className="p-1 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer text-on-surface-variant"
                disabled={activationWizardLoading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="px-6 pt-6 flex justify-between items-center gap-2">
              {[
                { step: 1, label: "Retrieve Code" },
                { step: 2, label: "Device Info" },
                { step: 3, label: "Complete" },
              ].map((s, idx) => (
                <div key={s.step} className="flex-1 flex items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        activationWizardStep === s.step
                          ? "bg-primary text-on-primary ring-4 ring-primary/15"
                          : activationWizardStep > s.step
                            ? "bg-success text-on-success"
                            : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {activationWizardStep > s.step ? "✓" : s.step}
                    </span>
                    <span
                      className={`text-label-sm font-semibold hidden sm:inline ${
                        activationWizardStep === s.step ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && <div className="flex-1 h-0.5 mx-2 bg-outline-variant/30 min-w-[20px]" />}
                </div>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {activationWizardStep === 1 &&
                (() => {
                  const slots = subscriptionEquipment[activationWizardSubId] || [];
                  const currentSlot = slots[activationWizardSlotIdx];

                  return (
                    <div className="space-y-4">
                      <p className="text-body-md text-on-surface-variant">
                        Follow these steps to activate backup services on your equipment:
                      </p>
                      <ol className="list-decimal list-inside text-body-sm text-on-surface-variant space-y-2 bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/30">
                        <li>Download and install the **MSP Backup Agent** on your device.</li>
                        <li>Launch the app and select **Enter Activation Code**.</li>
                        <li>Use the temporary 6-digit passcode generated below.</li>
                      </ol>

                      <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/60 text-center space-y-2">
                        <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">
                          Temporary Activation Code
                        </p>
                        {currentSlot?.otp ? (
                          <>
                            <p className="text-4xl font-extrabold text-primary font-mono tracking-widest select-all my-2">
                              {currentSlot.otp}
                            </p>
                            <p className="text-[11px] text-on-surface-variant font-medium">
                              Expires:{" "}
                              {currentSlot.otp_expires_at ? new Date(currentSlot.otp_expires_at).toLocaleString() : ""}
                            </p>
                          </>
                        ) : (
                          <div className="py-4 flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <p className="text-label-sm text-on-surface-variant animate-pulse font-medium">
                              Generating temporary code...
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                        <button
                          type="button"
                          onClick={() => {
                            setActivationWizardSubId(null);
                            setActivationWizardSlotIdx(null);
                          }}
                          className="px-4 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container border border-outline-variant/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivationWizardStep(2)}
                          disabled={!currentSlot?.otp}
                          className="px-5 py-2 text-label-md font-semibold bg-primary text-on-primary hover:opacity-90 rounded-lg transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          Next: Enter Device Info
                        </button>
                      </div>
                    </div>
                  );
                })()}

              {activationWizardStep === 2 && (
                <div className="space-y-4">
                  <p className="text-body-md text-on-surface-variant">
                    Please provide device identification info to complete cloud backup provisioning:
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="wizard-dev-name"
                        className="block text-label-sm text-on-surface mb-1 font-semibold"
                      >
                        Device Name / Label
                      </label>
                      <Input
                        id="wizard-dev-name"
                        type="text"
                        value={activationDeviceName}
                        onChange={(e) => setActivationDeviceName(e.target.value)}
                        placeholder="e.g. Sales-Laptop-03"
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="wizard-dev-serial"
                        className="block text-label-sm text-on-surface mb-1 font-semibold"
                      >
                        Device Serial Number
                      </label>
                      <Input
                        id="wizard-dev-serial"
                        type="text"
                        value={activationDeviceSerial}
                        onChange={(e) => setActivationDeviceSerial(e.target.value)}
                        placeholder="e.g. SN-SIM-827461"
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 pt-4 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setActivationWizardStep(1)}
                      className="px-4 py-2 text-label-md font-semibold text-on-surface-variant hover:bg-surface-container border border-outline-variant/40 rounded-lg transition-colors cursor-pointer"
                      disabled={activationWizardLoading}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleWizardActivate}
                      disabled={activationWizardLoading || !activationDeviceName || !activationDeviceSerial}
                      className="px-5 py-2 text-label-md font-semibold bg-success text-on-success hover:opacity-90 rounded-lg transition-opacity cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {activationWizardLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-on-success" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <span>Activate & Provision Backup</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activationWizardStep === 3 &&
                (() => {
                  const slots = subscriptionEquipment[activationWizardSubId] || [];
                  const currentSlot = slots[activationWizardSlotIdx];
                  return (
                    <div className="space-y-4">
                      <div className="text-center space-y-2 py-4">
                        <span className="inline-block p-3 bg-success/15 text-success border border-success/30 rounded-full text-2xl font-bold">
                          ✓
                        </span>
                        <h4 className="text-h3 font-bold text-success">Device Successfully Activated!</h4>
                        <p className="text-body-sm text-on-surface-variant">
                          Cloud storage space has been provisioned and mapped to this device.
                        </p>
                      </div>

                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 space-y-3">
                        <div className="flex justify-between text-body-sm">
                          <span className="text-on-surface-variant font-medium">Device Name:</span>
                          <span className="text-on-surface font-semibold">{currentSlot?.device_name}</span>
                        </div>
                        <div className="flex justify-between text-body-sm">
                          <span className="text-on-surface-variant font-medium">Serial Number:</span>
                          <span className="text-on-surface font-mono font-semibold">{currentSlot?.device_serial}</span>
                        </div>
                        <div className="border-t border-outline-variant/30 my-2 pt-2 space-y-2">
                          <p className="text-label-sm font-semibold text-primary">
                            ☁️ Nextcloud Backup Account Credentials:
                          </p>
                          <div className="bg-surface-container p-3 rounded-lg font-mono text-xs text-on-surface-variant space-y-1 select-all relative group">
                            <p>User: {currentSlot?.nextcloud_username}</p>
                            <p>Pass: {currentSlot?.nextcloud_password}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center pt-4 border-t border-outline-variant">
                        <button
                          type="button"
                          onClick={() => {
                            setActivationWizardSubId(null);
                            setActivationWizardSlotIdx(null);
                            fetchActiveSubscriptions();
                          }}
                          className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity font-bold cursor-pointer font-semibold"
                        >
                          Complete Activation
                        </button>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
