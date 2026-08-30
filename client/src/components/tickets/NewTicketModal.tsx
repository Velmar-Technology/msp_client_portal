import { useState, useEffect, memo } from "react";
import { X, Clock } from "lucide-react";
import { ticketService } from "@/services/ticketService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { useTranslation } from "react-i18next";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface NewTicketModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const NewTicketModal = memo(function NewTicketModal({ onClose, onCreated }: NewTicketModalProps) {
  const { t } = useTranslation();
  const { isOpen: isBusinessHoursOpen } = useBusinessHours();
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("REPAIR");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [devices, setDevices] = useState<SubscriptionEquipment[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesFailed, setDevicesFailed] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDevices() {
      try {
        const result = await equipmentService.getMyDevices();
        if (!cancelled) {
          const provisioned = (result || []).filter((device) => device.status === "ACTIVE");
          setDevices(provisioned);
          if (provisioned.length === 1) {
            const d = provisioned[0];
            const limit = d.monthly_ticket_limit;
            const hasLimit = typeof limit === 'number' && limit > 0;
            const isLimitReached = hasLimit && (d.monthly_ticket_count ?? 0) >= limit;
            if (!isLimitReached) {
              setSelectedEquipmentId(d.id);
            }
          }
          setDevicesFailed(false);
        }
      } catch (err) {
        console.error("Failed to load devices for ticket modal", err);
        if (!cancelled) setDevicesFailed(true);
      } finally {
        if (!cancelled) setDevicesLoading(false);
      }
    }
    loadDevices();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (devices.length > 0 && !selectedEquipmentId) {
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await ticketService.create({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        equipmentId: selectedEquipmentId || undefined,
      });

      // Upload selected attachments if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await ticketService.uploadAttachment(ticket.id, file);
          } catch (uploadErr) {
            console.error(`Failed to upload file ${file.name}`, uploadErr);
          }
        }
      }

      onCreated();
    } catch (err) {
      console.error("Failed to create ticket", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl bg-card border-border shadow-lg p-0 overflow-hidden sm:max-w-xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold font-heading text-foreground">
              {t("tickets.createModalTitle")}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                aria-label={t("common.close") || "Close"}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("tickets.createModalDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateTicket} className="p-6 pt-2 space-y-4">
          {!isBusinessHoursOpen && (
            <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <AlertTitle className="font-semibold text-xs tracking-wide uppercase">
                {t("tickets.afterHoursBannerTitle")}
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 leading-relaxed">
                {t("tickets.afterHoursNotice")}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="new-ticket-title" className="block text-sm font-medium text-foreground mb-1.5">
              {t("tickets.modalTitleLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-ticket-title"
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("tickets.modalTitlePlaceholder")}
              className="w-full text-xs"
            />
          </div>
          <div>
            <Label htmlFor="new-ticket-desc" className="block text-sm font-medium text-foreground mb-1.5">{t("tickets.modalDescLabel")}</Label>
            <Textarea
              id="new-ticket-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t("tickets.modalDescPlaceholder")}
              className="text-xs"
              required
              minLength={10}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-ticket-category" className="block text-sm font-medium text-foreground mb-1.5">
                {t("tickets.modalCategoryLabel")}
              </Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger id="new-ticket-category" size="lg" className="w-full text-xs">
                  <SelectValue placeholder={t("tickets.modalCategoryLabel")} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="REPAIR">{t("tickets.categories.REPAIR")}</SelectItem>
                  <SelectItem value="WARRANTY">{t("tickets.categories.WARRANTY")}</SelectItem>
                  <SelectItem value="SERVICE_OUTAGE">{t("tickets.categories.SERVICE_OUTAGE")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-ticket-priority" className="block text-sm font-medium text-foreground mb-1.5">
                {t("tickets.modalPriorityLabel")}
              </Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger id="new-ticket-priority" size="lg" className="w-full text-xs">
                  <SelectValue placeholder={t("tickets.modalPriorityLabel")} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="LOW">{t("tickets.priorities.LOW")}</SelectItem>
                  <SelectItem value="MEDIUM">{t("tickets.priorities.MEDIUM")}</SelectItem>
                  <SelectItem value="HIGH">{t("tickets.priorities.HIGH")}</SelectItem>
                  <SelectItem value="CRITICAL">{t("tickets.priorities.CRITICAL")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(devicesLoading || devicesFailed || devices.length > 0) && (
            <div>
              <Label htmlFor="new-ticket-device" className="block text-sm font-medium text-foreground mb-1.5">
                {t("tickets.modalDeviceLabel")} <span className="text-destructive">*</span>
              </Label>
              {devicesLoading ? (
                <div className="text-sm text-muted-foreground animate-pulse">{t("tickets.modalDeviceLoading")}</div>
              ) : devicesFailed ? (
                <div className="text-sm text-destructive">{t("tickets.modalDeviceLoadError")}</div>
              ) : (
                <Select
                  value={selectedEquipmentId}
                  onValueChange={setSelectedEquipmentId}
                  required
                >
                  <SelectTrigger id="new-ticket-device" size="lg" className="w-full text-xs">
                    <SelectValue placeholder={t("tickets.modalDevicePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {devices.map((device) => {
                      const limit = device.monthly_ticket_limit;
                      const hasLimit = typeof limit === 'number' && limit > 0;
                      const used = device.monthly_ticket_count ?? 0;
                      const isLimitReached = hasLimit && used >= limit;
                      const remaining = hasLimit ? Math.max(0, limit - used) : null;
                      const deviceBaseName = device.device_name || `Device ${device.slot_index + 1}`;

                      let quotaText = '';
                      if (hasLimit && limit !== undefined && limit !== null) {
                        if (isLimitReached) {
                          quotaText = `(${t("tickets.deviceQuotaReached", { used, total: limit }) || `Limit reached (${used}/${limit})`})`;
                        } else if (remaining !== null) {
                          quotaText = `(${t("tickets.deviceQuotaRemaining", { remaining, total: limit }) || `${remaining}/${limit} left`})`;
                        }
                      } else if (device.monthly_ticket_limit === null) {
                        quotaText = `(${t("tickets.deviceUnlimitedQuota") || "Unlimited"})`;
                      }

                      return (
                        <SelectItem
                          key={device.id}
                          value={device.id}
                          disabled={isLimitReached}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{deviceBaseName}</span>
                            {quotaText && (
                              <span className={`text-[10px] ${isLimitReached ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                                {quotaText}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div>
            <Label className="block text-sm font-medium text-foreground mb-1.5">{t("tickets.attachmentsLabel")}</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("modal-file-input")?.click()}
                  className="cursor-pointer"
                >
                  {t("tickets.selectFiles")}
                </Button>
                <Input
                  id="modal-file-input"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label={t("tickets.fileInput")}
                />
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-muted-foreground font-medium">
                    {selectedFiles.length} {t("tickets.filesSelected")}
                  </span>
                )}
              </div>
              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <ScrollArea className="h-24 border border-border rounded-lg p-2 bg-muted/30">
                  <div className="space-y-1.5 pr-2">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm bg-card px-2 py-1 rounded border border-border"
                      >
                        <span className="truncate max-w-55" title={file.name}>
                          {file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeFile(idx)}
                          className="text-destructive hover:text-destructive/80 cursor-pointer p-0.5"
                          aria-label={`${t("tickets.removeAttachment")} ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-3 pt-2 sm:flex-row sm:justify-stretch">
            <DialogClose
              onClick={onClose}
              className="flex-1 cursor-pointer"
            >
              {t("tickets.modalCancel")}
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting || (devices.length > 0 && !selectedEquipmentId)}
              className="flex-1 cursor-pointer"
            >
              {submitting ? t("tickets.modalCreating") : t("tickets.modalCreate")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default NewTicketModal;
