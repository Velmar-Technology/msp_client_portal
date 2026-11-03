import * as React from "react";
import { Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageBannerAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export interface PageBannerProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  /** Leading icon or illustration */
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode;
  /** Bold title or headline */
  title?: React.ReactNode;
  /** Descriptive body text */
  description?: React.ReactNode;
  /** Direct action button or custom action element */
  action?: PageBannerAction | React.ReactNode;
  /** Callback when dismiss X is clicked */
  onDismiss?: () => void;
  /** Visual theme */
  variant?: "default" | "muted" | "primary" | "warning";
}

/**
 * ElevenLabs-style inline callout/banner box with leading icon, headline, description,
 * and quick action button.
 *
 * @param props - PageBannerProps
 * @returns JSX.Element
 */
export function PageBanner({
  icon = Sparkles,
  title,
  description,
  action,
  onDismiss,
  variant = "default",
  className,
  children,
  ...props
}: PageBannerProps) {
  const IconComponent = typeof icon === "function" ? icon : null;

  return (
    <div
      data-slot="page-banner"
      data-testid="page-banner"
      className={cn(
        "rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors shadow-2xs",
        variant === "default" && "border-border/70 bg-muted/30 text-foreground",
        variant === "muted" && "border-border/50 bg-muted/20 text-muted-foreground",
        variant === "primary" && "border-primary/30 bg-primary/5 text-primary",
        variant === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
        className
      )}
      {...props}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        {IconComponent ? (
          <div className="size-8 rounded-xl bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-2xs text-foreground">
            <IconComponent className="size-4" />
          </div>
        ) : (
          React.isValidElement(icon) && icon
        )}

        <div className="min-w-0 flex-1">
          {title && (
            <span className="font-semibold text-foreground mr-1.5">{title}</span>
          )}
          {description && (
            <span className="text-muted-foreground leading-relaxed">{description}</span>
          )}
          {children}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {action && (
          React.isValidElement(action) ? (
            action
          ) : typeof action === "object" && "label" in action ? (
            <Button
              type="button"
              variant={action.variant || "outline"}
              size="xs"
              onClick={action.onClick}
              className="h-7 px-3 rounded-full text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            >
              {action.icon && <action.icon className="size-3.5" />}
              <span>{action.label}</span>
            </Button>
          ) : null
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss banner"
            className="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
