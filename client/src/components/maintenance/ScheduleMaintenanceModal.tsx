import { useState, useEffect, useMemo } from "react";
import { X, Calendar as CalendarIcon, Clock, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { maintenanceService, type DeviceMaintenance, type MaintenanceType } from "@/services/maintenanceService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { DatePicker } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  // Filter only provisioned (active) equipment with valid ID
  const provisionedEquipment = useMemo(() => {
    return allEquipment.filter(
      (eq): eq is Partial<SubscriptionEquipment> & { id: string } =>
        Boolean(eq.id && eq.status === "ACTIVE")
    );
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-full bg-card border border-border rounded-xl p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="py-3.5 border-b border-border flex flex-row justify-between items-center space-y-0 text-left">
          <div className="flex items-center gap-2">
            <div>
              <DialogTitle className="text-sm font-bold text-foreground font-heading">
                {t("maintenance.modalTitle")}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground font-medium">
                {t("maintenance.modalSubtitle")}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <FieldGroup className="gap-3.5">
            {/* Target Device Selection */}
            <Field>
              <Label htmlFor="maint-target-device" className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("maintenance.labelSelectDevice")}
              </Label>
              {provisionedEquipment.length > 1 && !equipment?.id ? (
                <Select
                  value={selectedEquipId}
                  onValueChange={(newId) => {
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
                >
                  <SelectTrigger id="maint-target-device" size="lg" className="w-full text-xs">
                    <SelectValue placeholder={t("maintenance.labelSelectDevice")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {provisionedEquipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id} className="text-xs">
                        {eq.device_name || t("devices.unnamedDevice")} ({eq.device_serial || t("devices.noSerial")})
                        {eq.client_name ? ` - ${eq.client_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex justify-between items-center py-1">
                  <div>
                    <p className="font-semibold text-foreground text-xs">
                      {activeTargetEquip?.device_name || t("devices.unnamedDevice")}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {activeTargetEquip?.device_serial || t("devices.noSerial")}
                    </p>
                  </div>
                  {activeTargetEquip?.client_name && (
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground border border-border/50">
                      {activeTargetEquip.client_name}
                    </span>
                  )}
                </div>
              )}
            </Field>

            {/* Schedule Mode Selector */}
            <Field>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("maintenance.labelSchedulingMethod")}
              </Label>
              <div className="grid grid-cols-2 gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50">
                <Button
                  type="button"
                  variant={scheduleMode === "PREDEFINED" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setScheduleMode("PREDEFINED")}
                  className="h-auto py-2 px-2.5 flex items-center justify-start gap-2 text-left shadow-none cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs leading-none">{t("maintenance.modePredefinedTitle")}</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate">{t("maintenance.modePredefinedDesc")}</p>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant={scheduleMode === "CUSTOM" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setScheduleMode("CUSTOM")}
                  className="h-auto py-2 px-2.5 flex items-center justify-start gap-2 text-left shadow-none cursor-pointer"
                >
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs leading-none">{t("maintenance.modeCustomTitle")}</p>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5 truncate">{t("maintenance.modeCustomDesc")}</p>
                  </div>
                </Button>
              </div>
            </Field>

            {/* Dynamic Schedule Fields */}
            {scheduleMode === "PREDEFINED" ? (
              <Field>
                <Label htmlFor="maint-interval" className="text-[10px] uppercase font-bold text-muted-foreground">
                  {t("maintenance.labelPredefinedMonths")}
                </Label>
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  {[
                    { months: 3, label: t("maintenance.months3") },
                    { months: 6, label: t("maintenance.months6Default") },
                    { months: 12, label: t("maintenance.months12") },
                  ].map((opt) => (
                    <Button
                      key={opt.months}
                      type="button"
                      variant={monthsAhead === opt.months ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMonthsAhead(opt.months)}
                      className="font-semibold text-center cursor-pointer"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                  <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>
                    {t("maintenance.predefinedNote", {
                      date: predefinedDateDisplay,
                    })}
                  </span>
                </p>
              </Field>
            ) : (
              <Field>
                <Label htmlFor="maint-custom-date" className="text-[10px] uppercase font-bold text-muted-foreground">
                  {t("maintenance.labelDatePicker")}
                </Label>
                <DatePicker
                  id="maint-custom-date"
                  value={customDate}
                  onChange={setCustomDate}
                  disabledBefore={new Date()}
                  className="w-full text-xs"
                />
              </Field>
            )}

            {/* Technician Assignment (Admin/Tech) */}
            {isAdminOrTech && technicians.length > 0 && (
              <Field>
                <Label htmlFor="maint-assigned-tech" className="text-[10px] uppercase font-bold text-muted-foreground">
                  {t("maintenance.labelAssignTech")}
                </Label>
                <Select
                  value={assignedTechId || "unassigned"}
                  onValueChange={(val) => setAssignedTechId(val === "unassigned" ? "" : val)}
                >
                  <SelectTrigger id="maint-assigned-tech" size="lg" className="w-full text-xs">
                    <SelectValue placeholder={t("maintenance.unassignedTech")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="unassigned" className="text-xs">
                      {t("maintenance.unassignedTech")}
                    </SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id} className="text-xs">
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {/* Title Input */}
            <Field>
              <Label htmlFor="maint-title-input" className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("maintenance.labelTitle")}
              </Label>
              <Input
                id="maint-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("maintenance.titlePlaceholder")}
                className="w-full text-xs"
              />
            </Field>

            {/* Notes Input */}
            <Field>
              <Label htmlFor="maint-notes-input" className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("maintenance.labelNotes")}
              </Label>
              <Textarea
                id="maint-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("maintenance.notesPlaceholder")}
                className="w-full resize-none text-xs"
              />
            </Field>
          </FieldGroup>

          {/* Actions */}
          <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-border">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={onClose}
                className="cursor-pointer"
              >
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={loading}
              className="gap-1.5 cursor-pointer font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("maintenance.scheduling")}</span>
                </>
              ) : (
                <span>{t("maintenance.confirmSchedule")}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleMaintenanceModal;
