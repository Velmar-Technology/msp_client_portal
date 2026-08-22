import { memo, useCallback, useState, useMemo } from "react";
import { X, Laptop, Loader2, MoreHorizontal, Cloud, Check, KeyRound, Copy, Activity } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useDevicesPage } from "@/hooks/useDevicesPage";
import type { Subscription } from "@/services/subscriptionService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---- Lazily loaded heavy sub-features and modals ----
const ScheduleMaintenanceModal = lazyWithRetry(() =>
  import("@/components/maintenance/ScheduleMaintenanceModal").then((m) => ({
    default: m.ScheduleMaintenanceModal,
  }))
);
const NextcloudInfoModal = lazyWithRetry(() =>
  import("@/components/devices/NextcloudInfoModal").then((m) => ({
    default: m.NextcloudInfoModal,
  }))
);
const ActivateWithOtpModal = lazyWithRetry(() =>
  import("@/components/devices/ActivateWithOtpModal").then((m) => ({
    default: m.ActivateWithOtpModal,
  }))
);
const RmmDashboard = lazyWithRetry(() =>
  import("@/components/devices/RmmDashboard").then((m) => ({
    default: m.RmmDashboard,
  }))
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
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
      <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
        <Laptop className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t("devices.noActiveSubscriptions")}</h3>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{t("devices.noActiveSubscriptionsDesc")}</p>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onBrowsePlans}
        className="h-7 px-3 text-xs font-semibold cursor-pointer"
      >
        {t("devices.browseSupportPlans")}
      </Button>
    </div>
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
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-sm max-w-sm">
      <label htmlFor="active-sub-select-devices" className="block text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
        {t("devices.selectSubscription")}
      </label>
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
        <Select value={selectedId} onValueChange={onChange}>
          <SelectTrigger
            id="active-sub-select-devices"
            aria-label={t("devices.selectSubscription")}
            className="w-full h-8 px-2.5 rounded text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5 justify-between"
          >
            <SelectValue placeholder={t("devices.selectSubscription")} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
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

// 3. Easy-Copy OTP Code Badge Sub-component
interface OtpCodeBadgeProps {
  otp: string;
  expiresAt?: string | null;
  compact?: boolean;
}

