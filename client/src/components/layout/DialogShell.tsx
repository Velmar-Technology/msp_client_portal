import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  type DialogSize,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  size?: DialogSize;
  /** Primary action button label */
  submitLabel?: string;
  /** Primary action handler */
  onSubmit?: () => void;
  /** Whether submit action is in loading state */
  isSubmitting?: boolean;
  /** Primary button variant */
  submitVariant?: "default" | "destructive" | "secondary";
  /** Cancel button label */
  cancelLabel?: string;
  /** Explicit cancel handler (defaults to closing dialog) */
  onCancel?: () => void;
  /** Optional custom footer replacement */
  footer?: React.ReactNode;
  /** Custom className for the content dialog container */
  className?: string;
  children?: React.ReactNode;
}

/**
 * Enterprise DialogShell adapted from Cal.com Dialog components.
 * Enforces uniform icon badge headers, hairline body spacing,
 * and standard action footers with micro-shadow buttons.
 *
 * @param props - DialogShellProps
 * @returns React.ReactElement
 * @see Cal.com Dialog.tsx
 */
export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  size = "default",
  submitLabel,
  onSubmit,
  isSubmitting = false,
  submitVariant = "default",
  cancelLabel = "Cancel",
  onCancel,
  footer,
  className,
  children,
}: DialogShellProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size} className={cn("p-0 gap-0 overflow-hidden", className)}>
        {/* Header */}
        {(title || description || Icon) && (
          <DialogHeader className="p-6 border-b border-border/50 space-y-1.5 text-left">
            <div className="flex items-start gap-3">
              {Icon && (
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <div className="space-y-1 flex-1 min-w-0">
                {title && (
                  <DialogTitle className="text-base sm:text-lg font-heading font-semibold text-foreground tracking-tight">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
        )}

        {/* Content Body */}
        {children && <div className="p-6 text-sm">{children}</div>}

        {/* Footer */}
        {footer !== undefined ? (
          footer
        ) : (submitLabel || cancelLabel) ? (
          <DialogFooter className="p-4 bg-muted/20 border-t border-border/50 flex flex-row items-center justify-end gap-2">
            {cancelLabel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="h-7 text-xs"
              >
                {cancelLabel}
              </Button>
            )}
            {submitLabel && (
              <Button
                type="button"
                variant={submitVariant}
                size="sm"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="h-7 text-xs shadow-button-solid"
              >
                {isSubmitting ? "..." : submitLabel}
              </Button>
            )}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
