import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MessageSquare, Sparkles, Bug, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal dialog for collecting user feedback or bug reports.
 *
 * @param props.open - Whether the dialog is visible.
 * @param props.onOpenChange - Callback to toggle visibility.
 * @returns JSX.Element
 */
export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<"idea" | "bug" | "general">("idea");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    // Simulate submission delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSubmitting(false);

    toast.success(t("topNav.feedbackSuccess"));
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">{t("topNav.feedbackTitle")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("topNav.feedbackDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Category Selector */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">
              {t("topNav.feedbackCategory")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory("idea")}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  category === "idea"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Sparkles className="size-3.5" />
                <span className="text-[11px] truncate">{t("topNav.feedbackCategoryIdea")}</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory("bug")}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  category === "bug"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Bug className="size-3.5" />
                <span className="text-[11px] truncate">{t("topNav.feedbackCategoryBug")}</span>
              </button>
              <button
                type="button"
                onClick={() => setCategory("general")}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  category === "general"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <MessageCircle className="size-3.5" />
                <span className="text-[11px] truncate">{t("topNav.feedbackCategoryGeneral")}</span>
              </button>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div>
            <label htmlFor="feedback-message" className="text-xs font-medium text-foreground block mb-1.5">
              {t("topNav.feedbackMessage")}
            </label>
            <textarea
              id="feedback-message"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("topNav.feedbackMessagePlaceholder")}
              className="w-full resize-none rounded-lg border border-border/80 bg-background/50 px-3 py-2 text-xs placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !message.trim()}
              className="text-xs font-medium"
            >
              {isSubmitting ? t("topNav.feedbackSubmitting") : t("topNav.feedbackSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
