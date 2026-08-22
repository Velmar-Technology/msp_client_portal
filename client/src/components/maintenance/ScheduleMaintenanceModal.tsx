import { useState, useEffect, useMemo } from "react";
import { X, Calendar as CalendarIcon, Clock, Wrench, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { maintenanceService, type DeviceMaintenance, type MaintenanceType } from "@/services/maintenanceService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { DatePicker } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface ScheduleMaintenanceModalProps {
  equipment: Partial<SubscriptionEquipment> | null;
  allEquipment?: Partial<SubscriptionEquipment>[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMaintenance: DeviceMaintenance) => void;
  isAdminOrTech?: boolean;
  technicians?: { id: string; name: string }[];
}

export function ScheduleMaintenanceModal({
  equipment,
  allEquipment = [],
  isOpen,
  onClose,
  onSuccess,
  isAdminOrTech = false,
  technicians = [],
}: ScheduleMaintenanceModalProps) {
  const { t } = useTranslation();

  const [selectedEquipId, setSelectedEquipId] = useState<string>(equipment?.id || "");
  const [scheduleMode, setScheduleMode] = useState<"PREDEFINED" | "CUSTOM">("PREDEFINED");
  const [monthsAhead, setMonthsAhead] = useState<number>(6);
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split("T")[0];
  });
  const [assignedTechId, setAssignedTechId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Filter only provisioned (active) equipment
  const provisionedEquipment = useMemo(() => {
    return allEquipment.filter((eq) => eq.status === "ACTIVE");
  }, [allEquipment]);

  useEffect(() => {
    if (equipment?.id) {
      setSelectedEquipId(equipment.id);
      setTitle(
        t("maintenance.defaultTitle", {
          name: equipment.device_name || t("devices.unnamedDevice"),
        }),
      );
    } else if (provisionedEquipment.length > 0) {
      if (!selectedEquipId || !provisionedEquipment.some((e) => e.id === selectedEquipId)) {
        setSelectedEquipId(provisionedEquipment[0].id || "");
        setTitle(
          t("maintenance.defaultTitle", {
            name: provisionedEquipment[0].device_name || t("devices.unnamedDevice"),
          }),
        );
      }
    } else {
      setSelectedEquipId("");
    }
  }, [equipment, provisionedEquipment, t, selectedEquipId]);

  const activeTargetEquip = useMemo(() => {
    if (equipment?.id === selectedEquipId) return equipment;
    return provisionedEquipment.find((e) => e.id === selectedEquipId) || equipment;
  }, [equipment, provisionedEquipment, selectedEquipId]);

  const predefinedDateDisplay = useMemo(() => {
    return new Date(Date.now() + monthsAhead * 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
  }, [monthsAhead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipId) {
      toast.error(t("maintenance.errorSelectDevice"));
      return;
    }

    setLoading(true);
    try {
      let maintenanceTypePayload: MaintenanceType = "PREDEFINED_6M";
      let scheduledDatePayload: string | undefined = undefined;

      if (scheduleMode === "CUSTOM") {
        maintenanceTypePayload = "CUSTOM_DATE";
        scheduledDatePayload = new Date(`${customDate}T09:00:00.000Z`).toISOString();
      } else {
        if (monthsAhead === 3) maintenanceTypePayload = "PREDEFINED_3M";
        else if (monthsAhead === 12) maintenanceTypePayload = "PREDEFINED_12M";
        else maintenanceTypePayload = "PREDEFINED_6M";
      }

      const res = await maintenanceService.createMaintenance({
        equipmentId: selectedEquipId,
        scheduledDate: scheduledDatePayload,
        monthsAhead: scheduleMode === "PREDEFINED" ? monthsAhead : undefined,
        maintenanceType: maintenanceTypePayload,
        assignedTechId: assignedTechId || undefined,
        title: title || undefined,
        notes: notes || undefined,
      });

      toast.success(t("maintenance.scheduleSuccess"));
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to schedule maintenance", err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("maintenance.scheduleError");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-lg w-full bg-white dark:bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <AlertDialogHeader className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-row justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 space-y-0 text-left">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t("maintenance.modalTitle")}</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] text-zinc-500">{t("maintenance.modalSubtitle")}</AlertDialogDescription>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </AlertDialogHeader>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Device Selection */}
          <div className="space-y-1">
            <label htmlFor="maint-target-device" className="block text-[10px] uppercase font-bold text-zinc-400">
              {t("maintenance.labelSelectDevice")}
            </label>
            {provisionedEquipment.length > 1 && !equipment?.id ? (
              <select
                id="maint-target-device"
                value={selectedEquipId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedEquipId(newId);
                  const selectedEq = provisionedEquipment.find((item) => item.id === newId);
                  if (selectedEq) {
                    setTitle(
                      t("maintenance.defaultTitle", {
                        name: selectedEq.device_name || t("devices.unnamedDevice"),
                      }),
                    );
                  }
                }}
                className="w-full h-8 px-2.5 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
              >
                {provisionedEquipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.device_name || t("devices.unnamedDevice")} ({eq.device_serial || t("devices.noSerial")}) -{" "}
                    {eq.client_name || ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md flex justify-between items-center">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-100">
                    {activeTargetEquip?.device_name || t("devices.unnamedDevice")}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {activeTargetEquip?.device_serial || t("devices.noSerial")}
                  </p>
                </div>
                {activeTargetEquip?.client_name && (
                  <span className="text-[9px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-medium text-zinc-700 dark:text-zinc-300">
                    {activeTargetEquip.client_name}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Schedule Mode Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-bold text-zinc-400">
              {t("maintenance.labelSchedulingMethod")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleMode("PREDEFINED")}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  scheduleMode === "PREDEFINED"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">{t("maintenance.modePredefinedTitle")}</p>
                  <p className="text-[10px] opacity-75 mt-0.5 leading-tight">{t("maintenance.modePredefinedDesc")}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode("CUSTOM")}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  scheduleMode === "CUSTOM"
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <CalendarIcon className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">{t("maintenance.modeCustomTitle")}</p>
                  <p className="text-[10px] opacity-75 mt-0.5 leading-tight">{t("maintenance.modeCustomDesc")}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Schedule Fields */}
          {scheduleMode === "PREDEFINED" ? (
            <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <label htmlFor="maint-interval" className="block text-[10px] uppercase font-bold text-zinc-400">
                {t("maintenance.labelPredefinedMonths")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { months: 3, label: t("maintenance.months3") },
                  { months: 6, label: t("maintenance.months6Default") },
                  { months: 12, label: t("maintenance.months12") },
                ].map((opt) => (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => setMonthsAhead(opt.months)}
                    className={`py-1.5 px-2 rounded text-xs font-semibold text-center border transition-all cursor-pointer ${
                      monthsAhead === opt.months
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-sm"
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                {t("maintenance.predefinedNote", {
                  date: predefinedDateDisplay,
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-900/30 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <label htmlFor="maint-custom-date" className="block text-[10px] uppercase font-bold text-zinc-400">
                {t("maintenance.labelDatePicker")}
              </label>
              <DatePicker
                id="maint-custom-date"
                value={customDate}
                onChange={setCustomDate}
                disabledBefore={new Date()}
                className="w-full h-8 text-xs"
              />
            </div>
          )}

          {/* Technician Assignment (Admin/Tech) */}
          {isAdminOrTech && technicians.length > 0 && (
            <div className="space-y-1">
              <label htmlFor="maint-assigned-tech" className="block text-[10px] uppercase font-bold text-zinc-400">
                {t("maintenance.labelAssignTech")}
              </label>
              <select
                id="maint-assigned-tech"
                value={assignedTechId}
                onChange={(e) => setAssignedTechId(e.target.value)}
                className="w-full h-8 px-2.5 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
              >
                <option value="">{t("maintenance.unassignedTech")}</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1">
            <label htmlFor="maint-title-input" className="block text-[10px] uppercase font-bold text-zinc-400">
              {t("maintenance.labelTitle")}
            </label>
            <input
              id="maint-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("maintenance.titlePlaceholder")}
              className="w-full h-8 px-2.5 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Notes Input */}
          <div className="space-y-1">
            <label htmlFor="maint-notes-input" className="block text-[10px] uppercase font-bold text-zinc-400">
              {t("maintenance.labelNotes")}
            </label>
            <textarea
              id="maint-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("maintenance.notesPlaceholder")}
              className="w-full p-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 resize-none text-xs"
            />
          </div>

          {/* Actions */}
          <AlertDialogFooter className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <AlertDialogCancel
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md transition-colors cursor-pointer mt-0"
            >
              {t("common.cancel")}
            </AlertDialogCancel>
            <button
              type="submit"
              disabled={loading}
              className="h-8 px-4 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md transition-opacity cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("maintenance.scheduling")}</span>
                </>
              ) : (
                <span>{t("maintenance.confirmSchedule")}</span>
              )}
            </button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

