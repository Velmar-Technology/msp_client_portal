import { useState } from "react";
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
import type { Lead } from "../../api/crmService";

interface DeleteLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (id: string) => Promise<void>;
}

export function DeleteLeadDialog({
  lead,
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteLeadDialogProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!lead) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(lead.id);
      onOpenChange(false);
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
            {t("crm.deleteLeadConfirmTitle") || "Delete Opportunity?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
            {t("crm.deleteLeadConfirmDesc", { name: lead.contact_name }) ||
              `Are you sure you want to delete the opportunity for ${lead.contact_name}?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-2 sm:justify-end gap-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)} className="text-xs cursor-pointer">
            {t("common.cancel") || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer"
          >
            {isDeleting ? (t("common.deleting") || "Deleting...") : (t("common.delete") || "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