export const OtpCodeBadge = memo(function OtpCodeBadge({
  otp,
  expiresAt,
  compact = false,
}: OtpCodeBadgeProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(otp);
      setCopied(true);
      toast.success(t("devices.otpCopied") || "OTP copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    },
    [otp, t],
  );

  if (compact) {
    return (
      <div className="bg-card p-2 rounded border border-border max-w-47.5">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-xs font-bold text-foreground font-mono select-all">
            {t("devices.otpLabel")} {otp}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            title={t("devices.copyOtp") || "Copy OTP"}
            aria-label={t("devices.copyOtp") || "Copy OTP"}
            className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {expiresAt && (
          <p className="text-[9px] text-zinc-400 mt-0.5">
            {t("devices.otpExpires", {
              date: new Date(expiresAt).toLocaleString(),
            })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-center space-y-1.5">
      <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
        {t("devices.wizardStep1TempCode")}
      </p>
      <div className="flex items-center justify-center gap-2 my-1.5">
        <p className="text-3xl font-extrabold text-primary font-mono tracking-widest select-all">
          {otp}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          title={t("devices.copyOtp") || "Copy OTP"}
          aria-label={t("devices.copyOtp") || "Copy OTP"}
          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {expiresAt && (
        <p className="text-[10px] text-zinc-400 font-medium">
          {t("devices.wizardStep1Expires", {
            date: new Date(expiresAt).toLocaleString(),
          })}
        </p>
      )}
    </div>
  );
});

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

export const ActivationWizardModal = memo(function ActivationWizardModal({
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
    <AlertDialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-md w-full bg-card border rounded-lg p-0 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <AlertDialogHeader className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-row justify-between items-center bg-white dark:bg-zinc-950 rounded-t-lg space-y-0 text-left">
          <AlertDialogTitle className="text-sm font-bold text-zinc-955 dark:text-zinc-50">{t("devices.wizardTitle")}</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">{t("devices.wizardStep1Intro")}</AlertDialogDescription>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogHeader>

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
              {idx < 2 && <div className="flex-1 h-0.5 mx-1.5 bg-border min-w-3.75" />}
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

              {currentSlot?.otp ? (
                <OtpCodeBadge otp={currentSlot.otp} expiresAt={currentSlot.otp_expires_at} compact={false} />
              ) : (
                <div className="bg-zinc-50/50 dark:bg-zinc-950/20 p-4 rounded-md border border-zinc-200 dark:border-zinc-800 text-center space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    {t("devices.wizardStep1TempCode")}
                  </p>
                  <div className="py-3 flex flex-col items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    <p className="text-[10px] text-zinc-400 animate-pulse font-medium">
                      {t("devices.wizardStep1Generating")}
                    </p>
                  </div>
                </div>
              )}

              <AlertDialogFooter className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <AlertDialogCancel
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer mt-0"
                >
                  {t("devices.cancel")}
                </AlertDialogCancel>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onNextStep(2)}
                  disabled={!currentSlot?.otp}
                  className="h-8 px-3 text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {t("devices.wizardStep1Next")}
                </Button>
              </AlertDialogFooter>
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

              <AlertDialogFooter className="flex justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNextStep(1)}
                  className="h-8 px-3 text-xs font-semibold cursor-pointer"
                  disabled={loading}
                >
                  {t("devices.back")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onActivate}
                  disabled={loading || !deviceName || !deviceSerial}
                  className="h-8 px-4 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>{t("devices.wizardStep2Activating")}</span>
                    </>
                  ) : (
                    <span>{t("devices.wizardStep2Submit")}</span>
                  )}
                </Button>
              </AlertDialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="text-center flex flex-col items-center space-y-1.5 py-2">
                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center font-bold">
                  <Check className="w-4 h-4" />
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

              <AlertDialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <AlertDialogAction
                  type="button"
                  onClick={onClose}
                  className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer border-0"
                >
                  {t("devices.wizardStep3Complete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// 5. Memoized Actions Cell to prevent cross-row re-renders on dropdown open/close
interface DeviceActionsCellProps {
  equip: Partial<SubscriptionEquipment>;
  rowIndex: number;
  targetSubId: string | undefined;
  isAdmin?: boolean;
  onOpenNcModal: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenScheduleMaint: (equip: Partial<SubscriptionEquipment>) => void;
  onRevokeEquipment: (subId: string, slotIndex: number) => void;
  onStartActivationWizard: (subId: string, slotIndex: number, otp: string | null) => void;
  onGenerateOTP: (subId: string, slotIndex: number) => void;
}

const DeviceActionsCell = memo(function DeviceActionsCell({
  equip,
  rowIndex,
  targetSubId,
  isAdmin = false,
  onOpenNcModal,
  onOpenScheduleMaint,
  onRevokeEquipment,
  onStartActivationWizard,
  onGenerateOTP,
}: DeviceActionsCellProps) {
  const { t } = useTranslation();
  const idx = equip.slot_index !== undefined ? equip.slot_index : rowIndex;

  return (
    <div className="text-right" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("devices.tableActions")}
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 w-36"
        >
          <DropdownMenuLabel className="text-xs">{t("devices.actionsLabel")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {equip.status === "ACTIVE" ? (
            <>
              {equip.nextcloud_username && (
                <DropdownMenuItem onClick={() => onOpenNcModal(equip)}>
                  {t("devices.actionNextcloudInfo")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onOpenScheduleMaint(equip)}>
                {t("maintenance.scheduleBtn")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => targetSubId && onRevokeEquipment(targetSubId, idx)}
              >
                {t("devices.actionDeactivate")}
              </DropdownMenuItem>
            </>
          ) : equip.otp ? (
            <>
              <DropdownMenuItem onClick={() => targetSubId && onStartActivationWizard(targetSubId, idx, equip.otp!)}>
                {t("devices.actionSimulate")}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => targetSubId && onGenerateOTP(targetSubId, idx)}>
                  {t("devices.actionRegenerate")}
                </DropdownMenuItem>
              )}
            </>
          ) : isAdmin ? (
            <DropdownMenuItem onClick={() => targetSubId && onStartActivationWizard(targetSubId, idx, null)}>
              {t("devices.actionGenerate")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => targetSubId && onStartActivationWizard(targetSubId, idx, null)}
              className="opacity-60"
            >
              {t("devices.actionGenerate")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

// 6. Parent Dashboard Page
export function DevicesPage() {
  const { t } = useTranslation();
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
    handleGenerateOTP,
    handleRevokeEquipment,
    handleStartActivationWizard,
    handleWizardActivate,
    activateOtpModalOpen,
    activateOtpLoading,
    handleOpenActivateWithOtp,
    handleCloseActivateWithOtp,
    handleActivateWithOtp,
    isAdmin,
    adminDevices,
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
    handleBulkGenerateOTP,
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

  const [maintModalEquip, setMaintModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [ncModalEquip, setNcModalEquip] = useState<Partial<SubscriptionEquipment> | null>(null);
  const [isNcModalOpen, setIsNcModalOpen] = useState(false);

  const bulkActions = useMemo(
    () => [
      ...(isAdmin
        ? [
            {
              label: t("devices.bulkGenerateOtp") || "Generate OTPs",
              onClick: handleBulkGenerateOTP,
              variant: "default" as const,
            },
          ]
        : []),
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
    [isAdmin, t, handleBulkGenerateOTP, handleBulkDeactivateClick, handleBulkExportCSV],
  );

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
  }, [setActivationWizardSubId, setActivationWizardSlotIdx]);

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

  const handleBrowsePlans = useCallback(() => {
    navigate("/plans");
  }, [navigate]);

  const equipmentColumns = useMemo<ColumnDef<Partial<SubscriptionEquipment>>[]>(() => {
    const cols: ColumnDef<Partial<SubscriptionEquipment>>[] = [];
    const sub = activeSub;

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
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {equip.client_name || t("devices.unknownClient")}
              </p>
              <p className="text-[10px] text-zinc-450 font-mono">{equip.tenant_name || t("devices.unknownTenant")}</p>
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
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {t("devices.slotNumber", {
                num: equip.slot_index !== undefined ? equip.slot_index + 1 : row.index + 1,
              })}
            </span>
            {equip.id && (
              <p className="text-[9px] text-zinc-400 font-mono truncate max-w-25" title={equip.id}>
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
              <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-1 rounded text-[9px] font-mono font-bold uppercase">
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
          <span className="bg-emerald-55 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-mono uppercase">
            ACTIVE
          </span>
        ) : (
          <span className="bg-amber-55 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-mono uppercase">
            {t("devices.statusPendingActivation")}
          </span>
        );
      },
    });

    // Add Device Details
    cols.push({
      id: "deviceDetails",
      accessorFn: (row) => row.device_name || row.otp || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableDeviceDetails")} />,
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
          return <OtpCodeBadge otp={equip.otp} expiresAt={equip.otp_expires_at} compact={true} />;
        }
        return <p className="text-xs text-zinc-455 italic">{t("devices.emptyLicenseSlot")}</p>;
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
      enableSorting: false,
      header: () => (
        <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
          {t("devices.tableActions")}
        </span>
      ),
      cell: ({ row }) => {
        const equip = row.original;
        const targetSubId = equip.subscription_id || (sub && sub.id);

        return (
          <DeviceActionsCell
            equip={equip}
            rowIndex={row.index}
            targetSubId={targetSubId}
            isAdmin={isAdmin}
            onOpenNcModal={handleOpenNcModal}
            onOpenScheduleMaint={handleOpenScheduleMaint}
            onRevokeEquipment={handleRevokeEquipment}
            onStartActivationWizard={handleStartActivationWizard}
            onGenerateOTP={handleGenerateOTP}
          />
        );
      },
    });
    return cols;
  }, [
    t,
    handleRevokeEquipment,
    handleStartActivationWizard,
    handleGenerateOTP,
    handleOpenScheduleMaint,
    handleOpenNcModal,
    isAdmin,
    activeSub,
  ]);

  const searchConfig = useMemo(
    () => ({
      value: searchTerm,
      onChange: setSearchTerm,
      placeholder: isAdmin ? t("devices.adminSearchPlaceholder") : t("devices.searchPlaceholder"),
    }),
    [searchTerm, setSearchTerm, isAdmin, t],
  );

  const filtersConfig = useMemo(() => {
    if (!isAdmin) return undefined;
    return [
      {
        id: "status",
        value: selectedStatus,
        onChange: setSelectedStatus,
        options: statusFilterOptions,
        placeholder: t("devices.filterAllStatuses"),
      },
    ];
  }, [
    isAdmin,
    selectedStatus,
    setSelectedStatus,
    statusFilterOptions,
    t,
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

  return (
    <Page title={t("nav.devices")} subtitle={t("devices.subtitle")} isLoading={loading}>
      <div className="space-y-6">
        {/* Navigation Section Switcher: Device Inventory vs RMM Monitoring & Patches */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "devices" | "rmm")} className="w-full">
            <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
              <TabsTrigger
                value="devices"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>{t("rmm.tabInventory")}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 text-[10px] font-mono px-1.5 py-0 min-w-[20px] inline-flex justify-center"
                >
                  {loading ? <Skeleton className="h-3 w-4" /> : totalInventoryCount}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="rmm"
                className="gap-2 text-xs font-medium px-4 py-1.5 cursor-pointer data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-xs"
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
            {activeSubscriptions.length === 0 && !loading && !isAdmin ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <EmptySubscriptionsCard onBrowsePlans={handleBrowsePlans} />
              </div>
            ) : (
              <div className="space-y-4 text-foreground animate-fade-in">
                {activeSubscriptions.length > 1 && !isAdmin && (
                  <SubscriptionSelector
                    subscriptions={activeSubscriptions}
                    selectedId={selectedSubscriptionId}
                    onChange={setSelectedSubscriptionId}
                  />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  <div className="lg:col-span-3 space-y-4">
                    {/* Toolbar: Activate with Code */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenActivateWithOtp}
                        className="h-7 px-3 text-xs font-semibold gap-1 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{t("devices.activateWithCode")}</span>
                      </Button>
                    </div>

                    {/* Device List Data Table */}
                    <DataTable
                      columns={equipmentColumns}
                      data={paginatedEquipment}
                      noDataMessage={t("devices.noSlotsFound")}
                      loading={loading}
                      className="border-none rounded-none"
                      search={searchConfig}
                      filters={filtersConfig}
                      pagination={paginationConfig}
                      enableRowSelection={true}
                      onSelectedRowsChange={setSelectedDevices}
                      bulkActions={bulkActions}
                      sorting={sorting}
                      onSortingChange={setSorting}
                    />
                  </div>
                </div>
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
                  <div className="p-8 flex items-center justify-center min-h-[300px]">
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

      {/* Bulk Deactivation Confirmation Modal */}
      <AlertDialog open={showBulkDeactivateAlert} onOpenChange={setShowBulkDeactivateAlert}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("devices.bulkDeactivateConfirmTitle") || "Deactivate Selected Devices"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              {t("devices.bulkDeactivateConfirmDesc", { count: bulkDeactivateTargets.length }) ||
                `Are you sure you want to deactivate ${bulkDeactivateTargets.length} active device(s)? This action will revoke cloud backup accounts.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              {t("devices.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkProcessing}
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0"
              onClick={confirmBulkDeactivate}
            >
              {t("devices.bulkDeactivate") || "Deactivate Devices"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
export default DevicesPage;
