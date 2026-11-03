import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props for PageSettingRow.
 */
export interface PageSettingRowProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Label or title of the setting */
  label: React.ReactNode;
  /** Subtitle, value display, or explanatory text */
  description?: React.ReactNode;
  /** Action element rendered on the right side (Button, Select, Switch, etc.) */
  action?: React.ReactNode;
  /** Highlight row as a destructive / danger setting */
  danger?: boolean;
  /** Optional icon prefix for the setting label */
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Individual row item for ElevenLabs-style settings pages with horizontal dividers.
 *
 * @param props - Setting row options including label, description, and action button.
 * @returns React element.
 */
export function PageSettingRow({
  label,
  description,
  action,
  danger = false,
  icon: Icon,
  className,
  children,
  ...props
}: PageSettingRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 last:border-b-0 transition-colors",
        danger && "border-destructive/20",
        className
      )}
      {...props}
    >
      <div className="space-y-0.5 max-w-xl">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                danger ? "text-destructive" : "text-muted-foreground"
              )}
            />
          )}
          <span
            className={cn(
              "text-sm font-semibold tracking-tight",
              danger ? "text-destructive font-semibold" : "text-foreground"
            )}
          >
            {label}
          </span>
        </div>
        {description && (
          <div className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </div>
        )}
        {children}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * Props for PageSettingGroup.
 */
export interface PageSettingGroupProps extends Omit<React.ComponentPropsWithoutRef<"section">, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Section container grouping related PageSettingRow items.
 */
export function PageSettingGroup({
  title,
  description,
  children,
  className,
  ...props
}: PageSettingGroupProps) {
  return (
    <section className={cn("space-y-1", className)} {...props}>
      {(title || description) && (
        <div className="pb-3 mb-2 border-b border-border/40">
          {title && <h3 className="text-base font-semibold text-foreground font-heading">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}
