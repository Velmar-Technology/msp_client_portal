import { useCallback, useState } from "react";
import { X, Laptop, Loader2, MoreHorizontal, Wrench, Cloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDevicesPage } from "@/hooks/useDevicesPage";
import type { Subscription } from "@/services/subscriptionService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { ScheduleMaintenanceModal } from "@/components/maintenance/ScheduleMaintenanceModal";
import { NextcloudInfoModal } from "@/components/devices/NextcloudInfoModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// 1. High-Density Empty Subscriptions Card Sub-component
interface EmptySubscriptionsCardProps {
  onBrowsePlans: () => void;
}

export function EmptySubscriptionsCard({ onBrowsePlans }: EmptySubscriptionsCardProps) {
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
      <button
        onClick={onBrowsePlans}
        className="px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-md text-xs shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
      >
        {t("devices.browseSupportPlans")}
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
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-sm max-w-sm">
      <label htmlFor="active-sub-select-devices" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
        {t("devices.selectSubscription")}
      </label>
      <select
        id="active-sub-select-devices"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2.5 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 cursor-pointer font-medium"
      >
        {subscriptions.map((sub) => (
          <option key={sub.id} value={sub.id}>
            {t("devices.subOptionLabel", {
              name: sub.service_name,
              devicesStr: t("plans.devicesCount", { count: sub.equipment_count }),
            })}
          </option>
        ))}
      </select>
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
  const { t } = useTranslation();
  const currentSlot = slotsEquipment[slotIdx];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg max-w-md w-full shadow-lg text-zinc-900 dark:text-zinc-100 flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-950 rounded-t-lg">
          <h3 className="text-sm font-bold text-zinc-955 dark:text-zinc-50">{t("devices.wizardTitle")}</h3>
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
            { step: 1, label: t("devices.wizardStepRetrieve") },
            { step: 2, label: t("devices.wizardStepInfo") },
            { step: 3, label: t("devices.wizardStepComplete") },
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
              <p className="text-xs text-zinc-500 leading-normal">{t("devices.wizardStep1Intro")}</p>
              <ol className="list-decimal list-inside text-[11px] text-zinc-500 leading-relaxed bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-md border border-zinc-200 dark:border-zinc-800">
                <li>{t("devices.wizardStep1Instruction1")}</li>
                <li>{t("devices.wizardStep1Instruction2")}</li>
                <li>{t("devices.wizardStep1Instruction3")}</li>
              </ol>

              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-center space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  {t("devices.wizardStep1TempCode")}
                </p>
                {currentSlot?.otp ? (
                  <>
                    <p className="text-3xl font-extrabold text-primary font-mono tracking-widest select-all my-1.5">
                      {currentSlot.otp}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      {t("devices.wizardStep1Expires", {
                        date: currentSlot.otp_expires_at ? new Date(currentSlot.otp_expires_at).toLocaleString() : "",
                      })}
                    </p>
                  </>
                ) : (
                  <div className="py-3 flex flex-col items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    <p className="text-[10px] text-zinc-400 animate-pulse font-medium">
                      {t("devices.wizardStep1Generating")}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer"
                >
                  {t("devices.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => onNextStep(2)}
                  disabled={!currentSlot?.otp}
                  className="h-8 px-3 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {t("devices.wizardStep1Next")}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 leading-normal">{t("devices.wizardStep2Intro")}</p>

              <div className="space-y-3.5">
                <div>
                  <label htmlFor="wizard-dev-name" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">
                    {t("devices.wizardStep2NameLabel")}
                  </label>
                  <Input
                    id="wizard-dev-name"
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder={t("devices.wizardStep2NamePlaceholder")}
                    className="w-full bg-card border rounded-md text-xs h-8"
                  />
                </div>

                <div>
                  <label
                    htmlFor="wizard-dev-serial"
                    className="block text-[10px] uppercase font-bold text-zinc-400 mb-1"
                  >
                    {t("devices.wizardStep2SerialLabel")}
                  </label>
                  <Input
                    id="wizard-dev-serial"
                    type="text"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                    placeholder={t("devices.wizardStep2SerialPlaceholder")}
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
                  {t("devices.back")}
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
                      <span>{t("devices.wizardStep2Activating")}</span>
                    </>
                  ) : (
                    <span>{t("devices.wizardStep2Activate")}</span>
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
                  {t("devices.wizardStep3Success")}
                </h4>
                <p className="text-xs text-zinc-500">{t("devices.wizardStep3Desc")}</p>
              </div>

              <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>{t("devices.wizardStep3DeviceName")}</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{currentSlot?.device_name}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>{t("devices.wizardStep3SerialNumber")}</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold">
                    {currentSlot?.device_serial}
                  </span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {t("devices.wizardStep3Credentials")}
                  </p>
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-2 rounded-md font-mono text-[10px] text-zinc-600 dark:text-zinc-400 space-y-0.5 select-all">
                    <p>
                      {t("devices.wizardStep3User")} {currentSlot?.nextcloud_username}
                    </p>
                    <p>
                      {t("devices.wizardStep3Pass")} {currentSlot?.nextcloud_password}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t("devices.wizardStep3Complete")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 6. Parent Dashboard Page
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
    paginatedEquipment,
    fetchActiveSubscriptions,
    handleGenerateOTP,
    handleRevokeEquipment,
    handleStartActivationWizard,
    handleWizardActivate,
    isAdmin,
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
  } = useDevicesPage();

  const [maintModalEquip, setMaintModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [ncModalEquip, setNcModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isNcModalOpen, setIsNcModalOpen] = useState(false);

  const handleOpenScheduleMaint = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setMaintModalEquip(equip);
    setIsMaintModalOpen(true);
  }, []);

  const handleOpenNcModal = useCallback((equip: Partial<SubscriptionEquipment>) => {
    setNcModalEquip(equip);
    setIsNcModalOpen(true);
  }, []);

  const handleCloseWizard = useCallback(() => {
    setActivationWizardSubId(null);
    setActivationWizardSlotIdx(null);
    fetchActiveSubscriptions();
  }, [fetchActiveSubscriptions, setActivationWizardSubId, setActivationWizardSlotIdx]);

  const equipmentColumns = useCallback(
    (sub?: Subscription): ColumnDef<Partial<SubscriptionEquipment>>[] => {
      const cols: ColumnDef<Partial<SubscriptionEquipment>>[] = [];

      // Add Client/Tenant column if Admin
      if (isAdmin) {
        cols.push({
          id: "clientInfo",
          header: () => (
            <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
              {t("devices.tableClientTenant")}
            </span>
          ),
          cell: ({ row }) => {
            const equip = row.original;
            return (
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {equip.client_name || t("devices.unknownClient")}
                </p>
                <p className="text-[10px] text-zinc-450 font-mono">{equip.tenant_name || t("devices.unknownTenant")}</p>
                {equip.client_email && (
                  <p className="text-[9px] text-zinc-400 truncate max-w-[140px]" title={equip.client_email}>
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
        header: () => (
          <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
            {t("devices.tableSlot")}
          </span>
        ),
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
                <p className="text-[9px] text-zinc-400 font-mono truncate max-w-[100px]" title={equip.id}>
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
          header: () => (
            <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
              {t("devices.tablePlanService")}
            </span>
          ),
          cell: ({ row }) => {
            const equip = row.original;
            return (
              <div className="space-y-0.5">
                <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-1 rounded text-[9px] font-mono font-bold uppercase">
                  {equip.plan || t("devices.notAvailable")}
                </span>
                <p className="text-xs text-zinc-505 truncate max-w-[140px]">{equip.service_name}</p>
              </div>
            );
          },
        });
      }

      // Add Status
      cols.push({
        accessorKey: "status",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
            {t("devices.tableStatus")}
          </span>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return status === "ACTIVE" ? (
            <span className="bg-emerald-55 text-emerald-700 border border-emerald-202 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
              ACTIVE
            </span>
          ) : (
            <span className="bg-amber-55 text-amber-700 border border-amber-202 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase animate-pulse">
              {t("devices.statusPendingActivation")}
            </span>
          );
        },
      });

      // Add Device Details
      cols.push({
        id: "deviceDetails",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
            {t("devices.tableDeviceDetails")}
          </span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          if (equip.status === "ACTIVE") {
            return (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {equip.device_name || t("devices.unnamedDevice")}
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">{equip.device_serial || t("devices.noSerial")}</p>
              </div>
            );
          }
          if (equip.otp) {
            return (
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-2 rounded border border-zinc-200 dark:border-zinc-800 max-w-[180px]">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono select-all">
                  {t("devices.otpLabel")} {equip.otp}
                </p>
                <p className="text-[9px] text-zinc-400 mt-0.5">
                  {t("devices.otpExpires", {
                    date: equip.otp_expires_at ? new Date(equip.otp_expires_at).toLocaleString() : "",
                  })}
                </p>
              </div>
            );
          }
          return <p className="text-xs text-zinc-455 italic">{t("devices.emptyLicenseSlot")}</p>;
        },
      });

      // Add Cloud Backup Account
      cols.push({
        id: "backupAccount",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
            {t("devices.tableCloudBackup")}
          </span>
        ),
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
        header: () => (
          <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
            {t("devices.tableActions")}
          </span>
        ),
        cell: ({ row }) => {
          const equip = row.original;
          const idx = equip.slot_index !== undefined ? equip.slot_index : row.index;
          const targetSubId = equip.subscription_id || (sub && sub.id);

          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={t("devices.tableActions")}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md border border-transparent hover:border-zinc-200 dark:hover:border-zinc-850 cursor-pointer transition-colors"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-zinc-505" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
                >
                  <DropdownMenuLabel className="text-xs">{t("devices.actionsLabel")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {equip.status === "ACTIVE" ? (
                    <>
                      {equip.nextcloud_username && (
                        <DropdownMenuItem
                          onClick={() => handleOpenNcModal(equip)}
                          className="cursor-pointer text-xs flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400"
                        >
                          <Cloud className="h-3.5 w-3.5" />
                          {t("devices.actionNextcloudInfo")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleOpenScheduleMaint(equip)}
                        className="cursor-pointer text-xs flex items-center gap-1.5 font-medium text-primary"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        {t("maintenance.scheduleBtn")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => targetSubId && handleRevokeEquipment(targetSubId, idx)}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer text-xs"
                      >
                        {t("devices.actionDeactivate")}
                      </DropdownMenuItem>
                    </>
                  ) : equip.otp ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => targetSubId && handleStartActivationWizard(targetSubId, idx, equip.otp)}
                        className="cursor-pointer text-xs"
                      >
                        {t("devices.actionSimulate")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => targetSubId && handleGenerateOTP(targetSubId, idx)}
                        className="cursor-pointer text-xs"
                      >
                        {t("devices.actionRegenerate")}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => targetSubId && handleStartActivationWizard(targetSubId, idx, null)}
                      className="cursor-pointer text-xs"
                    >
                      {t("devices.actionGenerate")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      });
      return cols;
    },
    [t, handleRevokeEquipment, handleStartActivationWizard, handleGenerateOTP, handleOpenScheduleMaint, handleOpenNcModal, isAdmin],
  );

  if (loading) {
    return (
      <Page title={t("nav.devices")} subtitle={t("devices.subtitle")} isLoading={false}>
        <div className="space-y-4">
          <div className="space-y-4 text-on-surface animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-3 space-y-4">
                <Skeleton className="w-full h-10" />
                <Skeleton className="w-full h-96" />
                <Skeleton className="w-full h-10" />
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title={t("nav.devices")} subtitle={t("devices.subtitle")} isLoading={false}>
      <div className="space-y-4">
        {activeSubscriptions.length === 0 && !loading && !isAdmin ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <EmptySubscriptionsCard onBrowsePlans={() => navigate("/plans")} />
          </div>
        ) : (
          <div className="space-y-4 text-on-surface animate-fade-in">
            {activeSubscriptions.length > 1 && !isAdmin && (
              <SubscriptionSelector
                subscriptions={activeSubscriptions}
                selectedId={selectedSubscriptionId}
                onChange={setSelectedSubscriptionId}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-3 space-y-4">
                {/* Device List Data Table */}
                <DataTable
                  columns={equipmentColumns(activeSub)}
                  data={paginatedEquipment}
                  noDataMessage={t("devices.noSlotsFound")}
                  loading={loading}
                  className="border-none rounded-none"
                  search={{
                    value: searchTerm,
                    onChange: setSearchTerm,
                    placeholder: isAdmin ? t("devices.adminSearchPlaceholder") : t("devices.searchPlaceholder"),
                  }}
                  filters={
                    isAdmin
                      ? [
                          {
                            id: "client",
                            value: selectedClient,
                            onChange: setSelectedClient,
                            options: uniqueClients.map((c) => ({ value: c.id, label: c.name })),
                            placeholder: t("devices.filterAllClients"),
                          },
                          {
                            id: "plan",
                            value: selectedPlan,
                            onChange: setSelectedPlan,
                            options: uniquePlans.map((p) => ({ value: p, label: p })),
                            placeholder: t("devices.filterAllPlans"),
                          },
                          {
                            id: "status",
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                              { value: "ACTIVE", label: t("devices.statusActive") },
                              { value: "PENDING_ACTIVATION", label: t("devices.statusPending") },
                            ],
                            placeholder: t("devices.filterAllStatuses"),
                          },
                        ]
                      : undefined
                  }
                  pagination={{
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
                  }}
                />
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

      {/* Schedule Maintenance Modal */}
      <ScheduleMaintenanceModal
        equipment={maintModalEquip}
        isOpen={isMaintModalOpen}
        onClose={() => {
          setIsMaintModalOpen(false);
          setMaintModalEquip(null);
        }}
        onSuccess={() => {
          fetchActiveSubscriptions();
        }}
        isAdminOrTech={isAdmin}
      />

      {/* Nextcloud Info Modal */}
      <NextcloudInfoModal
        isOpen={isNcModalOpen}
        onClose={() => {
          setIsNcModalOpen(false);
          setNcModalEquip(null);
        }}
        subId={ncModalEquip?.subscription_id || null}
        slotIndex={ncModalEquip?.slot_index ?? null}
        fallbackUsername={ncModalEquip?.nextcloud_username}
        fallbackDeviceName={ncModalEquip?.device_name}
      />
    </Page>
  );
}
export default DevicesPage;
