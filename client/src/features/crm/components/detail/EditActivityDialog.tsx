import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared";
import { Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import type { LeadActivity, UpdateActivityPayload } from "../../api/crmService";
import { toast } from "sonner";

interface EditActivityDialogProps {
  activity: LeadActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  onSave: (activityId: string, data: UpdateActivityPayload) => Promise<void>;
}

export function EditActivityDialog({ activity, open, onOpenChange, actionLoading, onSave }: EditActivityDialogProps) {
  const { t } = useTranslation();

  const [editActType, setEditActType] = useState<LeadActivity["activity_type"]>("CALL");
  const [editActTitle, setEditActTitle] = useState<string>("");
  const [editActSummary, setEditActSummary] = useState<string>("");
  const [editActDueDate, setEditActDueDate] = useState<string>("");
  const [editActStatus, setEditActStatus] = useState<LeadActivity["status"]>("PENDING");
  const [editActErrors, setEditActErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (activity) {
      setEditActType(activity.activity_type);
      setEditActTitle(activity.title);
      setEditActSummary(activity.summary || "");
      setEditActDueDate(activity.due_date ? String(activity.due_date).split("T")[0] : "");
      setEditActStatus(activity.status);
      setEditActErrors({});
    }
  }, [activity]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activity) return;

    if (!editActTitle.trim()) {
      setEditActErrors({ title: "crm.validation.activityTitleRequired" });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(activity.id, {
        title: editActTitle.trim(),
        activityType: editActType,
        summary: editActSummary.trim() || null,
        dueDate: editActDueDate ? new Date(`${editActDueDate}T09:00:00.000Z`).toISOString() : null,
        status: editActStatus,
      });
      toast.success(t("crm.activityUpdatedSuccess") || "Activity updated successfully!");
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("crm.activityUpdateError") || "Failed to update activity.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md bg-card text-foreground border border-border">
        <form onSubmit={handleSave} className="space-y-3.5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground font-heading">
              <Pencil className="h-4 w-4 text-primary" />
              {t("crm.editActivity") || "Edit Follow-up / Activity"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {t("crm.activitySummaryPlaceholder") || "Update details, due date, status, or notes for this activity."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 min-h-[14px] truncate">
                {t("crm.activityType")}
              </label>
              <Select value={editActType} onValueChange={(v) => setEditActType(v as LeadActivity["activity_type"])}>
                <SelectTrigger size="lg" className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">{t("crm.activities.call")}</SelectItem>
                  <SelectItem value="MEETING">{t("crm.activities.meeting")}</SelectItem>
                  <SelectItem value="EMAIL_SENT">{t("crm.activities.email")}</SelectItem>
                  <SelectItem value="NOTE">{t("crm.activities.note")}</SelectItem>
                  <SelectItem value="QUOTE_SENT">{t("crm.activities.quoteSent") || "Quotation Sent"}</SelectItem>
                  <SelectItem value="QUOTE_REMINDER">
                    {t("crm.activities.quoteReminder") || "Quotation Reminder"}
                  </SelectItem>
                  <SelectItem value="QUOTE_STATUS_CHANGE">
                    {t("crm.activities.quoteStatusChange") || "Quotation Status Change"}
                  </SelectItem>
                  <SelectItem value="STAGE_CHANGE">{t("crm.activities.stageChange") || "Stage Change"}</SelectItem>
                  <SelectItem value="PLAN_ASSIGNED">{t("crm.activities.planAssigned") || "Plan Assigned"}</SelectItem>
                  <SelectItem value="SUB_MODIFIED">
                    {t("crm.activities.subModified") || "Subscription Modified"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 min-h-[14px] truncate">
                {t("crm.activityStatus") || "Status"}
              </label>
              <Select value={editActStatus} onValueChange={(v) => setEditActStatus(v as LeadActivity["status"])}>
                <SelectTrigger size="lg" className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("crm.dueDate")}
            </label>
            <DatePicker value={editActDueDate} onChange={(v) => setEditActDueDate(v)} className="w-full" />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("crm.activityTitle")} *
            </label>
            <Input
              value={editActTitle}
              onChange={(e) => setEditActTitle(e.target.value)}
              placeholder={t("crm.activityTitlePlaceholder")}
              className="h-8 text-xs"
              aria-invalid={Boolean(editActErrors.title)}
            />
            {editActErrors.title && <p className="text-[10px] text-destructive mt-1">{t(editActErrors.title)}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("crm.activitySummary")}
            </label>
            <Textarea
              rows={3}
              value={editActSummary}
              onChange={(e) => setEditActSummary(e.target.value)}
              placeholder={t("crm.activitySummaryPlaceholder")}
              className="text-xs bg-background text-foreground"
            />
          </div>

          <AlertDialogFooter className="pt-2 sm:justify-end gap-2">
            <AlertDialogCancel type="button" onClick={() => onOpenChange(false)} className="text-xs cursor-pointer">
              {t("common.cancel") || "Cancel"}
            </AlertDialogCancel>
            <Button
              type="submit"
              disabled={isSaving || actionLoading}
              className="text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {isSaving ? t("common.saving") || "Saving..." : t("common.save") || "Save Changes"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
