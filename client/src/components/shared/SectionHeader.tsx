import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Main title for the section */
  title: React.ReactNode;
  /** Explanatory description beneath the title */
  description?: React.ReactNode;
  /** Right-aligned actions, buttons, or controls */
  actions?: React.ReactNode;
  /** Optional icon displayed before the title */
  icon?: React.ReactNode;
  /** Optional badge next to the title */
  badge?: React.ReactNode;
  /** Whether to render a hairline bottom border divider */
  bordered?: boolean;
}

/**
 * Cal.com inspired Section Header.
 * Provides clean typography hierarchy and action slots with hairline borders.
 *
 * @param props - SectionHeaderProps
 * @returns React.ReactElement
 */
export function SectionHeader({
  title,
  description,
  actions,
  icon,
  badge,
  bordered = false,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full",
        bordered && "border-b border-border/50 pb-3 mb-4",
        className
      )}
      {...props}
    >
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
          <h3 className="text-sm font-semibold tracking-tight text-foreground font-heading truncate">
            {title}
          </h3>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
}
