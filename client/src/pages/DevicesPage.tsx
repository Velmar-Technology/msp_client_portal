import { useCallback } from "react";
import { X, Laptop, Loader2, MoreHorizontal, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDevicesPage } from "../hooks/useDevicesPage";
import type { Subscription } from "@/services/subscriptionService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
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

// 1. High-Density Empty Subscriptions Card Sub-component
interface EmptySubscriptionsCardProps {
  onBrowsePlans: () => void;
}

export function EmptySubscriptionsCard({ onBrowsePlans }: EmptySubscriptionsCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
      <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
        <Laptop className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Active Subscriptions</h3>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
          You currently do not have any active subscriptions. A managed support service plan is required to activate and
          manage devices.
        </p>
      </div>
      <button
        onClick={onBrowsePlans}
        className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-md text-xs shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
      >
        Browse Support Plans
      </button>
    </div>
  );
}

// 2. High-Density Subscription Selector Sub-component
interface SubscriptionSelectorProps {
  subscriptions: Subscription[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function SubscriptionSelector({ subscriptions, selectedId, onChange }: SubscriptionSelectorProps) {
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-sm max-w-sm">
      <label htmlFor="active-sub-select-devices" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
        Select Subscription to Manage Devices
      </label>
      <select
        id="active-sub-select-devices"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2.5 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer font-medium"
      >
        {subscriptions.map((sub) => (
          <option key={sub.id} value={sub.id}>
            {sub.service_name} ({sub.equipment_count} Devices)
          </option>
        ))}
      </select>
    </div>
  );
}

// 3. High-Density Filters Sub-component
interface DevicesTableFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder: string;
}

export function DevicesTableFilters({ searchTerm, setSearchTerm, searchPlaceholder }: DevicesTableFiltersProps) {
  return (
    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <Input
          id="devices-search"
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 text-zinc-900 dark:text-zinc-100"
        />
      </div>
    </div>
  );
}

// 4. Decoupled Activation Wizard Modal Sub-component
interface ActivationWizardModalProps {
  slotIdx: number;
  step: 1 | 2 | 3;
  deviceName: string;
  setDeviceName: (name: string) => void;
  deviceSerial: string;
  setDeviceSerial: (serial: string) => void;
  loading: boolean;
  onClose: () => void;
  onNextStep: (step: 1 | 2 | 3) => void;
  onActivate: () => void;
  slotsEquipment: Partial<SubscriptionEquipment>[];
}

