import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyScreenProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Icon displayed in the circular header */
  icon?: React.ComponentType<{ className?: string }>;
  /** Custom element to replace the icon circle */
  customIcon?: React.ReactNode;
  /** Primary headline or title */
  headline: React.ReactNode;
  /** Explanatory description beneath headline */
  description?: React.ReactNode;
  /** Primary action button label */
  buttonText?: string;
  /** Primary action button click handler */
  buttonOnClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Custom button or action slot replacement */
  buttonRaw?: React.ReactNode;
  /** Secondary action slot */
  secondaryAction?: React.ReactNode;
  /** Whether to render an outer hairline border */
  border?: boolean;
  /** Whether the outer border is dashed */
  dashedBorder?: boolean;
  /** Whether to constrain content width (max-w-[420px]) */
  limitWidth?: boolean;
  /** Additional styling for the circular icon wrapper */
  iconWrapperClassName?: string;
  /** Additional styling for the icon element */
  iconClassName?: string;
}

/**
 * Enterprise EmptyScreen adapted from Cal.com UI components.
 * Displays a clean, centered empty state with circular icon halo,
 * clear typography, and standardized action buttons.
 *
 * @param props - EmptyScreenProps
 * @returns React.ReactElement
 * @see Cal.com EmptyScreen.tsx
 */
export function EmptyScreen({
  icon: Icon,
  customIcon,
  headline,
  description,
  buttonText,
  buttonOnClick,
  buttonRaw,
  secondaryAction,
  border = true,
  dashedBorder = true,
  limitWidth = true,
  iconWrapperClassName,
  iconClassName,
  className,
  ...props
}: EmptyScreenProps) {
  return (
    <div
      data-slot="empty-screen"
      data-testid="empty-screen"
      className={cn(
        "flex w-full select-none flex-col items-center justify-center rounded-lg p-8 sm:p-12 lg:p-16 text-center transition-all",
        border && "border border-border/70 bg-card/40",
        border && dashedBorder && "border-dashed",
        className
      )}
      {...props}
    >
      {/* Icon halo */}
      {customIcon ? (
        <div className="mb-4">{customIcon}</div>
      ) : Icon ? (
        <div
          data-slot="empty-screen-icon"
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full bg-muted/80 text-muted-foreground mb-4 shadow-subtle ring-1 ring-border/50",
            iconWrapperClassName
          )}
        >
          <Icon className={cn("h-7 w-7 stroke-[1.5]", iconClassName)} />
        </div>
      ) : null}

      {/* Typography */}
      <div className={cn("flex flex-col items-center space-y-1.5", limitWidth && "max-w-[420px]")}>
        <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground tracking-tight">
          {headline}
        </h2>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(buttonText || buttonRaw || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {buttonRaw ? (
            buttonRaw
          ) : buttonText ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={buttonOnClick}
              className="h-7 text-xs shadow-button-solid"
            >
              {buttonText}
            </Button>
          ) : null}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
