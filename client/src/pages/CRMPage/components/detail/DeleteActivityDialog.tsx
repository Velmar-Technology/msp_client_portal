import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { LeadActivity } from "@/services/crmService";
import { toast } from "sonner";

interface DeleteActivityDialogProps {
  activity: LeadActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading: boolean;
  onConfirmDelete: (activityId: string) => Promise<void>;
}

export function DeleteActivityDialog({
  activity,
  open,
  onOpenChange,
  actionLoading,
  onConfirmDelete,
}: DeleteActivityDialogProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!activity) return;
    setIsDeleting(true);
    try {
      await onConfirmDelete(activity.id);
      toast.success(t("crm.activityDeletedSuccess") || "Activity deleted successfully!");
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("crm.activityDeleteError") || "Failed to delete activity.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md bg-card text-foreground border border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            {t("crm.deleteActivityConfirmTitle") || "Delete Follow-up Activity?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
            {t("crm.deleteActivityConfirmDesc") ||
              "Are you sure you want to delete this activity? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-2 sm:justify-end gap-2">
          <AlertDialogCancel
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            {t("common.cancel") || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || actionLoading}
            className="text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
          >
            {isDeleting ? (t("common.deleting") || "Deleting...") : (t("common.delete") || "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