export function ActivationWizardModal({
  slotIdx,
  step,
  deviceName,
  setDeviceName,
  deviceSerial,
  setDeviceSerial,
  loading,
  onClose,
  onNextStep,
  onActivate,
  slotsEquipment,
}: ActivationWizardModalProps) {
  const currentSlot = slotsEquipment[slotIdx];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg max-w-md w-full shadow-lg text-zinc-900 dark:text-zinc-100 flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-950 rounded-t-lg">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">Device Activation Wizard</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors cursor-pointer text-zinc-400"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-5 pt-4 flex justify-between items-center gap-2">
          {[
            { step: 1, label: "Retrieve Code" },
            { step: 2, label: "Device Info" },
            { step: 3, label: "Complete" },
          ].map((s, idx) => (
            <div key={s.step} className="flex-1 flex items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    step === s.step
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 ring-2 ring-zinc-900/10 dark:ring-zinc-100/10"
                      : step > s.step
                        ? "bg-emerald-600 text-white dark:bg-emerald-500"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {step > s.step ? "✓" : s.step}
                </span>
                <span
                  className={`text-[10px] font-semibold hidden sm:inline ${
                    step === s.step ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && <div className="flex-1 h-0.5 mx-1.5 bg-zinc-200 dark:bg-zinc-800 min-w-[15px]" />}
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 leading-normal">
                Follow these steps to activate backup services on your equipment:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-zinc-500 leading-relaxed bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-md border border-zinc-200 dark:border-zinc-800">
                <li>Download and install the **MSP Backup Agent** on your device.</li>
                <li>Launch the app and select **Enter Activation Code**.</li>
                <li>Use the temporary 6-digit passcode generated below.</li>
              </ol>

              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-center space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Temporary Activation Code
                </p>
                {currentSlot?.otp ? (
                  <>
                    <p className="text-3xl font-extrabold text-primary font-mono tracking-widest select-all my-1.5">
                      {currentSlot.otp}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      Expires: {currentSlot.otp_expires_at ? new Date(currentSlot.otp_expires_at).toLocaleString() : ""}
                    </p>
                  </>
                ) : (
                  <div className="py-3 flex flex-col items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    <p className="text-[10px] text-zinc-400 animate-pulse font-medium">Generating temporary code...</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onNextStep(2)}
                  disabled={!currentSlot?.otp}
                  className="h-8 px-3 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md transition-opacity cursor-pointer disabled:opacity-50"
                >
                  Next: Enter Device Info
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 leading-normal">
                Please provide device identification info to complete cloud backup provisioning:
              </p>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="wizard-dev-name" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    Device Name / Label
                  </label>
                  <Input
                    id="wizard-dev-name"
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. Sales-Laptop-03"
                    className="w-full bg-card border rounded-md text-xs h-8"
                  />
                </div>

                <div>
                  <label
                    htmlFor="wizard-dev-serial"
                    className="block text-[10px] uppercase font-bold text-zinc-400 mb-1"
                  >
                    Device Serial Number
                  </label>
                  <Input
                    id="wizard-dev-serial"
                    type="text"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                    placeholder="e.g. SN-SIM-827461"
                    className="w-full bg-card border rounded-md text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onNextStep(1)}
                  className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onActivate}
                  disabled={loading || !deviceName || !deviceSerial}
                  className="h-8 px-4 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <span>Activate & Provision Backup</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="text-center space-y-1.5 py-2">
                <span className="inline-block p-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-405 border border-emerald-900/50 rounded-full text-sm font-bold">
                  ✓
                </span>
                <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Device Successfully Activated!
                </h4>
                <p className="text-xs text-zinc-500">
                  Cloud storage space has been provisioned and mapped to this device.
                </p>
              </div>

              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Device Name:</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{currentSlot?.device_name}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Serial Number:</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold">
                    {currentSlot?.device_serial}
                  </span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Nextcloud Credentials</p>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-2 rounded-md font-mono text-[10px] text-zinc-600 dark:text-zinc-400 space-y-0.5 select-all">
                    <p>User: {currentSlot?.nextcloud_username}</p>
                    <p>Pass: {currentSlot?.nextcloud_password}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Complete Activation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 5. Parent Dashboard Page
export function DevicesPage() {
  const { t } = useTranslation();
  const {
    navigate,
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
  } = useDevicesPage();

  const handleCloseWizard = useCallback(() => {
    setActivationWizardSubId(null);
    setActivationWizardSlotIdx(null);
    fetchActiveSubscriptions();
  }, [fetchActiveSubscriptions, setActivationWizardSubId, setActivationWizardSlotIdx]);

  const equipmentColumns = useCallback(
    (sub?: Subscription): ColumnDef<Partial<SubscriptionEquipment>>[] => [
      {
        id: "slotNumber",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">{t("devices.tableSlot")}</span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          return (
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Slot #{row.index + 1}</span>
              {equip.id && (
                <p className="text-[9px] text-zinc-400 font-mono truncate max-w-[100px]" title={equip.id}>
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
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">
            {t("devices.tableStatus")}
          </span>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return status === "ACTIVE" ? (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
              ACTIVE
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase animate-pulse">
              PENDING ACTIVATION
            </span>
          );
        },
      },
      {
        id: "deviceDetails",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">
            {t("devices.tableDeviceDetails")}
          </span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          if (equip.status === "ACTIVE") {
            return (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {equip.device_name || "Unnamed Device"}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">{equip.device_serial || "No Serial"}</p>
              </div>
            );
          }
          if (equip.otp) {
            return (
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-2 rounded border border-zinc-200 dark:border-zinc-800 max-w-[180px]">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono select-all">
                  OTP: {equip.otp}
                </p>
                <p className="text-[9px] text-zinc-400 mt-0.5">
                  Expires: {equip.otp_expires_at ? new Date(equip.otp_expires_at).toLocaleString() : ""}
                </p>
              </div>
            );
          }
          return <p className="text-xs text-zinc-450 italic">Empty license slot</p>;
        },
      },
      {
        id: "backupAccount",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">
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
              <div className="space-y-1.5 max-w-[200px]">
                <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-2 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] space-y-0.5">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-200">☁️ Nextcloud Backup:</p>
                  <p className="text-zinc-500 font-mono truncate">User: {equip.nextcloud_username}</p>
                  <p className="text-zinc-500 font-mono truncate">Pass: {equip.nextcloud_password}</p>
                </div>
                {total > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-zinc-400 font-medium">
                      <span>Used: {formatSize(used)}</span>
                      <span>
                        Total: {formatSize(total)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage > 90 ? "bg-red-500" : percentage > 75 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return <span className="text-xs text-zinc-400">—</span>;
        },
      },
      {
        id: "actions",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">
            {t("devices.tableActions")}
          </span>
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
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md border border-transparent hover:border-zinc-200 dark:hover:border-zinc-850 cursor-pointer transition-colors"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                >
                  <DropdownMenuLabel className="text-xs">{t("devices.actionsLabel")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {equip.status === "ACTIVE" ? (
                    <DropdownMenuItem
                      onClick={() => sub && handleRevokeEquipment(sub.id, idx)}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer text-xs"
                    >
                      Deactivate Device
                    </DropdownMenuItem>
                  ) : equip.otp ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => sub && handleStartActivationWizard(sub.id, idx, equip.otp)}
                        className="cursor-pointer text-xs"
                      >
                        Simulate Agent Activation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => sub && handleGenerateOTP(sub.id, idx)}
                        className="cursor-pointer text-xs"
                      >
                        Regenerate OTP
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => sub && handleStartActivationWizard(sub.id, idx, null)}
                      className="cursor-pointer text-xs"
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
    <Page title={t("nav.devices")} subtitle={t("devices.subtitle")} isLoading={false}>
      <div className="max-w-7xl mx-auto space-y-4">
        {activeSubscriptions.length === 0 && !loading ? (
          <EmptySubscriptionsCard onBrowsePlans={() => navigate("/plans")} />
        ) : (
          <div className="space-y-4 text-on-surface animate-fade-in">
            {activeSubscriptions.length > 1 && (
              <SubscriptionSelector
                subscriptions={activeSubscriptions}
                selectedId={selectedSubscriptionId}
                onChange={setSelectedSubscriptionId}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-card border rounded-lg overflow-hidden shadow-sm flex flex-col">
                  {/* Table Filters */}
                  <DevicesTableFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    searchPlaceholder={t("devices.searchPlaceholder") || "Search by Device ID..."}
                  />

                  {/* Device List Data Table */}
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
        <ActivationWizardModal
          slotIdx={activationWizardSlotIdx}
          step={activationWizardStep}
          deviceName={activationDeviceName}
          setDeviceName={setActivationDeviceName}
          deviceSerial={activationDeviceSerial}
          setDeviceSerial={setActivationDeviceSerial}
          loading={activationWizardLoading}
          onClose={handleCloseWizard}
          onNextStep={setActivationWizardStep}
          onActivate={handleWizardActivate}
          slotsEquipment={subscriptionEquipment[activationWizardSubId] || []}
        />
      )}
    </Page>
  );
}
export default DevicesPage;
