import { useTranslation } from "react-i18next";
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

interface DeletePlanAlertDialogProps {
  planName: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePlanAlertDialog({ planName, onConfirm, onCancel }: DeletePlanAlertDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={Boolean(planName)} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="bg-card border border-border text-foreground max-w-sm rounded-lg p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-bold font-heading">
            {t("plans.deleteDialogTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
            {planName
              ? t("plans.deleteConfirmWithName", { name: planName })
              : t("plans.deleteConfirm")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
          <AlertDialogCancel className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer">
            {t("plans.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
            onClick={onConfirm}
          >
            {t("plans.softDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
