import { useState, useEffect, memo } from "react";
import { X } from "lucide-react";
import { ticketService } from "@/services/ticketService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export interface NewTicketModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const NewTicketModal = memo(function NewTicketModal({ onClose, onCreated }: NewTicketModalProps) {
  const { t } = useTranslation();
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
          setDevices(result);
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
    <AlertDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="sm:max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 text-foreground text-sm">
        <AlertDialogHeader>
          <AlertDialogTitle
            className="text-xl font-bold text-foreground mb-2 text-left"
          >
            {t("tickets.createModalTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">{t("tickets.createModalTitle")}</AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <Label htmlFor="new-ticket-title" className="block text-sm font-medium text-foreground mb-1.5">
              {t("tickets.modalTitleLabel")}
            </Label>
            <Input
              id="new-ticket-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("tickets.modalTitlePlaceholder")}
              required
              minLength={5}
            />
          </div>
          <div>
            <Label htmlFor="new-ticket-desc" className="block text-sm font-medium text-foreground mb-1.5">{t("tickets.modalDescLabel")}</Label>
            <Textarea
              id="new-ticket-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t("tickets.modalDescPlaceholder")}
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
              <select
                id="new-ticket-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="REPAIR">{t("tickets.categories.REPAIR")}</option>
                <option value="WARRANTY">{t("tickets.categories.WARRANTY")}</option>
                <option value="SERVICE_OUTAGE">{t("tickets.categories.SERVICE_OUTAGE")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="new-ticket-priority" className="block text-sm font-medium text-foreground mb-1.5">
                {t("tickets.modalPriorityLabel")}
              </Label>
              <select
                id="new-ticket-priority"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="LOW">{t("tickets.priorities.LOW")}</option>
                <option value="MEDIUM">{t("tickets.priorities.MEDIUM")}</option>
                <option value="HIGH">{t("tickets.priorities.HIGH")}</option>
                <option value="CRITICAL">{t("tickets.priorities.CRITICAL")}</option>
              </select>
            </div>
          </div>
          {(devicesLoading || devicesFailed || devices.length > 0) && (
            <div>
              <Label htmlFor="new-ticket-device" className="block text-sm font-medium text-foreground mb-1.5">
                {t("tickets.modalDeviceLabel")}
              </Label>
              {devicesLoading ? (
                <div className="text-sm text-muted-foreground animate-pulse">{t("tickets.modalDeviceLoading")}</div>
              ) : devicesFailed ? (
                <div className="text-sm text-destructive">{t("tickets.modalDeviceLoadError")}</div>
              ) : (
                <select
                  id="new-ticket-device"
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">{t("tickets.modalDevicePlaceholder")}</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.device_name || `Device ${device.slot_index + 1}`}
                    </option>
                  ))}
                </select>
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
          <AlertDialogFooter className="flex gap-3 pt-2 sm:flex-row sm:justify-stretch">
            <AlertDialogCancel
              onClick={onClose}
              className="flex-1 cursor-pointer"
            >
              {t("tickets.modalCancel")}
            </AlertDialogCancel>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 cursor-pointer"
            >
              {submitting ? t("tickets.modalCreating") : t("tickets.modalCreate")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
});

export default NewTicketModal;
